import { NextResponse } from "next/server";
import { getContract, TRANSPORTER_KEY, Stage } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

export async function POST(request: Request) {
    try {
        const { itemId, CID, dbId } = await request.json();

        if (itemId === undefined || CID === undefined) {
            return NextResponse.json({ error: "Missing itemId or CID" }, { status: 400 });
        }

        console.log(`[TransporterSubmit] Submitting for Item ${itemId} with CID ${CID}`);

        const contract = getContract(TRANSPORTER_KEY);
        const tx = await contract.transporterSubmit(itemId, CID);
        const receipt = await tx.wait();

        // Sync with Database
        if (dbId) {
            await dbPool.execute(
                "UPDATE applications SET current_stage = ?, status = 'transporter_submitted' WHERE blockchain_itemId = ?",
                [Stage.TransporterReady, itemId]
            );
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            newStage: Stage.TransporterReady
        });

    } catch (error: any) {
        console.error("[TransporterSubmit] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

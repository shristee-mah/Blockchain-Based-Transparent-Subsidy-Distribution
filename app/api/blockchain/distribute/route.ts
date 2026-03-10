import { NextResponse } from "next/server";
import { getContract, DISTRIBUTOR_KEY, Stage } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

export async function POST(request: Request) {
    try {
        const { itemId, CID, dbId } = await request.json();

        if (itemId === undefined || CID === undefined) {
            return NextResponse.json({ error: "Missing itemId or CID" }, { status: 400 });
        }

        console.log(`[DistributorSubmit] Submitting for Item ${itemId} with CID ${CID}`);

        const contract = getContract(DISTRIBUTOR_KEY);
        const tx = await contract.distributorSubmit(itemId, CID);
        const receipt = await tx.wait();

        // Sync with Database
        if (dbId) {
            await dbPool.execute(
                "UPDATE applications SET current_stage = ?, status = 'distributor_submitted' WHERE blockchain_itemId = ?",
                [Stage.DistributorReady, itemId]
            );
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            newStage: Stage.DistributorReady
        });

    } catch (error: any) {
        console.error("[DistributorSubmit] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

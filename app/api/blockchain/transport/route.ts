import { NextResponse } from "next/server";
import { getContract, ADMIN_KEY, Stage, sendTransactionWithNonce } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

export async function POST(request: Request) {
    try {
        const { itemId, CID, dbId } = await request.json();

        if (itemId === undefined || CID === undefined) {
            return NextResponse.json({ error: "Missing itemId or CID" }, { status: 400 });
        }

        console.log(`[TransporterSubmit] Processing: itemId=${itemId}, CID=${CID}, dbId=${dbId}`);

        const contract = getContract(ADMIN_KEY);
        let receipt;

        try {
            receipt = await sendTransactionWithNonce(contract, 'transporterSubmit', [itemId, CID]);
            console.log(`[TransporterSubmit] Success: ${receipt.hash}`);
        } catch (contractError: any) {
            console.error("[TransporterSubmit] Contract error:", contractError.message);
            throw new Error(`Blockchain submission failed: ${contractError.message}`);
        }

        // Sync with Database
        if (dbId) {
            try {
                await dbPool.execute(
                    "UPDATE applications SET current_stage = ?, status = 'transporter_submitted' WHERE blockchain_itemId = ?",
                    [Stage.TransporterReady, itemId]
                );
                console.log("[TransporterSubmit] Database updated");
            } catch (dbError: any) {
                console.error("[TransporterSubmit] Database error:", dbError.message);
                // Continue even if database fails
            }
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            newStage: Stage.TransporterReady
        });

    } catch (error: any) {
        console.error("[TransporterSubmit] Error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Transporter submission failed"
        }, { status: 500 });
    }
}

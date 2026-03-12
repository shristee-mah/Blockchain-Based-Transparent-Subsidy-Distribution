import { NextResponse } from "next/server";
import { getContract, ADMIN_KEY, Stage } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

export async function POST(request: Request) {
    try {
        const { itemId, CID, dbId } = await request.json();

        if (itemId === undefined || CID === undefined) {
            return NextResponse.json({ error: "Missing itemId or CID" }, { status: 400 });
        }

        console.log(`[DistributorSubmit] Processing: itemId=${itemId}, CID=${CID}, dbId=${dbId}`);

        const contract = getContract(ADMIN_KEY);
        let receipt;

        try {
            const tx = await contract.distributorSubmit(itemId, CID);
            receipt = await tx.wait();
            console.log(`[DistributorSubmit] Success: ${receipt.hash}`);
        } catch (contractError: any) {
            console.error("[DistributorSubmit] Contract error:", contractError.message);
            throw new Error(`Blockchain submission failed: ${contractError.message}`);
        }

        // Sync with Database
        if (dbId) {
            try {
                await dbPool.execute(
                    "UPDATE applications SET current_stage = ?, status = 'distributor_submitted' WHERE blockchain_itemId = ?",
                    [Stage.DistributorReady, itemId]
                );
                console.log("[DistributorSubmit] Database updated");
            } catch (dbError: any) {
                console.error("[DistributorSubmit] Database error:", dbError.message);
                // Continue even if database fails
            }
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            newStage: Stage.DistributorReady
        });

    } catch (error: any) {
        console.error("[DistributorSubmit] Error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Distributor submission failed"
        }, { status: 500 });
    }
}

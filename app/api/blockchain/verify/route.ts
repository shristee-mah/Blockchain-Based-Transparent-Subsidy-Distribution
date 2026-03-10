import { NextResponse } from "next/server";
import { getContract, ADMIN_KEY, Stage } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

export async function POST(request: Request) {
    try {
        const { itemId, currentStage, dbId } = await request.json();

        if (itemId === undefined || currentStage === undefined) {
            return NextResponse.json({ error: "Missing itemId or currentStage" }, { status: 400 });
        }

        console.log(`[AdminVerify] Verifying Item ${itemId} at Stage ${currentStage}`);

        const contract = getContract(ADMIN_KEY);
        const tx = await contract.adminVerify(itemId, currentStage);
        const receipt = await tx.wait();

        // Determine the new stage based on the 7-stage logic
        let newStage: Stage;
        if (currentStage === Stage.Created) newStage = Stage.VerifiedByAdmin;
        else if (currentStage === Stage.TransporterReady) newStage = Stage.InTransit;
        else if (currentStage === Stage.DistributorReady) newStage = Stage.Distributed;
        else throw new Error("Invalid stage for Admin verification");

        // Sync with Database
        try {
            if (dbId) {
                await dbPool.execute(
                    "UPDATE applications SET current_stage = ?, status = 'approved' WHERE blockchain_itemId = ?",
                    [newStage, itemId]
                );
            }
        } catch (dbErr: any) {
            console.error("[AdminVerify] Database sync failed (Blockchain OK):", dbErr.message);
            // We return success anyway, since the blockchain transaction was processed
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            newStage
        });

    } catch (error: any) {
        console.error("[AdminVerify] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

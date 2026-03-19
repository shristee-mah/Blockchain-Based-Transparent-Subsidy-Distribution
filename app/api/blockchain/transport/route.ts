import { NextResponse } from "next/server";
import { getContract, ADMIN_KEY, Stage, sendTransactionWithNonce } from "@/app/lib/blockchain";
import { createDocumentBatch, getMerkleRoot, getMerkleProof } from "@/app/lib/merkle";
import dbPool from "@/app/lib/db";

export async function POST(request: Request) {
    try {
        const { itemId, CID, dbId, documents, useMerkleTree } = await request.json();

        if (itemId === undefined) {
            return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
        }

        if (useMerkleTree && !documents) {
            return NextResponse.json({ error: "Documents array required for Merkle tree submission" }, { status: 400 });
        }

        if (!useMerkleTree && CID === undefined) {
            return NextResponse.json({ error: "Missing CID for single document submission" }, { status: 400 });
        }

        console.log(`[TransporterSubmit] Processing: itemId=${itemId}, useMerkleTree=${useMerkleTree}`);

        const contract = getContract(ADMIN_KEY);
        let receipt;
        let merkleRoot: string | undefined;

        if (useMerkleTree && documents) {
            // Create Merkle tree for batch document submission
            const documentBatch = createDocumentBatch(documents);
            merkleRoot = documentBatch.merkleRoot;
            
            console.log(`[TransporterSubmit] Created Merkle tree with ${documents.length} documents, root: ${merkleRoot}`);

            // Submit with primary CID (first document) and set Merkle root
            receipt = await sendTransactionWithNonce(contract, 'transporterSubmit', [itemId, documents[0]]);
            
            // Set the Merkle root for this stage
            await sendTransactionWithNonce(contract, 'setMerkleRoot', [itemId, Stage.TransporterReady, merkleRoot]);
            
            console.log(`[TransporterSubmit] Merkle batch submitted: ${receipt.hash}`);
        } else {
            // Single document submission (existing logic)
            receipt = await sendTransactionWithNonce(contract, 'transporterSubmit', [itemId, CID]);
            console.log(`[TransporterSubmit] Single document submitted: ${receipt.hash}`);
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
            newStage: Stage.TransporterReady,
            merkleRoot: merkleRoot || null,
            useMerkleTree: !!useMerkleTree,
            documentCount: useMerkleTree ? documents?.length : 1
        });

    } catch (error: any) {
        console.error("[TransporterSubmit] Error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Transporter submission failed"
        }, { status: 500 });
    }
}

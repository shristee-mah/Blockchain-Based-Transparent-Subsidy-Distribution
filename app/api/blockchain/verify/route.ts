import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getContract, ADMIN_KEY, Stage, decodeBlockchainError } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

export type Submission = {
    id: string;
    blockchain_itemId?: number;
    current_stage?: number;
    qrData?: string;
    [key: string]: any;
};

const DB_FILE = path.join(process.cwd(), '.submissions.json');
const g = globalThis as typeof globalThis & { __nischit_db__?: Submission[] };

function read(): Submission[] {
    if (g.__nischit_db__) return g.__nischit_db__;
    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, "utf-8").trim();
            if (raw) {
                g.__nischit_db__ = JSON.parse(raw) as Submission[];
                return g.__nischit_db__;
            }
        }
    } catch (e) { console.error(e); }
    g.__nischit_db__ = [];
    return g.__nischit_db__;
}

function write(data: Submission[]): void {
    g.__nischit_db__ = data;
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8"); }
    catch (e) { console.error(e); }
}

export async function POST(request: Request) {
    try {
        const { itemId, currentStage, dbId } = await request.json();

        if (itemId === undefined || currentStage === undefined) {
            return NextResponse.json({ error: "Missing itemId or currentStage" }, { status: 400 });
        }

        let resolvedItemId = itemId;

        // Get submission data from JSON file
        const submissions = read();
        const submission = submissions.find(s => s.id === dbId);
        
        console.log(`[AdminVerify] Processing: dbId=${dbId}, itemId=${itemId}, stage=${currentStage}`);

        const contract = getContract(ADMIN_KEY);
        let receipt;

        // Handle Stage 0 - Create new item if needed
        if (currentStage === Stage.Created && (!resolvedItemId || resolvedItemId === 0)) {
            console.log("[AdminVerify] Creating new blockchain item...");
            
            const cid = submission?.cid || "QmNone";
            const beneficiaryAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

            try {
                console.log("[AdminVerify] Contract address:", contract.target);
                console.log("[AdminVerify] Creating item with:", { beneficiaryAddress, cid });

                const tx = await contract.createItem(beneficiaryAddress, cid);
                receipt = await tx.wait();
                console.log("[AdminVerify] Item created, tx:", receipt.hash);
                console.log("[AdminVerify] Receipt logs:", receipt.logs.length);

                // Try to parse the ItemCreated event properly
                try {
                    for (let i = 0; i < receipt.logs.length; i++) {
                        const log = receipt.logs[i];
                        console.log(`[AdminVerify] Log ${i}:`, {
                            topics: log.topics,
                            data: log.data,
                            address: log.address
                        });
                        
                        try {
                            const parsed = contract.interface.parseLog(log);
                            console.log(`[AdminVerify] Parsed log ${i}:`, parsed);
                            
                            if (parsed && parsed.name === 'ItemCreated') {
                                console.log("[AdminVerify] Found ItemCreated event:", parsed.args);
                                // Use the first argument as itemId
                                resolvedItemId = Number(parsed.args[0]);
                                console.log(`[AdminVerify] Extracted itemId: ${resolvedItemId}`);
                                break;
                            }
                        } catch (parseErr: any) {
                            console.log(`[AdminVerify] Could not parse log ${i}:`, parseErr.message);
                        }
                    }
                    
                    // If we couldn't get the ID from event, try a simple counter
                    if (!resolvedItemId || resolvedItemId === 0) {
                        console.log("[AdminVerify] Could not extract itemId from event, using fallback");
                        resolvedItemId = (Date.now() % 1000) + 1;
                        console.log(`[AdminVerify] Using fallback itemId: ${resolvedItemId}`);
                    }
                } catch (eventError: any) {
                    console.error("[AdminVerify] Event parsing failed:", eventError.message);
                    resolvedItemId = (Date.now() % 1000) + 1;
                    console.log(`[AdminVerify] Using emergency fallback itemId: ${resolvedItemId}`);
                }

                // Now verify the newly created item
                const verifyTx = await contract.adminVerify(resolvedItemId, currentStage);
                receipt = await verifyTx.wait();
                console.log(`[AdminVerify] Item ${resolvedItemId} verified`);

            } catch (error: any) {
                console.error("[AdminVerify] Contract error:", error.message);
                throw new Error(`Blockchain operation failed: ${error.message}`);
            }
        } else {
            // Standard verification for existing items
            try {
                const tx = await contract.adminVerify(resolvedItemId, currentStage);
                receipt = await tx.wait();
                console.log(`[AdminVerify] Item ${resolvedItemId} verified from Stage ${currentStage}`);
            } catch (error: any) {
                console.error("[AdminVerify] Verification error:", error.message);
                throw new Error(`Verification failed: ${error.message}`);
            }
        }

        // Determine new stage
        let newStage: Stage;
        if (currentStage === Stage.Created) newStage = Stage.VerifiedByAdmin;
        else if (currentStage === Stage.TransporterReady) newStage = Stage.InTransit;
        else if (currentStage === Stage.DistributorReady) newStage = Stage.Distributed;
        else throw new Error("Invalid stage for verification");

        // Update database
        if (dbId) {
            try {
                const numericAppId = dbId.replace(/\D/g, '');
                await dbPool.execute(
                    "UPDATE applications SET current_stage = ?, blockchain_itemId = ?, status = 'approved' WHERE application_id = ?",
                    [newStage, Number(resolvedItemId), numericAppId]
                );
                console.log("[AdminVerify] Database updated");
            } catch (dbError: any) {
                console.error("[AdminVerify] Database error:", dbError.message);
                // Continue even if database fails
            }
        }

        // Update JSON and generate QR
        try {
            const updatedSubmissions = submissions.map(sub => {
                if (sub.id === dbId) {
                    const nextStageStr = newStage === Stage.VerifiedByAdmin ? 'transporter_handover'
                        : newStage === Stage.InTransit ? 'distributor_handover'
                            : 'beneficiary_delivery';

                    return {
                        ...sub,
                        blockchain_itemId: Number(resolvedItemId),
                        current_stage: newStage,
                        status: 'approved',
                        nextStage: nextStageStr,
                        qrData: JSON.stringify({
                            itemId: Number(resolvedItemId),
                            submissionId: sub.id,
                            currentStage: newStage,
                            role: sub.role,
                            cid: sub.cid || null,
                            nextStage: nextStageStr,
                            verifiedAt: new Date().toISOString()
                        })
                    };
                }
                return sub;
            });

            write(updatedSubmissions);
            console.log("[AdminVerify] JSON updated");
        } catch (jsonError: any) {
            console.error("[AdminVerify] JSON error:", jsonError.message);
            // Continue even if JSON fails
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            itemId: Number(resolvedItemId),
            newStage
        });

    } catch (error: any) {
        console.error("[AdminVerify] Final error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Verification failed"
        }, { status: 500 });
    }
}

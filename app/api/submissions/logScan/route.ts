import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbPool from "@/app/lib/db";
import { Stage } from "@/app/lib/blockchain";

export type Submission = {
    id: string;
    blockchain_itemId?: number;
    current_stage?: number;
    role: string;
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
        const { itemId, submissionId, nextStage } = await request.json();

        // 1. Strict Validation: itemId is MANDATORY for a blockchain-based system
        if (itemId === undefined || itemId === null || isNaN(Number(itemId))) {
            console.error(`[LogScan] Rejected: Missing or invalid itemId: ${itemId}`);
            return NextResponse.json({ error: "Invalid Scan: Blockchain Item ID is required." }, { status: 400 });
        }

        console.log(`[LogScan] Strict verification for Item ${itemId} | Role: ${nextStage}`);

        // 2. Map role-based scan to target stage and expected current stage
        let targetStage: Stage;
        let expectedCurrent: Stage;

        if (nextStage === "transporter_handover") {
            targetStage = Stage.TransporterReady;
            expectedCurrent = Stage.VerifiedByAdmin; // Must be at 1 to go to 2
        } else if (nextStage === "distributor_handover") {
            targetStage = Stage.DistributorReady;
            expectedCurrent = Stage.InTransit; // Must be at 3 to go to 4
        } else if (nextStage === "beneficiary_delivery") {
            targetStage = Stage.Claimed; // Real claiming happens here or Stage 5 -> 6
            expectedCurrent = Stage.Distributed; // Must be at 5 to go to 6
        } else {
            return NextResponse.json({ error: "Invalid Role: Unrecognized scanner role." }, { status: 400 });
        }

        // 3. Verify current state in Database (The "Source of Truth")
        try {
            const [rows]: any = await dbPool.execute(
                "SELECT current_stage, id FROM applications WHERE blockchain_itemId = ?",
                [Number(itemId)]
            );

            if (!rows || rows.length === 0) {
                return NextResponse.json({ error: "Not Found: No blockchain item found with this ID." }, { status: 404 });
            }

            const current = rows[0].current_stage;
            const mySqlId = rows[0].application_id; // Fixed: id -> application_id

            // Strict progression check
            if (current >= targetStage) {
                return NextResponse.json({
                    success: true,
                    alreadyProcessed: true,
                    message: "This handover has already been recorded."
                });
            }

            if (current < expectedCurrent) {
                return NextResponse.json({
                    error: `Out of Sequence: This item is at stage ${current}, but needs Admin Verification (Stage ${expectedCurrent}) before this scan.`
                }, { status: 400 });
            }

            // 4. Update MySQL (Fixed: remove updated_at which doesn't exist)
            await dbPool.execute(
                "UPDATE applications SET current_stage = ? WHERE blockchain_itemId = ?",
                [targetStage, Number(itemId)]
            );

            // 5. Update JSON for immediate UI refresh
            let mySqlIdFromSub: number | undefined;
            try {
                const submissions = read();
                const sub = submissions.find(s =>
                    (itemId !== undefined && itemId !== null && s.blockchain_itemId === Number(itemId)) ||
                    (submissionId && s.id === submissionId)
                );
                if (sub && sub.applicationId) {
                    mySqlIdFromSub = Number(sub.applicationId);
                    console.log(`[LogScan] Linked JSON submission found: ${sub.id} -> MySQL AppId: ${mySqlIdFromSub}`);
                }

                let jsonUpdated = false;
                submissions.forEach(s => {
                    if (s.blockchain_itemId === Number(itemId)) {
                        s.current_stage = targetStage;
                        jsonUpdated = true;
                    }
                });
                if (jsonUpdated) write(submissions);
            } catch (e) { console.error("[LogScan] JSON lookup failed", e); }


            console.log(`[LogScan] Successfully advanced Item ${itemId} from ${current} to ${targetStage}`);

            return NextResponse.json({
                success: true,
                newStage: targetStage
            });

        } catch (dbErr: any) {
            console.error("[LogScan] Database error:", dbErr.message);
            return NextResponse.json({ error: "System synchronization error." }, { status: 500 });
        }

    } catch (error: any) {
        console.error("[LogScan] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

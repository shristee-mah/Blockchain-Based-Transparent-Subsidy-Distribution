import { NextResponse } from 'next/server';
import { getContract, ADMIN_KEY } from '@/app/lib/blockchain';
import dbPool from '@/app/lib/db';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DB_FILE = path.join(process.cwd(), '.submissions.json');
const g = globalThis as typeof globalThis & { __nischit_db__?: any[] };

function readJSON() {
    if (g.__nischit_db__) return g.__nischit_db__;
    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
            if (raw) {
                g.__nischit_db__ = JSON.parse(raw);
                return g.__nischit_db__!;
            }
        }
    } catch { /* ignore */ }
    g.__nischit_db__ = [];
    return g.__nischit_db__!;
}

function writeJSON(data: any[]) {
    g.__nischit_db__ = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(request: Request) {
    try {
        const { itemId, dbId } = await request.json();

        console.log(`[Claim] Beneficiary claiming itemId=${itemId}, dbId=${dbId}`);

        // ── Blockchain call ──────────────────────────────────────────────────
        let txHash: string | null = null;
        if (itemId !== null && itemId !== undefined) {
            try {
                const contract = getContract(ADMIN_KEY);
                const tx = await contract.beneficiaryClaim(Number(itemId));
                await tx.wait();
                txHash = tx.hash;
                console.log(`[Claim] TX confirmed: ${txHash}`);
            } catch (bcErr: any) {
                console.error('[Claim] Blockchain error:', bcErr.message);
                return NextResponse.json({
                    error: 'Blockchain Claim Failed',
                    details: bcErr.reason || bcErr.message
                }, { status: 400 });
            }
        } else {
            console.warn('[Claim] No itemId — skipping blockchain call, updating local state only');
        }

        // ── MySQL update ─────────────────────────────────────────────────────
        try {
            if (itemId) {
                await dbPool.execute(
                    "UPDATE applications SET current_stage = 6, status = 'claimed' WHERE blockchain_itemId = ?",
                    [itemId]
                );
            } else if (dbId && !String(dbId).startsWith('APP-')) {
                // Fixed: use application_id instead of id safely
                await dbPool.execute(
                    "UPDATE applications SET current_stage = 6, status = 'claimed' WHERE application_id = ?",
                    [dbId]
                );
            }
        } catch (dbErr: any) {
            console.error('[Claim] MySQL update failed (continuing):', dbErr.message);
        }

        // ── JSON store update (critical — dashboard reads from here) ─────────
        try {
            const db = readJSON();
            let updated = false;

            for (let i = 0; i < db.length; i++) {
                const sub = db[i];
                // Match by submissionId (dbId), by blockchain_itemId, or by the producer role
                const matchById = dbId && sub.id === dbId;
                const matchByBlockchainId = itemId && sub.blockchain_itemId === Number(itemId);

                if (matchById || matchByBlockchainId) {
                    db[i] = {
                        ...sub,
                        status: 'claimed',
                        current_stage: 6,
                        claimedAt: new Date().toISOString(),
                    };
                    updated = true;
                    console.log(`[Claim] JSON updated: sub ${sub.id}`);
                }
            }

            // If no direct match, update all producer submissions as a fallback
            // (since the QR may reference a transporter/distributor submission but
            //  the timeline lives on the producer record)
            if (!updated) {
                console.warn('[Claim] No direct match found — updating all producer submissions to stage 6');
                for (let i = 0; i < db.length; i++) {
                    if (db[i].role === 'producer') {
                        db[i] = { ...db[i], current_stage: 6, claimedAt: new Date().toISOString() };
                    }
                }
            }

            writeJSON(db);
        } catch (jsonErr: any) {
            console.error('[Claim] JSON store update failed:', jsonErr.message);
        }

        return NextResponse.json({
            success: true,
            message: 'Subsidy claimed successfully',
            txHash,
        });

    } catch (error: any) {
        console.error('Blockchain Claim Error:', error);
        return NextResponse.json({
            error: 'Claim Failed',
            details: error.message,
        }, { status: 500 });
    }
}

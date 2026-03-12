import { NextResponse } from 'next/server';
import { getContract } from '@/app/lib/blockchain';
import dbPool from '@/app/lib/db';
import fs from 'fs';
import path from 'path';
import { create } from 'ipfs-http-client';

const DB_FILE = path.join(process.cwd(), '.submissions.json');

function readJSON() {
    const g = globalThis as typeof globalThis & { __nischit_db__?: any[] };
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

function generateReceiptId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `RCPT-${timestamp}-${random}`.toUpperCase();
}

async function uploadToIPFS(data: any): Promise<string> {
    try {
        const client = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            headers: {
                authorization: `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`
            }
        });

        const result = await client.add(JSON.stringify(data, null, 2));
        return result.cid.toString();
    } catch (error: any) {
        console.error('[IPFS] Upload failed:', error.message);
        // Fallback to mock CID for development
        return `QmMock${Date.now()}`;
    }
}

export async function POST(request: Request) {
    try {
        const { itemId, dbId } = await request.json();

        console.log(`[Receipt] Generating receipt for itemId=${itemId}, dbId=${dbId}`);

        // Get all submissions related to this claim
        const db = readJSON();
        const relatedSubmissions = db.filter(sub => 
            (itemId && sub.blockchain_itemId === Number(itemId)) ||
            (dbId && sub.id === dbId) ||
            (itemId && db.some(s => s.blockchain_itemId === Number(itemId) && s.phone === sub.phone))
        );

        if (relatedSubmissions.length === 0) {
            return NextResponse.json({ error: 'No related submissions found' }, { status: 404 });
        }

        // Get beneficiary info (producer submission)
        const beneficiary = relatedSubmissions.find(s => s.role === 'producer');
        if (!beneficiary) {
            return NextResponse.json({ error: 'Beneficiary information not found' }, { status: 404 });
        }

        // Get blockchain logs for detailed timeline
        let blockchainLogs: any[] = [];
        try {
            const contract = getContract();
            
            // Get ItemCreated events
            const createdFilter = contract.filters.ItemCreated();
            const createdEvents = await contract.queryFilter(createdFilter, -10000, 'latest');
            
            for (const event of createdEvents) {
                if ('args' in event && event.args?.itemId?.toString() === itemId?.toString()) {
                    blockchainLogs.push({
                        eventName: event.eventName || 'ItemCreated',
                        transactionHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        timestamp: new Date().toISOString(),
                        args: event.args
                    });
                }
            }

            // Get ItemVerified events
            const verifiedFilter = contract.filters.ItemVerified();
            const verifiedEvents = await contract.queryFilter(verifiedFilter, -10000, 'latest');
            
            for (const event of verifiedEvents) {
                if ('args' in event && event.args?.itemId?.toString() === itemId?.toString()) {
                    blockchainLogs.push({
                        eventName: event.eventName || 'ItemVerified',
                        transactionHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        timestamp: new Date().toISOString(),
                        args: event.args
                    });
                }
            }
        } catch (error: any) {
            console.warn('[Receipt] Blockchain logs fetch failed:', error.message);
        }

        // Build node handover timeline
        const nodeHandovers = relatedSubmissions
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(sub => ({
                nodeId: sub.id,
                nodeName: sub.name,
                nodeRole: sub.role,
                nodeDistrict: sub.district,
                handoverTime: sub.createdAt,
                approvedAt: sub.approvedAt,
                status: sub.status,
                blockchainItemId: sub.blockchain_itemId,
                ipfsCid: sub.cid
            }));

        // Generate comprehensive receipt
        const receiptId = generateReceiptId();
        const receiptData = {
            receiptId,
            itemId: Number(itemId),
            beneficiary: {
                name: beneficiary.name,
                district: beneficiary.district,
                phone: beneficiary.phone,
                applicationId: beneficiary.id
            },
            claimDetails: {
                claimedAt: new Date().toISOString(),
                claimTransactionHash: blockchainLogs.find(log => log.eventName === 'SubsidyClaimed')?.transactionHash,
                stage: 6,
                status: 'claimed'
            },
            nodeHandovers,
            blockchainLogs,
            metadata: {
                generatedAt: new Date().toISOString(),
                systemVersion: '1.0.0',
                receiptType: 'comprehensive_claim_receipt'
            }
        };

        // Upload to IPFS
        const ipfsCid = await uploadToIPFS(receiptData);
        console.log(`[Receipt] Uploaded to IPFS: ${ipfsCid}`);

        // Store receipt reference in database
        try {
            await dbPool.execute(
                `INSERT INTO claim_receipts (receipt_id, item_id, beneficiary_phone, ipfs_cid, receipt_data, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [receiptId, itemId, beneficiary.phone, ipfsCid, JSON.stringify(receiptData)]
            );
        } catch (dbError: any) {
            console.error('[Receipt] Database storage failed:', dbError.message);
        }

        // Update JSON store with receipt info
        try {
            const db = readJSON();
            for (let i = 0; i < db.length; i++) {
                if (db[i].blockchain_itemId === Number(itemId) || db[i].id === dbId) {
                    db[i] = {
                        ...db[i],
                        receiptId,
                        receiptIpfsCid: ipfsCid,
                        claimedAt: new Date().toISOString()
                    };
                }
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        } catch (jsonError: any) {
            console.error('[Receipt] JSON store update failed:', jsonError.message);
        }

        return NextResponse.json({
            success: true,
            receiptId,
            ipfsCid,
            receiptData
        });

    } catch (error: any) {
        console.error('[Receipt] Generation failed:', error);
        return NextResponse.json({
            error: 'Receipt generation failed',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const receiptId = searchParams.get('receiptId');
        const itemId = searchParams.get('itemId');

        if (!receiptId && !itemId) {
            return NextResponse.json({ error: 'Missing receiptId or itemId' }, { status: 400 });
        }

        // Try database first
        if (receiptId) {
            try {
                const [rows] = await dbPool.execute(
                    'SELECT * FROM claim_receipts WHERE receipt_id = ?',
                    [receiptId]
                ) as any[];

                if (rows.length > 0) {
                    return NextResponse.json({
                        success: true,
                        receipt: rows[0]
                    });
                }
            } catch (dbError: any) {
                console.warn('[Receipt] DB lookup failed:', dbError.message);
            }
        }

        // Fallback to JSON store
        const db = readJSON();
        const matchingSubmission = db.find(sub => 
            (receiptId && sub.receiptId === receiptId) ||
            (itemId && sub.blockchain_itemId === Number(itemId))
        );

        if (!matchingSubmission) {
            return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            receipt: {
                receiptId: matchingSubmission.receiptId,
                ipfsCid: matchingSubmission.receiptIpfsCid,
                claimedAt: matchingSubmission.claimedAt,
                submission: matchingSubmission
            }
        });

    } catch (error: any) {
        console.error('[Receipt] Fetch failed:', error);
        return NextResponse.json({
            error: 'Failed to fetch receipt',
            details: error.message
        }, { status: 500 });
    }
}

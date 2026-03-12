import { NextResponse } from 'next/server';
import { getContract } from '@/app/lib/blockchain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/blockchain/logEvent
 *
 * Fetches and returns all blockchain events for a given itemId,
 * grouped by event type, with timestamps and transaction hashes.
 *
 * Body: { itemId: number }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { itemId } = body;

        if (itemId === undefined || itemId === null) {
            return NextResponse.json({ error: 'Missing itemId in request body' }, { status: 400 });
        }

        const itemIdNum = Number(itemId);
        if (isNaN(itemIdNum)) {
            return NextResponse.json({ error: 'itemId must be a valid number' }, { status: 400 });
        }

        const contract = getContract();

        console.log(`[logEvent] Fetching all events for itemId=${itemIdNum}`);

        // Fetch all event types for this item
        const [
            itemCreatedEvents,
            itemVerifiedEvents,
            documentUploadedEvents,
            subsidyClaimedEvents,
        ] = await Promise.all([
            contract.queryFilter(contract.filters.ItemCreated(itemIdNum), 0, 'latest'),
            contract.queryFilter(contract.filters.ItemVerified(itemIdNum), 0, 'latest'),
            contract.queryFilter(contract.filters.DocumentUploaded(itemIdNum), 0, 'latest'),
            contract.queryFilter(contract.filters.SubsidyClaimed(itemIdNum), 0, 'latest'),
        ]);

        const allEvents = [
            ...itemCreatedEvents,
            ...itemVerifiedEvents,
            ...documentUploadedEvents,
            ...subsidyClaimedEvents,
        ].sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
            return a.index - b.index;
        });

        // Resolve blocks and parse args in parallel
        const parsedLogs = await Promise.all(
            allEvents.map(async (event: any) => {
                const block = await event.getBlock();
                const logData = contract.interface.parseLog(event);

                let parsedArgs: Record<string, any> = {};
                if (logData?.args) {
                    logData.args.forEach((val: any, i: number) => {
                        const name = logData.fragment.inputs[i]?.name ?? i.toString();
                        parsedArgs[name] = typeof val === 'bigint' ? val.toString() : val;
                    });
                }

                const stageName = getStageName(parsedArgs);

                return {
                    eventName: event.eventName || logData?.name || 'Unknown',
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                    timestamp: block ? block.timestamp * 1000 : Date.now(),
                    args: parsedArgs,
                    stageName,
                };
            })
        );

        console.log(`[logEvent] Found ${parsedLogs.length} event(s) for itemId=${itemIdNum}`);
        parsedLogs.forEach(log => {
            const time = new Date(log.timestamp).toLocaleString('en-US');
            console.log(`  [${log.eventName}] Block #${log.blockNumber} @ ${time} | TX: ${log.transactionHash}`);
            if (log.stageName) console.log(`    Stage: ${log.stageName}`);
        });

        return NextResponse.json({
            itemId: itemIdNum,
            totalEvents: parsedLogs.length,
            logs: parsedLogs,
        });

    } catch (error: any) {
        console.error('[logEvent] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/blockchain/logEvent?itemId=<id>
 * Convenience alias for the POST route using query params.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
        return NextResponse.json({ error: 'Missing itemId query parameter' }, { status: 400 });
    }

    // Reuse POST logic by creating a synthetic request body
    const syntheticRequest = new Request(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: Number(itemId) }),
    });

    return POST(syntheticRequest);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_NAMES: Record<number, string> = {
    0: 'Created',
    1: 'VerifiedByAdmin',
    2: 'TransporterReady',
    3: 'InTransit',
    4: 'DistributorReady',
    5: 'Distributed',
    6: 'Claimed',
    7: 'Cancelled',
};

function getStageName(args: Record<string, any>): string | undefined {
    const stage = args['stage'] ?? args['newStage'];
    if (stage !== undefined) {
        return STAGE_NAMES[Number(stage)] ?? `Stage ${stage}`;
    }
    return undefined;
}

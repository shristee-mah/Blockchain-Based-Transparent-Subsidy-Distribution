import { NextResponse } from 'next/server';
import { getContract } from "@/app/lib/blockchain";
import { ethers } from "ethers";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

        if (!itemId) {
            return NextResponse.json({ error: 'Missing itemId parameter' }, { status: 400 });
        }

        const contract = getContract();
        const itemIdNum = Number(itemId);

        // Fetch all relevant events
        const filters = [
            contract.filters.ItemCreated(itemIdNum),
            contract.filters.ItemVerified(itemIdNum),
            contract.filters.DocumentUploaded(itemIdNum),
            contract.filters.SubsidyClaimed(itemIdNum)
        ];

        const allEvents = await Promise.all(
            filters.map(filter => contract.queryFilter(filter, 0, 'latest'))
        );

        // Flatten and sort by blockNumber then logIndex
        const parsedEvents = allEvents.flat().sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
            return a.index - b.index;
        });

        // Resolve timestamps
        const logsWithTimestamps = await Promise.all(
            parsedEvents.map(async (event: any) => {
                const block = await event.getBlock();
                const logData = contract.interface.parseLog(event);

                // Reconstruct log safely
                let parsedArgs = {};
                if (logData && logData.args) {
                    const argNames = logData.args.map((_, i) => logData.fragment.inputs[i]?.name || i.toString());
                    parsedArgs = Object.fromEntries(
                        logData.args.map((val, i) => [
                            argNames[i],
                            typeof val === 'bigint' ? val.toString() : val
                        ])
                    );
                }

                return {
                    eventName: event.eventName || (logData ? logData.name : "Unknown"),
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                    timestamp: block ? block.timestamp * 1000 : Date.now(),
                    args: parsedArgs
                };
            })
        );

        return NextResponse.json(logsWithTimestamps);
    } catch (error) {
        console.error('API GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

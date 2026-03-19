import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import mysql from 'mysql2/promise';

// Configuration
const config = {
    blockchain: {
        rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
        contractAddress: process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'subsidy_system'
    }
};

// Contract ABI
const CONTRACT_ABI = [
    'function getItem(uint256 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))',
    'function getItemByBytes32(bytes32 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))',
    'function itemCount() external view returns (uint256)',
    'function itemIdToUint(bytes32 itemId) external view returns (uint256)',
    'event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)'
];

class BlockchainSynchronizer {
    private provider: ethers.JsonRpcProvider;
    private contract: ethers.Contract;
    private dbConnection: mysql.Connection | null = null;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        this.contract = new ethers.Contract(
            config.blockchain.contractAddress,
            CONTRACT_ABI,
            this.provider
        );
    }

    async initialize() {
        this.dbConnection = await mysql.createConnection(config.database);
    }

    async cleanup() {
        if (this.dbConnection) {
            await this.dbConnection.end();
            this.dbConnection = null;
        }
    }

    // Synchronize single item from blockchain (SSoT principle)
    async syncItemFromBlockchain(itemIdUint: string): Promise<{ success: boolean; message: string; data?: any }> {
        if (!this.dbConnection) {
            throw new Error('Database connection not initialized');
        }

        try {
            // Get item from blockchain
            const blockchainItem = await this.contract.getItem(itemIdUint);
            
            // Get current item from database
            const [dbItems] = await this.dbConnection.execute(
                'SELECT * FROM items WHERE item_id_uint = ?',
                [itemIdUint]
            );

            const dbItem = (dbItems as any[])[0];

            // Check for conflicts
            const conflicts = await this.detectConflicts(dbItem, blockchainItem);

            if (conflicts.length > 0) {
                // Log conflicts and override with blockchain data
                await this.resolveConflicts(itemIdUint, conflicts, blockchainItem);
            }

            // Update database with blockchain data
            await this.updateDatabaseItem(itemIdUint, blockchainItem);

            return {
                success: true,
                message: 'Item synchronized successfully from blockchain',
                data: {
                    itemId: itemIdUint,
                    blockchainData: blockchainItem,
                    conflictsResolved: conflicts.length
                }
            };

        } catch (error: any) {
            console.error('Error syncing item from blockchain:', error);
            return {
                success: false,
                message: `Failed to sync item: ${error.message}`
            };
        }
    }

    // Synchronize all items from blockchain
    async syncAllItemsFromBlockchain(): Promise<{ success: boolean; message: string; synced: number; conflicts: number }> {
        try {
            const itemCount = await this.contract.itemCount();
            let syncedCount = 0;
            let totalConflicts = 0;

            for (let i = 1; i <= Number(itemCount); i++) {
                const result = await this.syncItemFromBlockchain(i.toString());
                if (result.success) {
                    syncedCount++;
                    if (result.data?.conflictsResolved > 0) {
                        totalConflicts += result.data.conflictsResolved;
                    }
                }
            }

            return {
                success: true,
                message: `Synced ${syncedCount} items from blockchain`,
                synced: syncedCount,
                conflicts: totalConflicts
            };

        } catch (error: any) {
            console.error('Error syncing all items from blockchain:', error);
            return {
                success: false,
                message: `Failed to sync items: ${error.message}`,
                synced: 0,
                conflicts: 0
            };
        }
    }

    private async detectConflicts(dbItem: any, blockchainItem: any): Promise<any[]> {
        if (!dbItem) return [];

        const conflicts = [];

        // Check stage conflict
        if (dbItem.current_stage !== blockchainItem.stage) {
            conflicts.push({
                type: 'STAGE_MISMATCH',
                backendValue: dbItem.current_stage,
                blockchainValue: blockchainItem.stage.toString()
            });
        }

        // Check claimed status conflict
        if (dbItem.claimed !== blockchainItem.claimed) {
            conflicts.push({
                type: 'CLAIMED_STATUS',
                backendValue: dbItem.claimed,
                blockchainValue: blockchainItem.claimed
            });
        }

        // Check IPFS hash conflict
        if (dbItem.current_ipfs_hash !== blockchainItem.currentIpfsHash) {
            conflicts.push({
                type: 'IPFS_HASH_MISMATCH',
                backendValue: dbItem.current_ipfs_hash,
                blockchainValue: blockchainItem.currentIpfsHash
            });
        }

        return conflicts;
    }

    private async resolveConflicts(itemIdUint: string, conflicts: any[], blockchainItem: any): Promise<void> {
        if (!this.dbConnection) {
            throw new Error('Database connection not initialized');
        }

        for (const conflict of conflicts) {
            await this.dbConnection.execute(`
                INSERT INTO conflict_resolution_log (
                    item_id_uint, conflict_type, backend_value, blockchain_value,
                    resolution_action, resolved_by, block_number, transaction_hash
                ) VALUES (?, ?, ?, ?, 'OVERRIDE_WITH_BLOCKCHAIN', 'SYSTEM', 0, NULL)
            `, [
                itemIdUint,
                conflict.type,
                JSON.stringify(conflict.backendValue),
                JSON.stringify(conflict.blockchainValue)
            ]);
        }
    }

    private async updateDatabaseItem(itemIdUint: string, blockchainItem: any): Promise<void> {
        if (!this.dbConnection) {
            throw new Error('Database connection not initialized');
        }

        await this.dbConnection.execute(`
            INSERT INTO items (
                item_id_uint, item_id_bytes32, beneficiary_address, current_stage,
                claimed, current_ipfs_hash, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            item_id_bytes32 = VALUES(item_id_bytes32),
            beneficiary_address = VALUES(beneficiary_address),
            current_stage = VALUES(current_stage),
            claimed = VALUES(claimed),
            current_ipfs_hash = VALUES(current_ipfs_hash),
            updated_at = NOW()
        `, [
            itemIdUint,
            blockchainItem.itemId,
            blockchainItem.beneficiary,
            blockchainItem.stage,
            blockchainItem.claimed,
            blockchainItem.currentIpfsHash
        ]);
    }

    // Get recent transactions for audit log
    async getRecentTransactions(limit: number = 10): Promise<any[]> {
        if (!this.dbConnection) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this.dbConnection.execute(`
                SELECT 
                    bt.item_id_bytes32,
                    bt.actor_address,
                    bt.action,
                    bt.transaction_hash,
                    bt.block_number,
                    bt.created_at,
                    i.beneficiary_address,
                    i.current_stage,
                    i.claimed
                FROM blockchain_transactions bt
                LEFT JOIN items i ON bt.item_id_bytes32 = i.item_id_bytes32
                ORDER BY bt.block_number DESC, bt.created_at DESC
                LIMIT ?
            `, [limit]);

            return rows as any[];
        } catch (error) {
            console.error('Error fetching recent transactions:', error);
            return [];
        }
    }

    // Get item by bytes32 ID (blockchain primary key)
    async getItemByBytes32(itemIdBytes32: string): Promise<any> {
        if (!this.dbConnection) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this.dbConnection.execute(`
                SELECT * FROM items WHERE item_id_bytes32 = ?
            `, [itemIdBytes32]);

            return (rows as any[])[0] || null;
        } catch (error) {
            console.error('Error fetching item by bytes32:', error);
            return null;
        }
    }

    // Validate data integrity between blockchain and database
    async validateDataIntegrity(): Promise<{ valid: boolean; issues: any[] }> {
        if (!this.dbConnection) {
            throw new Error('Database connection not initialized');
        }

        try {
            const itemCount = await this.contract.itemCount();
            const issues = [];

            for (let i = 1; i <= Number(itemCount); i++) {
                const blockchainItem = await this.contract.getItem(i.toString());
                const [dbItems] = await this.dbConnection.execute(
                    'SELECT * FROM items WHERE item_id_uint = ?',
                    [i.toString()]
                );

                const dbItem = (dbItems as any[])[0];

                if (!dbItem) {
                    issues.push({
                        type: 'MISSING_IN_DATABASE',
                        itemId: i.toString(),
                        blockchainData: blockchainItem
                    });
                } else {
                    const conflicts = await this.detectConflicts(dbItem, blockchainItem);
                    if (conflicts.length > 0) {
                        issues.push({
                            type: 'DATA_CONFLICT',
                            itemId: i.toString(),
                            conflicts: conflicts
                        });
                    }
                }
            }

            return {
                valid: issues.length === 0,
                issues: issues
            };

        } catch (error: any) {
            console.error('Error validating data integrity:', error);
            return {
                valid: false,
                issues: [{ type: 'VALIDATION_ERROR', error: error.message }]
            };
        }
    }
}

// API Routes
export async function POST(request: NextRequest) {
    const synchronizer = new BlockchainSynchronizer();

    try {
        await synchronizer.initialize();

        const body = await request.json();
        const { action, itemId, limit } = body;

        switch (action) {
            case 'sync_item':
                if (!itemId) {
                    return NextResponse.json(
                        { success: false, message: 'itemId is required' },
                        { status: 400 }
                    );
                }
                const itemResult = await synchronizer.syncItemFromBlockchain(itemId);
                return NextResponse.json(itemResult);

            case 'sync_all':
                const allResult = await synchronizer.syncAllItemsFromBlockchain();
                return NextResponse.json(allResult);

            case 'validate_integrity':
                const integrityResult = await synchronizer.validateDataIntegrity();
                return NextResponse.json(integrityResult);

            default:
                return NextResponse.json(
                    { success: false, message: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (error: any) {
        console.error('Blockchain sync API error:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    } finally {
        await synchronizer.cleanup();
    }
}

export async function GET(request: NextRequest) {
    const synchronizer = new BlockchainSynchronizer();

    try {
        await synchronizer.initialize();

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const itemId = searchParams.get('itemId');
        const limit = parseInt(searchParams.get('limit') || '10');

        switch (action) {
            case 'recent_transactions':
                const transactions = await synchronizer.getRecentTransactions(limit);
                return NextResponse.json({
                    success: true,
                    data: transactions
                });

            case 'get_item':
                if (!itemId) {
                    return NextResponse.json(
                        { success: false, message: 'itemId is required' },
                        { status: 400 }
                    );
                }
                const item = await synchronizer.getItemByBytes32(itemId);
                return NextResponse.json({
                    success: true,
                    data: item
                });

            case 'validate_integrity':
                const integrityResult = await synchronizer.validateDataIntegrity();
                return NextResponse.json(integrityResult);

            default:
                return NextResponse.json(
                    { success: false, message: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (error: any) {
        console.error('Blockchain sync API error:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    } finally {
        await synchronizer.cleanup();
    }
}

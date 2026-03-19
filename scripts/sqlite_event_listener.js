const { ethers } = require("hardhat");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteEventListener {
    constructor() {
        this.db = null;
        this.contract = null;
        this.isListening = false;
    }

    async initialize() {
        try {
            // Initialize SQLite database
            const dbPath = path.join(__dirname, '..', 'blockchain_events.db');
            this.db = new sqlite3.Database(dbPath);
            
            // Create tables if they don't exist
            await this.createTables();
            
            // Initialize blockchain connection
            const contractAddress = process.env.CONTRACT_ADDRESS || "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";
            this.contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            
            console.log('✅ SQLite Event Listener initialized successfully');
            console.log(`📁 Database: ${dbPath}`);
            console.log(`📋 Contract: ${contractAddress}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize SQLite Event Listener:', error);
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const createTablesSQL = `
                CREATE TABLE IF NOT EXISTS blockchain_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    item_id_bytes32 TEXT NOT NULL,
                    actor_address TEXT NOT NULL,
                    action TEXT NOT NULL,
                    transaction_hash TEXT NOT NULL UNIQUE,
                    block_number INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    item_id_uint TEXT NOT NULL UNIQUE,
                    item_id_bytes32 TEXT NOT NULL UNIQUE,
                    beneficiary_address TEXT NOT NULL,
                    current_stage INTEGER NOT NULL DEFAULT 0,
                    claimed BOOLEAN NOT NULL DEFAULT FALSE,
                    claimed_by TEXT,
                    claimed_at DATETIME,
                    current_ipfs_hash TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS event_listener_state (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    listener_name TEXT NOT NULL UNIQUE,
                    block_number INTEGER NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;

            this.db.exec(createTablesSQL, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async startListening() {
        if (this.isListening) {
            console.log('⚠️ Listener is already running');
            return;
        }

        this.isListening = true;
        console.log('🎧 Starting to listen for blockchain events...');

        // Listen for new events
        this.contract.on('TransactionLogged', async (itemId, actor, action, event) => {
            await this.handleTransactionLoggedEvent(itemId, actor, action, event);
        });

        this.contract.on('ItemCreated', async (itemId, beneficiary, ipfsHash, event) => {
            await this.handleItemCreatedEvent(itemId, beneficiary, ipfsHash, event);
        });

        this.contract.on('ItemVerified', async (itemId, newStage, event) => {
            await this.handleItemVerifiedEvent(itemId, newStage, event);
        });

        this.contract.on('SubsidyClaimed', async (itemId, beneficiary, claimedBy, event) => {
            await this.handleSubsidyClaimedEvent(itemId, beneficiary, claimedBy, event);
        });

        // Process historical events
        await this.processHistoricalEvents();
        
        console.log('✅ Event listener started successfully');
    }

    async processHistoricalEvents() {
        try {
            const latestBlock = await ethers.provider.getBlockNumber();
            const fromBlock = await this.getLastProcessedBlock();

            console.log(`📊 Processing events from block ${fromBlock} to ${latestBlock}`);

            // Get all events
            const allEvents = await this.contract.queryFilter("*", fromBlock, latestBlock);
            
            for (const event of allEvents) {
                if (event.event === 'TransactionLogged') {
                    await this.handleTransactionLoggedEvent(
                        event.args.itemId,
                        event.args.actor,
                        event.args.action,
                        event
                    );
                } else if (event.event === 'ItemCreated') {
                    await this.handleItemCreatedEvent(
                        event.args.itemId,
                        event.args.beneficiary,
                        event.args.ipfsHash,
                        event
                    );
                } else if (event.event === 'ItemVerified') {
                    await this.handleItemVerifiedEvent(
                        event.args.itemId,
                        event.args.newStage,
                        event
                    );
                } else if (event.event === 'SubsidyClaimed') {
                    await this.handleSubsidyClaimedEvent(
                        event.args.itemId,
                        event.args.beneficiary,
                        event.args.claimedBy,
                        event
                    );
                }
            }

            await this.saveLastProcessedBlock(latestBlock);
            console.log(`✅ Processed ${allEvents.length} historical events`);

        } catch (error) {
            console.error('❌ Error processing historical events:', error);
        }
    }

    async handleTransactionLoggedEvent(itemId, actor, action, event) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO blockchain_transactions 
                (item_id_bytes32, actor_address, action, transaction_hash, block_number, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;
            
            this.db.run(sql, [itemId, actor, action, event.transactionHash, event.blockNumber], function(err) {
                if (err) {
                    console.error('❌ Error storing transaction:', err);
                    reject(err);
                } else {
                    console.log(`📝 Stored: ${action} by ${actor} for item ${itemId}`);
                    resolve();
                }
            });
        });
    }

    async handleItemCreatedEvent(itemId, beneficiary, ipfsHash, event) {
        try {
            const itemDetails = await this.contract.getItem(itemId);
            
            return new Promise((resolve, reject) => {
                const sql = `
                    INSERT OR REPLACE INTO items 
                    (item_id_uint, item_id_bytes32, beneficiary_address, current_stage, claimed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `;
                
                this.db.run(sql, [itemId.toString(), itemDetails.itemId, beneficiary, 0, false], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('❌ Error handling ItemCreated event:', error);
        }
    }

    async handleItemVerifiedEvent(itemId, newStage, event) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE items 
                SET current_stage = ?, updated_at = datetime('now')
                WHERE item_id_uint = ?
            `;
            
            this.db.run(sql, [newStage, itemId.toString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async handleSubsidyClaimedEvent(itemId, beneficiary, claimedBy, event) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE items 
                SET current_stage = 6, claimed = 1, claimed_by = ?, claimed_at = datetime('now'), updated_at = datetime('now')
                WHERE item_id_uint = ?
            `;
            
            this.db.run(sql, [claimedBy, itemId.toString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getLastProcessedBlock() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT block_number FROM event_listener_state WHERE listener_name = ?',
                ['transaction_logged_listener'],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.block_number : 0);
                    }
                }
            );
        });
    }

    async saveLastProcessedBlock(blockNumber) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO event_listener_state (listener_name, block_number, updated_at)
                VALUES (?, ?, datetime('now'))
            `;
            
            this.db.run(sql, ['transaction_logged_listener', blockNumber], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getRecentTransactions(limit = 10) {
        return new Promise((resolve, reject) => {
            const sql = `
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
            `;
            
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    stopListening() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        this.isListening = false;
        console.log('🛑 Event listener stopped');
    }

    cleanup() {
        this.stopListening();
        if (this.db) {
            this.db.close();
        }
        console.log('🧹 Cleanup completed');
    }
}

// Main execution
async function main() {
    const listener = new SQLiteEventListener();

    try {
        await listener.initialize();
        await listener.startListening();

        // Show recent transactions
        const recentTxs = await listener.getRecentTransactions(10);
        console.log('\n📊 Recent Transactions:');
        console.log('=' .repeat(80));
        
        if (recentTxs.length === 0) {
            console.log('❌ No transactions found in database');
        } else {
            recentTxs.forEach((tx, index) => {
                console.log(`${index + 1}. ${tx.action} by ${tx.actor_address}`);
                console.log(`   Item: ${tx.item_id_bytes32}`);
                console.log(`   Block: ${tx.block_number}`);
                console.log(`   Time: ${tx.created_at}`);
                console.log('');
            });
        }

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n👋 Received SIGINT, shutting down gracefully...');
            await listener.cleanup();
            process.exit(0);
        });

        console.log('🎉 SQLite Event Listener is running. Press Ctrl+C to stop.');
        
    } catch (error) {
        console.error('❌ Failed to start SQLite event listener:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = SQLiteEventListener;

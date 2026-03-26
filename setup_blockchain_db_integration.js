const { ethers } = require("ethers");
const mysql = require('mysql2/promise');

class BlockchainDatabaseIntegration {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.dbConnection = null;
        this.isRunning = false;
    }

    async initialize() {
        try {
            console.log("🚀 Initializing Blockchain-Database Integration...");
            
            // 1. Connect to blockchain
            this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            
            const contractABI = [
                "event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)",
                "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
                "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
                "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
                "event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy)",
                "function getItem(uint256 itemId) view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))",
                "function itemIdToUint(bytes32 itemId) view returns (uint256)"
            ];
            
            this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
            console.log("✅ Connected to blockchain contract");
            
            // 2. Connect to database
            try {
                this.dbConnection = await mysql.createConnection({
                    host: 'localhost',
                    user: 'root',
                    password: '',
                    database: 'subsidy_system'
                });
                console.log("✅ Connected to database");
            } catch (dbError) {
                console.error("❌ Database connection failed:", dbError.message);
                console.log("💡 Please ensure MySQL is running and the database exists");
                throw dbError;
            }
            
            // 3. Setup event listeners
            this.setupEventListeners();
            
            // 4. Process existing blockchain events
            await this.processExistingEvents();
            
            console.log("🎯 Blockchain-Database Integration is now ACTIVE!");
            console.log("📊 All blockchain events will be stored in the database");
            console.log("🔄 Beneficiary timeline will be updated automatically");
            
        } catch (error) {
            console.error("❌ Initialization failed:", error.message);
            throw error;
        }
    }

    setupEventListeners() {
        console.log("📡 Setting up blockchain event listeners...");
        
        // Listen to all events
        this.contract.on("*", async (event) => {
            await this.handleBlockchainEvent(event);
        });
        
        // Specific event listeners
        this.contract.on("TransactionLogged", async (itemId, actor, action, event) => {
            await this.handleTransactionLogged(itemId, actor, action, event);
        });
        
        this.contract.on("ItemCreated", async (itemId, beneficiary, ipfsHash, event) => {
            await this.handleItemCreated(itemId, beneficiary, ipfsHash, event);
        });
        
        this.contract.on("ItemVerified", async (itemId, newStage, event) => {
            await this.handleItemVerified(itemId, newStage, event);
        });
        
        this.contract.on("SubsidyClaimed", async (itemId, beneficiary, claimedBy, event) => {
            await this.handleSubsidyClaimed(itemId, beneficiary, claimedBy, event);
        });
    }

    async handleBlockchainEvent(event) {
        try {
            console.log(`🔥 Blockchain Event: ${event.event || 'UNKNOWN'}`);
            
            if (event.args && Object.keys(event.args).length > 0) {
                console.log("📊 Event Data:");
                Object.keys(event.args).forEach(key => {
                    const value = event.args[key].toString();
                    console.log(`   ${key}: ${value}`);
                });
            }
            console.log("─".repeat(50));
        } catch (error) {
            console.error("❌ Error handling blockchain event:", error.message);
        }
    }

    async handleTransactionLogged(itemId, actor, action, event) {
        try {
            console.log(`📝 Storing TransactionLogged: ${action} by ${actor}`);
            
            // Store in blockchain_transactions table
            await this.dbConnection.execute(`
                INSERT INTO blockchain_transactions 
                (item_id_bytes32, actor_address, action, transaction_hash, block_number, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                actor_address = VALUES(actor_address),
                action = VALUES(action),
                block_number = VALUES(block_number)
            `, [itemId, actor, action, event.transactionHash, event.blockNumber]);
            
            console.log("✅ TransactionLogged stored in database");
            
        } catch (error) {
            console.error("❌ Error storing TransactionLogged:", error.message);
        }
    }

    async handleItemCreated(itemId, beneficiary, ipfsHash, event) {
        try {
            console.log(`🆕 Storing ItemCreated: Item ${itemId} for ${beneficiary}`);
            
            // Get the bytes32 itemId from the contract
            const itemDetails = await this.contract.getItem(itemId);
            
            // Store in items table
            await this.dbConnection.execute(`
                INSERT INTO items 
                (item_id_uint, item_id_bytes32, beneficiary_address, current_stage, claimed, current_ipfs_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                item_id_bytes32 = VALUES(item_id_bytes32),
                beneficiary_address = VALUES(beneficiary_address),
                current_ipfs_hash = VALUES(current_ipfs_hash),
                updated_at = NOW()
            `, [itemId.toString(), itemDetails.itemId, beneficiary, 0, false, ipfsHash]);
            
            // Also store as transaction
            await this.handleTransactionLogged(itemDetails.itemId, beneficiary, 'CREATE_ITEM', event);
            
            console.log("✅ ItemCreated stored in database");
            
        } catch (error) {
            console.error("❌ Error storing ItemCreated:", error.message);
        }
    }

    async handleItemVerified(itemId, newStage, event) {
        try {
            console.log(`✅ Updating ItemVerified: Item ${itemId} to stage ${newStage}`);
            
            // Update item stage
            await this.dbConnection.execute(`
                UPDATE items 
                SET current_stage = ?, updated_at = NOW()
                WHERE item_id_uint = ?
            `, [newStage, itemId.toString()]);
            
            console.log("✅ ItemVerified updated in database");
            
        } catch (error) {
            console.error("❌ Error updating ItemVerified:", error.message);
        }
    }

    async handleSubsidyClaimed(itemId, beneficiary, claimedBy, event) {
        try {
            console.log(`💰 Updating SubsidyClaimed: Item ${itemId} claimed by ${claimedBy}`);
            
            // Update item as claimed
            await this.dbConnection.execute(`
                UPDATE items 
                SET current_stage = 6, claimed = 1, claimed_by = ?, claimed_at = NOW(), updated_at = NOW()
                WHERE item_id_uint = ?
            `, [claimedBy, itemId.toString()]);
            
            console.log("✅ SubsidyClaimed updated in database");
            
        } catch (error) {
            console.error("❌ Error updating SubsidyClaimed:", error.message);
        }
    }

    async processExistingEvents() {
        try {
            console.log("🔄 Processing existing blockchain events...");
            
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 100); // Process last 100 blocks
            
            console.log(`📊 Processing events from block ${fromBlock} to ${currentBlock}`);
            
            // Get all existing events
            const events = await this.contract.queryFilter("*", fromBlock, currentBlock);
            console.log(`🔍 Found ${events.length} existing events`);
            
            for (const event of events) {
                if ('args' in event) {
                    await this.handleBlockchainEvent(event);
                }
            }
            
            console.log("✅ Existing events processed");
            
        } catch (error) {
            console.error("❌ Error processing existing events:", error.message);
        }
    }

    async getStatus() {
        try {
            if (!this.dbConnection) return { database: 'Not connected' };
            
            const [txCount] = await this.dbConnection.execute('SELECT COUNT(*) as count FROM blockchain_transactions');
            const [itemCount] = await this.dbConnection.execute('SELECT COUNT(*) as count FROM items');
            
            return {
                database: 'Connected',
                blockchainTransactions: txCount[0].count,
                items: itemCount[0].count,
                isRunning: this.isRunning
            };
        } catch (error) {
            return { database: 'Error', error: error.message };
        }
    }

    async stop() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        if (this.dbConnection) {
            await this.dbConnection.end();
        }
        this.isRunning = false;
        console.log("🛑 Blockchain-Database Integration stopped");
    }
}

// Start the integration
const integration = new BlockchainDatabaseIntegration();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    await integration.stop();
    process.exit(0);
});

// Start integration
integration.initialize().then(() => {
    integration.isRunning = true;
    
    // Show status every 30 seconds
    setInterval(async () => {
        const status = await integration.getStatus();
        console.log(`📊 Status: DB=${status.database}, TX=${status.blockchainTransactions}, Items=${status.items}`);
    }, 30000);
    
}).catch(error => {
    console.error('❌ Failed to start integration:', error);
    process.exit(1);
});

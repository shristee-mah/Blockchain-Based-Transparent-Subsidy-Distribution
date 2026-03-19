const { ethers } = require('ethers');
const mysql = require('mysql2/promise');

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

// Contract ABI - Only include the events we need
const CONTRACT_ABI = [
    'event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)',
    'event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)',
    'event ItemVerified(uint256 indexed itemId, uint8 newStage)',
    'event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)',
    'event MerkleRootSet(uint256 indexed itemId, uint8 indexed stage, bytes32 merkleRoot)',
    'event DocumentBatchVerified(uint256 indexed itemId, uint8 indexed stage, bytes32 merkleRoot)',
    'event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy)',
    'event ItemCancelled(uint256 indexed itemId)'
];

class BlockchainEventListener {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.dbConnection = null;
        this.isListening = false;
        this.lastProcessedBlock = 0;
    }

    async initialize() {
        try {
            // Initialize blockchain provider
            this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
            
            // Initialize contract
            this.contract = new ethers.Contract(
                config.blockchain.contractAddress,
                CONTRACT_ABI,
                this.provider
            );

            // Initialize database connection
            this.dbConnection = await mysql.createConnection(config.database);

            // Get the last processed block from database
            await this.loadLastProcessedBlock();

            console.log('Blockchain Event Listener initialized successfully');
            console.log(`Contract: ${config.blockchain.contractAddress}`);
            console.log(`RPC URL: ${config.blockchain.rpcUrl}`);
            console.log(`Starting from block: ${this.lastProcessedBlock}`);

        } catch (error) {
            console.error('Failed to initialize Blockchain Event Listener:', error);
            throw error;
        }
    }

    async loadLastProcessedBlock() {
        try {
            const [rows] = await this.dbConnection.execute(
                'SELECT block_number FROM event_listener_state WHERE listener_name = ?',
                ['transaction_logged_listener']
            );

            if (rows.length > 0) {
                this.lastProcessedBlock = rows[0].block_number;
            } else {
                // Start from current block if no state exists
                this.lastProcessedBlock = await this.provider.getBlockNumber();
                await this.saveLastProcessedBlock(this.lastProcessedBlock);
            }
        } catch (error) {
            console.error('Failed to load last processed block:', error);
            this.lastProcessedBlock = await this.provider.getBlockNumber();
        }
    }

    async saveLastProcessedBlock(blockNumber) {
        try {
            await this.dbConnection.execute(`
                INSERT INTO event_listener_state (listener_name, block_number, updated_at)
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE block_number = ?, updated_at = NOW()
            `, ['transaction_logged_listener', blockNumber, blockNumber]);
        } catch (error) {
            console.error('Failed to save last processed block:', error);
        }
    }

    async startListening() {
        if (this.isListening) {
            console.log('Listener is already running');
            return;
        }

        this.isListening = true;
        console.log('Starting to listen for TransactionLogged events...');

        // Listen for new events
        this.contract.on('TransactionLogged', async (itemId, actor, action, event) => {
            await this.handleTransactionLoggedEvent(itemId, actor, action, event);
        });

        // Also listen for other important events
        this.contract.on('ItemCreated', async (itemId, beneficiary, ipfsHash, event) => {
            await this.handleItemCreatedEvent(itemId, beneficiary, ipfsHash, event);
        });

        this.contract.on('ItemVerified', async (itemId, newStage, event) => {
            await this.handleItemVerifiedEvent(itemId, newStage, event);
        });

        this.contract.on('SubsidyClaimed', async (itemId, beneficiary, claimedBy, event) => {
            await this.handleSubsidyClaimedEvent(itemId, beneficiary, claimedBy, event);
        });

        // Process historical events that might have been missed
        await this.processHistoricalEvents();

        console.log('Event listener started successfully');
    }

    async processHistoricalEvents() {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = this.lastProcessedBlock + 1;

            if (fromBlock >= currentBlock) {
                return; // No historical events to process
            }

            console.log(`Processing historical events from block ${fromBlock} to ${currentBlock}`);

            // Get TransactionLogged events
            const transactionEvents = await this.contract.queryFilter(
                this.contract.filters.TransactionLogged(),
                fromBlock,
                currentBlock
            );

            for (const event of transactionEvents) {
                await this.handleTransactionLoggedEvent(
                    event.args.itemId,
                    event.args.actor,
                    event.args.action,
                    event
                );
            }

            // Get ItemCreated events
            const itemCreatedEvents = await this.contract.queryFilter(
                this.contract.filters.ItemCreated(),
                fromBlock,
                currentBlock
            );

            for (const event of itemCreatedEvents) {
                await this.handleItemCreatedEvent(
                    event.args.itemId,
                    event.args.beneficiary,
                    event.args.ipfsHash,
                    event
                );
            }

            // Update last processed block
            await this.saveLastProcessedBlock(currentBlock);
            console.log(`Processed historical events up to block ${currentBlock}`);

        } catch (error) {
            console.error('Error processing historical events:', error);
        }
    }

    async handleTransactionLoggedEvent(itemId, actor, action, event) {
        try {
            console.log(`TransactionLogged: ItemId=${itemId}, Actor=${actor}, Action=${action}, Block=${event.blockNumber}`);

            // Store transaction in database
            await this.dbConnection.execute(`
                INSERT INTO blockchain_transactions 
                (item_id_bytes32, actor_address, action, transaction_hash, block_number, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                actor_address = VALUES(actor_address),
                action = VALUES(action),
                transaction_hash = VALUES(transaction_hash),
                block_number = VALUES(block_number)
            `, [itemId, actor, action, event.transactionHash, event.blockNumber]);

            // Update the last processed block
            await this.saveLastProcessedBlock(event.blockNumber);

            // Trigger any additional processing based on action
            await this.processActionSpecificLogic(itemId, actor, action, event);

        } catch (error) {
            console.error('Error handling TransactionLogged event:', error);
        }
    }

    async handleItemCreatedEvent(itemId, beneficiary, ipfsHash, event) {
        try {
            console.log(`ItemCreated: ItemId=${itemId}, Beneficiary=${beneficiary}, Block=${event.blockNumber}`);

            // Get the bytes32 itemId from the contract
            const itemDetails = await this.contract.getItem(itemId);
            
            await this.dbConnection.execute(`
                INSERT INTO items 
                (item_id_uint, item_id_bytes32, beneficiary_address, current_stage, claimed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                item_id_bytes32 = VALUES(item_id_bytes32),
                beneficiary_address = VALUES(beneficiary_address),
                updated_at = NOW()
            `, [itemId.toString(), itemDetails.itemId, beneficiary, 0, false]);

        } catch (error) {
            console.error('Error handling ItemCreated event:', error);
        }
    }

    async handleItemVerifiedEvent(itemId, newStage, event) {
        try {
            console.log(`ItemVerified: ItemId=${itemId}, NewStage=${newStage}, Block=${event.blockNumber}`);

            await this.dbConnection.execute(`
                UPDATE items 
                SET current_stage = ?, updated_at = NOW()
                WHERE item_id_uint = ?
            `, [newStage, itemId.toString()]);

        } catch (error) {
            console.error('Error handling ItemVerified event:', error);
        }
    }

    async handleSubsidyClaimedEvent(itemId, beneficiary, claimedBy, event) {
        try {
            console.log(`SubsidyClaimed: ItemId=${itemId}, Beneficiary=${beneficiary}, ClaimedBy=${claimedBy}, Block=${event.blockNumber}`);

            await this.dbConnection.execute(`
                UPDATE items 
                SET current_stage = 6, claimed = 1, claimed_by = ?, claimed_at = NOW(), updated_at = NOW()
                WHERE item_id_uint = ?
            `, [claimedBy, itemId.toString()]);

        } catch (error) {
            console.error('Error handling SubsidyClaimed event:', error);
        }
    }

    async processActionSpecificLogic(itemId, actor, action, event) {
        try {
            switch (action) {
                case 'CREATE_ITEM':
                    // Additional logic for item creation
                    break;
                case 'ADMIN_VERIFY':
                    // Update item stage based on admin verification
                    await this.updateItemStageFromBlockchain(itemId);
                    break;
                case 'TRANSPORTER_SUBMIT':
                    // Mark transporter submission
                    await this.updateItemStageFromBlockchain(itemId);
                    break;
                case 'DISTRIBUTOR_SUBMIT':
                    // Mark distributor submission
                    await this.updateItemStageFromBlockchain(itemId);
                    break;
                case 'BENEFICIARY_CLAIM':
                    // Mark as claimed
                    await this.updateItemStageFromBlockchain(itemId);
                    break;
                case 'CANCEL_ITEM':
                    // Mark as cancelled
                    await this.updateItemStageFromBlockchain(itemId);
                    break;
                default:
                    console.log(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error('Error in action-specific logic:', error);
        }
    }

    async updateItemStageFromBlockchain(itemId) {
        try {
            // Get the uint256 ID from bytes32
            const uintId = await this.contract.itemIdToUint(itemId);
            if (uintId === 0) {
                console.log(`Item not found for itemId: ${itemId}`);
                return;
            }

            // Get current item state from blockchain
            const item = await this.contract.getItem(uintId);
            
            // Update database with blockchain state (SSoT principle)
            await this.dbConnection.execute(`
                UPDATE items 
                SET current_stage = ?, claimed = ?, updated_at = NOW()
                WHERE item_id_uint = ?
            `, [item.stage, item.claimed, uintId.toString()]);

            console.log(`Updated item ${uintId} stage to ${item.stage} from blockchain`);
        } catch (error) {
            console.error('Error updating item stage from blockchain:', error);
        }
    }

    async stopListening() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        this.isListening = false;
        console.log('Event listener stopped');
    }

    async cleanup() {
        await this.stopListening();
        if (this.dbConnection) {
            await this.dbConnection.end();
        }
        console.log('Cleanup completed');
    }
}

// Initialize and start the listener
const listener = new BlockchainEventListener();

async function main() {
    try {
        await listener.initialize();
        await listener.startListening();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Received SIGINT, shutting down gracefully...');
            await listener.cleanup();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM, shutting down gracefully...');
            await listener.cleanup();
            process.exit(0);
        });

        // Keep the process running
        console.log('Blockchain Event Listener is running. Press Ctrl+C to stop.');
        
    } catch (error) {
        console.error('Failed to start event listener:', error);
        process.exit(1);
    }
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    listener.cleanup().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the listener
if (require.main === module) {
    main();
}

module.exports = BlockchainEventListener;

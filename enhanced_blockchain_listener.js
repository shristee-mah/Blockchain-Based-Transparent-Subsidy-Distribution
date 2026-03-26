const { ethers } = require("ethers");

class EnhancedBlockchainListener {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.eventCount = 0;
        this.lastProcessedBlock = 0;
        this.pollingInterval = null;
    }

    async start() {
        try {
            console.log("🚀 Starting Enhanced Blockchain Listener...");
            
            // Setup provider
            this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            
            // Contract address and ABI
            const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            const contractABI = [
                "event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)",
                "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
                "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
                "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
                "event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy)",
                "function createItem(address beneficiary, string calldata ipfsHash)"
            ];
            
            // Create contract instance
            this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
            
            console.log("📋 Contract:", contractAddress);
            console.log("🔗 Connected to blockchain");
            
            // Get current block and start polling
            const currentBlock = await this.provider.getBlockNumber();
            this.lastProcessedBlock = currentBlock - 1;
            
            console.log(`📊 Starting from block ${this.lastProcessedBlock}`);
            
            // Start polling for new events
            this.startPolling();
            
            console.log("✅ Event listener is now ACTIVE!");
            console.log("👀 Polling for blockchain events every 2 seconds...");
            console.log("=" .repeat(60));
            
        } catch (error) {
            console.error("❌ Failed to start event listener:", error.message);
            process.exit(1);
        }
    }

    startPolling() {
        this.pollingInterval = setInterval(async () => {
            await this.checkForNewEvents();
        }, 2000); // Poll every 2 seconds
    }

    async checkForNewEvents() {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            
            if (currentBlock > this.lastProcessedBlock) {
                // Query all events from the new blocks
                await this.queryEvents(this.lastProcessedBlock + 1, currentBlock);
                this.lastProcessedBlock = currentBlock;
            }
        } catch (error) {
            console.error("❌ Error checking for events:", error.message);
        }
    }

    async queryEvents(fromBlock, toBlock) {
        try {
            // Query all event types
            const [
                transactionEvents,
                itemCreatedEvents,
                itemVerifiedEvents,
                documentUploadedEvents,
                subsidyClaimedEvents
            ] = await Promise.all([
                this.contract.queryFilter(this.contract.filters.TransactionLogged(), fromBlock, toBlock),
                this.contract.queryFilter(this.contract.filters.ItemCreated(), fromBlock, toBlock),
                this.contract.queryFilter(this.contract.filters.ItemVerified(), fromBlock, toBlock),
                this.contract.queryFilter(this.contract.filters.DocumentUploaded(), fromBlock, toBlock),
                this.contract.queryFilter(this.contract.filters.SubsidyClaimed(), fromBlock, toBlock)
            ]);

            // Process all events
            const allEvents = [
                ...transactionEvents.map(e => ({ ...e, type: 'TransactionLogged' })),
                ...itemCreatedEvents.map(e => ({ ...e, type: 'ItemCreated' })),
                ...itemVerifiedEvents.map(e => ({ ...e, type: 'ItemVerified' })),
                ...documentUploadedEvents.map(e => ({ ...e, type: 'DocumentUploaded' })),
                ...subsidyClaimedEvents.map(e => ({ ...e, type: 'SubsidyClaimed' }))
            ].sort((a, b) => {
                if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
                return a.index - b.index;
            });

            // Process each event
            for (const event of allEvents) {
                await this.processEvent(event);
            }

            if (allEvents.length > 0) {
                console.log(`✅ Processed ${allEvents.length} events from blocks ${fromBlock}-${toBlock}`);
            }
            
        } catch (error) {
            console.error("❌ Error querying events:", error.message);
        }
    }

    async processEvent(event) {
        try {
            const timestamp = new Date().toLocaleTimeString();
            
            // Get block and transaction details using the correct method
            const block = await this.provider.getBlock(event.blockNumber);
            const transaction = await this.provider.getTransaction(event.transactionHash);

            switch (event.type) {
                case 'TransactionLogged':
                    await this.handleTransactionLogged(
                        event.args.itemId,
                        event.args.actor,
                        event.args.action,
                        event,
                        block,
                        transaction
                    );
                    break;
                case 'ItemCreated':
                    await this.handleItemCreated(
                        event.args.itemId,
                        event.args.beneficiary,
                        event.args.ipfsHash,
                        event,
                        block,
                        transaction
                    );
                    break;
                case 'ItemVerified':
                    await this.handleItemVerified(
                        event.args.itemId,
                        event.args.newStage,
                        event,
                        block,
                        transaction
                    );
                    break;
                case 'DocumentUploaded':
                    await this.handleDocumentUploaded(
                        event.args.itemId,
                        event.args.stage,
                        event.args.ipfsHash,
                        event.args.uploader,
                        event,
                        block,
                        transaction
                    );
                    break;
                case 'SubsidyClaimed':
                    await this.handleSubsidyClaimed(
                        event.args.itemId,
                        event.args.beneficiary,
                        event.args.claimedBy,
                        event,
                        block,
                        transaction
                    );
                    break;
            }
        } catch (error) {
            console.error("❌ Error processing event:", error.message);
            // Still show basic event info even if block/tx fails
            this.showBasicEventInfo(event);
        }
    }

    showBasicEventInfo(event) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n🔥 ${event.type} [${timestamp}]`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        if (event.args) {
            Object.keys(event.args).forEach(key => {
                const value = event.args[key].toString();
                console.log(`📊 ${key}: ${value}`);
            });
        }
        console.log("─".repeat(50));
    }

    async getTransactionDetails(event) {
        try {
            // Method 1: Try to get transaction receipt directly
            if (event.transactionHash) {
                const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
                if (receipt) {
                    return {
                        blockNumber: receipt.blockNumber,
                        transactionHash: receipt.transactionHash,
                        gasUsed: receipt.gasUsed.toString()
                    };
                }
            }
            
            // Method 2: Query recent blocks to find the transaction
            const currentBlock = await this.provider.getBlockNumber();
            const searchBlocks = 5; // Search last 5 blocks
            
            for (let i = 0; i < searchBlocks; i++) {
                const blockNumber = currentBlock - i;
                if (blockNumber < 0) break;
                
                try {
                    const block = await this.provider.getBlock(blockNumber, true);
                    if (block && block.transactions) {
                        for (const tx of block.transactions) {
                            if (typeof tx === 'object' && tx.to === this.contract.target) {
                                // Get transaction receipt to check if it contains our event
                                const receipt = await this.provider.getTransactionReceipt(tx.hash);
                                if (receipt && receipt.logs.some(log => 
                                    log.address === this.contract.target && 
                                    log.topics.includes(event.topics[0])
                                )) {
                                    return {
                                        blockNumber: receipt.blockNumber,
                                        transactionHash: receipt.transactionHash,
                                        gasUsed: receipt.gasUsed.toString()
                                    };
                                }
                            }
                        }
                    }
                } catch (error) {
                    continue; // Skip this block and try next
                }
            }
            
            // Method 3: Fallback to event data
            return {
                blockNumber: event.blockNumber || 'N/A',
                transactionHash: event.transactionHash || 'N/A',
                gasUsed: 'N/A'
            };
            
        } catch (error) {
            console.log("⚠️ Could not fetch transaction details:", error.message);
            return {
                blockNumber: 'N/A',
                transactionHash: 'N/A',
                gasUsed: 'N/A'
            };
        }
    }

    async handleTransactionLogged(itemId, actor, action, event, block, transaction) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(actor);
        
        console.log(`\n📝 TRANSACTION LOGGED [${timestamp}]`);
        console.log(`🎯 Action: ${action}`);
        console.log(`👤 Actor: ${actor} (${role})`);
        console.log(`📦 Item: ${itemId}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        console.log(`⛽ Gas Used: ${transaction.gasLimit.toString()}`);
        console.log(`🕐 Block Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        console.log("─".repeat(50));
    }

    async handleItemCreated(itemId, beneficiary, ipfsHash, event, block, transaction) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(beneficiary);
        
        console.log(`\n🆕 ITEM CREATED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`👤 Beneficiary: ${beneficiary} (${role})`);
        console.log(`📁 IPFS: ${ipfsHash}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        console.log(`⛽ Gas Used: ${transaction.gasLimit.toString()}`);
        console.log(`🕐 Block Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        console.log("─".repeat(50));
    }

    async handleItemVerified(itemId, newStage, event, block, transaction) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n✅ ITEM VERIFIED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`📊 New Stage: ${newStage}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        console.log(`⛽ Gas Used: ${transaction.gasLimit.toString()}`);
        console.log(`🕐 Block Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        console.log("─".repeat(50));
    }

    async handleDocumentUploaded(itemId, stage, ipfsHash, uploader, event, block, transaction) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(uploader);
        
        console.log(`\n📄 DOCUMENT UPLOADED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`📊 Stage: ${stage}`);
        console.log(`👤 Uploader: ${uploader} (${role})`);
        console.log(`📁 IPFS: ${ipfsHash}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        console.log(`⛽ Gas Used: ${transaction.gasLimit.toString()}`);
        console.log(`🕐 Block Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        console.log("─".repeat(50));
    }

    async handleSubsidyClaimed(itemId, beneficiary, claimedBy, event, block, transaction) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(beneficiary);
        
        console.log(`\n💰 SUBSIDY CLAIMED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`👤 Beneficiary: ${beneficiary} (${role})`);
        console.log(`🎯 Claimed By: ${claimedBy}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        console.log(`⛽ Gas Used: ${transaction.gasLimit.toString()}`);
        console.log(`🕐 Block Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        console.log("─".repeat(50));
    }

    identifyRole(address) {
        const roleMap = {
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "ADMIN",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "PROCESSOR", 
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": "TRANSPORTER",
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906": "DISTRIBUTOR",
            "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": "BENEFICIARY"
        };
        return roleMap[address] || "UNKNOWN";
    }

    stop() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        console.log("🛑 Event listener stopped");
    }
}

// Start the listener
const listener = new EnhancedBlockchainListener();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    listener.stop();
    process.exit(0);
});

// Start listening
listener.start().catch(error => {
    console.error('❌ Failed to start:', error);
    process.exit(1);
});

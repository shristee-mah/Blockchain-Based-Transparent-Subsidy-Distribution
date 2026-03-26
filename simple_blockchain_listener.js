const { ethers } = require("ethers");

class SimpleBlockchainListener {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.eventCount = 0;
    }

    async start() {
        try {
            console.log("🚀 Starting Simple Blockchain Listener...");
            
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
            
            // Setup specific event listeners only (avoid generic "*")
            this.setupEventListeners();
            
            console.log("✅ Event listener is now ACTIVE!");
            console.log("👀 Listening for blockchain events...");
            console.log("=" .repeat(60));
            
        } catch (error) {
            console.error("❌ Failed to start event listener:", error.message);
            process.exit(1);
        }
    }

    setupEventListeners() {
        console.log("📡 Setting up event listeners...");

        // Specific event listeners only
        this.contract.on("TransactionLogged", (itemId, actor, action, event) => {
            this.handleTransactionLogged(itemId, actor, action, event);
        });

        this.contract.on("ItemCreated", (itemId, beneficiary, ipfsHash, event) => {
            this.handleItemCreated(itemId, beneficiary, ipfsHash, event);
        });

        this.contract.on("ItemVerified", (itemId, newStage, event) => {
            this.handleItemVerified(itemId, newStage, event);
        });

        this.contract.on("DocumentUploaded", (itemId, stage, ipfsHash, uploader, event) => {
            this.handleDocumentUploaded(itemId, stage, ipfsHash, uploader, event);
        });

        this.contract.on("SubsidyClaimed", (itemId, beneficiary, claimedBy, event) => {
            this.handleSubsidyClaimed(itemId, beneficiary, claimedBy, event);
        });

        console.log("✅ Event listeners configured");
    }

    handleTransactionLogged(itemId, actor, action, event) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(actor);
        
        // Extract block number and transaction hash
        const blockNumber = event.blockNumber || 'N/A';
        const transactionHash = event.transactionHash || 'N/A';
        
        console.log(`\n📝 TRANSACTION LOGGED [${timestamp}]`);
        console.log(`🎯 Action: ${action}`);
        console.log(`👤 Actor: ${actor} (${role})`);
        console.log(`📦 Item: ${itemId}`);
        console.log(`🔗 Block: ${blockNumber}`);
        console.log(`📄 TX: ${transactionHash}`);
        console.log("─".repeat(50));
    }

    async handleItemCreated(itemId, beneficiary, ipfsHash, event) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(beneficiary);
        
        // Get block details if available
        let blockNumber = event.blockNumber;
        let transactionHash = event.transactionHash;
        
        // If blockNumber is undefined, try to get it from the transaction
        if (!blockNumber && transactionHash) {
            try {
                const tx = await this.provider.getTransaction(transactionHash);
                if (tx) {
                    blockNumber = tx.blockNumber;
                }
            } catch (error) {
                console.log("Could not fetch transaction details");
            }
        }
        
        console.log(`\n🆕 ITEM CREATED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`👤 Beneficiary: ${beneficiary} (${role})`);
        console.log(`📁 IPFS: ${ipfsHash}`);
        console.log(`🔗 Block: ${blockNumber || 'N/A'}`);
        console.log(`📄 TX: ${transactionHash || 'N/A'}`);
        console.log("─".repeat(50));
    }

    handleItemVerified(itemId, newStage, event) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n✅ ITEM VERIFIED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`📊 New Stage: ${newStage}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
        console.log("─".repeat(50));
    }

    handleDocumentUploaded(itemId, stage, ipfsHash, uploader, event) {
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
        console.log("─".repeat(50));
    }

    handleSubsidyClaimed(itemId, beneficiary, claimedBy, event) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(beneficiary);
        
        console.log(`\n💰 SUBSIDY CLAIMED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`👤 Beneficiary: ${beneficiary} (${role})`);
        console.log(`🎯 Claimed By: ${claimedBy}`);
        console.log(`🔗 Block: ${event.blockNumber}`);
        console.log(`📄 TX: ${event.transactionHash}`);
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
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        console.log("🛑 Event listener stopped");
    }
}

// Start the listener
const listener = new SimpleBlockchainListener();

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

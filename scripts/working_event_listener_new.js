const { ethers } = require("ethers");

class WorkingEventListener {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.isRunning = false;
        this.eventCount = 0;
    }

    async start() {
        try {
            console.log("🚀 Starting Working Event Listener...");
            
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
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isRunning = true;
            console.log("✅ Event listener is now ACTIVE!");
            console.log("👀 Listening for blockchain events...");
            console.log("🎯 Any frontend action will appear here instantly!");
            console.log("=" .repeat(60));
            
            // Create a test transaction after 3 seconds
            setTimeout(() => this.createTestTransaction(), 3000);
            
        } catch (error) {
            console.error("❌ Failed to start event listener:", error.message);
            process.exit(1);
        }
    }

    setupEventListeners() {
        // Listen to all events
        this.contract.on("*", (event) => {
            this.handleEvent(event);
        });

        // Also listen to specific events for better formatting
        this.contract.on("TransactionLogged", (itemId, actor, action, event) => {
            this.handleTransactionLogged(itemId, actor, action, event);
        });

        this.contract.on("ItemCreated", (itemId, beneficiary, ipfsHash, event) => {
            this.handleItemCreated(itemId, beneficiary, ipfsHash, event);
        });

        this.contract.on("DocumentUploaded", (itemId, stage, ipfsHash, uploader, event) => {
            this.handleDocumentUploaded(itemId, stage, ipfsHash, uploader, event);
        });
    }

    handleEvent(event) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n🔥 EVENT #${this.eventCount} [${timestamp}]`);
        console.log(`📝 Type: ${event.event || 'UNKNOWN'}`);
        
        if (event.args && Object.keys(event.args).length > 0) {
            console.log("📊 Data:");
            Object.keys(event.args).forEach(key => {
                const value = event.args[key].toString();
                console.log(`   ${key}: ${value}`);
            });
        }
        
        console.log("─".repeat(50));
    }

    handleTransactionLogged(itemId, actor, action, event) {
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(actor);
        
        console.log(`\n📝 TRANSACTION LOGGED [${timestamp}]`);
        console.log(`🎯 Action: ${action}`);
        console.log(`👤 Actor: ${actor} (${role})`);
        console.log(`📦 Item: ${itemId}`);
        console.log("─".repeat(50));
    }

    handleItemCreated(itemId, beneficiary, ipfsHash, event) {
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(beneficiary);
        
        console.log(`\n🆕 ITEM CREATED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`👤 Beneficiary: ${beneficiary} (${role})`);
        console.log(`📁 IPFS: ${ipfsHash}`);
        console.log("─".repeat(50));
    }

    handleDocumentUploaded(itemId, stage, ipfsHash, uploader, event) {
        const timestamp = new Date().toLocaleTimeString();
        const role = this.identifyRole(uploader);
        
        console.log(`\n📄 DOCUMENT UPLOADED [${timestamp}]`);
        console.log(`📦 Item ID: ${itemId}`);
        console.log(`📊 Stage: ${stage}`);
        console.log(`👤 Uploader: ${uploader} (${role})`);
        console.log(`📁 IPFS: ${ipfsHash}`);
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

    async createTestTransaction() {
        try {
            console.log("\n🧪 Creating test transaction...");
            
            const signer = await this.provider.getSigner();
            const contractWithSigner = this.contract.connect(signer);
            
            const testIpfs = "QmTestWorking" + Date.now();
            const tx = await contractWithSigner.createItem(signer.address, testIpfs);
            
            console.log(`📤 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed! Gas used: ${receipt.gasUsed.toString()}`);
            
        } catch (error) {
            console.error("❌ Test transaction failed:", error.message);
        }
    }

    stop() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        this.isRunning = false;
        console.log("🛑 Event listener stopped");
    }
}

// Start the listener
const listener = new WorkingEventListener();

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

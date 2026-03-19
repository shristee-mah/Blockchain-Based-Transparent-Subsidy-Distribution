const { ethers } = require("hardhat");

class TerminalEventViewer {
    constructor() {
        this.contract = null;
        this.isMonitoring = false;
        this.eventCount = 0;
    }

    async initialize() {
        try {
            const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            this.contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            
            console.log("🔴 LIVE BLOCKCHAIN EVENT VIEWER");
            console.log("📋 Contract:", contractAddress);
            console.log("🎯 Shows ALL frontend interactions in REAL-TIME");
            console.log("=" .repeat(80));
            
            // Get initial state
            await this.getInitialState();
            
        } catch (error) {
            console.error("❌ Failed to initialize viewer:", error.message);
            throw error;
        }
    }

    async getInitialState() {
        try {
            console.log("📊 Getting current blockchain state...");
            
            // Get existing events
            try {
                const existingEvents = await this.contract.queryFilter("*", 0, "latest");
                console.log(`📝 Existing events on blockchain: ${existingEvents.length}`);
                
                if (existingEvents.length > 0) {
                    console.log("📋 RECENT EVENTS:");
                    existingEvents.slice(-5).forEach((event, index) => {
                        this.displayEvent(event, index + 1);
                    });
                }
                
            } catch (error) {
                console.log("⚠️ Could not query existing events:", error.message);
            }

        } catch (error) {
            console.error("❌ Error getting initial state:", error);
        }
    }

    startMonitoring() {
        if (this.isMonitoring) {
            console.log("⚠️ Monitoring is already active");
            return;
        }

        this.isMonitoring = true;
        console.log("🎯 STARTING REAL-TIME MONITORING...");
        console.log("📡 Waiting for frontend interactions...");
        console.log("💡 Any dashboard action will appear here instantly!");
        console.log("=" .repeat(80));

        // Set up event listeners for ALL possible events
        this.setupAllEventListeners();

        console.log("✅ Event listeners configured");
        console.log("🔴 READY TO CAPTURE FRONTEND ACTIONS!");
        console.log("💡 Now run frontend actions and watch them appear here...");
    }

    setupAllEventListeners() {
        console.log("🔗 Setting up comprehensive event listeners...");

        // Listen to ALL events from the contract
        this.contract.on("*", (event) => {
            this.handleLiveEvent(event);
        });

        // Also listen to specific events for better formatting
        this.contract.on("TransactionLogged", (itemId, actor, action, event) => {
            this.handleSpecificEvent("TransactionLogged", {
                itemId: itemId.toString(),
                actor: actor,
                action: action,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        this.contract.on("ItemCreated", (itemId, beneficiary, ipfsHash, event) => {
            this.handleSpecificEvent("ItemCreated", {
                itemId: itemId.toString(),
                beneficiary: beneficiary,
                ipfsHash: ipfsHash,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        this.contract.on("ItemVerified", (itemId, newStage, event) => {
            this.handleSpecificEvent("ItemVerified", {
                itemId: itemId.toString(),
                newStage: newStage.toString(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        this.contract.on("DocumentUploaded", (itemId, stage, ipfsHash, uploader, event) => {
            this.handleSpecificEvent("DocumentUploaded", {
                itemId: itemId.toString(),
                stage: stage.toString(),
                ipfsHash: ipfsHash,
                uploader: uploader,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        this.contract.on("SubsidyClaimed", (itemId, beneficiary, claimedBy, event) => {
            this.handleSpecificEvent("SubsidyClaimed", {
                itemId: itemId.toString(),
                beneficiary: beneficiary,
                claimedBy: claimedBy,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
    }

    handleLiveEvent(event) {
        this.eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        // Clear current line and show event
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        
        console.log(`\n🔴 LIVE EVENT #${this.eventCount} [${timestamp}]`);
        console.log(`📝 Event Type: ${event.event || 'UNKNOWN'}`);
        console.log(`📦 Block: ${event.blockNumber}`);
        console.log(`🔗 Transaction: ${event.transactionHash}`);
        
        if (event.args && Object.keys(event.args).length > 0) {
            console.log(`📄 Event Data:`);
            Object.keys(event.args).forEach(key => {
                const value = event.args[key].toString();
                console.log(`      ${key}: ${value}`);
            });
        }
        
        console.log("─".repeat(80));
        
        // Show status
        this.showStatus();
    }

    handleSpecificEvent(eventType, data) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Clear line and show formatted event
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        
        console.log(`\n🔴 ${eventType.toUpperCase()} EVENT [${timestamp}]`);
        console.log(`📦 Block: ${data.blockNumber}`);
        console.log(`🔗 Tx: ${data.transactionHash.slice(0, 10)}...`);
        
        // Show event-specific details with role identification
        switch (eventType) {
            case "TransactionLogged":
                const role = this.identifyRole(data.actor);
                console.log(`🎯 Action: ${data.action}`);
                console.log(`👤 Actor: ${data.actor} (${role})`);
                console.log(`🆔 Item: ${data.itemId}`);
                break;
            case "ItemCreated":
                const creatorRole = this.identifyRole(data.beneficiary);
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`👤 Beneficiary: ${data.beneficiary} (${creatorRole})`);
                console.log(`📄 IPFS: ${data.ipfsHash}`);
                break;
            case "ItemVerified":
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`📊 Stage: ${data.newStage}`);
                break;
            case "DocumentUploaded":
                const uploaderRole = this.identifyRole(data.uploader);
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`📊 Stage: ${data.stage}`);
                console.log(`📄 IPFS: ${data.ipfsHash}`);
                console.log(`👤 Uploader: ${data.uploader} (${uploaderRole})`);
                break;
            case "SubsidyClaimed":
                const claimerRole = this.identifyRole(data.beneficiary);
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`👤 Beneficiary: ${data.beneficiary} (${claimerRole})`);
                console.log(`✅ Claimed By: ${data.claimedBy}`);
                break;
        }
        
        console.log("─".repeat(80));
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

    displayEvent(event, index) {
        console.log(`${index}. ${event.event || 'UNKNOWN'} - Block ${event.blockNumber}`);
        if (event.args && Object.keys(event.args).length > 0) {
            Object.keys(event.args).forEach(key => {
                console.log(`   ${key}: ${event.args[key].toString()}`);
            });
        }
    }

    showStatus() {
        const status = `📊 Total Events: ${this.eventCount} | Monitoring: ✅ ACTIVE | Press Ctrl+C to stop`;
        process.stdout.write(`\r${status}`);
    }

    stopMonitoring() {
        this.isMonitoring = false;
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        console.log("\n🛑 Real-time monitoring stopped");
    }
}

// Main execution
async function main() {
    const viewer = new TerminalEventViewer();

    try {
        await viewer.initialize();
        await viewer.startMonitoring();

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n👋 Received SIGINT, shutting down gracefully...');
            viewer.stopMonitoring();
            process.exit(0);
        });

        console.log("\n🎯 READY FOR FRONTEND ACTIONS!");
        console.log("💡 Perform any dashboard action and watch it appear here instantly!");

    } catch (error) {
        console.error("❌ Failed to start viewer:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = TerminalEventViewer;

const { ethers } = require("hardhat");

class WorkingEventListener {
    constructor() {
        this.contract = null;
        this.isMonitoring = false;
        this.eventCount = 0;
        this.stats = {
            totalEvents: 0,
            eventTypes: {},
            itemsCreated: 0,
            itemsVerified: 0,
            itemsClaimed: 0
        };
    }

    async initialize() {
        try {
            const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            this.contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            
            console.log("🔴 WORKING EVENT LISTENER");
            console.log("📋 Contract:", contractAddress);
            console.log("🎯 Shows ALL frontend interactions in REAL-TIME");
            console.log("=" .repeat(80));
            
            // Get initial state
            await this.getInitialState();
            
        } catch (error) {
            console.error("❌ Failed to initialize listener:", error.message);
            throw error;
        }
    }

    async getInitialState() {
        try {
            console.log("📊 Getting initial blockchain state...");
            
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
        console.log("📡 Listening for blockchain events...");
        console.log("⌨️ Press 'q' to quit, 's' for stats, 'c' for current state, 'h' for help\n");

        // Set up event listeners
        this.setupEventListeners();

        // Start status updates
        this.startStatusUpdates();
    }

    setupEventListeners() {
        console.log("🔗 Setting up event listeners...");

        // Listen to ALL events from the contract
        this.contract.on("*", (event) => {
            this.handleRealtimeEvent(event);
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

        console.log("✅ Event listeners configured");
    }

    handleRealtimeEvent(event) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Update stats
        this.eventCount++;
        this.stats.totalEvents++;
        this.stats.eventTypes[event.event] = (this.stats.eventTypes[event.event] || 0) + 1;
        
        if (event.event === "ItemCreated") this.stats.itemsCreated++;
        if (event.event === "ItemVerified") this.stats.itemsVerified++;
        if (event.event === "SubsidyClaimed") this.stats.itemsClaimed++;

        // Clear line and show event
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        
        console.log(`\n🔴 LIVE EVENT [${timestamp}]`);
        console.log(`📝 Type: ${event.event || 'UNKNOWN'}`);
        console.log(`📦 Block: ${event.blockNumber}`);
        console.log(`🔗 Tx: ${event.transactionHash.slice(0, 10)}...`);
        
        if (event.args && Object.keys(event.args).length > 0) {
            console.log(`📄 Event Data:`);
            Object.keys(event.args).forEach(key => {
                const value = event.args[key].toString();
                console.log(`      ${key}: ${value}`);
            });
        }
        
        console.log("─".repeat(60));
        
        // Show mini stats
        this.showMiniStats();
    }

    handleSpecificEvent(eventType, data) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Update stats
        this.eventCount++;
        this.stats.totalEvents++;
        this.stats.eventTypes[eventType] = (this.stats.eventTypes[eventType] || 0) + 1;
        
        if (eventType === "ItemCreated") this.stats.itemsCreated++;
        if (eventType === "ItemVerified") this.stats.itemsVerified++;
        if (eventType === "SubsidyClaimed") this.stats.itemsClaimed++;

        // Clear line and show event
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
                console.log(`📊 New Stage: ${data.newStage}`);
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
        
        console.log("─".repeat(60));
        
        // Show mini stats
        this.showMiniStats();
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
        if (event.args && Object.keys(Event.args).length > 0) {
            Object.keys(event.args).forEach(key => {
                console.log(`   ${key}: ${event.args[key].toString()}`);
            });
        }
    }

    showMiniStats() {
        const statsLine = `📊 Events: ${this.stats.totalEvents} | 🏭 Created: ${this.stats.itemsCreated} | ✅ Verified: ${this.stats.itemsVerified} | 🎁 Claimed: ${this.stats.itemsClaimed}`;
        process.stdout.write(`\r${statsLine}`);
    }

    displayStats() {
        console.log("\n📊 CURRENT LEDGER STATISTICS:");
        console.log("=" .repeat(50));
        console.log(`📝 Total Events: ${this.stats.totalEvents}`);
        console.log(`🏭 Items Created: ${this.stats.itemsCreated}`);
        console.log(`✅ Items Verified: ${this.stats.itemsVerified}`);
        console.log(`🎁 Items Claimed: ${this.stats.itemsClaimed}`);
        
        console.log("\n📋 Event Breakdown:");
        Object.keys(this.stats.eventTypes).forEach(eventType => {
            console.log(`   ${eventType}: ${this.stats.eventTypes[eventType]}`);
        });
        console.log("=" .repeat(50));
    }

    startStatusUpdates() {
        // Show periodic status updates
        setInterval(() => {
            if (this.isMonitoring) {
                const timestamp = new Date().toLocaleTimeString();
                process.stdout.write(`\r🕐 ${timestamp} | Monitoring... | Press 'q' to quit | 's' for stats | 'c' for state | 'h' for help`);
            }
        }, 10000); // Every 10 seconds
    }

    stopMonitoring() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        this.isMonitoring = false;
        console.log("🛑 Real-time monitoring stopped");
    }
}

// Main execution
async function main() {
    const listener = new WorkingEventListener();

    try {
        await listener.initialize();
        await listener.startMonitoring();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n👋 Received SIGINT, shutting down gracefully...');
            listener.stopMonitoring();
            process.exit(0);
        });

        // Handle keyboard input for commands
        const readline = require('readline');
        readline.emitKeypressEvents(process);
        process.stdin.setRawMode(true);
        process.stdin.resume();

        process.stdin.on('keypress', (str, key) => {
            if (key.name === 'q') {
                console.log('\n👋 Stopping monitor...');
                listener.stopMonitoring();
                process.exit(0);
            } else if (key.name === 's') {
                listener.displayStats();
            } else if (key.name === 'c') {
                // Show current state
                console.log('\n📊 Showing current state...');
                // Could add current state logic here
            } else if (key.name === 'h') {
                console.log('\n📖 HELP:');
                console.log('q - Quit monitoring');
                console.log('s - Show statistics');
                console.log('c - Show current state');
                console.log('h - Show this help');
            }
        });

        console.log("🎉 WORKING EVENT LISTENER IS ACTIVE!");
        console.log("💡 Any frontend action will appear here instantly!");
        
    } catch (error) {
        console.error("❌ Failed to start listener:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = WorkingEventListener;

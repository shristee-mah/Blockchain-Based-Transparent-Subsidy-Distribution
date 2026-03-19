const { ethers } = require("hardhat");
const readline = require('readline');

class RealtimeMonitor {
    constructor() {
        this.contract = null;
        this.isMonitoring = false;
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
            
            console.log("🔍 Real-time Ledger & Event Log Monitor");
            console.log("📋 Contract:", contractAddress);
            console.log("=" .repeat(80));
            
            // Get initial state
            await this.getInitialState();
            
        } catch (error) {
            console.error("❌ Failed to initialize monitor:", error.message);
            throw error;
        }
    }

    async getInitialState() {
        try {
            console.log("📊 Getting initial ledger state...");
            
            // Get current item count
            try {
                const itemCount = await this.contract.itemCount();
                console.log(`📦 Current item count: ${itemCount.toString()}`);
            } catch (error) {
                console.log("⚠️ Could not get item count (contract may not have this function)");
            }

            // Get existing events
            try {
                const existingEvents = await this.contract.queryFilter("*", 0, "latest");
                console.log(`📝 Existing events on blockchain: ${existingEvents.length}`);
                
                // Categorize existing events
                existingEvents.forEach(event => {
                    this.categorizeEvent(event);
                });
                
                this.displayStats();
                
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
        console.log("🎯 Starting real-time monitoring...");
        console.log("📡 Listening for blockchain events...");
        console.log("⌨️ Press 'q' to quit, 's' for stats, 'c' for current state\n");

        // Set up event listeners
        this.setupEventListeners();

        // Set up keyboard input
        this.setupKeyboardInput();

        // Start status updates
        this.startStatusUpdates();
    }

    setupEventListeners() {
        // Listen to all possible events
        console.log("🔗 Setting up event listeners...");

        // TransactionLogged events
        this.contract.on("TransactionLogged", (itemId, actor, action, event) => {
            this.handleRealtimeEvent("TransactionLogged", {
                itemId: itemId.toString(),
                actor: actor,
                action: action,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        // ItemCreated events
        this.contract.on("ItemCreated", (itemId, beneficiary, ipfsHash, event) => {
            this.handleRealtimeEvent("ItemCreated", {
                itemId: itemId.toString(),
                beneficiary: beneficiary,
                ipfsHash: ipfsHash,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        // ItemVerified events
        this.contract.on("ItemVerified", (itemId, newStage, event) => {
            this.handleRealtimeEvent("ItemVerified", {
                itemId: itemId.toString(),
                newStage: newStage.toString(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        // DocumentUploaded events
        this.contract.on("DocumentUploaded", (itemId, stage, ipfsHash, uploader, event) => {
            this.handleRealtimeEvent("DocumentUploaded", {
                itemId: itemId.toString(),
                stage: stage.toString(),
                ipfsHash: ipfsHash,
                uploader: uploader,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        // SubsidyClaimed events
        this.contract.on("SubsidyClaimed", (itemId, beneficiary, claimedBy, event) => {
            this.handleRealtimeEvent("SubsidyClaimed", {
                itemId: itemId.toString(),
                beneficiary: beneficiary,
                claimedBy: claimedBy,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });

        console.log("✅ Event listeners configured");
    }

    handleRealtimeEvent(eventType, data) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Update stats
        this.stats.totalEvents++;
        this.stats.eventTypes[eventType] = (this.stats.eventTypes[eventType] || 0) + 1;
        
        if (eventType === "ItemCreated") this.stats.itemsCreated++;
        if (eventType === "ItemVerified") this.stats.itemsVerified++;
        if (eventType === "SubsidyClaimed") this.stats.itemsClaimed++;

        // Clear line and show event
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        
        console.log(`\n🔴 LIVE EVENT [${timestamp}]`);
        console.log(`📝 Type: ${eventType}`);
        console.log(`📦 Block: ${data.blockNumber}`);
        console.log(`🔗 Tx: ${data.transactionHash.slice(0, 10)}...`);
        
        // Show event-specific details
        switch (eventType) {
            case "TransactionLogged":
                console.log(`🎯 Action: ${data.action}`);
                console.log(`👤 Actor: ${data.actor}`);
                console.log(`🆔 Item: ${data.itemId}`);
                break;
            case "ItemCreated":
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`👤 Beneficiary: ${data.beneficiary}`);
                console.log(`📄 IPFS: ${data.ipfsHash}`);
                break;
            case "ItemVerified":
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`📊 New Stage: ${data.newStage}`);
                break;
            case "DocumentUploaded":
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`📊 Stage: ${data.stage}`);
                console.log(`📄 IPFS: ${data.ipfsHash}`);
                console.log(`👤 Uploader: ${data.uploader}`);
                break;
            case "SubsidyClaimed":
                console.log(`🆔 Item: ${data.itemId}`);
                console.log(`👤 Beneficiary: ${data.beneficiary}`);
                console.log(`✅ Claimed By: ${data.claimedBy}`);
                break;
        }
        
        console.log("─".repeat(60));
        
        // Show mini stats
        this.showMiniStats();
    }

    categorizeEvent(event) {
        if (event.event) {
            this.stats.totalEvents++;
            this.stats.eventTypes[event.event] = (this.stats.eventTypes[event.event] || 0) + 1;
            
            if (event.event === "ItemCreated") this.stats.itemsCreated++;
            if (event.event === "ItemVerified") this.stats.itemsVerified++;
            if (event.event === "SubsidyClaimed") this.stats.itemsClaimed++;
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

    setupKeyboardInput() {
        readline.emitKeypressEvents(process);
        process.stdin.setRawMode(true);
        process.stdin.resume();

        process.stdin.on('keypress', (str, key) => {
            if (key.name === 'q') {
                console.log('\n👋 Stopping monitor...');
                this.stopMonitoring();
                process.exit(0);
            } else if (key.name === 's') {
                this.displayStats();
            } else if (key.name === 'c') {
                this.showCurrentState();
            }
        });
    }

    async showCurrentState() {
        console.log("\n📊 CURRENT LEDGER STATE:");
        console.log("=" .repeat(50));
        
        try {
            const itemCount = await this.contract.itemCount();
            console.log(`📦 Total Items: ${itemCount.toString()}`);
            
            // Get recent items
            for (let i = 1; i <= Math.min(5, parseInt(itemCount.toString())); i++) {
                try {
                    const item = await this.contract.getItem(i.toString());
                    console.log(`\n🆔 Item ${i}:`);
                    console.log(`   👤 Beneficiary: ${item.beneficiary}`);
                    console.log(`   📊 Stage: ${item.currentStage}`);
                    console.log(`   ✅ Claimed: ${item.claimed}`);
                    if (item.claimed) {
                        console.log(`   🏆 Claimed By: ${item.claimedBy}`);
                    }
                } catch (error) {
                    console.log(`   Item ${i}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log("❌ Could not get current state:", error.message);
        }
        
        console.log("=" .repeat(50));
    }

    startStatusUpdates() {
        // Show periodic status updates
        setInterval(() => {
            if (this.isMonitoring) {
                const timestamp = new Date().toLocaleTimeString();
                process.stdout.write(`\r🕐 ${timestamp} | Monitoring... | Press 'q' to quit | 's' for stats | 'c' for state`);
            }
        }, 10000); // Every 10 seconds
    }

    stopMonitoring() {
        this.isMonitoring = false;
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log("🛑 Real-time monitoring stopped");
    }
}

// Main execution
async function main() {
    const monitor = new RealtimeMonitor();

    try {
        await monitor.initialize();
        await monitor.startMonitoring();

    } catch (error) {
        console.error("❌ Failed to start monitoring:", error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = RealtimeMonitor;

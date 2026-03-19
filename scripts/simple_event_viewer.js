const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Simple Event Log Viewer");

    try {
        // Get deployed contract
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        console.log("📋 Contract address:", contractAddress);

        // Get latest block number
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`📦 Latest block number: ${latestBlock}`);

        // Get all events from the contract
        console.log("\n🔗 ALL BLOCKCHAIN EVENTS:");
        console.log("=" .repeat(80));

        try {
            // Get all events from the beginning
            const allEvents = await contract.queryFilter("*", 0, "latest");
            console.log(`✅ Found ${allEvents.length} total events:\n`);

            // Group events by type
            const eventsByType = {};
            allEvents.forEach(event => {
                const eventName = event.event || 'UNKNOWN';
                if (!eventsByType[eventName]) {
                    eventsByType[eventName] = [];
                }
                eventsByType[eventName].push(event);
            });

            // Display events by type
            Object.keys(eventsByType).forEach(eventName => {
                console.log(`📊 ${eventName} Events (${eventsByType[eventName].length}):`);
                eventsByType[eventName].forEach((event, index) => {
                    console.log(`   ${index + 1}. Block: ${event.blockNumber}, Tx: ${event.transactionHash.slice(0, 10)}...`);
                    
                    // Show event args if available
                    if (event.args && Object.keys(event.args).length > 0) {
                        const args = {};
                        Object.keys(event.args).forEach(key => {
                            args[key] = event.args[key].toString();
                        });
                        console.log(`      Args: ${JSON.stringify(args, null, 2)}`);
                    }
                });
                console.log("");
            });

        } catch (error) {
            console.log("❌ Error querying events:", error.message);
            
            // Try to get recent blocks and their transactions
            console.log("\n📦 Checking recent blocks:");
            for (let i = Math.max(0, latestBlock - 5); i <= latestBlock; i++) {
                try {
                    const block = await ethers.provider.getBlock(i, true);
                    if (block && block.transactions.length > 0) {
                        console.log(`\n📦 Block ${i}:`);
                        console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
                        console.log(`   Transactions: ${block.transactions.length}`);
                        
                        block.transactions.forEach((tx, txIndex) => {
                            console.log(`   ${txIndex + 1}. ${tx.hash} (to: ${tx.to || 'Contract Creation'})`);
                        });
                    }
                } catch (blockError) {
                    console.log(`   Block ${i}: ${blockError.message}`);
                }
            }
        }

        // Show where events are stored
        console.log("\n📍 EVENT STORAGE LOCATIONS:");
        console.log("=" .repeat(80));
        console.log("1. 🔗 BLOCKCHAIN (Primary Source):");
        console.log("   - All events are permanently stored on the blockchain");
        console.log("   - Accessible via ethers.js queryFilter()");
        console.log("   - Immutable and publicly verifiable");
        console.log("");
        console.log("2. 💾 DATABASE (Mirrored Copy):");
        console.log("   - Table: blockchain_transactions");
        console.log("   - Fast queries and search capabilities");
        console.log("   - Updated by event listener script");
        console.log("");
        console.log("3. 🖥️  FRONTEND (Real-time Display):");
        console.log("   - BlockchainAuditLog component");
        console.log("   - Real-time event monitoring");
        console.log("   - User-friendly interface");
        console.log("");
        console.log("4. 📊 EVENT LISTENER (Live Sync):");
        console.log("   - Script: scripts/blockchain_event_listener.js");
        console.log("   - Continuously monitors blockchain");
        console.log("   - Updates database in real-time");

        // Show how to access each location
        console.log("\n🔧 HOW TO ACCESS EVENTS:");
        console.log("=" .repeat(80));
        console.log("Blockchain Direct Access:");
        console.log("   npx hardhat console");
        console.log("   > const contract = await ethers.getContractAt('TransparentSubsidySystem', 'YOUR_CONTRACT_ADDRESS')");
        console.log("   > const events = await contract.queryFilter('*', 0, 'latest')");
        console.log("");
        console.log("Database Access (MySQL required):");
        console.log("   mysql -u root -p subsidy_system");
        console.log("   > SELECT * FROM blockchain_transactions ORDER BY block_number DESC LIMIT 10;");
        console.log("");
        console.log("Frontend API Access:");
        console.log("   GET http://localhost:3000/api/blockchain/sync?action=recent_transactions&limit=10");
        console.log("");
        console.log("Start Event Listener:");
        console.log("   node scripts/blockchain_event_listener.js");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

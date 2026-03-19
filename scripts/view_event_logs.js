const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Viewing Event Logs from Blockchain and Database");

    // Get deployed contract
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract address:", contractAddress);

    try {
        // 1. Get latest block number
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`\n📦 Latest block number: ${latestBlock}`);

        // 2. Query TransactionLogged events from blockchain
        console.log("\n🔗 BLOCKCHAIN EVENT LOGS - TransactionLogged Events:");
        console.log("=" .repeat(80));
        
        try {
            const transactionFilter = contract.filters.TransactionLogged();
            const transactionEvents = await contract.queryFilter(
                transactionFilter, 
                latestBlock - 100, // Last 100 blocks
                latestBlock
            );

            if (transactionEvents.length === 0) {
                console.log("❌ No TransactionLogged events found in recent blocks");
            } else {
                console.log(`✅ Found ${transactionEvents.length} TransactionLogged events:\n`);
                
                transactionEvents.forEach((event, index) => {
                    console.log(`📝 Event ${index + 1}:`);
                    console.log(`   🆔 Item ID: ${event.args.itemId}`);
                    console.log(`   👤 Actor: ${event.args.actor}`);
                    console.log(`   🎯 Action: ${event.args.action}`);
                    console.log(`   🔗 Transaction Hash: ${event.transactionHash}`);
                    console.log(`   📦 Block Number: ${event.blockNumber}`);
                    console.log(`   📅 Block Timestamp: ${new Date().toISOString()}`);
                    console.log(`   📄 Event Index: ${event.index}`);
                    console.log("");
                });
            }
        } catch (filterError) {
            console.log("⚠️  TransactionLogged event filter not available");
            console.log("   This means the deployed contract doesn't have the updated ABI");
            console.log("   You may need to redeploy the contract with the updated version");
            console.log("   Run: npx hardhat run scripts/deploy.js --network localhost");
        }

        // 3. Query other contract events
        console.log("\n🔗 BLOCKCHAIN EVENT LOGS - All Contract Events:");
        console.log("=" .repeat(80));

        // Get all events from the contract
        const allEvents = await contract.queryFilter("*", latestBlock - 50, latestBlock);
        
        console.log(`✅ Total events found: ${allEvents.length}\n`);

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
                if (event.args && Object.keys(event.args).length > 0) {
                    console.log(`      Args: ${JSON.stringify(event.args, null, 6).slice(0, 200)}...`);
                }
            });
            console.log("");
        });

        // 4. Show database event logs (if database is available)
        console.log("\n💾 DATABASE EVENT LOGS - blockchain_transactions Table:");
        console.log("=" .repeat(80));
        
        try {
            const mysql = require('mysql2/promise');
            const dbConnection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'subsidy_system'
            });

            const [rows] = await dbConnection.execute(`
                SELECT 
                    item_id_bytes32,
                    actor_address,
                    action,
                    transaction_hash,
                    block_number,
                    created_at
                FROM blockchain_transactions
                ORDER BY block_number DESC, created_at DESC
                LIMIT 10
            `);

            if (rows.length === 0) {
                console.log("❌ No events found in database table");
            } else {
                console.log(`✅ Found ${rows.length} recent events in database:\n`);
                
                rows.forEach((row, index) => {
                    console.log(`📝 Database Event ${index + 1}:`);
                    console.log(`   🆔 Item ID: ${row.item_id_bytes32}`);
                    console.log(`   👤 Actor: ${row.actor_address}`);
                    console.log(`   🎯 Action: ${row.action}`);
                    console.log(`   🔗 Transaction Hash: ${row.transaction_hash}`);
                    console.log(`   📦 Block Number: ${row.block_number}`);
                    console.log(`   📅 Database Timestamp: ${row.created_at}`);
                    console.log("");
                });
            }

            await dbConnection.end();

        } catch (dbError) {
            console.log("⚠️ Could not connect to database:", dbError.message);
            console.log("💡 Make sure MySQL is running and environment variables are set");
        }

        // 5. Show event listener state
        console.log("\n🔄 EVENT LISTENER STATE:");
        console.log("=" .repeat(80));
        
        try {
            const mysql = require('mysql2/promise');
            const dbConnection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'subsidy_system'
            });

            const [listenerRows] = await dbConnection.execute(`
                SELECT listener_name, block_number, updated_at
                FROM event_listener_state
                WHERE listener_name = 'transaction_logged_listener'
            `);

            if (listenerRows.length > 0) {
                const state = listenerRows[0];
                console.log(`✅ Event Listener State:`);
                console.log(`   📛 Listener Name: ${state.listener_name}`);
                console.log(`   📦 Last Processed Block: ${state.block_number}`);
                console.log(`   📅 Last Updated: ${state.updated_at}`);
                console.log(`   📊 Blocks Behind: ${latestBlock - state.block_number}`);
            } else {
                console.log("❌ Event listener state not found - listener may not be running");
            }

            await dbConnection.end();

        } catch (dbError) {
            console.log("⚠️ Could not check event listener state:", dbError.message);
        }

        // 6. Show how to access logs programmatically
        console.log("\n📚 HOW TO ACCESS EVENT LOGS:");
        console.log("=" .repeat(80));
        console.log("🔗 Blockchain Events (Hardhat):");
        console.log("   npx hardhat console");
        console.log("   > const contract = await ethers.getContractAt('TransparentSubsidySystem', '0x5FbDB2315678afecb367f032d93F642f64180aa3')");
        console.log("   > const events = await contract.queryFilter(contract.filters.TransactionLogged(), 0, 'latest')");
        console.log("");
        console.log("💾 Database Events:");
        console.log("   mysql -u root -p subsidy_system");
        console.log("   > SELECT * FROM blockchain_transactions ORDER BY block_number DESC LIMIT 10;");
        console.log("");
        console.log("🖥️  Frontend API:");
        console.log("   GET /api/blockchain/sync?action=recent_transactions&limit=10");
        console.log("");
        console.log("📊 Real-time Monitoring:");
        console.log("   node scripts/blockchain_event_listener.js");

    } catch (error) {
        console.error("❌ Error viewing event logs:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 System Diagnosis Tool");

    // 1. Check Hardhat node
    console.log("\n📦 1. Checking Hardhat Node Status:");
    try {
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`✅ Hardhat node is running. Latest block: ${latestBlock}`);
        
        if (latestBlock === 0) {
            console.log("⚠️  No blocks mined yet. You may need to start mining or deploy the contract.");
        }
    } catch (error) {
        console.log("❌ Hardhat node is not running or not accessible");
        console.log("💡 Start it with: npx hardhat node");
        return;
    }

    // 2. Check contract deployment and ABI
    console.log("\n📋 2. Checking Contract Deployment:");
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    try {
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        // Check if contract exists
        const code = await ethers.provider.getCode(contractAddress);
        if (code === "0x") {
            console.log("❌ No contract deployed at this address");
            console.log("💡 Deploy with: npx hardhat run scripts/deploy.js --network localhost");
            return;
        }
        
        console.log(`✅ Contract found at: ${contractAddress}`);
        
        // Check contract ABI and available events
        try {
            const itemCount = await contract.itemCount();
            console.log(`✅ Contract is responsive. Item count: ${itemCount}`);
        } catch (error) {
            console.log("⚠️  Contract exists but may not have the expected functions");
            console.log("   Error:", error.message);
        }

        // Check if TransactionLogged event exists
        try {
            const filter = contract.filters.TransactionLogged();
            console.log("✅ TransactionLogged event filter is available");
        } catch (error) {
            console.log("❌ TransactionLogged event filter not available");
            console.log("   This means the deployed contract doesn't have the updated ABI");
            console.log("   You may need to redeploy the contract with the updated version");
        }

        // List all available events
        try {
            const events = await contract.queryFilter("*", 0, "latest");
            console.log(`📊 Found ${events.length} total events in contract history`);
            
            const eventTypes = {};
            events.forEach(event => {
                const eventName = event.event || 'UNKNOWN';
                eventTypes[eventName] = (eventTypes[eventName] || 0) + 1;
            });
            
            console.log("📋 Available event types:");
            Object.keys(eventTypes).forEach(eventName => {
                console.log(`   ${eventName}: ${eventTypes[eventName]} occurrences`);
            });
            
        } catch (error) {
            console.log("⚠️  Could not query events:", error.message);
        }

    } catch (error) {
        console.log("❌ Contract access failed:", error.message);
    }

    // 3. Check database connection
    console.log("\n💾 3. Checking Database Connection:");
    try {
        const mysql = require('mysql2/promise');
        
        const dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'subsidy_system'
        });

        console.log("✅ Database connection successful");
        
        // Check if tables exist
        const [tables] = await dbConnection.execute("SHOW TABLES");
        console.log(`📊 Found ${tables.length} tables in database`);
        
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });

        // Check blockchain_transactions table
        try {
            const [count] = await dbConnection.execute("SELECT COUNT(*) as count FROM blockchain_transactions");
            console.log(`📋 blockchain_transactions table has ${count[0].count} records`);
        } catch (error) {
            console.log("⚠️  blockchain_transactions table may not exist");
        }

        await dbConnection.end();
        
    } catch (error) {
        console.log("❌ Database connection failed:", error.message);
        console.log("💡 Make sure MySQL is running and credentials are correct in .env file");
        console.log("   Or run: mysql -u root -p < scripts/database_schema.sql");
    }

    // 4. Check environment variables
    console.log("\n🔧 4. Checking Environment Variables:");
    const requiredVars = [
        'CONTRACT_ADDRESS',
        'DB_HOST',
        'DB_USER',
        'DB_NAME'
    ];
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: ${value}`);
        } else {
            console.log(`❌ ${varName}: Not set`);
        }
    });

    // 5. Provide next steps
    console.log("\n🚀 5. Next Steps:");
    console.log("=" .repeat(50));
    
    if (latestBlock === 0) {
        console.log("1. Start mining transactions or deploy contract");
    }
    
    try {
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        contract.filters.TransactionLogged();
        console.log("2. Create some test transactions to generate events");
        console.log("   Run: node scripts/test_contract.js");
    } catch (error) {
        console.log("1. Redeploy contract with updated ABI");
        console.log("   Run: npx hardhat run scripts/deploy.js --network localhost");
    }
    
    console.log("2. Start the event listener");
    console.log("   Run: node scripts/blockchain_event_listener.js");
    
    console.log("3. View event logs");
    console.log("   Run: node scripts/view_event_logs.js");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const mysql = require('mysql2/promise');

async function testBeneficiaryTimeline() {
    try {
        console.log("🔍 Testing Beneficiary Timeline Integration...");
        
        // Connect to database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'subsidy_system'
        });
        
        console.log("✅ Database connected");
        
        // Check tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log("📋 Available tables:", tables.map(t => Object.values(t)[0]));
        
        // Check blockchain_transactions
        try {
            const [txCount] = await connection.execute('SELECT COUNT(*) as count FROM blockchain_transactions');
            console.log(`📊 Blockchain transactions: ${txCount[0].count}`);
            
            if (txCount[0].count > 0) {
                const [recentTxs] = await connection.execute('SELECT * FROM blockchain_transactions ORDER BY created_at DESC LIMIT 5');
                console.log("📝 Recent transactions:");
                recentTxs.forEach((tx, i) => {
                    console.log(`  ${i+1}. ${tx.action} by ${tx.actor_address} - Block ${tx.block_number}`);
                });
            }
        } catch (error) {
            console.log("⚠️ blockchain_transactions table not found");
        }
        
        // Check items table
        try {
            const [itemCount] = await connection.execute('SELECT COUNT(*) as count FROM items');
            console.log(`📦 Items: ${itemCount[0].count}`);
            
            if (itemCount[0].count > 0) {
                const [recentItems] = await connection.execute('SELECT * FROM items ORDER BY created_at DESC LIMIT 3');
                console.log("📦 Recent items:");
                recentItems.forEach((item, i) => {
                    console.log(`  ${i+1}. Item ${item.item_id_uint} - Stage ${item.current_stage} - ${item.claimed ? 'Claimed' : 'Pending'}`);
                });
            }
        } catch (error) {
            console.log("⚠️ items table not found");
        }
        
        // Test the beneficiary track API endpoint
        console.log("\n🌐 Testing Beneficiary Track API...");
        try {
            const response = await fetch('http://localhost:3000/api/beneficiary/track?phone=1234567890');
            if (response.ok) {
                const data = await response.json();
                console.log("✅ Beneficiary API working");
                console.log(`📊 Applications found: ${data.applications?.length || 0}`);
            } else {
                console.log("⚠️ Beneficiary API returned:", response.status);
            }
        } catch (apiError) {
            console.log("⚠️ Could not reach beneficiary API:", apiError.message);
        }
        
        await connection.end();
        console.log("\n🎯 Test completed");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testBeneficiaryTimeline();

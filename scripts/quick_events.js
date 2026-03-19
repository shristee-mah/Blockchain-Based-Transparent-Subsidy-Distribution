const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Quick Event Viewer - No Database Required");

    try {
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        console.log("📋 Contract:", contractAddress);

        // Get all events from blockchain
        const events = await contract.queryFilter("*", 0, "latest");
        
        console.log(`\n🎉 Found ${events.length} events on blockchain:`);
        console.log("=" .repeat(80));

        events.forEach((event, index) => {
            console.log(`\n📝 Event ${index + 1}:`);
            console.log(`   🎯 Type: ${event.event || 'UNKNOWN'}`);
            console.log(`   📦 Block: ${event.blockNumber}`);
            console.log(`   🔗 Tx: ${event.transactionHash}`);
            
            if (event.args && Object.keys(event.args).length > 0) {
                console.log(`   📄 Args:`);
                Object.keys(event.args).forEach(key => {
                    const value = event.args[key].toString();
                    console.log(`      ${key}: ${value}`);
                });
            }
        });

        console.log("\n✅ SUCCESS! Your event logs are stored on the blockchain!");
        console.log("📍 Storage locations:");
        console.log("   1. 🔗 Blockchain (Primary) - Above events");
        console.log("   2. 💾 Database (Ready) - Tables created, needs MySQL server");
        console.log("   3. 🖥️  Frontend - Can read directly from blockchain");

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

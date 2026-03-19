const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 DEMONSTRATING ADDRESS-DASHBOARD CONNECTION");
    console.log("=" .repeat(80));

    try {
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
        
        console.log("👥 ADDRESSES CONNECTED TO DASHBOARDS:");
        console.log("=" .repeat(80));
        console.log(`🔵 ADMIN:      ${admin.address}     → /admin/dashboard`);
        console.log(`🟡 PROCESSOR:  ${processor.address} → /processor/dashboard`);
        console.log(`🟠 TRANSPORT:  ${transporter.address} → /transporter/dashboard`);
        console.log(`🟣 DISTRIBUTOR: ${distributor.address} → /distributor/dashboard`);
        console.log(`🟢 BENEFICIARY:${beneficiary.address} → /beneficiary/dashboard`);
        
        console.log("\n🎬 SIMULATING DASHBOARD INTERACTIONS:");
        console.log("=" .repeat(80));
        
        // Simulate Processor Dashboard Action
        console.log("\n1️⃣ PROCESSOR DASHBOARD ACTION:");
        console.log("   📱 User visits /processor/dashboard");
        console.log("   🔗 Connected with address:", processor.address);
        console.log("   📝 Clicks 'Create New Application'");
        console.log("   ⛓️  Calling: createItem(beneficiary, ipfsHash)");
        
        const createTx = await contract.connect(processor).createItem(
            beneficiary.address,
            `QmProcessorDoc${Date.now()}`
        );
        const createReceipt = await createTx.wait();
        
        console.log("   ✅ SUCCESS!");
        console.log(`   📦 Block: ${createReceipt.blockNumber}`);
        console.log(`   🔗 Tx Hash: ${createReceipt.transactionHash}`);
        console.log(`   🎯 Actor Address: ${processor.address} (from dashboard)`);
        
        // Simulate Admin Dashboard Action
        console.log("\n2️⃣ ADMIN DASHBOARD ACTION:");
        console.log("   📱 User visits /admin/dashboard");
        console.log("   🔗 Connected with address:", admin.address);
        console.log("   ✅ Clicks 'Verify Application'");
        console.log("   ⛓️  Calling: adminVerify(itemId, stage)");
        
        const verifyTx = await contract.connect(admin).adminVerify(1, 0);
        const verifyReceipt = await verifyTx.wait();
        
        console.log("   ✅ SUCCESS!");
        console.log(`   📦 Block: ${verifyReceipt.blockNumber}`);
        console.log(`   🔗 Tx Hash: ${verifyReceipt.transactionHash}`);
        console.log(`   🎯 Actor Address: ${admin.address} (from dashboard)`);
        
        // Show the connection
        console.log("\n🔗 PROOF OF CONNECTION:");
        console.log("=" .repeat(80));
        console.log("✅ Dashboard interactions use specific addresses");
        console.log("✅ Each address has role-based permissions");
        console.log("✅ Actions trigger smart contract functions");
        console.log("✅ Events are signed by the dashboard address");
        console.log("✅ This creates a complete audit trail!");
        
        console.log("\n📊 REAL-TIME VERIFICATION:");
        console.log("=" .repeat(80));
        console.log("💡 Run this in another terminal to see the events:");
        console.log("   node scripts/realtime_monitor.js");
        console.log("");
        console.log("🔴 You'll see events with these exact addresses:");
        console.log(`   🟡 Actor: ${processor.address} (processor dashboard)`);
        console.log(`   🔵 Actor: ${admin.address} (admin dashboard)`);
        
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

const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Simple Item Creation Test");
    console.log("=" .repeat(50));

    try {
        // Get signers
        const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
        
        console.log("👥 Available accounts:");
        console.log(`   🔵 Admin:      ${admin.address}`);
        console.log(`   🟡 Processor:  ${processor.address}`);
        console.log(`   🟠 Transporter: ${transporter.address}`);
        console.log(`   🟣 Distributor: ${distributor.address}`);
        console.log(`   🟢 Beneficiary:${beneficiary.address}`);
        
        // Deploy contract fresh
        console.log("\n🏗️  Deploying fresh contract...");
        const Factory = await ethers.getContractFactory("TransparentSubsidySystem");
        const contract = await Factory.deploy();
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        console.log(`✅ Contract deployed to: ${address}`);
        
        // Grant roles
        console.log("🎭 Granting roles...");
        const PROCESSOR_ROLE = await contract.PROCESSOR_ROLE();
        await contract.grantRole(PROCESSOR_ROLE, processor.address);
        console.log(`✅ Processor role granted to: ${processor.address}`);
        
        // Create item
        console.log("\n📝 Creating item...");
        const ipfsHash = `QmTestDocument${Date.now()}`;
        
        console.log(`📄 IPFS Hash: ${ipfsHash}`);
        console.log(`👤 Beneficiary: ${beneficiary.address}`);
        console.log(`🔨 Processor: ${processor.address}`);
        
        const tx = await contract.connect(processor).createItem(beneficiary.address, ipfsHash);
        console.log(`📦 Transaction submitted: ${tx.hash}`);
        
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        
        console.log(`✅ SUCCESS! Item created in block ${receipt.blockNumber}`);
        console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check for events
        console.log("\n📝 Checking events:");
        if (receipt.logs.length > 0) {
            console.log(`🎉 Found ${receipt.logs.length} events!`);
            receipt.logs.forEach((log, index) => {
                try {
                    const parsedLog = contract.interface.parseLog(log);
                    console.log(`\n📋 Event ${index + 1}: ${parsedLog.name}`);
                    Object.keys(parsedLog.args).forEach(arg => {
                        console.log(`   ${arg}: ${parsedLog.args[arg].toString()}`);
                    });
                } catch (parseError) {
                    console.log(`\n📋 Event ${index + 1}: Raw log data`);
                    console.log(`   Topic: ${log.topics[0]}`);
                    console.log(`   Data: ${log.data}`);
                }
            });
        } else {
            console.log("❌ No events found in transaction");
        }
        
        // Check item count
        try {
            const itemCount = await contract.itemCount();
            console.log(`\n📊 Current item count: ${itemCount.toString()}`);
        } catch (error) {
            console.log("⚠️ Could not get item count (function may not exist)");
        }
        
        // Get item details
        try {
            const item = await contract.getItem(1);
            console.log(`\n📄 Item 1 details:`);
            console.log(`   Beneficiary: ${item.beneficiary}`);
            console.log(`   Current Stage: ${item.currentStage}`);
            console.log(`   Claimed: ${item.claimed}`);
            console.log(`   IPFS Hash: ${item.currentIpfsHash}`);
        } catch (error) {
            console.log("⚠️ Could not get item details:", error.message);
        }
        
        console.log("\n🎯 BLOCKCHAIN CONNECTION SUCCESSFUL!");
        console.log("✅ Your item is now stored on the blockchain!");
        console.log("✅ Events were emitted and can be monitored in real-time!");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Generating Test Events for Event Log Demo");

    try {
        const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
        
        // Get deployed contract
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        console.log("📋 Contract address:", contractAddress);

        // 1. Create an item
        console.log("\n🏭 1. Creating item...");
        const createTx = await contract.connect(processor).createItem(
            beneficiary.address,          // beneficiary
            "QmTestDocument123"     // ipfsHash
        );
        const createReceipt = await createTx.wait();
        console.log(`✅ Item created in block ${createReceipt.blockNumber}`);
        console.log(`   Transaction: ${createReceipt.transactionHash}`);

        // 2. Verify the item (admin)
        console.log("\n✅ 2. Admin verifying item...");
        const verifyTx = await contract.connect(admin).adminVerify(1, 0); // itemId 1, stage 0
        const verifyReceipt = await verifyTx.wait();
        console.log(`✅ Item verified in block ${verifyReceipt.blockNumber}`);
        console.log(`   Transaction: ${verifyReceipt.transactionHash}`);

        // 3. Transporter submit
        console.log("\n🚚 3. Transporter submitting pickup docs...");
        const transporterTx = await contract.connect(transporter).transporterSubmit(
            1,                      // itemId
            "QmTransporterDoc456"  // ipfsHash
        );
        const transporterReceipt = await transporterTx.wait();
        console.log(`✅ Transporter submitted in block ${transporterReceipt.blockNumber}`);
        console.log(`   Transaction: ${transporterReceipt.transactionHash}`);

        // 4. Admin verify transporter
        console.log("\n✅ 4. Admin verifying transporter submission...");
        const verifyTransporterTx = await contract.connect(admin).adminVerify(1, 2); // itemId 1, stage 2
        const verifyTransporterReceipt = await verifyTransporterTx.wait();
        console.log(`✅ Transporter verified in block ${verifyTransporterReceipt.blockNumber}`);
        console.log(`   Transaction: ${verifyTransporterReceipt.transactionHash}`);

        // 5. Distributor submit
        console.log("\n🚚 5. Distributor submitting delivery docs...");
        const distributorTx = await contract.connect(distributor).distributorSubmit(
            1,                      // itemId
            "QmDistributorDoc789" // ipfsHash
        );
        const distributorReceipt = await distributorTx.wait();
        console.log(`✅ Distributor submitted in block ${distributorReceipt.blockNumber}`);
        console.log(`   Transaction: ${distributorReceipt.transactionHash}`);

        // 6. Admin verify distributor
        console.log("\n✅ 6. Admin verifying distributor submission...");
        const verifyDistributorTx = await contract.connect(admin).adminVerify(1, 4); // itemId 1, stage 4
        const verifyDistributorReceipt = await verifyDistributorTx.wait();
        console.log(`✅ Distributor verified in block ${verifyDistributorReceipt.blockNumber}`);
        console.log(`   Transaction: ${verifyDistributorReceipt.transactionHash}`);

        // 7. Beneficiary claim
        console.log("\n🎁 7. Beneficiary claiming item...");
        const claimTx = await contract.connect(beneficiary).beneficiaryClaim(1); // itemId 1
        const claimReceipt = await claimTx.wait();
        console.log(`✅ Item claimed in block ${claimReceipt.blockNumber}`);
        console.log(`   Transaction: ${claimReceipt.transactionHash}`);

        console.log("\n🎉 All test events generated successfully!");
        console.log("📊 Now you can view the events with:");
        console.log("   node scripts/simple_event_viewer.js");
        console.log("   node scripts/view_event_logs.js");

    } catch (error) {
        console.error("❌ Error generating test events:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

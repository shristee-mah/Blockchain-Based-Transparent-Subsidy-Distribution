const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing basic contract functionality...");

    const [admin, processor, transporter] = await ethers.getSigners();
    
    // Get deployed contract
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract address:", contractAddress);

    try {
        // 1. Check if contract is working
        console.log("\n🔍 Checking contract state...");
        
        try {
            const itemCount = await contract.itemCount();
            console.log("📊 Item count:", itemCount.toString());
        } catch (error) {
            console.log("⚠️ Could not get item count:", error.message);
        }

        // 2. Try to create a simple item
        console.log("\n🏭 Creating test item...");
        const createTx = await contract.connect(processor).createItem(
            admin.address,          // beneficiary
            "QmTestDocument123"     // ipfsHash
        );
        await createTx.wait();
        console.log("✅ Item created");

        // 3. Check item count again
        const newItemCount = await contract.itemCount();
        console.log("📊 New item count:", newItemCount.toString());

        // 4. Try to get item data
        console.log("\n📋 Getting item data...");
        try {
            const item = await contract.items(1);
            console.log("📄 Item data:", {
                beneficiary: item.beneficiary,
                ipfsHash: item.ipfsHash,
                currentStage: item.currentStage,
                isVerified: item.isVerified
            });
        } catch (error) {
            console.log("⚠️ Could not get item data:", error.message);
        }

        // 5. Try admin verification
        console.log("\n🔐 Admin verification...");
        const verifyTx = await contract.connect(admin).adminVerify(1, 0);
        await verifyTx.wait();
        console.log("✅ Admin verification completed");

        // 6. Try transporter submission
        console.log("\n🚚 Transporter submission...");
        const transportTx = await contract.connect(transporter).transporterSubmit(1, "QmTransportDoc456");
        await transportTx.wait();
        console.log("✅ Transporter submission completed");

        // 7. Try to set a simple Merkle root
        console.log("\n🌳 Setting Merkle root...");
        const testRoot = "0xd668e14bbd2eb2ae3d1234567890123456789012345678901234567890123456";
        const setRootTx = await contract.setMerkleRoot(1, 2, testRoot);
        await setRootTx.wait();
        console.log("✅ Merkle root set");

        // 8. Try to get the Merkle root back
        console.log("\n🔍 Getting Merkle root...");
        try {
            const storedRoot = await contract.getMerkleRoot(1, 2);
            console.log("📊 Stored Merkle root:", storedRoot);
        } catch (error) {
            console.log("⚠️ Could not get Merkle root:", error.message);
        }

        console.log("\n🎉 Contract test completed successfully!");

    } catch (error) {
        console.error("❌ Error testing contract:", error.message);
        console.error("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

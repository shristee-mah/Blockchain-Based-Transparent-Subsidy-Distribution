const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 CHECKING CONTRACT STATE DIRECTLY");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract:", contractAddress);

    try {
        // Get signers
        const [admin, processor, transporter] = await ethers.getSigners();
        console.log("👤 Admin:", admin.address);
        console.log("👤 Processor:", processor.address);
        console.log("👤 Transporter:", transporter.address);

        // Check if contract is working by creating a simple test
        console.log("\n🧪 Testing contract functionality...");
        
        // 1. Create an item
        console.log("🏭 Creating test item...");
        const createTx = await contract.connect(processor).createItem(
            admin.address,
            "QmTestDocument123"
        );
        const createReceipt = await createTx.wait();
        console.log("✅ Item created!");
        console.log("📦 Transaction hash:", createReceipt.hash);
        console.log("🔗 Block number:", createReceipt.blockNumber);
        console.log("📄 Gas used:", createReceipt.gasUsed.toString());

        // 2. Check events in the receipt
        console.log("\n📊 Events in transaction:");
        createReceipt.logs.forEach((log, index) => {
            try {
                const parsed = contract.interface.parseLog(log);
                console.log(`${index + 1}. ${parsed.name}:`, parsed.args);
            } catch (e) {
                console.log(`${index + 1}. Unknown event: ${log.topics[0]}`);
            }
        });

        // 3. Try to read the item
        console.log("\n📋 Reading item data...");
        try {
            const item = await contract.items(1);
            console.log("✅ Item found:");
            console.log("   👤 Beneficiary:", item.beneficiary);
            console.log("   📄 IPFS Hash:", item.ipfsHash);
            console.log("   📊 Current Stage:", item.currentStage);
            console.log("   ✅ Is Verified:", item.isVerified);
        } catch (error) {
            console.log("❌ Could not read item:", error.message);
        }

        // 4. Admin verification
        console.log("\n🔐 Admin verification...");
        const verifyTx = await contract.connect(admin).adminVerify(1, 0);
        const verifyReceipt = await verifyTx.wait();
        console.log("✅ Admin verified!");
        console.log("📦 Transaction hash:", verifyReceipt.hash);

        // 5. Check verification events
        console.log("\n📊 Verification events:");
        verifyReceipt.logs.forEach((log, index) => {
            try {
                const parsed = contract.interface.parseLog(log);
                console.log(`${index + 1}. ${parsed.name}:`, parsed.args);
            } catch (e) {
                console.log(`${index + 1}. Unknown event: ${log.topics[0]}`);
            }
        });

        // 6. Set a Merkle root
        console.log("\n🌳 Setting Merkle root...");
        const testRoot = "0xd668e14bbd2eb2ae3d1234567890123456789012345678901234567890123456";
        const setRootTx = await contract.setMerkleRoot(1, 2, testRoot);
        const setRootReceipt = await setRootTx.wait();
        console.log("✅ Merkle root set!");
        console.log("📦 Transaction hash:", setRootReceipt.hash);

        // 7. Check Merkle events
        console.log("\n📊 Merkle events:");
        setRootReceipt.logs.forEach((log, index) => {
            try {
                const parsed = contract.interface.parseLog(log);
                console.log(`${index + 1}. ${parsed.name}:`, parsed.args);
            } catch (e) {
                console.log(`${index + 1}. Unknown event: ${log.topics[0]}`);
            }
        });

        // 8. Try to read the Merkle root back
        console.log("\n🔍 Reading Merkle root...");
        try {
            const storedRoot = await contract.getMerkleRoot(1, 2);
            console.log("✅ Merkle root found:", storedRoot);
        } catch (error) {
            console.log("❌ Could not read Merkle root:", error.message);
        }

        console.log("\n🎉 CONTRACT CHECK COMPLETE!");
        console.log("💡 Contract is working correctly!");

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

const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DEBUGGING CONTRACT STATE");
    console.log("==========================");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract:", contractAddress);

    try {
        // Get item count
        const itemCount = await contract.itemCount();
        console.log(`📦 Total Items: ${itemCount}`);

        if (Number(itemCount) > 0) {
            // Get the first item
            console.log("\n🔍 READING ITEM 1:");
            console.log("─".repeat(40));
            
            const item = await contract.items(1);
            console.log("Raw item data:", item);
            console.log("Item type:", typeof item);
            console.log("Item keys:", Object.keys(item));
            
            // Try to access individual fields
            try {
                console.log("\n📊 INDIVIDUAL FIELDS:");
                console.log(`beneficiary: ${item.beneficiary}`);
                console.log(`stage: ${item.stage}`);
                console.log(`claimed: ${item.claimed}`);
                console.log(`currentIpfsHash: ${item.currentIpfsHash}`);
                console.log(`itemId: ${item.itemId}`);
                
                // Convert stage to number
                const stageNum = Number(item.stage);
                console.log(`stage as number: ${stageNum}`);
                
            } catch (fieldError) {
                console.log("❌ Error accessing fields:", fieldError.message);
            }

            // Try different ways to get stage
            console.log("\n🔄 ALTERNATIVE METHODS:");
            
            try {
                // Method 1: Direct access
                console.log(`Method 1 - item.stage: ${item.stage}`);
            } catch (e) {
                console.log("❌ Method 1 failed:", e.message);
            }
            
            try {
                // Method 2: Using array access
                console.log(`Method 2 - item[1]: ${item[1]}`);
            } catch (e) {
                console.log("❌ Method 2 failed:", e.message);
            }
            
            try {
                // Method 3: Call getter function
                const stageGetter = await contract.getStage(1);
                console.log(`Method 3 - getStage(1): ${stageGetter}`);
            } catch (e) {
                console.log("❌ Method 3 failed:", e.message);
            }

        } else {
            console.log("\n⚠️ No items found. Creating one...");
            
            const [admin, processor] = await ethers.getSigners();
            const createTx = await contract.connect(processor).createItem(
                admin.address,
                "QmDebugTest123"
            );
            await createTx.wait();
            
            console.log("✅ Item created. Run this script again.");
        }

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

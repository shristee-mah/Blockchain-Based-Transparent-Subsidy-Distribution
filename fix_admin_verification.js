const { ethers } = require("ethers");

async function fixAdminVerification() {
    try {
        console.log("🔧 Fixing admin verification for Item 1...");
        
        // Setup provider
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        // Use the same ABI as the frontend
        const contractABI = [
            "function adminVerify(uint256 itemId, uint8 expectedCurrentStage)",
            "event ItemVerified(uint256 indexed itemId, uint8 newStage)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Listen for ItemVerified events
        contract.on("ItemVerified", (itemId, newStage, event) => {
            console.log(`🔍 ItemVerified event detected:`);
            console.log(`  📦 Item ID: ${itemId}`);
            console.log(`  📊 New Stage: ${newStage}`);
            console.log(`  🔗 Block: ${event.blockNumber}`);
            console.log(`  📄 TX: ${event.transactionHash}`);
            
            if (Number(itemId) === 1) {
                console.log("✅ Item 1 verification successful!");
            }
        });
        
        // Try direct verification with minimal gas
        console.log("🔄 Attempting direct admin verification...");
        try {
            const tx = await contract.adminVerify(1, 0, {
                gasLimit: 500000 // Higher gas limit
            });
            const receipt = await tx.wait();
            console.log("✅ Direct verification successful!");
            console.log("📄 Transaction hash:", tx.hash);
            console.log("📊 Gas used:", receipt.gasUsed.toString());
            
            // Listen for the event
            setTimeout(() => {
                console.log("👀 Waiting for ItemVerified event...");
            }, 2000);
            
        } catch (error) {
            console.error("❌ Direct verification failed:", error.message);
            
            // Try with ADMIN_KEY
            console.log("🔄 Trying with ADMIN_KEY...");
            try {
                const adminContract = new ethers.Contract(contractAddress, contractABI, provider.getSigner());
                const tx2 = await adminContract.adminVerify(1, 0, {
                    gasLimit: 500000
                });
                const receipt2 = await tx2.wait();
                console.log("✅ ADMIN_KEY verification successful!");
                console.log("📄 Transaction hash:", tx2.hash);
                console.log("📊 Gas used:", receipt2.gasUsed.toString());
            } catch (error2) {
                console.error("❌ ADMIN_KEY verification also failed:", error2.message);
            }
        }
        
    } catch (error) {
        console.error("❌ Fix failed:", error.message);
    }
}

// Run the fix
fixAdminVerification();

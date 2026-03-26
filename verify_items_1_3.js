const { ethers } = require("ethers");

async function verifyItems1to3() {
    try {
        console.log("🔧 Verifying Items 1-3 for transporter access...");
        
        // Setup provider with ADMIN_KEY
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const wallet = new ethers.Wallet(privateKey, provider);
        
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contractABI = [
            "function adminVerify(uint256 itemId, uint8 expectedCurrentStage)",
            "event ItemVerified(uint256 indexed itemId, uint8 newStage)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);
        
        // Verify items 1, 2, and 3 at Stage 0 (Created)
        for (let itemId = 1; itemId <= 3; itemId++) {
            console.log(`\n🔄 Verifying Item ${itemId}...`);
            
            try {
                const tx = await contract.adminVerify(itemId, 0, {
                    gasLimit: 500000
                });
                const receipt = await tx.wait();
                
                console.log(`✅ Item ${itemId} verified successfully!`);
                console.log(`📄 Transaction hash: ${tx.hash}`);
                console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
                
            } catch (error) {
                console.log(`❌ Item ${itemId} verification failed: ${error.message}`);
            }
        }
        
        console.log("\n🎉 Verification complete! Transporter can now upload documents to Items 1-3");
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    }
}

// Run the verification
verifyItems1to3();

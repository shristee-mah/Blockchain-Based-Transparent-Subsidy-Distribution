const { ethers } = require("ethers");

async function forceVerifyItem1() {
    try {
        console.log("🔧 Force verifying Item 1 with all possible stages...");
        
        // Setup provider
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        // Use ADMIN_KEY signer
        const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const wallet = new ethers.Wallet(privateKey, provider);
        
        const contractABI = [
            "function adminVerify(uint256 itemId, uint8 expectedCurrentStage)",
            "event ItemVerified(uint256 indexed itemId, uint8 newStage)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);
        
        // Try all possible stages
        const stages = [0, 1, 2, 3, 4, 5, 6, 7];
        const stageNames = ["Created", "VerifiedByAdmin", "TransporterReady", "InTransit", "DistributorReady", "Distributed", "Claimed", "Cancelled"];
        
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const stageName = stageNames[i];
            
            console.log(`🔄 Trying stage ${stage} (${stageName})...`);
            
            try {
                const tx = await contract.adminVerify(1, stage, {
                    gasLimit: 500000
                });
                const receipt = await tx.wait();
                console.log(`✅ SUCCESS! Item 1 verified at stage ${stage} (${stageName})`);
                console.log(`📄 Transaction hash: ${tx.hash}`);
                console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
                return;
            } catch (error) {
                console.log(`❌ Stage ${stage} failed: ${error.message}`);
            }
        }
        
        console.log("❌ All stages failed. Item might be in an invalid state.");
        
    } catch (error) {
        console.error("❌ Force verification failed:", error.message);
    }
}

// Run the force verification
forceVerifyItem1();

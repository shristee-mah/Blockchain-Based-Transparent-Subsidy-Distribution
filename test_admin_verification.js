const { ethers } = require("ethers");

async function testAdminVerification() {
    try {
        console.log("🧪 Testing Admin Verification...");
        
        // Setup provider and contract
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contractABI = [
            "function items(uint256 itemId) view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))",
            "function adminVerify(uint256 itemId, uint8 expectedCurrentStage)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Get item details for itemId 1 (should exist from processor submission)
        console.log("📋 Getting item details for itemId 1...");
        const item = await contract.items(1);
        console.log("📦 Item details:", {
            beneficiary: item.beneficiary,
            stage: Number(item.stage),
            claimed: item.claimed,
            itemId: item.itemId
        });
        
        // Try to verify at Stage.Created (0)
        console.log("🔍 Attempting verification at Stage.Created (0)...");
        try {
            const tx = await contract.adminVerify(1, 0);
            const receipt = await tx.wait();
            console.log("✅ Verification successful!");
            console.log("📄 Transaction hash:", tx.hash);
            console.log("📊 Gas used:", receipt.gasUsed.toString());
        } catch (error) {
            console.error("❌ Verification failed:", error.message);
            
            // Try to decode the error
            if (error.data) {
                console.log("🔍 Error data:", error.data);
            }
        }
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

// Run the test
testAdminVerification();

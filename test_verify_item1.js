const { ethers } = require("ethers");

async function testVerifyItem1() {
    try {
        console.log("🧪 Testing admin verification for Item 1...");
        
        // Setup provider and contract
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contractABI = [
            "function adminVerify(uint256 itemId, uint8 expectedCurrentStage)",
            "function items(uint256 itemId) view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Get item 1 details
        const item = await contract.items(1);
        console.log("📦 Item 1 details:", {
            beneficiary: item.beneficiary,
            stage: Number(item.stage),
            claimed: item.claimed,
            ipfs: item.currentIpfsHash
        });
        
        // Try to verify at Stage.Created (0)
        console.log("🔍 Attempting admin verification at Stage.Created (0)...");
        try {
            const tx = await contract.adminVerify(1, 0);
            const receipt = await tx.wait();
            console.log("✅ Verification successful!");
            console.log("📄 Transaction hash:", tx.hash);
            console.log("📊 Gas used:", receipt.gasUsed.toString());
            
            // Check what stage it moved to
            const updatedItem = await contract.items(1);
            console.log("📊 New stage:", Number(updatedItem.stage));
            
        } catch (error) {
            console.error("❌ Verification failed:", error.message);
        }
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

// Run the test
testVerifyItem1();

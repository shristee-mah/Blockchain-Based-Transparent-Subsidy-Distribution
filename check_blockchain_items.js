const { ethers } = require("ethers");

async function checkBlockchainItems() {
    try {
        console.log("🔍 Checking all items on blockchain...");
        
        // Setup provider and contract
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contractABI = [
            "function itemCount() view returns (uint256)",
            "function items(uint256 itemId) view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Get total item count
        const totalCount = await contract.itemCount();
        console.log(`📊 Total items on blockchain: ${totalCount}`);
        
        // Check each item
        for (let i = 1; i <= totalCount; i++) {
            try {
                const item = await contract.items(i);
                console.log(`\n📦 Item ${i}:`);
                console.log(`  👤 Beneficiary: ${item.beneficiary}`);
                console.log(`  📊 Stage: ${Number(item.stage)} (${getStageName(Number(item.stage))})`);
                console.log(`  ✅ Claimed: ${item.claimed}`);
                console.log(`  📁 IPFS: ${item.currentIpfsHash}`);
                console.log(`  🆔 Item ID: ${item.itemId}`);
            } catch (error) {
                console.error(`❌ Error getting item ${i}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error("❌ Check failed:", error.message);
    }
}

function getStageName(stage) {
    const stages = {
        0: "Created",
        1: "VerifiedByAdmin", 
        2: "TransporterReady",
        3: "InTransit",
        4: "DistributorReady",
        5: "Distributed",
        6: "Claimed",
        7: "Cancelled"
    };
    return stages[stage] || `Unknown(${stage})`;
}

// Run the check
checkBlockchainItems();

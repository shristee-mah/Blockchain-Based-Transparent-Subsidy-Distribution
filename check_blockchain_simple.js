const { ethers } = require("ethers");

async function checkBlockchainItems() {
    try {
        console.log("🔍 Checking all items on blockchain...");
        
        // Setup provider and contract
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contractABI = [
            "function itemCount() view returns (uint256)",
            "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
            "event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Get total item count
        const totalCount = await contract.itemCount();
        console.log(`📊 Total items on blockchain: ${totalCount}`);
        
        // Get ItemCreated events instead
        const itemCreatedEvents = await contract.queryFilter(
            contract.filters.ItemCreated(),
            0,
            'latest'
        );
        
        console.log(`📋 Found ${itemCreatedEvents.length} ItemCreated events:`);
        
        itemCreatedEvents.forEach((event, index) => {
            console.log(`\n🆕 Item ${index + 1}:`);
            console.log(`  📦 Item ID: ${event.args.itemId}`);
            console.log(`  👤 Beneficiary: ${event.args.beneficiary}`);
            console.log(`  📁 IPFS: ${event.args.ipfsHash}`);
            console.log(`  🔗 Block: ${event.blockNumber}`);
            console.log(`  📄 TX: ${event.transactionHash}`);
        });
        
    } catch (error) {
        console.error("❌ Check failed:", error.message);
    }
}

// Run the check
checkBlockchainItems();

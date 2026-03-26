const { ethers } = require("ethers");

async function checkItemStages() {
    try {
        console.log("🔍 Checking item stages for transporter workflow...");
        
        // Setup provider
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        // Listen to events to determine stages
        const contractABI = [
            "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
            "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
            "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
            "event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Get all ItemCreated events
        const itemCreatedEvents = await contract.queryFilter(
            contract.filters.ItemCreated(),
            0,
            'latest'
        );
        
        // Get all ItemVerified events
        const itemVerifiedEvents = await contract.queryFilter(
            contract.filters.ItemVerified(),
            0,
            'latest'
        );
        
        // Get all DocumentUploaded events
        const documentEvents = await contract.queryFilter(
            contract.filters.DocumentUploaded(),
            0,
            'latest'
        );
        
        console.log(`📊 Found ${itemCreatedEvents.length} items, ${itemVerifiedEvents.length} verifications, ${documentEvents.length} document uploads`);
        
        // Check each item's current stage
        for (let i = 1; i <= itemCreatedEvents.length; i++) {
            console.log(`\n📦 Item ${i}:`);
            
            // Find creation event
            const created = itemCreatedEvents.find(e => Number(e.args.itemId) === i);
            if (created) {
                console.log(`  🆕 Created: Block ${created.blockNumber}`);
                console.log(`  👤 Beneficiary: ${created.args.beneficiary}`);
                console.log(`  📁 IPFS: ${created.args.ipfsHash}`);
            }
            
            // Find verification events
            const verifications = itemVerifiedEvents.filter(e => Number(e.args.itemId) === i);
            verifications.forEach(v => {
                console.log(`  ✅ Verified: Stage ${v.args.newStage} at Block ${v.blockNumber}`);
            });
            
            // Find document uploads
            const docs = documentEvents.filter(e => Number(e.args.itemId) === i);
            docs.forEach(d => {
                console.log(`  📄 Document: Stage ${d.args.stage} by ${d.args.uploader} at Block ${d.blockNumber}`);
            });
            
            // Determine current stage
            let currentStage = 0; // Created
            if (verifications.length > 0) {
                const lastVerification = verifications[verifications.length - 1];
                currentStage = Number(lastVerification.args.newStage);
            }
            
            const stageNames = ["Created", "VerifiedByAdmin", "TransporterReady", "InTransit", "DistributorReady", "Distributed", "Claimed", "Cancelled"];
            console.log(`  📊 Current Stage: ${currentStage} (${stageNames[currentStage]})`);
            
            // Check if transporter can upload
            if (currentStage === 1) { // VerifiedByAdmin
                console.log(`  ✅ Transporter CAN upload documents`);
            } else {
                console.log(`  ❌ Transporter CANNOT upload documents (needs admin verification)`);
            }
        }
        
    } catch (error) {
        console.error("❌ Check failed:", error.message);
    }
}

// Run the check
checkItemStages();

const { ethers } = require("hardhat");

async function main() {
    console.log("📊 Viewing blockchain ledger...");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract address:", contractAddress);

    try {
        // Get all events to see what's in the ledger
        console.log("\n🔍 Fetching contract events...");
        
        const filter = {
            address: contractAddress,
            fromBlock: 0,
            toBlock: "latest"
        };
        
        const provider = ethers.provider;
        const logs = await provider.getLogs(filter);
        
        console.log(`📊 Found ${logs.length} events:`);
        
        logs.forEach((log, index) => {
            try {
                const parsed = contract.interface.parseLog(log);
                console.log(`\n${index + 1}. Event: ${parsed.name}`);
                console.log(`   Args:`, parsed.args);
                
                if (parsed.name === "ItemCreated") {
                    console.log(`   🏭 Item ${parsed.args.itemId} created for ${parsed.args.beneficiary}`);
                }
                if (parsed.name === "AdminVerified") {
                    console.log(`   🔐 Item ${parsed.args.itemId} verified at stage ${parsed.args.stage}`);
                }
                if (parsed.name === "TransporterSubmitted") {
                    console.log(`   🚚 Transporter submitted for item ${parsed.args.itemId}`);
                }
                if (parsed.name === "MerkleRootSet") {
                    console.log(`   🌳 Merkle root set for item ${parsed.args.itemId}, stage ${parsed.args.stage}`);
                    console.log(`   🔐 Root: ${parsed.args.merkleRoot.slice(0, 20)}...`);
                }
            } catch (e) {
                console.log(`${index + 1}. Unknown event: ${log.topics[0]}`);
            }
        });
        
        console.log("\n🎉 Ledger view completed!");
        
    } catch (error) {
        console.error("❌ Error viewing ledger:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

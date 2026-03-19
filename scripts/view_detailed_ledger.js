const { ethers } = require("hardhat");

async function main() {
    console.log("📊 DETAILED LEDGER VIEWER");
    console.log("========================");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract:", contractAddress);
    console.log("🔗 Network:", "localhost (Hardhat)");

    try {
        // Get all events
        console.log("\n🔍 FETCHING LEDGER DATA...");
        const provider = ethers.provider;
        const latestBlock = await provider.getBlockNumber();
        console.log("📦 Latest block:", latestBlock);

        // Get all logs
        const filter = {
            address: contractAddress,
            fromBlock: 0,
            toBlock: "latest"
        };
        
        const logs = await provider.getLogs(filter);
        console.log(`📊 Found ${logs.length} transactions\n`);

        // Group events by type
        const events = {
            ItemCreated: [],
            AdminVerified: [],
            TransporterSubmitted: [],
            MerkleRootSet: [],
            DocumentBatchVerified: [],
            Other: []
        };

        // Parse and categorize events
        logs.forEach((log, index) => {
            try {
                const parsed = contract.interface.parseLog(log);
                const eventInfo = {
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    args: parsed.args
                };

                if (events.hasOwnProperty(parsed.name)) {
                    events[parsed.name].push(eventInfo);
                } else {
                    events.Other.push({ ...eventInfo, eventName: parsed.name });
                }
            } catch (e) {
                events.Other.push({
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    topic: log.topics[0],
                    error: "Could not parse"
                });
            }
        });

        // Display each category
        Object.entries(events).forEach(([category, eventList]) => {
            if (eventList.length > 0) {
                console.log(`\n📂 ${category.toUpperCase()} (${eventList.length}):`);
                console.log("─".repeat(50));
                
                eventList.forEach((event, index) => {
                    console.log(`\n${index + 1}. Block: ${event.blockNumber} | Tx: ${event.transactionHash.slice(0, 10)}...`);
                    
                    if (category === 'ItemCreated') {
                        console.log(`   🏭 Item ${event.args.itemId} created`);
                        console.log(`   👤 Beneficiary: ${event.args.beneficiary}`);
                        console.log(`   📄 Document: ${event.args.ipfsHash}`);
                    }
                    if (category === 'AdminVerified') {
                        console.log(`   🔐 Item ${event.args.itemId} verified`);
                        console.log(`   📊 Stage: ${event.args.stage}`);
                        console.log(`   👤 Admin: ${event.args.admin}`);
                    }
                    if (category === 'TransporterSubmitted') {
                        console.log(`   🚚 Item ${event.args.itemId} submitted`);
                        console.log(`   📄 CID: ${event.args.cid}`);
                        console.log(`   👤 Transporter: ${event.args.transporter}`);
                    }
                    if (category === 'MerkleRootSet') {
                        console.log(`   🌳 Item ${event.args.itemId}, Stage ${event.args.stage}`);
                        console.log(`   🔐 Root: ${event.args.merkleRoot.slice(0, 20)}...`);
                        console.log(`   👤 Set by: ${event.args.setter}`);
                    }
                    if (category === 'DocumentBatchVerified') {
                        console.log(`   📊 Item ${event.args.itemId}, Stage ${event.args.stage}`);
                        console.log(`   🔐 Root: ${event.args.merkleRoot.slice(0, 20)}...`);
                        console.log(`   📄 Documents: ${event.args.documentCount}`);
                    }
                    if (category === 'Other') {
                        console.log(`   ❓ ${event.eventName || event.topic}`);
                    }
                });
            }
        });

        // Current contract state
        console.log("\n📊 CURRENT CONTRACT STATE:");
        console.log("─".repeat(50));
        
        try {
            const itemCount = await contract.itemCount();
            console.log(`📦 Total Items: ${itemCount}`);
        } catch (e) {
            console.log("📦 Total Items: Could not read (empty)");
        }

        // Try to read a few items
        for (let i = 1; i <= 3; i++) {
            try {
                const item = await contract.items(i);
                console.log(`\n📋 Item ${i}:`);
                console.log(`   👤 Beneficiary: ${item.beneficiary}`);
                console.log(`   📄 IPFS Hash: ${item.ipfsHash}`);
                console.log(`   📊 Current Stage: ${item.currentStage}`);
                console.log(`   ✅ Verified: ${item.isVerified}`);
            } catch (e) {
                console.log(`\n📋 Item ${i}: Not found`);
            }
        }

        // Check Merkle roots
        console.log("\n🌳 MERKLE ROOTS:");
        console.log("─".repeat(50));
        
        for (let itemId = 1; itemId <= 3; itemId++) {
            for (let stage = 0; stage <= 2; stage++) {
                try {
                    const root = await contract.getMerkleRoot(itemId, stage);
                    if (root !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                        console.log(`🔐 Item ${itemId}, Stage ${stage}: ${root.slice(0, 20)}...`);
                    }
                } catch (e) {
                    // Skip if no root set
                }
            }
        }

        console.log("\n🎉 LEDGER VIEW COMPLETE!");
        console.log("💡 Tip: Use 'npx hardhat console' for interactive queries");

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

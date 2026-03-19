const { ethers } = require("hardhat");

async function main() {
    console.log("📊 WORKING LEDGER VIEWER");
    console.log("======================");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract:", contractAddress);

    try {
        // Get the latest block number
        const provider = ethers.provider;
        const latestBlock = await provider.getBlockNumber();
        console.log("📦 Latest block:", latestBlock);

        // Get recent transactions by checking blocks
        console.log("\n🔍 CHECKING RECENT BLOCKS...");
        
        let foundTransactions = [];
        
        // Check last 20 blocks for transactions to our contract
        for (let i = latestBlock; i > Math.max(0, latestBlock - 20); i--) {
            try {
                const block = await provider.getBlock(i, true);
                if (block && block.transactions) {
                    for (const tx of block.transactions) {
                        if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
                            foundTransactions.push({
                                blockNumber: i,
                                hash: tx.hash,
                                from: tx.from,
                                gasUsed: tx.gasLimit
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip block if error
            }
        }

        console.log(`📊 Found ${foundTransactions.length} transactions to contract:`);
        
        if (foundTransactions.length === 0) {
            console.log("⚠️ No transactions found. Let's create some test data...");
            
            // Create test data if none exists
            const [admin, processor, transporter] = await ethers.getSigners();
            
            console.log("🏭 Creating test item...");
            const createTx = await contract.connect(processor).createItem(
                admin.address,
                "QmTestDocument123"
            );
            await createTx.wait();
            console.log("✅ Item created!");

            console.log("🔐 Admin verification...");
            const verifyTx = await contract.connect(admin).adminVerify(1, 0);
            await verifyTx.wait();
            console.log("✅ Admin verified!");

            console.log("🚚 Transporter submission...");
            const transportTx = await contract.connect(transporter).transporterSubmit(1, "QmTransportDoc456");
            await transportTx.wait();
            console.log("✅ Transporter submitted!");

            console.log("🌳 Setting Merkle root...");
            const testRoot = "0xd668e14bbd2eb2ae3d1234567890123456789012345678901234567890123456";
            const setRootTx = await contract.setMerkleRoot(1, 2, testRoot);
            await setRootTx.wait();
            console.log("✅ Merkle root set!");
            
            console.log("\n🎉 TEST DATA CREATED!");
            console.log("💡 Ledger now has data. Run this script again to see it.");
            
        } else {
            // Display found transactions
            foundTransactions.forEach((tx, index) => {
                console.log(`\n${index + 1}. Transaction:`);
                console.log(`   📦 Block: ${tx.blockNumber}`);
                console.log(`   🔗 Hash: ${tx.hash}`);
                console.log(`   👤 From: ${tx.from}`);
                console.log(`   ⛽ Gas: ${tx.gasUsed}`);
            });

            // Try to get transaction receipts with events
            console.log("\n📊 GETTING TRANSACTION DETAILS...");
            
            for (const tx of foundTransactions.slice(0, 5)) { // Check first 5
                try {
                    const receipt = await provider.getTransactionReceipt(tx.hash);
                    console.log(`\n🔍 Transaction ${tx.hash.slice(0, 10)}...:`);
                    console.log(`   📦 Block: ${receipt.blockNumber}`);
                    console.log(`   ✅ Status: ${receipt.status ? "Success" : "Failed"}`);
                    console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);
                    
                    // Try to parse logs
                    if (receipt.logs.length > 0) {
                        console.log(`   📊 Events (${receipt.logs.length}):`);
                        receipt.logs.forEach((log, logIndex) => {
                            try {
                                const parsed = contract.interface.parseLog(log);
                                console.log(`      ${logIndex + 1}. ${parsed.name}:`);
                                
                                if (parsed.name === 'ItemCreated') {
                                    console.log(`         🏭 Item ${parsed.args.itemId} created`);
                                    console.log(`         👤 Beneficiary: ${parsed.args.beneficiary}`);
                                }
                                if (parsed.name === 'AdminVerified') {
                                    console.log(`         🔐 Item ${parsed.args.itemId} verified`);
                                    console.log(`         📊 Stage: ${parsed.args.stage}`);
                                }
                                if (parsed.name === 'TransporterSubmitted') {
                                    console.log(`         🚚 Item ${parsed.args.itemId} submitted`);
                                    console.log(`         📄 CID: ${parsed.args.cid}`);
                                }
                                if (parsed.name === 'MerkleRootSet') {
                                    console.log(`         🌳 Item ${parsed.args.itemId}, Stage ${parsed.args.stage}`);
                                    console.log(`         🔐 Root: ${parsed.args.merkleRoot.slice(0, 20)}...`);
                                }
                            } catch (e) {
                                console.log(`      ${logIndex + 1}. Unknown event`);
                            }
                        });
                    }
                } catch (e) {
                    console.log(`❌ Could not get receipt for ${tx.hash}`);
                }
            }
        }

        console.log("\n🎉 LEDGER VIEW COMPLETE!");
        console.log("💡 Your blockchain ledger is working and contains data!");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

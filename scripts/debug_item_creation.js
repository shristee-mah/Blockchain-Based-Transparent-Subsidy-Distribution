const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Item Creation Issue");
    console.log("=" .repeat(80));

    try {
        // Check if Hardhat node is running
        console.log("📦 1. Checking Hardhat Node Status:");
        try {
            const latestBlock = await ethers.provider.getBlockNumber();
            console.log(`✅ Hardhat node running. Latest block: ${latestBlock}`);
        } catch (error) {
            console.log("❌ Hardhat node not running!");
            console.log("💡 Start it with: npx hardhat node --hostname 0.0.0.0 --port 8545");
            return;
        }

        // Check contract deployment
        console.log("\n📋 2. Checking Contract Deployment:");
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        try {
            const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            const code = await ethers.provider.getCode(contractAddress);
            
            if (code === "0x") {
                console.log("❌ No contract deployed at this address!");
                console.log("💡 Deploy with: npx hardhat run scripts/deploy.js --network localhost");
                return;
            }
            
            console.log(`✅ Contract deployed at: ${contractAddress}`);
            
            // Test contract functionality
            try {
                const itemCount = await contract.itemCount();
                console.log(`✅ Contract responsive. Current item count: ${itemCount.toString()}`);
            } catch (error) {
                console.log("⚠️ Contract exists but itemCount() failed:", error.message);
                console.log("   This might be normal if the function doesn't exist");
            }

        } catch (error) {
            console.log("❌ Contract access failed:", error.message);
            return;
        }

        // Check recent blocks for transactions
        console.log("\n🔍 3. Checking Recent Blocks for Transactions:");
        const latestBlock = await ethers.provider.getBlockNumber();
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        for (let i = Math.max(0, latestBlock - 5); i <= latestBlock; i++) {
            try {
                const block = await ethers.provider.getBlock(i, true);
                if (block && block.transactions.length > 0) {
                    console.log(`\n📦 Block ${i} (${new Date(block.timestamp * 1000).toLocaleString()}):`);
                    console.log(`   Transactions: ${block.transactions.length}`);
                    
                    for (let j = 0; j < block.transactions.length; j++) {
                        const tx = block.transactions[j];
                        console.log(`   ${j + 1}. ${tx.hash}`);
                        console.log(`      To: ${tx.to || 'Contract Creation'}`);
                        console.log(`      From: ${tx.from}`);
                        
                        // Check if this transaction was to our contract
                        if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
                            console.log(`      🎯 THIS IS A TRANSACTION TO OUR CONTRACT!`);
                            
                            // Get transaction receipt
                            try {
                                const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                                console.log(`      Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
                                console.log(`      Gas Used: ${receipt.gasUsed.toString()}`);
                                
                                // Check for events
                                if (receipt.logs.length > 0) {
                                    console.log(`      📝 Events: ${receipt.logs.length} found`);
                                    receipt.logs.forEach((log, logIndex) => {
                                        try {
                                            const parsedLog = contract.interface.parseLog(log);
                                            console.log(`         Event ${logIndex + 1}: ${parsedLog.name}`);
                                            Object.keys(parsedLog.args).forEach(arg => {
                                                console.log(`            ${arg}: ${parsedLog.args[arg].toString()}`);
                                            });
                                        } catch (parseError) {
                                            console.log(`         Event ${logIndex + 1}: Could not parse (unknown event)`);
                                        }
                                    });
                                } else {
                                    console.log(`      📝 Events: None found`);
                                }
                            } catch (receiptError) {
                                console.log(`      ❌ Could not get receipt: ${receiptError.message}`);
                            }
                        }
                    }
                }
            } catch (blockError) {
                console.log(`   Block ${i}: ${blockError.message}`);
            }
        }

        // Check contract events directly
        console.log("\n📝 4. Checking Contract Events:");
        try {
            const allEvents = await contract.queryFilter("*", 0, "latest");
            console.log(`✅ Found ${allEvents.length} total events on contract`);
            
            if (allEvents.length > 0) {
                console.log("\n📋 Recent Events:");
                allEvents.slice(-5).forEach((event, index) => {
                    console.log(`${index + 1}. ${event.event || 'UNKNOWN'} - Block ${event.blockNumber}`);
                    if (event.args && Object.keys(event.args).length > 0) {
                        Object.keys(event.args).forEach(key => {
                            console.log(`   ${key}: ${event.args[key].toString()}`);
                        });
                    }
                });
            } else {
                console.log("❌ No events found on contract");
                console.log("💡 This means no transactions have successfully executed");
            }
        } catch (error) {
            console.log("❌ Could not query events:", error.message);
        }

        // Test creating an item right now
        console.log("\n🧪 5. Testing Item Creation Now:");
        try {
            const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
            console.log(`👥 Using processor address: ${processor.address}`);
            
            console.log("📝 Attempting to create item...");
            const ipfsHash = `QmTestDebug${Date.now()}`;
            const tx = await contract.connect(processor).createItem(beneficiary.address, ipfsHash);
            console.log(`📦 Transaction submitted: ${tx.hash}`);
            
            console.log("⏳ Waiting for confirmation...");
            const receipt = await tx.wait();
            console.log(`✅ Item created successfully in block ${receipt.blockNumber}`);
            console.log(`📝 Gas used: ${receipt.gasUsed.toString()}`);
            
            // Check for events
            if (receipt.logs.length > 0) {
                console.log(`📝 Events emitted: ${receipt.logs.length}`);
                receipt.logs.forEach((log, index) => {
                    try {
                        const parsedLog = contract.interface.parseLog(log);
                        console.log(`   Event ${index + 1}: ${parsedLog.name}`);
                        Object.keys(parsedLog.args).forEach(arg => {
                            console.log(`      ${arg}: ${parsedLog.args[arg].toString()}`);
                        });
                    } catch (parseError) {
                        console.log(`   Event ${index + 1}: Raw log - ${log.topics[0]}`);
                    }
                });
            }
            
        } catch (error) {
            console.log("❌ Item creation failed:", error.message);
            
            if (error.message.includes("revert")) {
                console.log("💡 This might be a permission issue - check if the processor has the right role");
            }
            if (error.message.includes("insufficient funds")) {
                console.log("💡 This might be a gas issue - check if the account has enough ETH");
            }
        }

    } catch (error) {
        console.error("❌ Debug error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

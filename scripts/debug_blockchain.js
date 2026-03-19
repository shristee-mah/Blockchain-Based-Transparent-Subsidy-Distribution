const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Blockchain State");

    try {
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";
        const provider = ethers.provider;
        
        console.log("📋 Contract:", contractAddress);

        // Check if contract exists
        const code = await provider.getCode(contractAddress);
        console.log(`📦 Contract code length: ${code.length} characters`);
        console.log(`   Is deployed: ${code !== "0x" ? "✅ YES" : "❌ NO"}`);

        if (code === "0x") {
            console.log("❌ No contract deployed at this address!");
            console.log("💡 Run: npx hardhat run scripts/deploy.js --network localhost");
            return;
        }

        // Get contract instance
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);

        // Check contract functions
        console.log("\n🔍 Testing contract functions:");
        try {
            const itemCount = await contract.itemCount();
            console.log(`✅ itemCount(): ${itemCount.toString()}`);
        } catch (error) {
            console.log(`❌ itemCount() failed: ${error.message}`);
        }

        try {
            const item = await contract.getItem(1);
            console.log(`✅ getItem(1): ${JSON.stringify(item)}`);
        } catch (error) {
            console.log(`❌ getItem(1) failed: ${error.message}`);
        }

        // Check recent blocks
        console.log("\n📦 Checking recent blocks:");
        const latestBlock = await provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);

        for (let i = Math.max(0, latestBlock - 3); i <= latestBlock; i++) {
            try {
                const block = await provider.getBlock(i, true);
                if (block && block.transactions.length > 0) {
                    console.log(`\n📦 Block ${i}:`);
                    console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
                    console.log(`   Transactions: ${block.transactions.length}`);
                    
                    for (let j = 0; j < block.transactions.length; j++) {
                        const tx = block.transactions[j];
                        console.log(`   ${j + 1}. ${tx.hash}`);
                        console.log(`      To: ${tx.to || 'Contract Creation'}`);
                        
                        // Get transaction receipt
                        try {
                            const receipt = await provider.getTransactionReceipt(tx.hash);
                            console.log(`      Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
                            console.log(`      Gas Used: ${receipt.gasUsed.toString()}`);
                            
                            // Check logs
                            if (receipt.logs.length > 0) {
                                console.log(`      Logs: ${receipt.logs.length} events found`);
                                receipt.logs.forEach((log, logIndex) => {
                                    console.log(`         Log ${logIndex + 1}:`);
                                    console.log(`            Address: ${log.address}`);
                                    console.log(`            Topics: ${log.topics.length}`);
                                    console.log(`            Data: ${log.data}`);
                                });
                            } else {
                                console.log(`      Logs: No events found`);
                            }
                        } catch (receiptError) {
                            console.log(`      Receipt error: ${receiptError.message}`);
                        }
                    }
                }
            } catch (blockError) {
                console.log(`Block ${i}: ${blockError.message}`);
            }
        }

        // Try to query events with different methods
        console.log("\n🔍 Trying different event query methods:");
        
        try {
            const allEvents = await contract.queryFilter("*", 0, "latest");
            console.log(`✅ queryFilter('*'): Found ${allEvents.length} events`);
        } catch (error) {
            console.log(`❌ queryFilter('*') failed: ${error.message}`);
        }

        try {
            const logs = await provider.getLogs({
                address: contractAddress,
                fromBlock: 0,
                toBlock: "latest"
            });
            console.log(`✅ provider.getLogs(): Found ${logs.length} raw logs`);
            
            if (logs.length > 0) {
                logs.forEach((log, index) => {
                    console.log(`   Log ${index + 1}:`);
                    console.log(`      Topics: ${log.topics}`);
                    console.log(`      Data: ${log.data}`);
                });
            }
        } catch (error) {
            console.log(`❌ provider.getLogs() failed: ${error.message}`);
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

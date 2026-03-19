const { ethers } = require("hardhat");

async function main() {
    console.log(" EVENT LISTENER DEMO");
    console.log("====================");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log(" Contract:", contractAddress);

    try {
        // 1. Show current contract state
        console.log("\n CURRENT CONTRACT STATE:");
        console.log("─".repeat(50));
        
        const itemCount = await contract.itemCount();
        console.log(` Total Items: ${itemCount}`);
        
        // Show each item's current stage
        for (let i = 1; i <= Math.min(Number(itemCount), 3); i++) {
            try {
                const item = await contract.items(i);
                console.log(`\n Item ${i}:`);
                console.log(`    Beneficiary: ${item.beneficiary}`);
                console.log(`    Stage: ${item.currentStage} (${getStageName(item.currentStage)})`);
                console.log(`   ✅ Claimed: ${item.claimed}`);
                console.log(`    IPFS: ${item.currentIpfsHash}`);
            } catch (e) {
                console.log(`❌ Could not read Item ${i}`);
            }
        }

        // 2. Set up event listener
        console.log("\n SETTING UP EVENT LISTENERS:");
        console.log("─".repeat(50));
        
        // Listen to all relevant events
        contract.on("ItemCreated", (itemId, beneficiary, ipfsHash, event) => {
            console.log(`\n EVENT: ItemCreated`);
            console.log(`    Item ID: ${itemId}`);
            console.log(`    Beneficiary: ${beneficiary}`);
            console.log(`    IPFS: ${ipfsHash}`);
            console.log(`    Block: ${event.blockNumber}`);
            console.log(`    Tx: ${event.transactionHash}`);
        });

        contract.on("ItemVerified", (itemId, newStage, event) => {
            console.log(`\n✅ EVENT: ItemVerified`);
            console.log(`    Item ID: ${itemId}`);
            console.log(`    New Stage: ${newStage} (${getStageName(newStage)})`);
            console.log(`    Block: ${event.blockNumber}`);
            console.log(`    Tx: ${event.transactionHash}`);
        });

        contract.on("DocumentUploaded", (itemId, stage, ipfsHash, uploader, event) => {
            console.log(`\n📄 EVENT: DocumentUploaded`);
            console.log(`    Item ID: ${itemId}`);
            console.log(`    Stage: ${stage} (${getStageName(stage)})`);
            console.log(`    IPFS: ${ipfsHash}`);
            console.log(`    Uploader: ${uploader}`);
            console.log(`    Block: ${event.blockNumber}`);
        });

        contract.on("TransactionLogged", (itemId, actor, action, event) => {
            console.log(`\n📝 EVENT: TransactionLogged`);
            console.log(`    Item ID: ${itemId}`);
            console.log(`    Actor: ${actor}`);
            console.log(`    Action: ${action}`);
            console.log(`    Block: ${event.blockNumber}`);
            console.log(`    Tx: ${event.transactionHash}`);
        });

        contract.on("MerkleRootSet", (itemId, stage, merkleRoot, event) => {
            console.log(`\n🌳 EVENT: MerkleRootSet`);
            console.log(`    Item ID: ${itemId}`);
            console.log(`    Stage: ${stage} (${getStageName(stage)})`);
            console.log(`    Root: ${merkleRoot.slice(0, 20)}...`);
            console.log(`    Block: ${event.blockNumber}`);
        });

        contract.on("SubsidyClaimed", (itemId, beneficiary, claimedBy, event) => {
            console.log(`\n🎉 EVENT: SubsidyClaimed`);
            console.log(`    Item ID: ${itemId}`);
            console.log(`    Beneficiary: ${beneficiary}`);
            console.log(`    Claimed By: ${claimedBy}`);
            console.log(`    Block: ${event.blockNumber}`);
        });

        console.log("✅ Event listeners are now active!");
        console.log("  Perform actions in the frontend to see events here");

        // 3. Create some test activity to demonstrate
        console.log("\n CREATING TEST ACTIVITY:");
        console.log("─".repeat(50));
        
        const [admin, processor, transporter, distributor] = await ethers.getSigners();
        
        console.log(" Available signers:");
        console.log(`    Admin: ${admin.address}`);
        console.log(`    Processor: ${processor.address}`);
        console.log(`    Transporter: ${transporter.address}`);
        console.log(`    Distributor: ${distributor.address}`);

        // Create a test item if none exist
        if (Number(itemCount) === 0) {
            console.log("\n Creating test item...");
            const createTx = await contract.connect(processor).createItem(
                admin.address,
                "QmTestDocument123"
            );
            await createTx.wait();
            console.log("✅ Test item created - check events above!");
        }

        // Get the first item for testing
        const firstItem = await contract.items(1);
        console.log(`\n📋 Testing with Item 1 (Stage: ${getStageName(firstItem.currentStage)})`);

        // Perform stage progression based on current state
        if (firstItem.currentStage === 0) {
            console.log("\n🔐 Admin verification...");
            const verifyTx = await contract.connect(admin).adminVerify(1, 0);
            await verifyTx.wait();
            console.log("✅ Admin verified - check events above!");
        } else if (firstItem.currentStage === 1) {
            console.log("\n Transporter submission...");
            const transportTx = await contract.connect(transporter).transporterSubmit(1, "QmTransportDoc456");
            await transportTx.wait();
            console.log("✅ Transporter submitted - check events above!");
        } else if (firstItem.currentStage === 2) {
            console.log("\n🔐 Admin verification of transporter docs...");
            const verifyTx = await contract.connect(admin).adminVerify(1, 2);
            await verifyTx.wait();
            console.log("✅ Admin verified - check events above!");
        }

        // 4. Show how to query historical events
        console.log("\n📚 QUERYING HISTORICAL EVENTS:");
        console.log("─".repeat(50));

        // Get ItemCreated events
        const createdFilter = contract.filters.ItemCreated();
        const createdEvents = await contract.queryFilter(createdFilter, 0, 'latest');
        console.log(`📊 Found ${createdEvents.length} ItemCreated events:`);
        
        createdEvents.forEach((event, index) => {
            console.log(`   ${index + 1}. Item ${event.args.itemId} created for ${event.args.beneficiary}`);
        });

        // Get ItemVerified events
        const verifiedFilter = contract.filters.ItemVerified();
        const verifiedEvents = await contract.queryFilter(verifiedFilter, 0, 'latest');
        console.log(`\n📊 Found ${verifiedEvents.length} ItemVerified events:`);
        
        verifiedEvents.forEach((event, index) => {
            console.log(`   ${index + 1}. Item ${event.args.itemId} verified to stage ${event.args.newStage}`);
        });

        // Keep the script running to listen for more events
        console.log("\n⏳ LISTENING FOR MORE EVENTS...");
        console.log("─".repeat(50));
        console.log(" Use the frontend to perform more actions");
        console.log("  Press Ctrl+C to stop listening");
        
        // Keep the process alive
        await new Promise(() => {}); // This will run forever

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

function getStageName(stage) {
    const stages = [
        'Created', 'VerifiedByAdmin', 'TransporterReady', 'InTransit',
        'DistributorReady', 'Distributed', 'Claimed', 'Cancelled'
    ];
    return stages[stage] || `Unknown(${stage})`;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

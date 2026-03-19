const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 TESTING STAGE TRANSITIONS");
    console.log("===========================");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract:", contractAddress);

    try {
        const [admin, processor, transporter, distributor] = await ethers.getSigners();
        
        // 1. Check current state
        console.log("\n📊 CURRENT STATE:");
        const item = await contract.items(1);
        console.log(`📋 Item 1 Stage: ${item[1]} (${getStageName(item[1])})`);
        console.log(`👤 Beneficiary: ${item[0]}`);
        console.log(`📄 IPFS: ${item[3]}`);

        // 2. Admin verification (Stage 0 -> 1)
        if (item[1] === 0) {
            console.log("\n🔐 STAGE 0 → 1: Admin Verification");
            console.log("─".repeat(40));
            
            const verifyTx = await contract.connect(admin).adminVerify(1, 0);
            await verifyTx.wait();
            
            console.log("✅ Admin verification completed!");
        }

        // 3. Transporter submission (Stage 1 -> 2)
        const updatedItem = await contract.items(1);
        if (updatedItem[1] === 1) {
            console.log("\n🚚 STAGE 1 → 2: Transporter Submission");
            console.log("─".repeat(40));
            
            const transportTx = await contract.connect(transporter).transporterSubmit(1, "QmTransportDoc456");
            await transportTx.wait();
            
            console.log("✅ Transporter submission completed!");
        }

        // 4. Admin verification of transporter docs (Stage 2 -> 3)
        const item2 = await contract.items(1);
        if (item2.currentStage === 2) {
            console.log("\n🔐 STAGE 2 → 3: Admin Verification of Transporter");
            console.log("─".repeat(40));
            
            const verifyTx = await contract.connect(admin).adminVerify(1, 2);
            await verifyTx.wait();
            
            console.log("✅ Admin verification completed!");
        }

        // 5. Distributor submission (Stage 3 -> 4)
        const item3 = await contract.items(1);
        if (item3.currentStage === 3) {
            console.log("\n📦 STAGE 3 → 4: Distributor Submission");
            console.log("─".repeat(40));
            
            const distTx = await contract.connect(distributor).distributorSubmit(1, "QmDistributorDoc789");
            await distTx.wait();
            
            console.log("✅ Distributor submission completed!");
        }

        // 6. Admin verification of distributor docs (Stage 4 -> 5)
        const item4 = await contract.items(1);
        if (item4.currentStage === 4) {
            console.log("\n🔐 STAGE 4 → 5: Admin Verification of Distributor");
            console.log("─".repeat(40));
            
            const verifyTx = await contract.connect(admin).adminVerify(1, 4);
            await verifyTx.wait();
            
            console.log("✅ Admin verification completed!");
        }

        // 7. Beneficiary claim (Stage 5 -> 6)
        const item5 = await contract.items(1);
        if (item5.currentStage === 5) {
            console.log("\n🎉 STAGE 5 → 6: Beneficiary Claim");
            console.log("─".repeat(40));
            
            const claimTx = await contract.connect(admin).beneficiaryClaim(1); // Admin can claim on behalf
            await claimTx.wait();
            
            console.log("✅ Beneficiary claim completed!");
        }

        // 8. Final state
        console.log("\n🎊 FINAL STATE:");
        const finalItem = await contract.items(1);
        console.log(`📋 Item 1 Final Stage: ${finalItem.currentStage} (${getStageName(finalItem.currentStage)})`);
        console.log(`✅ Claimed: ${finalItem.claimed}`);
        console.log(`📄 Final IPFS: ${finalItem.currentIpfsHash}`);

        console.log("\n🎉 ALL STAGE TRANSITIONS COMPLETED!");
        console.log("💡 Check the event listener window to see all events!");

    } catch (error) {
        console.error("❌ Error:", error.message);
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

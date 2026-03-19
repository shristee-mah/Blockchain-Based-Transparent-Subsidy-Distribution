const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🔍 BLOCKCHAIN ID TRACKING ANALYSIS");
    console.log("==================================");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract:", contractAddress);

    try {
        // 1. Check database submissions
        console.log("\n📊 DATABASE SUBMISSIONS:");
        console.log("─".repeat(50));
        
        const submissionsFile = path.join(process.cwd(), '.submissions.json');
        let submissions = [];
        
        try {
            if (fs.existsSync(submissionsFile)) {
                const raw = fs.readFileSync(submissionsFile, 'utf-8').trim();
                if (raw) {
                    submissions = JSON.parse(raw);
                    console.log(`📁 Found ${submissions.length} submissions in database:`);
                    
                    submissions.forEach((sub, index) => {
                        console.log(`\n${index + 1}. Submission ID: ${sub.id}`);
                        console.log(`   👤 Name: ${sub.name}`);
                        console.log(`   🏭 Role: ${sub.role}`);
                        console.log(`   📊 Status: ${sub.status}`);
                        console.log(`   🔗 Blockchain ID: ${sub.blockchain_itemId || 'NOT SET'}`);
                        console.log(`   📊 Current Stage: ${sub.current_stage || 'UNKNOWN'}`);
                        console.log(`   📄 CID: ${sub.cid || 'NONE'}`);
                    });
                }
            }
        } catch (e) {
            console.log("❌ Could not read submissions file");
        }

        // 2. Check blockchain contract state
        console.log("\n⛓️ BLOCKCHAIN CONTRACT STATE:");
        console.log("─".repeat(50));
        
        try {
            const itemCount = await contract.itemCount();
            console.log(`📦 Total Items in Contract: ${itemCount}`);
            
            // Check each item
            for (let i = 1; i <= Math.min(Number(itemCount), 5); i++) {
                try {
                    const item = await contract.items(i);
                    console.log(`\n📋 Item ${i}:`);
                    console.log(`   👤 Beneficiary: ${item.beneficiary}`);
                    console.log(`   📄 IPFS Hash: ${item.ipfsHash}`);
                    console.log(`   📊 Current Stage: ${item.currentStage}`);
                    console.log(`   ✅ Verified: ${item.isVerified}`);
                } catch (e) {
                    console.log(`❌ Could not read Item ${i}`);
                }
            }
        } catch (e) {
            console.log("❌ Could not read contract state");
        }

        // 3. Find the connection
        console.log("\n🔗 FRONTEND ↔ BLOCKCHAIN ID CONNECTION:");
        console.log("─".repeat(50));
        
        const submissionsWithBlockchainId = submissions.filter(s => s.blockchain_itemId !== undefined && s.blockchain_itemId !== null);
        
        if (submissionsWithBlockchainId.length === 0) {
            console.log("⚠️ No submissions have blockchain_itemId set");
            console.log("💡 This happens because:");
            console.log("   1. Initial submissions don't create blockchain items");
            console.log("   2. Blockchain items are created during admin verification");
            console.log("   3. The blockchain_itemId gets assigned after admin approval");
            
            console.log("\n🔧 TO FIX THIS:");
            console.log("─".repeat(50));
            console.log("1. Start the frontend: npm run dev");
            console.log("2. Login as admin: http://localhost:3000/role-login/admin");
            console.log("3. Review and approve a pending submission");
            console.log("4. The approval will create the blockchain item");
            console.log("5. Check this script again to see the connection");
            
        } else {
            console.log("✅ Found submissions with blockchain IDs:");
            
            for (let i = 0; i < submissionsWithBlockchainId.length; i++) {
                const sub = submissionsWithBlockchainId[i];
                console.log(`\n${i + 1}. Submission ${sub.id}:`);
                console.log(`   🔗 Blockchain ID: ${sub.blockchain_itemId}`);
                console.log(`   👤 User: ${sub.name} (${sub.role})`);
                console.log(`   📊 Status: ${sub.status}`);
                
                // Try to find corresponding blockchain item
                try {
                    const item = await contract.items(sub.blockchain_itemId);
                    console.log(`   ⛓️ Blockchain Item ${sub.blockchain_itemId}:`);
                    console.log(`      👤 Beneficiary: ${item.beneficiary}`);
                    console.log(`      📊 Stage: ${item.currentStage}`);
                    console.log(`      ✅ Match: ${item.ipfsHash === sub.cid ? 'YES' : 'NO'}`);
                } catch (e) {
                    console.log(`   ❌ Could not find blockchain item ${sub.blockchain_itemId}`);
                }
            }
        }

        // 4. Show the workflow
        console.log("\n🔄 COMPLETE WORKFLOW:");
        console.log("─".repeat(50));
        console.log("1. 📝 User submits documents → Database (no blockchain ID yet)");
        console.log("2. 👀 Admin reviews submission → Frontend shows pending");
        console.log("3. ✅ Admin approves → Creates blockchain item → Gets blockchain_itemId");
        console.log("4. 🔗 Database updated → blockchain_itemId stored");
        console.log("5. 📱 Frontend shows → Blockchain ID #XXX");
        console.log("6. 🚚 Transporter scans QR → Sees blockchain ID #XXX");
        console.log("7. 📦 Transporter submits → Uses blockchain ID #XXX");

        console.log("\n🎉 ANALYSIS COMPLETE!");
        console.log("💡 The blockchain ID appears AFTER admin approval, not during initial submission");

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

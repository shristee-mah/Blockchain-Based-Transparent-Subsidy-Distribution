const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🗑️ RESET DATABASE FOR FRESH START");
    console.log("==============================");

    const submissionsFile = path.join(process.cwd(), '.submissions.json');
    
    try {
        // Read current submissions
        let submissions = [];
        if (fs.existsSync(submissionsFile)) {
            const raw = fs.readFileSync(submissionsFile, 'utf-8').trim();
            if (raw) {
                submissions = JSON.parse(raw);
                console.log(`📁 Found ${submissions.length} submissions`);
            }
        }

        // Filter out submissions with blockchain_itemId (old data)
        const freshSubmissions = submissions.filter(s => 
            s.blockchain_itemId === undefined || 
            s.blockchain_itemId === null
        );

        console.log(`🗑️ Removing ${submissions.length - freshSubmissions.length} old submissions`);
        console.log(`✅ Keeping ${freshSubmissions.length} fresh submissions`);

        // Save fresh submissions
        fs.writeFileSync(submissionsFile, JSON.stringify(freshSubmissions, null, 2));
        console.log("💾 Database reset complete!");

        console.log("\n🎯 NEXT STEPS:");
        console.log("─".repeat(30));
        console.log("1. Start frontend: npm run dev");
        console.log("2. Create new submissions");
        console.log("3. Approve as admin");
        console.log("4. Get fresh blockchain IDs (7, 8, 9...)");
        console.log("5. Test Merkle tree features");

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

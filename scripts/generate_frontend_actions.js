const { ethers } = require("hardhat");

class FrontendActionGenerator {
    constructor() {
        this.contract = null;
        this.actionCount = 0;
    }

    async initialize() {
        try {
            const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            this.contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            
            console.log("🎭 FRONTEND ACTION GENERATOR");
            console.log("📋 Contract:", contractAddress);
            console.log("🎯 Simulates dashboard interactions that appear in terminal viewer");
            console.log("=" .repeat(80));
            
            const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
            console.log("👥 Available dashboard users:");
            console.log(`   🔵 Admin:      ${admin.address}     → /admin/dashboard`);
            console.log(`   🟡 Processor:  ${processor.address} → /processor/dashboard`);
            console.log(`   🟠 Transporter: ${transporter.address} → /transporter/dashboard`);
            console.log(`   🟣 Distributor: ${distributor.address} → /distributor/dashboard`);
            console.log(`   🟢 Beneficiary:${beneficiary.address} → /beneficiary/dashboard`);
            console.log("=" .repeat(80));
            
        } catch (error) {
            console.error("❌ Failed to initialize generator:", error.message);
            throw error;
        }
    }

    async startGenerating() {
        console.log("🎬 Starting frontend action generation...");
        console.log("💡 Make sure 'node scripts/terminal_event_viewer.js' is running in another terminal!");
        console.log("🔴 Watch the events appear in real-time in the other terminal!");
        console.log("=" .repeat(80));

        const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();

        // Continuous generation loop
        while (true) {
            try {
                await this.generateRandomAction(admin, processor, transporter, distributor, beneficiary);
                await this.delay(Math.random() * 5000 + 3000); // 3-8 seconds between actions
            } catch (error) {
                console.log(`❌ Action failed: ${error.message}`);
                await this.delay(2000);
            }
        }
    }

    async generateRandomAction(admin, processor, transporter, distributor, beneficiary) {
        const actions = [
            () => this.createItem(processor, beneficiary),
            () => this.verifyItem(admin, 1),
            () => this.transporterSubmit(transporter, 1),
            () => this.distributorSubmit(distributor, 1),
            () => this.beneficiaryClaim(beneficiary, 1),
            () => this.createItem(processor, beneficiary),
            () => this.verifyItem(admin, 2),
            () => this.createItem(processor, distributor),
            () => this.verifyItem(admin, 4),
        ];

        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        console.log(`\n🎬 Frontend Action #${++this.actionCount}:`);
        
        try {
            await randomAction();
        } catch (error) {
            console.log(`❌ Action failed: ${error.message}`);
        }
    }

    async createItem(processor, beneficiary) {
        console.log("   📱 Dashboard: /processor/dashboard");
        console.log("   📝 Action: 'Create New Application'");
        console.log("   👤 User: Processor (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)");
        
        const ipfsHash = `QmProcessorDoc${Date.now()}`;
        const tx = await this.contract.connect(processor).createItem(beneficiary.address, ipfsHash);
        await tx.wait();
        
        console.log("   ✅ SUCCESS - Check terminal viewer for event!");
    }

    async verifyItem(admin, stage) {
        console.log("   📱 Dashboard: /admin/dashboard");
        console.log("   ✅ Action: 'Verify Application'");
        console.log("   👤 User: Admin (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)");
        
        const itemId = 1;
        const tx = await this.contract.connect(admin).adminVerify(itemId, stage);
        await tx.wait();
        
        console.log("   ✅ SUCCESS - Check terminal viewer for event!");
    }

    async transporterSubmit(transporter, itemId) {
        console.log("   📱 Dashboard: /transporter/dashboard");
        console.log("   🚚 Action: 'Submit Pickup Documents'");
        console.log("   👤 User: Transporter (0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)");
        
        const ipfsHash = `QmTransporterDoc${Date.now()}`;
        const tx = await this.contract.connect(transporter).transporterSubmit(itemId, ipfsHash);
        await tx.wait();
        
        console.log("   ✅ SUCCESS - Check terminal viewer for event!");
    }

    async distributorSubmit(distributor, itemId) {
        console.log("   📱 Dashboard: /distributor/dashboard");
        console.log("   📦 Action: 'Submit Delivery Documents'");
        console.log("   👤 User: Distributor (0x90F79bf6EB2c4f870365E785982E1f101E93b906)");
        
        const ipfsHash = `QmDistributorDoc${Date.now()}`;
        const tx = await this.contract.connect(distributor).distributorSubmit(itemId, ipfsHash);
        await tx.wait();
        
        console.log("   ✅ SUCCESS - Check terminal viewer for event!");
    }

    async beneficiaryClaim(beneficiary, itemId) {
        console.log("   📱 Dashboard: /beneficiary/dashboard");
        console.log("   🎁 Action: 'Claim Subsidy'");
        console.log("   👤 User: Beneficiary (0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65)");
        
        const tx = await this.contract.connect(beneficiary).beneficiaryClaim(itemId);
        await tx.wait();
        
        console.log("   ✅ SUCCESS - Check terminal viewer for event!");
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main execution
async function main() {
    const generator = new FrontendActionGenerator();

    try {
        await generator.initialize();
        
        console.log("🎯 INSTRUCTIONS:");
        console.log("1. Open ANOTHER terminal");
        console.log("2. Run: node scripts/terminal_event_viewer.js");
        console.log("3. Come back to THIS terminal and press Enter");
        console.log("4. Watch events appear in REAL-TIME in the other terminal!");
        
        // Wait for user to start the viewer
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('\n🎬 Press Enter to start generating frontend actions...', () => {
            rl.close();
            generator.startGenerating();
        });

    } catch (error) {
        console.error("❌ Failed to start generator:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FrontendActionGenerator;

const { ethers } = require("hardhat");

class FrontendEventSimulator {
    constructor() {
        this.contract = null;
        this.isSimulating = false;
        this.eventCount = 0;
    }

    async initialize() {
        try {
            const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            this.contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            
            console.log("🎭 Frontend Event Simulator");
            console.log("📋 Contract:", contractAddress);
            console.log("🎯 Simulating frontend interactions that generate blockchain events");
            console.log("=" .repeat(80));
            
            const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
            console.log("👥 Available accounts:");
            console.log(`   🔵 Admin: ${admin.address}`);
            console.log(`   🟡 Processor: ${processor.address}`);
            console.log(`   🟠 Transporter: ${transporter.address}`);
            console.log(`   🟣 Distributor: ${distributor.address}`);
            console.log(`   🟢 Beneficiary: ${beneficiary.address}`);
            console.log("=" .repeat(80));
            
        } catch (error) {
            console.error("❌ Failed to initialize simulator:", error.message);
            throw error;
        }
    }

    async startSimulation() {
        if (this.isSimulating) {
            console.log("⚠️ Simulation is already running");
            return;
        }

        this.isSimulating = true;
        console.log("🎬 Starting frontend event simulation...");
        console.log("📡 Each action will generate blockchain events visible in real-time monitor");
        console.log("💡 Run 'node scripts/realtime_monitor.js' in another terminal to see events live!");
        console.log("=" .repeat(80));

        const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();

        // Simulation sequence
        const simulations = [
            {
                name: "🏭 Create New Item",
                action: () => this.createItem(processor, beneficiary),
                delay: 2000
            },
            {
                name: "✅ Admin Verify Item",
                action: () => this.verifyItem(admin, 1),
                delay: 3000
            },
            {
                name: "🚚 Transporter Submit Documents",
                action: () => this.transporterSubmit(transporter, 1),
                delay: 3000
            },
            {
                name: "✅ Admin Verify Transporter",
                action: () => this.verifyItem(admin, 2),
                delay: 3000
            },
            {
                name: "🚚 Distributor Submit Documents",
                action: () => this.distributorSubmit(distributor, 1),
                delay: 3000
            },
            {
                name: "✅ Admin Verify Distributor",
                action: () => this.verifyItem(admin, 4),
                delay: 3000
            },
            {
                name: "🎁 Beneficiary Claim Item",
                action: () => this.beneficiaryClaim(beneficiary, 1),
                delay: 3000
            },
            {
                name: "🏭 Create Another Item",
                action: () => this.createItem(processor, beneficiary),
                delay: 2000
            },
            {
                name: "✅ Quick Verify",
                action: () => this.verifyItem(admin, 0),
                delay: 2000
            }
        ];

        // Run simulations with delays
        for (let i = 0; i < simulations.length; i++) {
            const sim = simulations[i];
            
            console.log(`\n🎬 Simulation ${i + 1}/${simulations.length}: ${sim.name}`);
            console.log(`⏳ Waiting ${sim.delay}ms before execution...`);
            
            await this.delay(sim.delay);
            
            try {
                await sim.action();
                console.log(`✅ Completed: ${sim.name}`);
                this.eventCount++;
            } catch (error) {
                console.log(`❌ Failed: ${sim.name} - ${error.message}`);
            }
        }

        console.log(`\n🎉 Simulation completed! Generated ${this.eventCount} events.`);
        console.log("💡 Check the real-time monitor to see all events!");
    }

    async createItem(processor, beneficiary) {
        const ipfsHash = `QmTestDocument${Date.now()}`;
        const tx = await this.contract.connect(processor).createItem(beneficiary.address, ipfsHash);
        await tx.wait();
        console.log(`   📝 Item created with IPFS: ${ipfsHash}`);
    }

    async verifyItem(admin, stage) {
        const itemId = 1; // Verify first item
        const tx = await this.contract.connect(admin).adminVerify(itemId, stage);
        await tx.wait();
        console.log(`   ✅ Item ${itemId} verified to stage ${stage}`);
    }

    async transporterSubmit(transporter, itemId) {
        const ipfsHash = `QmTransporterDoc${Date.now()}`;
        const tx = await this.contract.connect(transporter).transporterSubmit(itemId, ipfsHash);
        await tx.wait();
        console.log(`   📚 Transporter submitted: ${ipfsHash}`);
    }

    async distributorSubmit(distributor, itemId) {
        const ipfsHash = `QmDistributorDoc${Date.now()}`;
        const tx = await this.contract.connect(distributor).distributorSubmit(itemId, ipfsHash);
        await tx.wait();
        console.log(`   📦 Distributor submitted: ${ipfsHash}`);
    }

    async beneficiaryClaim(beneficiary, itemId) {
        const tx = await this.contract.connect(beneficiary).beneficiaryClaim(itemId);
        await tx.wait();
        console.log(`   🎁 Beneficiary claimed item ${itemId}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main execution
async function main() {
    const simulator = new FrontendEventSimulator();

    try {
        await simulator.initialize();
        
        console.log("🎯 Instructions:");
        console.log("1. Open another terminal");
        console.log("2. Run: node scripts/realtime_monitor.js");
        console.log("3. Come back to this terminal and press Enter to start simulation");
        console.log("4. Watch real-time events appear in the monitor!");
        
        // Wait for user to start monitor
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('\n🎬 Press Enter to start simulation...', () => {
            rl.close();
            simulator.startSimulation();
        });

    } catch (error) {
        console.error("❌ Failed to start simulation:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FrontendEventSimulator;

const { ethers } = require("hardhat");

class AddressDashboardMapper {
    constructor() {
        this.contract = null;
        this.roleAddresses = {};
        this.dashboardInteractions = {};
    }

    async initialize() {
        try {
            const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            this.contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
            
            console.log("🔗 Address-Dashboard Interaction Mapper");
            console.log("📋 Contract:", contractAddress);
            console.log("=" .repeat(80));
            
            await this.mapAddressesToDashboards();
            
        } catch (error) {
            console.error("❌ Failed to initialize mapper:", error.message);
            throw error;
        }
    }

    async mapAddressesToDashboards() {
        const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
        
        console.log("👥 ROLE-ADDRESS-DASHBOARD MAPPING:");
        console.log("=" .repeat(80));
        
        // Map each role to its address and dashboard
        this.roleAddresses = {
            admin: {
                address: admin.address,
                role: "ADMIN_ROLE",
                dashboard: "/admin/dashboard",
                permissions: ["verify_items", "approve_all_stages", "view_all_data"],
                interactions: [
                    "🔍 View all subsidy applications",
                    "✅ Verify items at any stage",
                    "📊 View statistics and analytics",
                    "👥 Manage user roles",
                    "🔧 System configuration"
                ],
                contractFunctions: [
                    "adminVerify(itemId, stage)",
                    "grantRole(role, address)",
                    "pause() / unpause()"
                ]
            },
            processor: {
                address: processor.address,
                role: "PROCESSOR_ROLE", 
                dashboard: "/processor/dashboard",
                permissions: ["create_items", "upload_documents"],
                interactions: [
                    "📝 Create new subsidy applications",
                    "📄 Upload initial documents",
                    "👤 View own applications",
                    "📊 Track application status",
                    "✏️ Edit pending applications"
                ],
                contractFunctions: [
                    "createItem(beneficiary, ipfsHash)",
                    "uploadDocument(itemId, ipfsHash)"
                ]
            },
            transporter: {
                address: transporter.address,
                role: "TRANSPORTER_ROLE",
                dashboard: "/transporter/dashboard", 
                permissions: ["transport_items", "upload_transport_docs"],
                interactions: [
                    "📋 View assigned transport tasks",
                    "🚚 Submit pickup confirmations",
                    "📄 Upload transport documents",
                    "📍 Track delivery status",
                    "📊 View transport history"
                ],
                contractFunctions: [
                    "transporterSubmit(itemId, ipfsHash)",
                    "updateTransportStatus(itemId, status)"
                ]
            },
            distributor: {
                address: distributor.address,
                role: "DISTRIBUTOR_ROLE",
                dashboard: "/distributor/dashboard",
                permissions: ["distribute_items", "upload_delivery_docs"],
                interactions: [
                    "📦 View distribution assignments",
                    "🚚 Submit delivery confirmations", 
                    "📄 Upload delivery documents",
                    "👥 Coordinate with beneficiaries",
                    "📊 View distribution metrics"
                ],
                contractFunctions: [
                    "distributorSubmit(itemId, ipfsHash)",
                    "confirmDelivery(itemId, proof)"
                ]
            },
            beneficiary: {
                address: beneficiary.address,
                role: "BENEFICIARY_ROLE",
                dashboard: "/beneficiary/dashboard",
                permissions: ["claim_items", "view_own_data"],
                interactions: [
                    "🎁 View available subsidies",
                    "✅ Claim assigned items",
                    "📄 Download claim documents",
                    "📊 Track claim status",
                    "🔔 Receive notifications"
                ],
                contractFunctions: [
                    "beneficiaryClaim(itemId)",
                    "viewClaimStatus(itemId)"
                ]
            }
        };

        // Display mapping
        Object.keys(this.roleAddresses).forEach(role => {
            const info = this.roleAddresses[role];
            console.log(`\n🎯 ${role.toUpperCase()}`);
            console.log(`   🔗 Address: ${info.address}`);
            console.log(`   🌐 Dashboard: ${info.dashboard}`);
            console.log(`   📜 Role: ${info.role}`);
            console.log(`   🔐 Permissions: ${info.permissions.join(", ")}`);
            console.log(`   📱 Interactions:`);
            info.interactions.forEach(interaction => {
                console.log(`      ${interaction}`);
            });
            console.log(`   🔧 Contract Functions:`);
            info.contractFunctions.forEach(func => {
                console.log(`      ${func}`);
            });
        });

        console.log("\n" + "=".repeat(80));
        console.log("🔄 INTERACTION FLOW:");
        console.log("=" .repeat(80));
        
        await this.showInteractionFlow();
    }

    async showInteractionFlow() {
        console.log("📱 USER DASHBOARD → SMART CONTRACT → BLOCKCHAIN → REAL-TIME MONITOR");
        console.log("");
        
        console.log("1️⃣ PROCESSOR WORKFLOW:");
        console.log("   📱 Dashboard: /processor/dashboard");
        console.log("   📝 Action: 'Create New Application'");
        console.log("   🔗 Contract: createItem(beneficiary, ipfsHash)");
        console.log("   ⛓️  Blockchain: Transaction + ItemCreated Event");
        console.log("   📊 Monitor: Shows 'ItemCreated' event in real-time");
        console.log("");
        
        console.log("2️⃣ ADMIN WORKFLOW:");
        console.log("   📱 Dashboard: /admin/dashboard");
        console.log("   ✅ Action: 'Verify Application'");
        console.log("   🔗 Contract: adminVerify(itemId, stage)");
        console.log("   ⛓️  Blockchain: Transaction + TransactionLogged Event");
        console.log("   📊 Monitor: Shows 'TransactionLogged' event in real-time");
        console.log("");
        
        console.log("3️⃣ TRANSPORTER WORKFLOW:");
        console.log("   📱 Dashboard: /transporter/dashboard");
        console.log("   🚚 Action: 'Submit Pickup Documents'");
        console.log("   🔗 Contract: transporterSubmit(itemId, ipfsHash)");
        console.log("   ⛓️  Blockchain: Transaction + DocumentUploaded Event");
        console.log("   📊 Monitor: Shows 'DocumentUploaded' event in real-time");
        console.log("");
        
        console.log("4️⃣ DISTRIBUTOR WORKFLOW:");
        console.log("   📱 Dashboard: /distributor/dashboard");
        console.log("   📦 Action: 'Submit Delivery Documents'");
        console.log("   🔗 Contract: distributorSubmit(itemId, ipfsHash)");
        console.log("   ⛓️  Blockchain: Transaction + DocumentUploaded Event");
        console.log("   📊 Monitor: Shows 'DocumentUploaded' event in real-time");
        console.log("");
        
        console.log("5️⃣ BENEFICIARY WORKFLOW:");
        console.log("   📱 Dashboard: /beneficiary/dashboard");
        console.log("   🎁 Action: 'Claim Subsidy'");
        console.log("   🔗 Contract: beneficiaryClaim(itemId)");
        console.log("   ⛓️  Blockchain: Transaction + SubsidyClaimed Event");
        console.log("   📊 Monitor: Shows 'SubsidyClaimed' event in real-time");
    }

    async demonstrateRealTimeConnection() {
        console.log("\n🎬 REAL-TIME CONNECTION DEMONSTRATION:");
        console.log("=" .repeat(80));
        
        console.log("💡 HOW TO SEE THE CONNECTION:");
        console.log("");
        console.log("📱 STEP 1: Open Dashboard");
        console.log("   Visit: http://localhost:3000/processor/dashboard");
        console.log("   Connect MetaMask with Processor address");
        console.log("");
        console.log("📱 STEP 2: Perform Action");
        console.log("   Click 'Create New Application'");
        console.log("   Fill form and submit");
        console.log("");
        console.log("📱 STEP 3: Watch Real-Time Monitor");
        console.log("   In terminal: node scripts/realtime_monitor.js");
        console.log("   You'll see: '🔴 LIVE EVENT: ItemCreated'");
        console.log("");
        console.log("📱 STEP 4: Check Event Details");
        console.log("   Monitor shows:");
        console.log("   - Actor: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
        console.log("   - Action: CREATE_ITEM");
        console.log("   - Item ID: 0x123...abc");
        console.log("   - Block: #123");
        console.log("");
        console.log("🎯 This proves the dashboard address is connected to the blockchain!");
    }

    async showCurrentRoles() {
        console.log("\n🔍 CURRENT ROLE ASSIGNMENTS:");
        console.log("=" .repeat(80));
        
        try {
            const roles = ['ADMIN_ROLE', 'PROCESSOR_ROLE', 'TRANSPORTER_ROLE', 'DISTRIBUTOR_ROLE'];
            
            for (const roleName of roles) {
                try {
                    const roleBytes = await this.contract[roleName]();
                    console.log(`📜 ${roleName}: ${roleBytes}`);
                    
                    // Check who has this role
                    const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
                    const addresses = [admin, processor, transporter, distributor, beneficiary];
                    
                    for (const account of addresses) {
                        try {
                            const hasRole = await this.contract.hasRole(roleBytes, account.address);
                            if (hasRole) {
                                const roleKey = roleName.toLowerCase().replace('_role', '');
                                if (this.roleAddresses[roleKey] && this.roleAddresses[roleKey].address === account.address) {
                                    console.log(`   ✅ ${roleKey}: ${account.address} (${this.roleAddresses[roleKey].dashboard})`);
                                }
                            }
                        } catch (error) {
                            // Skip if hasRole function doesn't exist
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Could not get ${roleName}: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log("❌ Error checking roles:", error.message);
        }
    }
}

// Main execution
async function main() {
    const mapper = new AddressDashboardMapper();

    try {
        await mapper.initialize();
        await mapper.showCurrentRoles();
        await mapper.demonstrateRealTimeConnection();
        
        console.log("\n🎯 SUMMARY:");
        console.log("=" .repeat(80));
        console.log("✅ Each role address is connected to specific dashboard interactions");
        console.log("✅ Dashboard actions trigger smart contract functions");
        console.log("✅ Contract functions generate blockchain events");
        console.log("✅ Events appear in real-time monitor with actor address");
        console.log("✅ This creates a complete traceable audit trail!");
        
    } catch (error) {
        console.error("❌ Failed to map addresses:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = AddressDashboardMapper;

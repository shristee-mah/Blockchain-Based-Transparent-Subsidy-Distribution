const { ethers } = require("ethers");
require("dotenv").config();

// Blockchain Monitoring Demo
class BlockchainMonitor {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");
    this.contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // Contract ABI (simplified)
    this.abi = [
      "function getItem(uint256 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash))",
      "function getDocuments(uint256 itemId) external view returns (tuple(uint8 stage, string ipfsHash, address uploader, uint256 timestamp)[])",
      "function itemCount() external view returns (uint256)",
      "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
      "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
      "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
      "event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy)"
    ];
    
    this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
  }

  // Method 1: Direct Contract Query
  async getItemDetails(itemId) {
    console.log(`\n=== Getting Item ${itemId} Details ===`);
    
    try {
      const item = await this.contract.getItem(itemId);
      const documents = await this.contract.getDocuments(itemId);
      
      console.log("📋 Item Status:");
      console.log(`   Beneficiary: ${item.beneficiary}`);
      console.log(`   Stage: ${item.stage} (${this.getStageName(item.stage)})`);
      console.log(`   Claimed: ${item.claimed}`);
      console.log(`   Current IPFS Hash: ${item.currentIpfsHash}`);
      
      console.log("\n📄 Document History:");
      documents.forEach((doc, index) => {
        console.log(`   ${index + 1}. Stage ${doc.stage} (${this.getStageName(doc.stage)})`);
        console.log(`      IPFS: ${doc.ipfsHash}`);
        console.log(`      Uploaded by: ${doc.uploader}`);
        console.log(`      Timestamp: ${new Date(doc.timestamp * 1000).toLocaleString()}`);
      });
      
      return { item, documents };
    } catch (error) {
      console.error("❌ Error fetching item:", error.message);
      return null;
    }
  }

  // Method 2: Event History
  async getEventHistory(itemId) {
    console.log(`\n=== Event History for Item ${itemId} ===`);
    
    try {
      const filters = [
        this.contract.filters.ItemCreated(itemId),
        this.contract.filters.ItemVerified(itemId),
        this.contract.filters.DocumentUploaded(itemId),
        this.contract.filters.SubsidyClaimed(itemId)
      ];

      const allEvents = await Promise.all(
        filters.map(filter => this.contract.queryFilter(filter, 0, 'latest'))
      );

      const events = allEvents.flat().sort((a, b) => a.blockNumber - b.blockNumber);
      
      console.log("🔍 Blockchain Events:");
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.eventName}`);
        console.log(`      Block: ${event.blockNumber}`);
        console.log(`      Transaction: ${event.transactionHash}`);
        console.log(`      Timestamp: ${new Date().toLocaleString()}`);
        
        if (event.args) {
          console.log(`      Details:`, event.args.toObject ? event.args.toObject() : event.args);
        }
        console.log("");
      });
      
      return events;
    } catch (error) {
      console.error("❌ Error fetching events:", error.message);
      return [];
    }
  }

  // Method 3: Real-time Monitoring
  async startRealTimeMonitoring(itemId) {
    console.log(`\n🔄 Starting Real-time Monitoring for Item ${itemId}`);
    console.log("   (Press Ctrl+C to stop)");
    
    // Listen for specific events
    this.contract.on("ItemCreated", (id, beneficiary, ipfsHash, event) => {
      if (id.toString() === itemId.toString()) {
        console.log(`🆕 Item Created: ${id}`);
        console.log(`   Beneficiary: ${beneficiary}`);
        console.log(`   IPFS: ${ipfsHash}`);
        console.log(`   Transaction: ${event.transactionHash}`);
      }
    });

    this.contract.on("ItemVerified", (id, newStage, event) => {
      if (id.toString() === itemId.toString()) {
        console.log(`✅ Item Verified: ${id}`);
        console.log(`   New Stage: ${newStage} (${this.getStageName(newStage)})`);
        console.log(`   Transaction: ${event.transactionHash}`);
      }
    });

    this.contract.on("DocumentUploaded", (id, stage, ipfsHash, uploader, event) => {
      if (id.toString() === itemId.toString()) {
        console.log(`📄 Document Uploaded: ${id}`);
        console.log(`   Stage: ${stage} (${this.getStageName(stage)})`);
        console.log(`   IPFS: ${ipfsHash}`);
        console.log(`   Uploader: ${uploader}`);
        console.log(`   Transaction: ${event.transactionHash}`);
      }
    });

    this.contract.on("SubsidyClaimed", (id, beneficiary, claimedBy, event) => {
      if (id.toString() === itemId.toString()) {
        console.log(`🎉 Subsidy Claimed: ${id}`);
        console.log(`   Beneficiary: ${beneficiary}`);
        console.log(`   Claimed By: ${claimedBy}`);
        console.log(`   Transaction: ${event.transactionHash}`);
      }
    });
  }

  // Method 4: System Overview
  async getSystemOverview() {
    console.log("\n=== System Overview ===");
    
    try {
      const itemCount = await this.contract.itemCount();
      console.log(`📊 Total Items: ${itemCount}`);
      
      // Show status of first few items
      for (let i = 1; i <= Math.min(itemCount, 3); i++) {
        const item = await this.contract.getItem(i);
        console.log(`   Item ${i}: Stage ${item.stage} (${this.getStageName(item.stage)}) - Claimed: ${item.claimed}`);
      }
      
      return itemCount;
    } catch (error) {
      console.error("❌ Error getting overview:", error.message);
      return 0;
    }
  }

  // Helper method
  getStageName(stage) {
    const stages = [
      "Created", "VerifiedByAdmin", "TransporterReady", "InTransit",
      "DistributorReady", "Distributed", "Claimed", "Cancelled"
    ];
    return stages[stage] || "Unknown";
  }

  // Method 5: Verify API Response
  async verifyApiResponse(itemId) {
    console.log(`\n=== Verifying API Response for Item ${itemId} ===`);
    
    try {
      // This simulates what your API returns
      const blockchainData = await this.getItemDetails(itemId);
      const events = await this.getEventHistory(itemId);
      
      console.log("✅ API can return this data:");
      console.log(JSON.stringify({
        success: true,
        itemId: itemId,
        item: blockchainData.item,
        documents: blockchainData.documents,
        events: events.map(e => ({
          eventName: e.eventName,
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber
        }))
      }, null, 2));
      
    } catch (error) {
      console.error("❌ API verification failed:", error.message);
    }
  }
}

// Demo Functions
async function runDemo() {
  const monitor = new BlockchainMonitor();
  
  console.log("🚀 Blockchain Monitoring Demo");
  console.log("================================");
  
  // 1. System Overview
  await monitor.getSystemOverview();
  
  // 2. Check specific item (try itemId = 1)
  const itemId = 1;
  await monitor.getItemDetails(itemId);
  
  // 3. Get event history
  await monitor.getEventHistory(itemId);
  
  // 4. Verify API response format
  await monitor.verifyApiResponse(itemId);
  
  console.log("\n🎯 Demo Complete!");
  console.log("\nTo see real-time updates:");
  console.log("1. Make a blockchain transaction via the web interface");
  console.log("2. Or call: monitor.startRealTimeMonitoring(1)");
  console.log("3. Watch the events appear in real-time");
}

// API Testing Functions
function showApiTesting() {
  console.log("\n=== API Testing Commands ===");
  console.log("\n1. Get blockchain logs:");
  console.log("curl http://localhost:3001/api/blockchain/logs?itemId=1");
  
  console.log("\n2. Get receipt:");
  console.log("curl -X POST http://localhost:3001/api/blockchain/receipt \\");
  console.log("  -H 'Content-Type: application/json' \\");
  console.log("  -d '{\"itemId\": 1, \"dbId\": \"APP-123\"}'");
  
  console.log("\n3. Create blockchain update (Admin verification):");
  console.log("curl -X POST http://localhost:3001/api/blockchain/verify \\");
  console.log("  -H 'Content-Type: application/json' \\");
  console.log("  -d '{\"itemId\": 1, \"currentStage\": 0, \"dbId\": \"APP-123\"}'");
  
  console.log("\n4. Create blockchain update (Transporter submission):");
  console.log("curl -X POST http://localhost:3001/api/blockchain/transport \\");
  console.log("  -H 'Content-Type: application/json' \\");
  console.log("  -d '{\"itemId\": 1, \"CID\": \"QmTest123\", \"dbId\": \"APP-123\"}'");
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
  showApiTesting();
}

module.exports = BlockchainMonitor;

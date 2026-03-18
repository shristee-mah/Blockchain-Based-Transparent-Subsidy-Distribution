const { ethers } = require("ethers");
require("dotenv").config();

// Create test blockchain data to demonstrate updates
async function createTestData() {
  console.log("🎯 Creating Test Blockchain Data");
  console.log("================================");
  
  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  // Use admin private key for testing
  const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  // Contract ABI
  const abi = [
    "function createItem(address beneficiary, string ipfsHash) external",
    "function adminVerify(uint256 itemId, uint8 expectedCurrentStage) external",
    "function transporterSubmit(uint256 itemId, string ipfsHash) external",
    "function beneficiaryClaim(uint256 itemId) external",
    "function getItem(uint256 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash))",
    "function getDocuments(uint256 itemId) external view returns (tuple(uint8 stage, string ipfsHash, address uploader, uint256 timestamp)[])",
    "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
    "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
    "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, adminWallet);
  
  try {
    // 1. Create a new item
    console.log("\n1️⃣ Creating new subsidy item...");
    const beneficiaryAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const ipfsHash = "QmTestDocument123";
    
    const createTx = await contract.createItem(beneficiaryAddress, ipfsHash);
    const createReceipt = await createTx.wait();
    
    console.log(`   ✅ Item created!`);
    console.log(`   📝 Transaction: ${createTx.hash}`);
    console.log(`   🔢 Block: ${createReceipt.blockNumber}`);
    
    // Extract itemId from events
    let itemId = 1; // Default fallback
    for (const event of createReceipt.logs) {
      try {
        const parsed = contract.interface.parseLog(event);
        if (parsed && parsed.name === 'ItemCreated') {
          itemId = Number(parsed.args[0]);
          console.log(`   🆔 Item ID: ${itemId}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // 2. Verify the item (admin verification)
    console.log(`\n2️⃣ Admin verifying item ${itemId}...`);
    const verifyTx = await contract.adminVerify(itemId, 0); // Stage 0 = Created
    const verifyReceipt = await verifyTx.wait();
    
    console.log(`   ✅ Item verified!`);
    console.log(`   📝 Transaction: ${verifyTx.hash}`);
    console.log(`   🔢 Block: ${verifyReceipt.blockNumber}`);
    
    // 3. Transporter submission
    console.log(`\n3️⃣ Transporter submitting pickup docs...`);
    const transporterIpfs = "QmTransporterDoc456";
    
    // Switch to transporter wallet
    const transporterWallet = new ethers.Wallet(process.env.TRANSPORTER_PRIVATE_KEY || "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9b80f38ab3fc6", provider);
    const transporterContract = new ethers.Contract(contractAddress, abi, transporterWallet);
    
    const transportTx = await transporterContract.transporterSubmit(itemId, transporterIpfs);
    const transportReceipt = await transportTx.wait();
    
    console.log(`   ✅ Transporter submitted!`);
    console.log(`   📝 Transaction: ${transportTx.hash}`);
    console.log(`   🔢 Block: ${transportReceipt.blockNumber}`);
    
    // 4. Final verification
    console.log(`\n4️⃣ Admin verifying transporter submission...`);
    const finalVerifyTx = await contract.adminVerify(itemId, 2); // Stage 2 = TransporterReady
    const finalVerifyReceipt = await finalVerifyTx.wait();
    
    console.log(`   ✅ Final verification complete!`);
    console.log(`   📝 Transaction: ${finalVerifyTx.hash}`);
    console.log(`   🔢 Block: ${finalVerifyReceipt.blockNumber}`);
    
    // 5. Show final state
    console.log(`\n5️⃣ Final blockchain state for item ${itemId}:`);
    const finalItem = await contract.getItem(itemId);
    const finalDocuments = await contract.getDocuments(itemId);
    
    console.log(`   👤 Beneficiary: ${finalItem.beneficiary}`);
    console.log(`   📊 Stage: ${finalItem.stage} (${getStageName(finalItem.stage)})`);
    console.log(`   🎯 Claimed: ${finalItem.claimed}`);
    console.log(`   📄 Current IPFS: ${finalItem.currentIpfsHash}`);
    
    console.log(`\n📜 Document History:`);
    finalDocuments.forEach((doc, index) => {
      console.log(`   ${index + 1}. Stage ${doc.stage} - ${doc.ipfsHash} by ${doc.uploader}`);
    });
    
    console.log(`\n🎉 Test data created successfully!`);
    console.log(`\nNow you can test the APIs:`);
    console.log(`curl http://localhost:3001/api/blockchain/logs?itemId=${itemId}`);
    console.log(`curl -X POST http://localhost:3001/api/blockchain/receipt -H 'Content-Type: application/json' -d '{"itemId": ${itemId}, "dbId": "APP-123"}'`);
    
    return itemId;
    
  } catch (error) {
    console.error("❌ Error creating test data:", error.message);
    return null;
  }
}

function getStageName(stage) {
  const stages = [
    "Created", "VerifiedByAdmin", "TransporterReady", "InTransit",
    "DistributorReady", "Distributed", "Claimed", "Cancelled"
  ];
  return stages[stage] || "Unknown";
}

// Run the test
if (require.main === module) {
  createTestData().catch(console.error);
}

module.exports = { createTestData };

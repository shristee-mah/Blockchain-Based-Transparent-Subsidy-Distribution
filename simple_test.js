const { ethers } = require("ethers");
require("dotenv").config();

// Simple test to create blockchain data
async function runSimpleTest() {
  console.log("🎯 Creating Simple Test Data");
  console.log("==========================");
  
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  // Get fresh nonce
  const adminWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  const nonce = await provider.getTransactionCount(adminWallet.address);
  
  console.log(`Using nonce: ${nonce}`);
  
  const abi = [
    "function createItem(address beneficiary, string ipfsHash) external",
    "function getItem(uint256 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash))"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, adminWallet);
  
  try {
    // Create item with proper nonce
    const tx = await contract.createItem(
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "QmTestDocument123",
      { nonce: nonce }
    );
    
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Item created in block:", receipt.blockNumber);
    
    // Get the item details
    const item = await contract.getItem(1);
    console.log("\n📋 Item Details:");
    console.log(`   Beneficiary: ${item.beneficiary}`);
    console.log(`   Stage: ${item.stage}`);
    console.log(`   Claimed: ${item.claimed}`);
    console.log(`   IPFS: ${item.currentIpfsHash}`);
    
    console.log("\n🎉 Test complete! Now try the API:");
    console.log("curl http://localhost:3001/api/blockchain/logs?itemId=1");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

runSimpleTest();

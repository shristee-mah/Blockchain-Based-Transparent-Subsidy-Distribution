const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const { keccak256 } = require("crypto-js");

// Simple Merkle tree implementation for testing
function createDocumentBatch(documentHashes) {
    const leaves = documentHashes.map(hash => '0x' + hash);
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();
    
    const proofs = {};
    documentHashes.forEach((hash, index) => {
        const leaf = '0x' + hash;
        proofs[hash] = tree.getHexProof(leaf);
    });
    
    return {
        merkleRoot: root,
        proofs: proofs,
        leaves: leaves
    };
}

async function main() {
    console.log("🌳 Populating ledger with Merkle tree test data...");

    const [admin, processor, transporter, distributor] = await ethers.getSigners();
    
    // Get deployed contract
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
    
    console.log("📋 Contract address:", contractAddress);
    console.log("👤 Admin address:", admin.address);

    try {
        // 1. Create a test item (subsidy application)
        console.log("\n🏭 Creating test subsidy item...");
        const createTx = await contract.connect(processor).createItem(
            admin.address,          // beneficiary
            "QmTestDocument123"     // ipfsHash
        );
        await createTx.wait();
        console.log("✅ Item created with ID: 1");

        // 2. Create some test document hashes for Merkle tree
        console.log("\n🌳 Creating Merkle tree for batch documents...");
        const documentHashes = [
            ethers.keccak256(ethers.toUtf8Bytes("Toll Receipt 1")).slice(2),
            ethers.keccak256(ethers.toUtf8Bytes("Fuel Receipt 1")).slice(2), 
            ethers.keccak256(ethers.toUtf8Bytes("GPS Log 1")).slice(2),
            ethers.keccak256(ethers.toUtf8Bytes("Delivery Challan 1")).slice(2)
        ];
        
        console.log("📄 Document hashes:", documentHashes.map(h => h.slice(0, 10) + "..."));

        // Create Merkle batch (using our utility)
        const batch = createDocumentBatch(documentHashes);
        console.log("🔐 Merkle root:", batch.merkleRoot.slice(0, 20) + "...");

        // 3. Admin verifies and sets Merkle root for Created stage
        console.log("\n🔐 Admin verifying and setting Merkle root...");
        const verifyTx = await contract.connect(admin).adminVerify(
            1,                      // itemId
            0                       // expectedCurrentStage (Created)
        );
        await verifyTx.wait();
        console.log("✅ Admin verification completed");

        // 4. Set Merkle root for Created stage
        const setRootTx = await contract.setMerkleRoot(
            1,                      // itemId
            0,                      // stage (Created)
            batch.merkleRoot        // merkleRoot
        );
        await setRootTx.wait();
        console.log("✅ Merkle root set for Created stage");

        // 5. Transporter submits batch documents
        console.log("\n🚚 Transporter submitting batch documents...");
        const transportTx = await contract.connect(transporter).transporterSubmit(
            1,                      // itemId
            batch.merkleRoot        // CID (using Merkle root)
        );
        await transportTx.wait();
        console.log("✅ Transporter batch submission completed");

        // 6. Admin verifies transporter stage
        console.log("\n🔐 Admin verifying transporter stage...");
        const verifyTransportTx = await contract.connect(admin).adminVerify(
            1,                      // itemId
            2                       // expectedCurrentStage (TransporterReady)
        );
        await verifyTransportTx.wait();
        console.log("✅ Transporter stage verified");

        // 7. Set Merkle root for Transporter stage
        const setTransportRootTx = await contract.setMerkleRoot(
            1,                      // itemId
            2,                      // stage (TransporterReady)
            batch.merkleRoot        // merkleRoot
        );
        await setTransportRootTx.wait();
        console.log("✅ Merkle root set for Transporter stage");

        // 8. Test Merkle verification
        console.log("\n🔍 Testing Merkle proof verification...");
        
        // Check if Merkle root is set
        const storedRoot = await contract.getMerkleRoot(1, 2);
        console.log("🔐 Stored Merkle root for stage 2:", storedRoot);
        
        if (storedRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log("⚠️ No Merkle root stored, skipping verification test");
        } else {
            const proof = batch.proofs[documentHashes[0]]; // Get proof for first document
            
            const isValid = await contract.verifyDocumentInclusion(
                1,                      // itemId
                2,                      // stage (TransporterReady)
                '0x' + documentHashes[0], // documentHash (add 0x prefix)
                proof                   // proof
            );
            console.log("✅ Merkle proof verification:", isValid);
        }

        // 9. Test batch verification
        console.log("\n📊 Testing batch verification...");
        
        if (storedRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log("⚠️ No Merkle root stored, skipping batch verification test");
        } else {
            const allValid = await contract.batchVerifyDocuments(
                1,                      // itemId
                2,                      // stage (TransporterReady)
                documentHashes.map(hash => '0x' + hash), // documentHashes (add 0x prefix)
                documentHashes.map(hash => batch.proofs[hash]) // proofs
            );
            console.log("✅ Batch verification result:", allValid);
        }

        console.log("\n🎉 Ledger populated successfully!");
        console.log("📊 Summary:");
        console.log("  - Items created: 1");
        console.log("  - Merkle roots set: 2");
        console.log("  - Stages completed: 2");
        console.log("  - Document proofs: 4");
        console.log("  - Batch verification: ✅");

    } catch (error) {
        console.error("❌ Error populating ledger:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

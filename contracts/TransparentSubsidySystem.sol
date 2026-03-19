// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract TransparentSubsidySystem is AccessControl {
    // ---------------- ROLES ----------------
    bytes32 public constant ADMIN_ROLE        = keccak256("ADMIN_ROLE");
    bytes32 public constant PROCESSOR_ROLE    = keccak256("PROCESSOR_ROLE");
    bytes32 public constant TRANSPORTER_ROLE  = keccak256("TRANSPORTER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE  = keccak256("DISTRIBUTOR_ROLE");

    // ---------------- WORKFLOW ----------------
    // 7-Stage "Scan-Upload-Verify-Release" workflow
    enum Stage {
        Created,           // 0: Processor uploaded initial docs
        VerifiedByAdmin,   // 1: Admin verified Stage 0 (QR 1 now visible to Processor)
        TransporterReady,  // 2: Transporter scanned QR 1 + uploaded Pickup Docs
        InTransit,         // 3: Admin verified Stage 2 (QR 2 now visible to Transporter)
        DistributorReady,  // 4: Distributor scanned QR 2 + uploaded Delivery Docs
        Distributed,       // 5: Admin verified Stage 4 (QR 3 now visible to Distributor)
        Claimed,           // 6: Beneficiary scanned QR 3
        Cancelled          // 7
    }

    struct Item {
        address beneficiary;
        Stage stage;
        bool claimed;
        string currentIpfsHash;
        bytes32 itemId; // Unique bytes32 ID for blockchain tracking
    }

    uint256 public itemCount;
    mapping(uint256 => Item) public items;
    mapping(bytes32 => uint256) public itemIdToUint; // bytes32 to uint256 mapping
    
    // Merkle tree storage for document batches
    mapping(uint256 => bytes32) public itemMerkleRoots; // itemId -> merkle root
    mapping(uint256 => mapping(Stage => bytes32)) public stageMerkleRoots; // itemId -> stage -> merkle root

    struct Document {
        Stage stage;
        string ipfsHash;
        address uploader;
        uint256 timestamp;
    }
    mapping(uint256 => Document[]) private itemDocuments;

    // ---------------- EVENTS ----------------
    event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action);
    event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash);
    event ItemVerified(uint256 indexed itemId, Stage newStage);
    event DocumentUploaded(uint256 indexed itemId, Stage stage, string ipfsHash, address uploader);
    event MerkleRootSet(uint256 indexed itemId, Stage indexed stage, bytes32 merkleRoot);
    event DocumentBatchVerified(uint256 indexed itemId, Stage indexed stage, bytes32 merkleRoot);
    event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy);
    event ItemCancelled(uint256 indexed itemId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        _setRoleAdmin(PROCESSOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(TRANSPORTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(DISTRIBUTOR_ROLE, ADMIN_ROLE);
    }

    // ---------------- ACTOR ACTIONS ----------------

    // 1. Processor: Create Item + Upload Initial Docs -> Stage 0
    function createItem(address beneficiary, string calldata ipfsHash)
        external
        onlyRole(PROCESSOR_ROLE)
    {
        require(beneficiary != address(0), "Invalid beneficiary");
        itemCount++;
        
        // Generate unique bytes32 Item ID
        bytes32 uniqueItemId = keccak256(abi.encodePacked(block.timestamp, msg.sender, itemCount));
        
        items[itemCount] = Item({
            beneficiary: beneficiary,
            stage: Stage.Created,
            claimed: false,
            currentIpfsHash: ipfsHash,
            itemId: uniqueItemId
        });
        
        // Map bytes32 ID to uint256
        itemIdToUint[uniqueItemId] = itemCount;

        itemDocuments[itemCount].push(Document({
            stage: Stage.Created,
            ipfsHash: ipfsHash,
            uploader: msg.sender,
            timestamp: block.timestamp
        }));

        emit TransactionLogged(uniqueItemId, msg.sender, "CREATE_ITEM");
        emit ItemCreated(itemCount, beneficiary, ipfsHash);
        emit DocumentUploaded(itemCount, Stage.Created, ipfsHash, msg.sender);
    }

    // 2. Admin: Verify current uploads and Release QR for next actor
    function adminVerify(uint256 itemId, Stage expectedCurrentStage) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        Item storage item = items[itemId];
        require(item.stage == expectedCurrentStage, "Stage mismatch for verification");

        if (expectedCurrentStage == Stage.Created) {
            item.stage = Stage.VerifiedByAdmin; // -> 1
        } else if (expectedCurrentStage == Stage.TransporterReady) {
            item.stage = Stage.InTransit; // -> 3
        } else if (expectedCurrentStage == Stage.DistributorReady) {
            item.stage = Stage.Distributed; // -> 5
        } else {
            revert("This stage cannot be verified by Admin directly");
        }

        emit TransactionLogged(item.itemId, msg.sender, "ADMIN_VERIFY");
        emit ItemVerified(itemId, item.stage);
    }

    // 3. Transporter: Submit Pickup Docs (Transition Stage 1 -> 2)
    function transporterSubmit(uint256 itemId, string calldata ipfsHash) 
        external 
        onlyRole(TRANSPORTER_ROLE) 
    {
        require(items[itemId].stage == Stage.VerifiedByAdmin, "Handover not verified by Admin");
        Item storage item = items[itemId];
        
        item.stage = Stage.TransporterReady;
        item.currentIpfsHash = ipfsHash;

        itemDocuments[itemId].push(Document({
            stage: Stage.TransporterReady,
            ipfsHash: ipfsHash,
            uploader: msg.sender,
            timestamp: block.timestamp
        }));

        emit TransactionLogged(item.itemId, msg.sender, "TRANSPORTER_SUBMIT");
        emit DocumentUploaded(itemId, Stage.TransporterReady, ipfsHash, msg.sender);
    }

    // 4. Distributor: Submit Delivery Docs (Transition Stage 3 -> 4)
    function distributorSubmit(uint256 itemId, string calldata ipfsHash) 
        external 
        onlyRole(DISTRIBUTOR_ROLE) 
    {
        require(items[itemId].stage == Stage.InTransit, "Item not in transit");
        Item storage item = items[itemId];

        item.stage = Stage.DistributorReady;
        item.currentIpfsHash = ipfsHash;

        itemDocuments[itemId].push(Document({
            stage: Stage.DistributorReady,
            ipfsHash: ipfsHash,
            uploader: msg.sender,
            timestamp: block.timestamp
        }));

        emit TransactionLogged(item.itemId, msg.sender, "DISTRIBUTOR_SUBMIT");
        emit DocumentUploaded(itemId, Stage.DistributorReady, ipfsHash, msg.sender);
    }

    // 5. Beneficiary: Claim (Transition Stage 5 -> 6)
    function beneficiaryClaim(uint256 itemId) external {
        Item storage item = items[itemId];
        require(item.stage == Stage.Distributed, "Delivery not verified by Admin yet");
        require(!item.claimed, "Already claimed");
        
        // Either the beneficiary scans or Admin/Distributor acts as relay
        bool isBeneficiary = msg.sender == item.beneficiary;
        bool authorizedRelay = hasRole(ADMIN_ROLE, msg.sender) || hasRole(DISTRIBUTOR_ROLE, msg.sender);
        require(isBeneficiary || authorizedRelay, "Unauthorized");

        item.claimed = true;
        item.stage = Stage.Claimed;

        emit TransactionLogged(item.itemId, msg.sender, "BENEFICIARY_CLAIM");
        emit SubsidyClaimed(itemId, item.beneficiary, msg.sender);
        emit DocumentUploaded(itemId, Stage.Claimed, "ipfs://Claimed", msg.sender);
    }

    function cancelItem(uint256 itemId) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        Item storage item = items[itemId];
        require(!item.claimed, "Cannot cancel a claimed item");
        item.stage = Stage.Cancelled;
        
        emit TransactionLogged(item.itemId, msg.sender, "CANCEL_ITEM");
        emit ItemCancelled(itemId);
    }

    // ---------------- UTILS ----------------

    function getDocuments(uint256 itemId)
        external
        view
        returns (Document[] memory)
    {
        return itemDocuments[itemId];
    }

    function getItem(uint256 itemId) external view returns (Item memory) {
        return items[itemId];
    }
    
    function getItemByBytes32(bytes32 itemId) external view returns (Item memory) {
        uint256 uintId = itemIdToUint[itemId];
        require(uintId != 0, "Item not found");
        return items[uintId];
    }
    
    // ---------------- MERKLE TREE FUNCTIONS ----------------
    
    /**
     * @dev Set Merkle root for document batch at specific stage
     * @param itemId The subsidy item ID
     * @param stage The workflow stage
     * @param merkleRoot The Merkle root of document batch
     */
    function setMerkleRoot(uint256 itemId, Stage stage, bytes32 merkleRoot)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(items[itemId].beneficiary != address(0), "Item does not exist");
        stageMerkleRoots[itemId][stage] = merkleRoot;
        itemMerkleRoots[itemId] = merkleRoot; // Update overall root
        emit MerkleRootSet(itemId, stage, merkleRoot);
    }
    
    /**
     * @dev Verify document inclusion using Merkle proof
     * @param itemId The subsidy item ID
     * @param stage The workflow stage
     * @param documentHash The hash of the document to verify
     * @param proof The Merkle proof array
     * @return valid True if document is included in the Merkle tree
     */
    function verifyDocumentInclusion(
        uint256 itemId,
        Stage stage,
        bytes32 documentHash,
        bytes32[] calldata proof
    ) external view returns (bool valid) {
        bytes32 root = stageMerkleRoots[itemId][stage];
        if (root == bytes32(0)) return false;
        
        return MerkleProof.verify(proof, root, documentHash);
    }
    
    /**
     * @dev Batch verify multiple documents for an item
     * @param itemId The subsidy item ID
     * @param stage The workflow stage
     * @param documentHashes Array of document hashes to verify
     * @param proofs Array of Merkle proofs for each document
     * @return allValid True if all documents are valid
     */
    function batchVerifyDocuments(
        uint256 itemId,
        Stage stage,
        bytes32[] calldata documentHashes,
        bytes32[][] calldata proofs
    ) external view returns (bool allValid) {
        require(documentHashes.length == proofs.length, "Array length mismatch");
        
        for (uint256 i = 0; i < documentHashes.length; i++) {
            bytes32 root = stageMerkleRoots[itemId][stage];
            if (root == bytes32(0)) return false;
            
            if (!MerkleProof.verify(proofs[i], root, documentHashes[i])) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Get Merkle root for a specific item and stage
     * @param itemId The subsidy item ID
     * @param stage The workflow stage
     * @return root The Merkle root
     */
    function getMerkleRoot(uint256 itemId, Stage stage) external view returns (bytes32 root) {
        return stageMerkleRoots[itemId][stage];
    }
    
    /**
     * @dev Get overall Merkle root for an item
     * @param itemId The subsidy item ID
     * @return root The overall Merkle root
     */
    function getItemMerkleRoot(uint256 itemId) external view returns (bytes32 root) {
        return itemMerkleRoots[itemId];
    }
}

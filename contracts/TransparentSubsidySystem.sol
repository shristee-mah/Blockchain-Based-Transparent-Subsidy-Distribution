// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

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
    }

    uint256 public itemCount;
    mapping(uint256 => Item) public items;

    struct Document {
        Stage stage;
        string ipfsHash;
        address uploader;
        uint256 timestamp;
    }
    mapping(uint256 => Document[]) private itemDocuments;

    // ---------------- EVENTS ----------------
    event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash);
    event ItemVerified(uint256 indexed itemId, Stage newStage);
    event DocumentUploaded(uint256 indexed itemId, Stage stage, string ipfsHash, address uploader);
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
        items[itemCount] = Item({
            beneficiary: beneficiary,
            stage: Stage.Created,
            claimed: false,
            currentIpfsHash: ipfsHash
        });

        itemDocuments[itemCount].push(Document({
            stage: Stage.Created,
            ipfsHash: ipfsHash,
            uploader: msg.sender,
            timestamp: block.timestamp
        }));

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
}

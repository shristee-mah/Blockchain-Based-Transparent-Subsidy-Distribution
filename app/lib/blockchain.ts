import { ethers } from "ethers";

// 7-Stage "Scan-Upload-Verify-Release" workflow
// 0: Created (Processor uploaded initial docs)
// 1: VerifiedByAdmin (Admin verified Stage 0)
// 2: TransporterReady (Transporter uploaded Pickup Docs)
// 3: InTransit (Admin verified Stage 2)
// 4: DistributorReady (Distributor uploaded Delivery Docs)
// 5: Distributed (Admin verified Stage 4)
// 6: Claimed (Beneficiary scanned QR 3)
// 7: Cancelled

export enum Stage {
    Created = 0,
    VerifiedByAdmin = 1,
    TransporterReady = 2,
    InTransit = 3,
    DistributorReady = 4,
    Distributed = 5,
    Claimed = 6,
    Cancelled = 7
}

const ABI = [
    "function createItem(address beneficiary, string ipfsHash) external",
    "function adminVerify(uint256 itemId, uint8 expectedCurrentStage) external",
    "function transporterSubmit(uint256 itemId, string ipfsHash) external",
    "function distributorSubmit(uint256 itemId, string ipfsHash) external",
    "function beneficiaryClaim(uint256 itemId) external",
    "function getItem(uint256 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash))",
    "function itemCount() external view returns (uint256)",
    "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
    "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
    "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
    "event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy)"
];

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");
const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export function getContract(privateKey?: string) {
    if (!privateKey) {
        return new ethers.Contract(contractAddress, ABI, provider);
    }
    const signer = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(contractAddress, ABI, signer);
}

export const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY!;
export const TRANSPORTER_KEY = process.env.TRANSPORTER_PRIVATE_KEY!;
export const DISTRIBUTOR_KEY = process.env.DISTRIBUTOR_PRIVATE_KEY!;

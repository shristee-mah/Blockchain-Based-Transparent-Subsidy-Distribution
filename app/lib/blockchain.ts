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

// Enhanced error handling utilities
export function decodeBlockchainError(error: any): { message: string; code: string; details?: any } {
    let errorMessage = "Unknown blockchain error";
    let errorCode = "UNKNOWN_ERROR";
    let details: any = null;

    // Ethers.js v6 specific error handling
    if (error.code) {
        errorCode = `ETH_${error.code}`;
        
        switch (error.code) {
            case 4001: // USER_REJECTED
                errorMessage = "Transaction rejected by user";
                break;
            case 4100: // UNAUTHORIZED
                errorMessage = "Unauthorized to perform this action";
                break;
            case 4200: // UNSUPPORTED_OPERATION
                errorMessage = "Unsupported operation";
                break;
            case 4900: // NOT_IMPLEMENTED
                errorMessage = "Feature not implemented";
                break;
            case 4901: // UNINITIALIZED
                errorMessage = "Provider not initialized";
                break;
            case 4902: // UNCONFIGURED_NAME
                errorMessage = "Unconfigured ENS name";
                break;
            case -32603: // INTERNAL_ERROR
                errorMessage = "Internal JSON-RPC error";
                break;
            case -32000: // INVALID_INPUT
                errorMessage = "Invalid input provided";
                break;
            case -32001: // RESOURCE_NOT_FOUND
                errorMessage = "Resource not found";
                break;
            case -32002: // RESOURCE_UNAVAILABLE
                errorMessage = "Resource unavailable";
                break;
            case -32003: // TRANSACTION_REJECTED
                errorMessage = "Transaction rejected";
                break;
            case -32004: // METHOD_NOT_FOUND
                errorMessage = "Method not found";
                break;
            case -32005: // LIMIT_EXCEEDED
                errorMessage = "Request limit exceeded";
                break;
            case -32600: // INVALID_REQUEST
                errorMessage = "Invalid JSON-RPC request";
                break;
            case -32601: // METHOD_NOT_FOUND
                errorMessage = "Method not found";
                break;
            case -32602: // INVALID_PARAMS
                errorMessage = "Invalid parameters";
                break;
            default:
                errorMessage = `Ethers.js error (${error.code}): ${error.message}`;
        }
    } else if (error.message) {
        // Handle common error patterns
        if (error.message.includes("revert")) {
            errorCode = "CONTRACT_REVERT";
            errorMessage = "Contract revert: " + (error.reason || error.message);
        } else if (error.message.includes("insufficient funds")) {
            errorCode = "INSUFFICIENT_FUNDS";
            errorMessage = "Insufficient funds for gas";
        } else if (error.message.includes("gas")) {
            errorCode = "GAS_ERROR";
            errorMessage = "Gas estimation failed";
        } else if (error.message.includes("nonce")) {
            errorCode = "NONCE_ERROR";
            errorMessage = "Nonce too low or transaction already mined";
        } else if (error.message.includes("network")) {
            errorCode = "NETWORK_ERROR";
            errorMessage = "Network connection error";
        } else if (error.message.includes("timeout")) {
            errorCode = "TIMEOUT_ERROR";
            errorMessage = "Transaction timeout";
        } else {
            errorMessage = error.message;
        }
    }

    // Extract additional details if available
    if (error.transaction) {
        details = {
            transaction: {
                to: error.transaction.to,
                from: error.transaction.from,
                data: error.transaction.data?.slice(0, 10) + "...",
                value: error.transaction.value
            }
        };
    }

    if (error.receipt) {
        details = {
            ...details,
            receipt: {
                hash: error.receipt.hash,
                status: error.receipt.status,
                gasUsed: error.receipt.gasUsed?.toString()
            }
        };
    }

    return { message: errorMessage, code: errorCode, details };
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

import { ethers } from "ethers";
import { MerkleProof, DocumentBatch } from "./merkle";

// Simple in-memory nonce cache to prevent nonce conflicts
const nonceCache = new Map<string, number>();

// Function to get and increment nonce for a specific address
async function getNonce(signer: ethers.Wallet): Promise<number> {
    const address = await signer.getAddress();
    
    if (!signer.provider) {
        throw new Error("Signer provider is null");
    }
    
    // Get current network nonce
    const networkNonce = await signer.provider.getTransactionCount(address, "pending");
    
    // Get cached nonce (if any)
    const cachedNonce = nonceCache.get(address) || 0;
    
    // Use the higher of network nonce or cached nonce
    const nonce = Math.max(networkNonce, cachedNonce);
    
    // Update cache
    nonceCache.set(address, nonce + 1);
    
    return nonce;
}

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
    "function cancelItem(uint256 itemId) external",
    "function getItem(uint256 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))",
    "function getItemByBytes32(bytes32 itemId) external view returns (tuple(address beneficiary, uint8 stage, bool claimed, string currentIpfsHash, bytes32 itemId))",
    "function itemCount() external view returns (uint256)",
    "function setMerkleRoot(uint256 itemId, uint8 stage, bytes32 merkleRoot) external",
    "function verifyDocumentInclusion(uint256 itemId, uint8 stage, bytes32 documentHash, bytes32[] calldata proof) external view returns (bool)",
    "function batchVerifyDocuments(uint256 itemId, uint8 stage, bytes32[] calldata documentHashes, bytes32[][] calldata proofs) external view returns (bool)",
    "function getMerkleRoot(uint256 itemId, uint8 stage) external view returns (bytes32)",
    "function getItemMerkleRoot(uint256 itemId) external view returns (bytes32)",
    "event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)",
    "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
    "event ItemVerified(uint256 indexed itemId, uint8 newStage)",
    "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
    "event MerkleRootSet(uint256 indexed itemId, uint8 indexed stage, bytes32 merkleRoot)",
    "event DocumentBatchVerified(uint256 indexed itemId, uint8 indexed stage, bytes32 merkleRoot)",
    "event SubsidyClaimed(uint256 indexed itemId, address indexed beneficiary, address claimedBy)",
    "event ItemCancelled(uint256 indexed itemId)"
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

// Function to send transaction with nonce management
export async function sendTransactionWithNonce(
    contract: ethers.Contract, 
    functionName: string, 
    args: any[]
): Promise<ethers.TransactionReceipt> {
    const signer = contract.runner as ethers.Wallet;
    if (!signer) {
        throw new Error("Contract must be instantiated with a signer");
    }
    
    if (!signer.provider) {
        throw new Error("Signer provider is null");
    }
    
    // Get appropriate nonce
    const nonce = await getNonce(signer);
    
    // Estimate gas
    const gasEstimate = await contract[functionName].estimateGas(...args);
    
    // Get gas price
    const gasPrice = await signer.provider.getFeeData();
    
    // Send transaction with explicit nonce
    const tx = await contract[functionName](...args, {
        nonce: nonce,
        gasLimit: gasEstimate,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
    });
    
    return await tx.wait();
}

export const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY!;
export const TRANSPORTER_KEY = process.env.TRANSPORTER_PRIVATE_KEY!;
export const DISTRIBUTOR_KEY = process.env.DISTRIBUTOR_PRIVATE_KEY!;

// ---------------- FRONTEND BLOCKCHAIN CONNECTION ----------------

export class BlockchainConnection {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.JsonRpcSigner | null = null;
    private contract: ethers.Contract | null = null;
    private contractAddress: string;
    private isConnecting = false;

    constructor(contractAddress: string) {
        this.contractAddress = contractAddress;
    }

    async connect(): Promise<{ address: string; success: boolean }> {
        if (this.isConnecting) {
            throw new Error('Connection already in progress');
        }

        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        this.isConnecting = true;

        try {
            // Create provider and signer
            this.provider = new ethers.BrowserProvider(window.ethereum);
            await this.provider.send('eth_requestAccounts', []);
            this.signer = await this.provider.getSigner();

            // Create contract instance
            this.contract = new ethers.Contract(
                this.contractAddress,
                ABI,
                this.signer
            );

            const address = await this.signer.getAddress();
            return { address, success: true };
        } catch (error) {
            console.error('Blockchain connection failed:', error);
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    async disconnect(): Promise<void> {
        this.provider = null;
        this.signer = null;
        this.contract = null;
    }

    isConnected(): boolean {
        return this.signer !== null && this.contract !== null;
    }

    async getSignerAddress(): Promise<string> {
        if (!this.signer) {
            throw new Error('Not connected to blockchain');
        }
        return await this.signer.getAddress();
    }

    async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt> {
        if (!this.provider) {
            throw new Error('Provider not available');
        }
        const receipt = await this.provider.waitForTransaction(txHash);
        if (!receipt) {
            throw new Error('Transaction receipt not found');
        }
        return receipt;
    }

    // Contract methods with error handling
    async createItem(beneficiary: string, ipfsHash: string): Promise<ethers.TransactionResponse> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.createItem(beneficiary, ipfsHash);
            return tx;
        } catch (error: any) {
            if (error.code === 4001) {
                throw new Error('User rejected transaction');
            } else if (error.code === -32603) {
                throw new Error('Out of gas or internal error');
            }
            throw error;
        }
    }

    async adminVerify(itemId: number, expectedStage: number): Promise<ethers.TransactionResponse> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.adminVerify(itemId, expectedStage);
            return tx;
        } catch (error: any) {
            if (error.code === 4001) {
                throw new Error('User rejected transaction');
            }
            throw error;
        }
    }

    async transporterSubmit(itemId: number, ipfsHash: string): Promise<ethers.TransactionResponse> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.transporterSubmit(itemId, ipfsHash);
            return tx;
        } catch (error: any) {
            if (error.code === 4001) {
                throw new Error('User rejected transaction');
            }
            throw error;
        }
    }

    async distributorSubmit(itemId: number, ipfsHash: string): Promise<ethers.TransactionResponse> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.distributorSubmit(itemId, ipfsHash);
            return tx;
        } catch (error: any) {
            if (error.code === 4001) {
                throw new Error('User rejected transaction');
            }
            throw error;
        }
    }

    async beneficiaryClaim(itemId: number): Promise<ethers.TransactionResponse> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.beneficiaryClaim(itemId);
            return tx;
        } catch (error: any) {
            if (error.code === 4001) {
                throw new Error('User rejected transaction');
            }
            throw error;
        }
    }

    async cancelItem(itemId: number): Promise<ethers.TransactionResponse> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.cancelItem(itemId);
            return tx;
        } catch (error: any) {
            if (error.code === 4001) {
                throw new Error('User rejected transaction');
            }
            throw error;
        }
    }

    async getItem(itemId: number): Promise<any> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        return await this.contract.getItem(itemId);
    }

    async getItemByBytes32(itemId: string): Promise<any> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        return await this.contract.getItemByBytes32(itemId);
    }

    async getItemCount(): Promise<number> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        const count = await this.contract.itemCount();
        return Number(count);
    }

    // Event listener for TransactionLogged events
    async listenToTransactionLogs(
        callback: (itemId: string, actor: string, action: string, event: any) => void
    ): Promise<void> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        this.contract.on('TransactionLogged', (itemId, actor, action, event) => {
            callback(itemId, actor, action, event);
        });
    }

    // Stop listening to events
    stopListening(): void {
        if (this.contract) {
            this.contract.removeAllListeners('TransactionLogged');
        }
    }

    // Get recent transactions from the contract
    async getRecentTransactions(limit: number = 10): Promise<any[]> {
        if (!this.provider || !this.contract) {
            throw new Error('Provider or contract not initialized');
        }

        try {
            // Get the latest block number
            const latestBlock = await this.provider.getBlockNumber();
            const transactions = [];

            // Query events from recent blocks
            const filter = this.contract.filters.TransactionLogged();
            const events = await this.contract.queryFilter(filter, latestBlock - 1000, latestBlock);

            // Process and limit results
            for (let i = events.length - 1; i >= Math.max(0, events.length - limit); i--) {
                const event = events[i];
                if ('args' in event) {
                    const eventLog = event as ethers.EventLog;
                    transactions.push({
                        itemId: eventLog.args.itemId,
                        actor: eventLog.args.actor,
                        action: eventLog.args.action,
                        blockNumber: eventLog.blockNumber,
                        transactionHash: eventLog.transactionHash,
                        timestamp: new Date().toISOString() // Would need to fetch block timestamp for accuracy
                    });
                }
            }

            return transactions;
        } catch (error) {
            console.error('Failed to fetch recent transactions:', error);
            return [];
        }
    }
}

// Global instance
let blockchainInstance: BlockchainConnection | null = null;

export function getBlockchainConnection(contractAddress: string): BlockchainConnection {
    if (!blockchainInstance) {
        blockchainInstance = new BlockchainConnection(contractAddress);
    }
    return blockchainInstance;
}

// Type declarations for window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

// ---------------- MERKLE TREE BLOCKCHAIN FUNCTIONS ----------------

/**
 * Set Merkle root for document batch at specific stage
 */
export async function setMerkleRoot(
    contract: ethers.Contract,
    itemId: number,
    stage: Stage,
    merkleRoot: string
): Promise<ethers.TransactionReceipt> {
    return await sendTransactionWithNonce(contract, 'setMerkleRoot', [itemId, stage, merkleRoot]);
}

/**
 * Verify document inclusion using Merkle proof
 */
export async function verifyDocumentInclusion(
    contract: ethers.Contract,
    itemId: number,
    stage: Stage,
    documentHash: string,
    proof: string[]
): Promise<boolean> {
    return await contract.verifyDocumentInclusion(itemId, stage, documentHash, proof);
}

/**
 * Batch verify multiple documents
 */
export async function batchVerifyDocuments(
    contract: ethers.Contract,
    itemId: number,
    stage: Stage,
    documentHashes: string[],
    proofs: string[][]
): Promise<boolean> {
    return await contract.batchVerifyDocuments(itemId, stage, documentHashes, proofs);
}

/**
 * Get Merkle root for specific item and stage
 */
export async function getMerkleRoot(
    contract: ethers.Contract,
    itemId: number,
    stage: Stage
): Promise<string> {
    return await contract.getMerkleRoot(itemId, stage);
}

/**
 * Get overall Merkle root for an item
 */
export async function getItemMerkleRoot(
    contract: ethers.Contract,
    itemId: number
): Promise<string> {
    return await contract.getItemMerkleRoot(itemId);
}

/**
 * Submit documents with Merkle tree batch
 */
export async function submitDocumentBatch(
    contract: ethers.Contract,
    itemId: number,
    documents: string[],
    submitFunction: 'transporterSubmit' | 'distributorSubmit'
): Promise<{ receipt: ethers.TransactionReceipt; merkleRoot: string; proofs: string[][] }> {
    const { createDocumentBatch } = await import('./merkle');
    
    // Create Merkle tree
    const documentBatch = createDocumentBatch(documents);
    
    // Submit primary document (first one)
    const receipt = await sendTransactionWithNonce(contract, submitFunction, [itemId, documents[0]]);
    
    // Set Merkle root
    await setMerkleRoot(contract, itemId, 
        submitFunction === 'transporterSubmit' ? Stage.TransporterReady : Stage.DistributorReady,
        documentBatch.merkleRoot
    );
    
    // Extract proofs for all documents
    const proofs: string[][] = documents.map(doc => documentBatch.proofs[doc] || []);
    
    return {
        receipt,
        merkleRoot: documentBatch.merkleRoot,
        proofs
    };
}

import { ethers } from "ethers";
import MerkleTree from 'merkletreejs';
import SHA256 from 'crypto-js/sha256';

export interface MerkleProof {
  proof: string[];
  leaf: string;
  root: string;
}

export interface DocumentBatch {
  documents: string[];
  merkleRoot: string;
  proofs: { [document: string]: string[] };
}

/**
 * Create a Merkle tree from an array of document hashes
 */
export function createMerkleTree(documents: string[]): MerkleTree {
  const leaves = documents.map(doc => ethers.keccak256(ethers.toUtf8Bytes(doc)));
  return new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
}

/**
 * Get Merkle root for a batch of documents
 */
export function getMerkleRoot(documents: string[]): string {
  const tree = createMerkleTree(documents);
  return tree.getHexRoot();
}

/**
 * Get Merkle proof for a specific document
 */
export function getMerkleProof(documents: string[], targetDocument: string): string[] {
  const tree = createMerkleTree(documents);
  const leaf = ethers.keccak256(ethers.toUtf8Bytes(targetDocument));
  return tree.getHexProof(leaf);
}

/**
 * Verify a document against a Merkle root using a proof
 */
export function verifyMerkleProof(
  document: string, 
  proof: string[], 
  root: string
): boolean {
  const leaf = ethers.keccak256(ethers.toUtf8Bytes(document));
  return MerkleTree.verify(proof, leaf, root, ethers.keccak256, { sortPairs: true });
}

/**
 * Create a complete document batch with proofs
 */
export function createDocumentBatch(documents: string[]): DocumentBatch {
  const tree = createMerkleTree(documents);
  const merkleRoot = tree.getHexRoot();
  const proofs: { [document: string]: string[] } = {};
  
  documents.forEach(doc => {
    const leaf = ethers.keccak256(ethers.toUtf8Bytes(doc));
    proofs[doc] = tree.getHexProof(leaf);
  });
  
  return {
    documents,
    merkleRoot,
    proofs
  };
}

/**
 * Batch verify multiple documents against their proofs
 */
export function batchVerifyDocuments(
  documents: string[], 
  proofs: string[][], 
  root: string
): boolean {
  for (let i = 0; i < documents.length; i++) {
    if (!verifyMerkleProof(documents[i], proofs[i], root)) {
      return false;
    }
  }
  return true;
}

/**
 * Hash document metadata for Merkle tree inclusion
 */
export function hashDocumentMetadata(
  ipfsHash: string, 
  uploader: string, 
  timestamp: number, 
  stage: number
): string {
  const data = `${ipfsHash}-${uploader}-${timestamp}-${stage}`;
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Create Merkle tree from document metadata
 */
export function createDocumentMerkleTree(
  documents: Array<{
    ipfsHash: string;
    uploader: string;
    timestamp: number;
    stage: number;
  }>
): DocumentBatch {
  const hashedDocs = documents.map(doc => 
    hashDocumentMetadata(doc.ipfsHash, doc.uploader, doc.timestamp, doc.stage)
  );
  
  const tree = createMerkleTree(hashedDocs);
  const merkleRoot = tree.getHexRoot();
  const proofs: { [key: string]: string[] } = {};
  
  documents.forEach((doc, index) => {
    proofs[doc.ipfsHash] = tree.getHexProof(hashedDocs[index]);
  });
  
  return {
    documents: hashedDocs,
    merkleRoot,
    proofs
  };
}

/**
 * Generate Merkle proof for blockchain submission
 */
export function generateMerkleProofForSubmission(
  documents: string[],
  targetDocument: string
): MerkleProof {
  const tree = createMerkleTree(documents);
  const leaf = ethers.keccak256(ethers.toUtf8Bytes(targetDocument));
  const proof = tree.getHexProof(leaf);
  const root = tree.getHexRoot();
  
  return {
    proof,
    leaf,
    root
  };
}

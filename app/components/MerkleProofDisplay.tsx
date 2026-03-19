import React from 'react';

interface MerkleProofDisplayProps {
  merkleRoot: string;
  documentHashes: string[];
  proofs: string[][];
  isValid: boolean;
  onVerify?: () => void;
}

export default function MerkleProofDisplay({
  merkleRoot,
  documentHashes,
  proofs,
  isValid,
  onVerify
}: MerkleProofDisplayProps) {
  return (
    <div style={{
      background: "#f8f9ff",
      border: "1px solid #e0e7ff",
      borderRadius: 8,
      padding: "16px",
      margin: "12px 0"
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#3D4B9C",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        <span>🔐</span>
        <span>Merkle Tree Verification</span>
        <span style={{
          fontSize: 11,
          padding: "2px 6px",
          borderRadius: 4,
          background: isValid ? "#10b981" : "#ef4444",
          color: "#fff",
          fontWeight: 500
        }}>
          {isValid ? "Verified" : "Invalid"}
        </span>
      </div>

      {/* Merkle Root */}
      <div style={{
        marginBottom: 16,
        padding: "12px",
        background: "#fff",
        borderRadius: 6,
        border: "1px solid #d1d5db"
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#666",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5
        }}>
          Merkle Root
        </div>
        <div style={{
          fontSize: 10,
          fontFamily: "monospace",
          color: "#3D4B9C",
          wordBreak: "break-all",
          background: "#f0f4ff",
          padding: "8px",
          borderRadius: 4,
          border: "1px solid #3D4B9C"
        }}>
          {merkleRoot}
        </div>
      </div>

      {/* Document Proofs */}
      <div style={{
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#666",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5
        }}>
          Document Proofs ({documentHashes.length})
        </div>
        
        <div style={{
          maxHeight: "200px",
          overflowY: "auto",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "#fff"
        }}>
          {documentHashes.map((hash, index) => (
            <div key={index} style={{
              borderBottom: index < documentHashes.length - 1 ? "1px solid #f3f4f6" : "none",
              padding: "8px 12px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#666",
                    marginBottom: 4
                  }}>
                    Document {index + 1}
                  </div>
                  <div style={{
                    fontSize: 9,
                    fontFamily: "monospace",
                    color: "#3D4B9C",
                    wordBreak: "break-all",
                    background: "#f8f9ff",
                    padding: "4px 6px",
                    borderRadius: 3,
                    border: "1px solid #e0e7ff"
                  }}>
                    {hash.slice(0, 20)}...
                  </div>
                </div>
                
                <div style={{
                  fontSize: 9,
                  color: "#666",
                  textAlign: "right"
                }}>
                  <div style={{ marginBottom: 2 }}>
                    Proof: {proofs[index]?.length || 0} hashes
                  </div>
                  {proofs[index] && (
                    <div style={{
                      color: isValid ? "#10b981" : "#ef4444",
                      fontWeight: 600
                    }}>
                      {isValid ? "✓ Valid" : "✗ Invalid"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Status */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTop: "1px solid #e0e7ff"
      }}>
        <div style={{
          fontSize: 11,
          color: "#666"
        }}>
          {isValid 
            ? "✓ All documents are cryptographically verified"
            : "⚠️ Document verification failed"
          }
        </div>
        
        {onVerify && (
          <button
            onClick={onVerify}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #3D4B9C",
              background: "#3D4B9C",
              color: "#fff",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Re-verify
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRScanner from "@/app/components/QRScanner";

type Submission = {
  id: string;
  name: string;
  district: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "claimed";
  role: "producer" | "transporter" | "distributor";
  docs: { label: string; fileType: string }[];
  cid?: string;
  qrData?: string;
  approvedAt?: string;
  approvedBy?: string;
  blockchain_itemId?: number;
  current_stage?: number;
};

type ActiveView = "overview" | "submit";
type FileEntry = { label: string; fileType: string; file: File };
type SubmissionStatus = "pending" | "approved" | "rejected" | "claimed";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: "#3D4B9C", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 400 }}>{value}</span>
    </div>
  );
}

function QRPlaceholderSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" rx="6" fill="#f0f0f0" />
      <rect x="6" y="6" width="24" height="24" rx="3" fill="#3D4B9C" />
      <rect x="11" y="11" width="14" height="14" rx="1" fill="#fff" />
      <rect x="14" y="14" width="8" height="8" fill="#3D4B9C" />
      <rect x="50" y="6" width="24" height="24" rx="3" fill="#3D4B9C" />
      <rect x="55" y="11" width="14" height="14" rx="1" fill="#fff" />
      <rect x="58" y="14" width="8" height="8" fill="#3D4B9C" />
      <rect x="6" y="50" width="24" height="24" rx="3" fill="#3D4B9C" />
      <rect x="11" y="55" width="14" height="14" rx="1" fill="#fff" />
      <rect x="14" y="58" width="8" height="8" fill="#3D4B9C" />
      {[38, 42, 46, 50, 54, 58, 62, 66, 70].map((x, i) =>
        [38, 42, 46, 50, 54, 58, 62, 66, 70]
          .filter((_, j) => (i * 3 + j) % 2 === 0)
          .map((y, j) => (
            <rect
              key={`${i}-${j}`}
              x={x}
              y={y}
              width="3"
              height="3"
              fill="#3D4B9C"
              opacity={0.4 + (i % 3) * 0.2}
            />
          )),
      )}
    </svg>
  );
}

const DOC_OPTIONS: { label: string; description: string }[] = [
  { label: "Toll Receipt", description: "Upload toll booth payment receipt" },
  { label: "Fuel Receipt", description: "Upload fuel station receipt" },
  { label: "GPS Log", description: "Upload GPS tracking log file" },
  {
    label: "Delivery Challan",
    description: "Upload signed delivery challan from distributor",
  },
];

/* ---------------- QR Expand Modal --------------------------------------- */
function QRExpandModal({
  submission,
  nextActor,
  onClose,
}: {
  submission: Submission;
  nextActor: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          maxWidth: 380,
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#065f46",
            marginBottom: 4,
          }}
        >
          ✓ QR Code Released by Admin
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#555",
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          The <strong>{nextActor}</strong> will scan this QR to confirm receipt
          and log the handover on the blockchain.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {submission.qrData ? (
            <img src={`https://quickchart.io/qr?text=${encodeURIComponent(submission.qrData)}&size=400&margin=2`} alt="QR" style={{ width: 220, height: 220, border: "2px solid #fff", borderRadius: 8 }} />
          ) : (
            <QRPlaceholderSVG size={220} />
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 4,
          }}
        >
          {submission.id}
        </div>
        {submission.cid && (
          <div
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "#3D4B9C",
              background: "#f0f4ff",
              padding: "4px 8px",
              borderRadius: 4,
              wordBreak: "break-all",
              marginBottom: 12,
            }}
          >
            IPFS CID: {submission.cid}
          </div>
        )}
        {submission.approvedAt && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 20 }}>
            Approved by {submission.approvedBy} ·{" "}
            {new Date(submission.approvedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            padding: "10px 32px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            color: "#444",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function TransporterDashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });
  const [activeView, setActiveView] = useState<ActiveView>("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timer = useRef<number | null>(null);

  const [transporterName, setTransporterName] = useState("");
  const [district, setDistrict] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [pendingLabel, setPendingLabel] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [myDocs, setMyDocs] = useState<Submission[]>([]);
  const [expandedQR, setExpandedQR] = useState<Submission | null>(null);
  const [scannedItemId, setScannedItemId] = useState<number | null>(null);
  const [scannedCID, setScannedCID] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!toast.show) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      3000,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast.show, toast.message]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ show: true, message: msg, type });
  }

  const fetchMyDocs = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/submissions");
      if (!res.ok) throw new Error();
      const data: Submission[] = await res.json();
      setMyDocs(
        data
          .filter((s) => s.role === "transporter")
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );
    } catch {
      showToast("Failed to load submissions.", "error");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchMyDocs();
    const interval = setInterval(fetchMyDocs, 10_000);
    return () => clearInterval(interval);
  }, [fetchMyDocs]);

  useEffect(() => {
    if (activeView === "submit") fetchMyDocs();
  }, [activeView, fetchMyDocs]);

  const triggerUpload = (label: string) => {
    setPendingLabel(label);
    fileInputRef.current?.click();
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newEntries = Array.from(e.target.files).map((f) => ({
        label: pendingLabel,
        fileType: f.type || "Unknown Type",
        file: f,
      }));
      setFiles((prev) => [...prev, ...newEntries]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  // const handleSubmit = async () => {
  //   if (files.length === 0 || !transporterName || !district) {
  //     showToast(
  //       "Please fill all fields and attach at least one document.",
  //       "error",
  //     );
  //     return;
  //   }
  //   setIsSubmitting(true);
  //   const payload = {
  //     name: transporterName,
  //     district,
  //     role: "transporter",
  //     docs: files.map(({ label, fileType }) => ({ label, fileType })),
  //   };
  //   try {
  //     const res = await fetch("/api/submissions", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  const handleSubmit = async () => {
    if (!isVerified) {
      showToast("Verification Required: Please scan the handover QR code first.", "error");
      return;
    }

    if (files.length === 0 || !transporterName || !district) {
      showToast("Please fill all fields and attach documentation.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload documents and create local submission
      const formData = new FormData();
      formData.append("name", transporterName);
      formData.append("node_id", transporterName);
      formData.append("district", district);
      formData.append("role", "transporter");
      if (scannedItemId !== null) {
        formData.append("blockchain_itemId", String(scannedItemId));
      }
      files.forEach((f) => formData.append("files", f.file));

      const res = await fetch("/api/submissions", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Local submission failed");
      const subData = await res.json();

      // 2. Submit to Blockchain (TransporterAction)
      if (scannedItemId !== null) {
        showToast("Documents uploaded. Sending to blockchain...");
        try {
          const bcRes = await fetch("/api/blockchain/transport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: scannedItemId,
              CID: subData.cid || "QmError",
              dbId: subData.id
            }),
          });
          
          if (!bcRes.ok) {
            const errorData = await bcRes.json();
            
            // Enhanced error handling with specific blockchain error decoding
            let userFriendlyMessage = "Blockchain transaction failed";
            
            if (errorData.code) {
              switch (errorData.code) {
                case "CONTRACT_REVERT":
                  userFriendlyMessage = "Contract rejected: " + (errorData.error || "Invalid transaction state");
                  break;
                case "INSUFFICIENT_FUNDS":
                  userFriendlyMessage = "Insufficient funds for transaction gas";
                  break;
                case "GAS_ERROR":
                  userFriendlyMessage = "Gas estimation failed - transaction may be too complex";
                  break;
                case "NONCE_ERROR":
                  userFriendlyMessage = "Transaction sequence error - please try again";
                  break;
                case "NETWORK_ERROR":
                  userFriendlyMessage = "Network connection issue - please check your connection";
                  break;
                default:
                  userFriendlyMessage = `Blockchain error (${errorData.code}): ${errorData.error}`;
              }
            } else if (errorData.error) {
              userFriendlyMessage = errorData.error;
            }
            
            console.error("[Blockchain] Detailed error:", errorData);
            throw new Error(userFriendlyMessage);
          }
          
          const bcResult = await bcRes.json();
          showToast("✓ Blockchain Synced: Status moved to TransporterReady");
          
          // Fire-and-forget: log the event for this item
          fetch("/api/blockchain/logEvent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: scannedItemId }),
          }).then(r => r.json()).then(data =>
            console.log("[logEvent] Transport events:", data.totalEvents)
          ).catch(e => console.warn("[logEvent] Transport log failed:", e));
          
        } catch (blockchainError: any) {
          console.error("[Blockchain] Transaction failed:", blockchainError);
          throw blockchainError; // Re-throw to be caught by outer try-catch
        }
      } else {
        showToast("Documents submitted. (Warning: No blockchain ID linked)");
      }

      setFiles([]);
      setTransporterName("");
      setDistrict("");
      setScannedItemId(null);
      setScannedCID("");
      setIsVerified(false);
      fetchMyDocs();
      showToast("✓ Handover Logged Successfully", "success");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.shell}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileAttach}
        accept="image/*,.pdf,.txt,.csv"
      />

      {expandedQR && (
        <QRExpandModal
          submission={expandedQR}
          nextActor="Distributor"
          onClose={() => setExpandedQR(null)}
        />
      )}

      {toast.show && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "error" ? "#dc2626" : "#1e8e3e",
          }}
        >
          {toast.type === "success" ? "✓" : "✗"} {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={{ marginBottom: "24px" }}>
          <div style={styles.logo}>निश्चित</div>
          <div style={styles.logoSub}>Transporter Portal</div>
        </div>

        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navItem,
              ...(activeView === "overview" && styles.active),
            }}
            onClick={() => setActiveView("overview")}
          >
            Route Overview
          </button>
          <button
            style={{
              ...styles.navItem,
              ...(activeView === "submit" && styles.active),
            }}
            onClick={() => setActiveView("submit")}
          >
            Submit Documents
          </button>
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button onClick={() => router.push("/")} style={styles.logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.h1}>
            {activeView === "overview" ? "Route Overview" : "Submit Documents"}
          </h1>
          <p style={styles.sub}>
            {activeView === "overview"
              ? "Log trip expenses and verify stock delivery to municipalities"
              : "Fill in your details, attach trip documents, and submit for Admin verification"}
          </p>
        </header>

        <section style={styles.card}>
          <h2 style={styles.h2}>Scan Handover QR</h2>
          <p style={styles.text}>Scan the QR from the previous actor (camera or file) to link documents to this shipment.</p>

          <div style={{ marginBottom: 20 }}>
            <QRScanner
              onResult={(res) => {
                try {
                  const cleaned = res.trim();
                  console.log("[QRScan Transport] Raw:", cleaned);
                  const data = JSON.parse(cleaned);
                  if (!data.submissionId) throw new Error("Not a system QR code");
                  if (data.itemId == null) throw new Error("Invalid Item: Missing Blockchain ID. Waiting for Admin verification.");

                  // Security check: Only allow QRs intended for transporters
                  if (data.nextStage !== "transporter_handover") {
                    throw new Error("Invalid Role: This QR is not intended for the Transporter node.");
                  }

                  setScannedItemId(data.itemId ?? null);
                  setScannedCID(data.cid || "");
                  setIsVerified(true);
                  const idLabel = data.itemId != null ? `Chain #${data.itemId}` : data.submissionId;
                  showToast(`✓ Verified: ${idLabel}`);

                  // Immediate status update for beneficiary timeline
                  if (data.itemId !== undefined && data.itemId !== null) {
                    fetch("/api/submissions/logScan", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        itemId: data.itemId,
                        submissionId: data.submissionId,
                        nextStage: data.nextStage
                      }),
                    }).then(async r => {
                      const resBody = await r.json();
                      if (resBody.alreadyProcessed) {
                        showToast("ℹ Handover already recorded (Duplicate Scan)");
                      } else {
                        showToast("✓ Progress Logged to Beneficiary Timeline");
                      }
                    }).catch(err => console.error("[ScanLog] failed:", err));
                  }
                } catch (e: any) {
                  console.error("[QRScan] Error:", res, e);
                  showToast(`QR Error: ${e.message}`, "error");
                }
              }}
              onError={(err) => console.error(err)}
            />
          </div>

          {scannedItemId !== null && (
            <div style={styles.scannedInfo}>
              <span>linked Blockchain ID: <strong>#{scannedItemId}</strong></span>
            </div>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>Active Trip Status</h2>
          <div style={styles.grid}>
            <Info label="Current Route" value="Warehouse A → Municipal B" />
            <Info label="Vehicle" value="Truck #8829" />
            <Info label="Vehicle Number" value="BA 2 PA 4567" />
          </div>
        </section>

        {/* SUBMIT DOCUMENTS */}
        {activeView === "submit" && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Upload Documents</h2>
            <p style={styles.text}>
              Fill in your transporter details and attach trip receipts — toll,
              fuel, GPS log, and delivery challan — for Admin verification.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <input
                type="text"
                placeholder="Transporter ID"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={styles.input}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              {DOC_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  style={{
                    ...styles.uploadBtn,
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                  disabled={isSubmitting}
                  onClick={() => triggerUpload(opt.label)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Attach {opt.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                      {opt.description}
                    </div>
                  </div>
                  <svg
                    style={{ marginLeft: 16, flexShrink: 0 }}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
              ))}
            </div>

            {!isVerified && (
              <div style={{
                background: "#fffbeb",
                border: "1px solid #fbbf24",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12
              }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>
                  Form Locked: You must scan the Handover QR code above before you can submit any documents.
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div style={styles.fileList}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#aaa",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Attached Files ({files.length})
                </div>
                {files.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.fileItem,
                      borderBottom:
                        i < files.length - 1
                          ? "1px solid rgba(0,0,0,0.05)"
                          : "none",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3D4B9C"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#333",
                          }}
                        >
                          {f.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>
                          {f.fileType}
                        </div>
                      </div>
                    </div>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeFile(i)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                style={{
                  ...styles.primary,
                  opacity: (isSubmitting || !isVerified) ? 0.7 : 1,
                  cursor: !isVerified ? "not-allowed" : "pointer",
                  background: !isVerified ? "#9ca3af" : "#3D4B9C"
                }}
                onClick={handleSubmit}
                disabled={isSubmitting || !isVerified}
              >
                {isSubmitting ? "Submitting..." : "Submit Handover Proof"}
              </button>
              <button
                style={styles.secondary}
                onClick={() => {
                  setFiles([]);
                  setTransporterName("");
                  setDistrict("");
                  setActiveView("overview");
                }}
              >
                Cancel
              </button>
            </div>

            {/* Submission Status */}
            <div
              style={{
                marginTop: 32,
                borderTop: "1px solid rgba(0,0,0,0.08)",
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ ...styles.h2, marginBottom: 0 }}>
                  Submission Status
                </h2>
                <button
                  style={styles.refreshBtn}
                  onClick={fetchMyDocs}
                  disabled={loadingStatus}
                >
                  {loadingStatus ? "Loading…" : "↻ Refresh"}
                </button>
              </div>

              {loadingStatus ? (
                <div
                  style={{
                    padding: "24px 0",
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: 14,
                  }}
                >
                  Loading submissions…
                </div>
              ) : myDocs.length === 0 ? (
                <div
                  style={{
                    padding: "24px 0",
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: 13,
                  }}
                >
                  No submissions yet. Fill in the form above and hit Submit.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {myDocs.map((s) => (
                    <SubmissionStatusCard
                      key={s.id}
                      submission={s}
                      onExpandQR={() => setExpandedQR(s)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ── Submission Status Card — shows QR when approved ── */
function SubmissionStatusCard({
  submission,
  onExpandQR,
}: {
  submission: Submission;
  onExpandQR: () => void;
}) {
  const cfg: Record<
    SubmissionStatus,
    {
      bg: string;
      border: string;
      color: string;
      icon: string;
      label: string;
      message: string;
    }
  > = {
    pending: {
      bg: "#fffbeb",
      border: "#fbbf24",
      color: "#92400e",
      icon: "⏳",
      label: "Pending Review",
      message:
        "Your documents have been submitted and are awaiting Admin approval.",
    },
    approved: {
      bg: "#f0fdf4",
      border: "#86efac",
      color: "#065f46",
      icon: "✓",
      label: "Approved",
      message: "Your submission has been verified and approved by the Admin.",
    },
    rejected: {
      bg: "#fef2f2",
      border: "#fca5a5",
      color: "#991b1b",
      icon: "✕",
      label: "Rejected",
      message:
        "Your submission was not approved. Please resubmit with correct documents.",
    },
    claimed: {
      bg: "#ecfdf5",
      border: "#10b981",
      color: "#064e3b",
      icon: "🎉",
      label: "Claimed",
      message: "The subsidy has been successfully claimed by the beneficiary.",
    },
  };
  const c = cfg[submission.status];

  return (
    <div
      style={{
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        background: c.bg,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{c.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.color }}>
            {c.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: c.color,
              opacity: 0.85,
              marginTop: 1,
            }}
          >
            {c.message}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: c.color,
            background: "rgba(255,255,255,0.6)",
            padding: "3px 8px",
            borderRadius: 12,
            border: `1px solid ${c.border}`,
          }}
        >
          {submission.status.toUpperCase()}
        </span>
      </div>

      {/* Details */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <DetailItem label="Submission ID" value={submission.id} mono />
        <DetailItem label="Name" value={submission.name} />
        <DetailItem label="District" value={submission.district} />
        <DetailItem
          label="Submitted"
          value={new Date(submission.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        {submission.approvedBy && (
          <DetailItem label="Reviewed By" value={submission.approvedBy} />
        )}
        {submission.approvedAt && (
          <DetailItem
            label="Reviewed At"
            value={new Date(submission.approvedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        )}
      </div>

      {/* Documents */}
      <div style={{ padding: "0 16px 14px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#888",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Documents ({submission.docs.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {submission.docs.map((doc, i) => (
            <span key={i} style={styles.docPill}>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {doc.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── QR: shown when approved and qrData exists — for Distributor to scan ── */}
      {submission.status === "approved" && submission.qrData && (
        <div
          style={{
            margin: "0 16px 16px",
            padding: 16,
            background: "#fff",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#065f46",
                marginBottom: 4,
              }}
            >
              ✓ QR Code Released by Admin
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
              Your documents have been approved. The{" "}
              <strong>Distributor</strong> will scan this QR to confirm receipt
              of goods and log the handover on the blockchain.
            </div>
            {submission.cid && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "#3D4B9C",
                  background: "#f0f4ff",
                  padding: "4px 8px",
                  borderRadius: 4,
                  wordBreak: "break-all",
                }}
              >
                IPFS CID: {submission.cid}
              </div>
            )}
          </div>
          {/* Click to expand QR */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              cursor: "pointer",
              position: "relative",
            }}
            onClick={onExpandQR}
            title="Click to enlarge"
          >
            <img src={`https://quickchart.io/qr?text=${encodeURIComponent(submission.qrData)}&size=400&margin=2`} alt="QR" style={{ width: 80, height: 80, borderRadius: 6, border: "2px solid #fff" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 20,
                background: "rgba(61,75,156,0.08)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            >
              <span style={{ fontSize: 20 }}>🔍</span>
            </div>
            <div style={{ fontSize: 10, color: "#3D4B9C", fontWeight: 600 }}>
              Tap to expand
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "#333",
          fontFamily: mono ? "monospace" : "inherit",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#F0EAD6",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    color: "#1b1b1b",
  },
  sidebar: {
    width: 260,
    background: "#ffffff",
    borderRight: "1px solid rgba(0,0,0,0.1)",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
  },
  logo: { fontSize: 20, fontWeight: 700, color: "#3D4B9C" },
  logoSub: { fontSize: 12, color: "#555", marginBottom: 16 },
  nav: { display: "flex", flexDirection: "column", gap: 10 },
  navItem: {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    fontWeight: 500,
    cursor: "pointer",
  },
  active: {
    background: "rgba(61,75,156,0.08)",
    color: "#3D4B9C",
    border: "1px solid #3D4B9C",
  },
  logout: {
    marginTop: 20,
    padding: "10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    color: "#9a1b1b",
    width: "100%",
  },
  main: { flex: 1, padding: 28 },
  header: { marginBottom: 18 },
  h1: { margin: 0, fontSize: 24, fontWeight: 600 },
  sub: { fontSize: 13, color: "#555" },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid rgba(0,0,0,0.12)",
  },
  h2: {
    marginBottom: 14,
    marginTop: 0,
    fontSize: 18,
    fontWeight: 600,
    color: "#3D4B9C",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginBottom: 14,
  },
  text: { fontSize: 13, color: "#666", marginBottom: 20, lineHeight: "1.5" },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  uploadBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#3D4B9C",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    minWidth: 280,
  },
  fileList: {
    marginTop: 16,
    padding: "12px 14px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 8,
    background: "#fafafa",
  },
  fileItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#aaa",
    fontSize: 13,
    padding: "2px 6px",
    borderRadius: 4,
    lineHeight: 1,
  },
  primary: {
    background: "#3D4B9C",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
  secondary: {
    background: "transparent",
    color: "#777",
    padding: "12px 24px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "14px",
  },
  refreshBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#fff",
    color: "#444",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  scannerPlaceholder: {
    width: "100%",
    height: 180,
    background: "#000",
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scannerOverlay: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.3)",
  },
  scannerTarget: {
    width: 100,
    height: 100,
    border: "2px solid #fff",
    borderRadius: 12,
    position: "relative",
  },
  scannerLine: {
    position: "absolute",
    top: "50%",
    left: "10%",
    width: "80%",
    height: 2,
    background: "rgba(255,255,255,0.8)",
    boxShadow: "0 0 15px #fff",
    animation: "scan-animation 2s ease-in-out infinite",
  },
  scannerHint: {
    color: "#fff",
    fontSize: 12,
    marginTop: 12,
    fontWeight: 500,
    opacity: 0.8,
  },
  scannedInfo: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "12px 16px",
    borderRadius: 8,
    color: "#16a34a",
    fontSize: 14,
    marginBottom: 16,
  },
  docPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: "#3D4B9C",
    background: "#ede9fe",
    padding: "3px 10px",
    borderRadius: 20,
    fontWeight: 500,
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    zIndex: 1000,
  },
};

// Add global styles for animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes scan-animation {
      0% { top: 20%; opacity: 0.5; }
      50% { top: 80%; opacity: 1; }
      100% { top: 20%; opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

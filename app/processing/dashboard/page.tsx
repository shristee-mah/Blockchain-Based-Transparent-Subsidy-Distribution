"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ActiveView = "tasks" | "inventory" | "upload";
// type FileData = { label: string; fileType: string };
type FileData = { label: string; fileType: string; file: File };
type SubmissionStatus = "pending" | "approved" | "rejected" | "claimed";

type Submission = {
  id: string;
  name: string;
  district: string;
  createdAt: string;
  status: SubmissionStatus;
  role: string;
  docs: { label: string; fileType: string }[];
  cid?: string;
  qrData?: string;
  approvedAt?: string;
  approvedBy?: string;
};

/* ---------------- QR Placeholder SVG ------------------------------------ */
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

/* ---------------- QR Expand Modal --------------------------------------- */
function QRExpandModal({
  submission,
  onClose,
}: {
  submission: Submission;
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
          The <strong>Transporter</strong> will scan this QR to confirm receipt
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

export default function ProcessorDashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (toast.show) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => setToast({ show: false, message: "" }),
        2500,
      );
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast.show]);

  function showToast(msg: string) {
    setToast({ show: true, message: msg });
  }

  const [activeView, setActiveView] = useState<ActiveView>("tasks");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [producerName, setProducerName] = useState("");
  const [district, setDistrict] = useState("");
  const [beneficiaryPhone, setBeneficiaryPhone] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [expandedQR, setExpandedQR] = useState<Submission | null>(null);

  const fetchMySubmissions = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/submissions");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: Submission[] = await res.json();
      if (!Array.isArray(data)) throw new Error("Unexpected response format");
      setMySubmissions(
        data
          .filter((s) => s.role === "producer")
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );
    } catch (err) {
      console.error("[processor] fetchMySubmissions failed:", err);
      showToast("Could not load submissions — check browser console.");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchMySubmissions();
    const interval = setInterval(fetchMySubmissions, 10_000);
    return () => clearInterval(interval);
  }, [fetchMySubmissions]);

  // Re-fetch whenever the user navigates to the upload view
  useEffect(() => {
    if (activeView === "upload") fetchMySubmissions();
  }, [activeView, fetchMySubmissions]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (picked.length === 0) return;
    const newEntries = picked.map((f) => ({
      label: f.name,
      fileType: f.type || "Unknown Type",
      file: f,
    }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  // const handleSubmit = async () => {
  //   if (files.length === 0 || !producerName || !district) {
  //     showToast("Please fill all fields and attach documents.");
  //     return;
  //   }
  //   setIsSubmitting(true);
  //   try {
  //     const response = await fetch("/api/submissions", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         name: producerName,
  //         district,
  //         docs: files,
  //         role: "producer",
  //       }),
  //     });
  //     if (!response.ok) throw new Error("Submission failed");
  //     showToast("Record successfully submitted to Admin.");
  //     setFiles([]);
  //     setProducerName("");
  //     setDistrict("");
  //     fetchMySubmissions();
  //   } catch (err) {
  //     showToast("Error submitting record.");
  //     console.error(err);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };
  // Find this entire handleSubmit:
  const handleSubmit = async () => {
    if (files.length === 0 || !producerName || !district) {
      showToast("Please fill all fields and attach documents.");
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ Send FormData with real files so API can upload to IPFS
      // const formData = new FormData();
      // formData.append("name", producerName);
      // formData.append("district", district);
      // formData.append("role", "producer");

      const formData = new FormData();
      formData.append("name", producerName);
      formData.append("node_id", producerName);  // ✅ send producer ID explicitly
      formData.append("district", district);
      formData.append("role", "producer");
      formData.append("phone", beneficiaryPhone);

      files.forEach((f) => {
        formData.append("files", f.file); // ✅ real File object
      });

      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData,   // ✅ no Content-Type header — browser sets it automatically
      });

      if (!response.ok) throw new Error("Submission failed");
      const subData = await response.json();

      showToast("Record successfully submitted to Admin.");

      // Fire-and-forget: log the ItemCreated event if blockchain ID was returned
      if (subData.blockchain_itemId !== undefined) {
        fetch("/api/blockchain/logEvent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: subData.blockchain_itemId }),
        }).catch(e => console.warn("[logEvent] Processor log failed:", e));
      }

      setFiles([]);
      setProducerName("");
      setDistrict("");
      setBeneficiaryPhone("");
      fetchMySubmissions();

    } catch (err) {
      showToast("Error submitting record.");
      console.error(err);
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
        onChange={handleFileUpload}
        accept="image/*,.pdf,.txt,.csv"
        multiple
      />

      {expandedQR && (
        <QRExpandModal
          submission={expandedQR}
          onClose={() => setExpandedQR(null)}
        />
      )}

      {toast.show && <div style={styles.toast}>✓ {toast.message}</div>}

      <aside style={styles.sidebar}>
        <div style={{ marginBottom: "24px" }}>
          <div style={styles.logo}>निश्चित</div>
          <div style={styles.logoSub}>Processor Console</div>
        </div>
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navItem,
              ...(activeView === "tasks" && styles.active),
            }}
            onClick={() => setActiveView("tasks")}
          >
            Pending Tasks
          </button>
          <button
            style={{
              ...styles.navItem,
              ...(activeView === "upload" && styles.active),
            }}
            onClick={() => setActiveView("upload")}
          >
            Submit Documents
          </button>
          <button
            style={{
              ...styles.navItem,
              ...(activeView === "inventory" && styles.active),
            }}
            onClick={() => setActiveView("inventory")}
          >
            Inventory Logs
          </button>
        </nav>
        <div style={{ marginTop: "auto" }}>
          <div style={styles.auditNote}>
            NODE: #PROC-88 <br /> IPFS GATEWAY: ACTIVE <br /> LAST SYNC: 2082-10-15 14:30
          </div>
          <button onClick={() => router.push("/")} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.h1}>
            {activeView === "tasks" && "Daily Task Queue"}
            {activeView === "inventory" && "Stock & Resource Ledger"}
            {activeView === "upload" && "IPFS Document Submission"}
          </h1>
          <p style={styles.sub}>
            System Date: 2082-10-15 | Network: Subsidy-Mainnet
          </p>
        </header>

        <div style={styles.metricsRow}>
          <MetricCard label="Tasks Completed" value="47" />
          <MetricCard label="IPFS CIDs Issued" value="28" />
          <MetricCard label="Pending Review" value="12" />
        </div>

        {activeView === "tasks" && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Awaiting Document Submission</h2>
            <div style={styles.taskList}>
              <TaskItem
                id="#APP-201"
                title="Verify Seed Stock Batch #99 - Wheat Variety"
                priority="High"
                onClick={() => setActiveView("upload")}
              />
              <TaskItem
                id="#APP-205"
                title="Approve Fertilizer Stock #992 - Urea 50kg bags"
                priority="Medium"
                onClick={() => setActiveView("upload")}
              />
              <TaskItem
                id="#APP-208"
                title="Process Pesticide Application #145 - Organic Certification"
                priority="High"
                onClick={() => setActiveView("upload")}
              />
              <TaskItem
                id="#APP-212"
                title="Review Irrigation Equipment Request #78"
                priority="Low"
                onClick={() => setActiveView("upload")}
              />
              <TaskItem
                id="#APP-215"
                title="Validate Soil Test Results - District 3"
                priority="Medium"
                onClick={() => setActiveView("upload")}
              />
              <TaskItem
                id="#APP-218"
                title="Approve Greenhouse Film Subsidy #23"
                priority="Low"
                onClick={() => setActiveView("upload")}
              />
            </div>
          </section>
        )}

        {activeView === "upload" && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Upload Documents</h2>
            <p style={styles.text}>
              Fill in the details and attach citizenship, land ownership, or
              registration certificates to initiate the verification sequence.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <input
                type="text"
                placeholder="Producer ID"
                value={producerName}
                onChange={(e) => setProducerName(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={styles.input}
              />
              <input
                type="tel"
                placeholder="Beneficiary Phone No."
                value={beneficiaryPhone}
                onChange={(e) => setBeneficiaryPhone(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <button
                style={{ ...styles.uploadBtn, opacity: isSubmitting ? 0.5 : 1 }}
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Attach Documents</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                    Citizenship, land ownership, registration certificates
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
            </div>

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
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                style={{ ...styles.primary, opacity: isSubmitting ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
              <button
                style={styles.secondary}
                onClick={() => {
                  setFiles([]);
                  setActiveView("tasks");
                }}
              >
                Cancel
              </button>
            </div>

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
                  onClick={fetchMySubmissions}
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
              ) : mySubmissions.length === 0 ? (
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
                  {mySubmissions.map((s) => (
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

        {activeView === "inventory" && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Central Ledger History</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Resource</th>
                  <th style={styles.th}>Total Unit</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                <InventoryRow
                  name="Urea Fertilizer"
                  total="5,000kg"
                  status="Stable"
                  lastUpdated="2082-10-14"
                />
                <InventoryRow
                  name="Paddy Seeds (Basmati)"
                  total="1,200kg"
                  status="Critical"
                  lastUpdated="2082-10-13"
                />
                <InventoryRow
                  name="DAP Fertilizer"
                  total="3,500kg"
                  status="Stable"
                  lastUpdated="2082-10-15"
                />
                <InventoryRow
                  name="Wheat Seeds (HD-2967)"
                  total="2,800kg"
                  status="Low"
                  lastUpdated="2082-10-12"
                />
                <InventoryRow
                  name="Potassium Sulfate"
                  total="1,750kg"
                  status="Stable"
                  lastUpdated="2082-10-14"
                />
                <InventoryRow
                  name="Maize Seeds (Hybrid)"
                  total="950kg"
                  status="Critical"
                  lastUpdated="2082-10-11"
                />
                <InventoryRow
                  name="Organic Pesticide"
                  total="450L"
                  status="Low"
                  lastUpdated="2082-10-15"
                />
                <InventoryRow
                  name="Lentil Seeds"
                  total="600kg"
                  status="Stable"
                  lastUpdated="2082-10-13"
                />
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

/* ---------------- Submission Status Card ---------------------------------- */
function SubmissionStatusCard({
  submission,
  onExpandQR,
}: {
  submission: Submission;
  onExpandQR: () => void;
}) {
  const statusConfig: Record<
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
  const cfg = statusConfig[submission.status];

  return (
    <div
      style={{
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        background: cfg.bg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: `1px solid ${cfg.border}`,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
            {cfg.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: cfg.color,
              opacity: 0.85,
              marginTop: 1,
            }}
          >
            {cfg.message}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: cfg.color,
            background: "rgba(255,255,255,0.6)",
            padding: "3px 8px",
            borderRadius: 12,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {submission.status.toUpperCase()}
        </span>
      </div>

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

      {/* ── QR section: click thumbnail to expand ── */}
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
              Your submission has been approved. The Transporter will scan this
              QR to confirm receipt of goods and log the handover on the
              blockchain.
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
          {/* Click to expand */}
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
            title="Click to enlarge QR"
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

/* ---------------- Helper Components --------------------------------------- */
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

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <span
        style={{ fontSize: "18px", fontWeight: "600", color: color || "#333" }}
      >
        {value}
      </span>
    </div>
  );
}

function TaskItem({
  id,
  title,
  priority,
  onClick,
}: {
  id: string;
  title: string;
  priority: string;
  onClick: () => void;
}) {
  return (
    <div style={styles.taskItem} onClick={onClick}>
      <span style={{ fontSize: "12px", color: "#888" }}>{id}</span>
      <span
        style={{
          fontSize: "14px",
          flex: 1,
          marginLeft: "12px",
          fontWeight: 500,
          color: "#444",
        }}
      >
        {title}
      </span>
      <span
        style={{
          ...styles.tag,
          background: priority === "High" ? "#fee2e2" : "#f3f4f6",
          color: priority === "High" ? "#9a1b1b" : "#666",
        }}
      >
        {priority}
      </span>
    </div>
  );
}

function InventoryRow({
  name,
  total,
  status,
  lastUpdated,
}: {
  name: string;
  total: string;
  status: string;
  lastUpdated?: string;
}) {
  return (
    <tr>
      <td style={styles.td}>{name}</td>
      <td style={styles.td}>{total}</td>
      <td style={styles.td}>
        <span
          style={{
            ...styles.tag,
            background: status === "Critical" ? "#fce8e6" : status === "Low" ? "#fff3cd" : "#e6f4ea",
            color: status === "Critical" ? "#d93025" : status === "Low" ? "#856404" : "#1e8e3e",
          }}
        >
          {status}
        </span>
      </td>
      <td style={styles.td}>{lastUpdated || "N/A"}</td>
    </tr>
  );
}

/* ---------------- Styles -------------------------------------------------- */
const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#F0EAD6",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    color: "#333",
  },
  sidebar: {
    width: 260,
    background: "#fff",
    borderRight: "1px solid rgba(0,0,0,0.1)",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
  },
  logo: { fontSize: 20, fontWeight: 700, color: "#3D4B9C" },
  logoSub: { fontSize: 11, color: "#666", marginBottom: 16 },
  nav: { display: "flex", flexDirection: "column", gap: 8 },
  navItem: {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#fff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    color: "#444",
  },
  active: {
    background: "rgba(61,75,156,0.08)",
    color: "#3D4B9C",
    border: "1px solid #3D4B9C",
  },
  auditNote: {
    fontSize: "10px",
    color: "#999",
    marginBottom: "10px",
    lineHeight: "1.4",
  },
  logoutBtn: {
    padding: "10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    color: "#9a1b1b",
    width: "100%",
    fontSize: "13px",
  },
  main: { flex: 1, padding: 28 },
  header: { marginBottom: 20 },
  h1: { margin: 0, fontSize: 22, fontWeight: 600, color: "#111" },
  sub: { fontSize: 12, color: "#666" },
  metricsRow: { display: "flex", gap: "16px", marginBottom: "24px" },
  metricCard: {
    flex: 1,
    background: "#fff",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metricLabel: {
    fontSize: "10px",
    color: "#3D4B9C",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid rgba(0,0,0,0.12)",
  },
  h2: { marginBottom: 16, fontSize: 16, fontWeight: 600, color: "#3D4B9C" },
  taskList: { display: "flex", flexDirection: "column", gap: "10px" },
  taskItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px",
    border: "1px solid #f0f0f0",
    borderRadius: "8px",
    cursor: "pointer",
  },
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
  text: { fontSize: "13px", marginBottom: 20, color: "#666" },
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
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px",
    fontSize: "11px",
    color: "#888",
    borderBottom: "1px solid #eee",
  },
  td: {
    padding: "12px",
    fontSize: "13px",
    borderBottom: "1px solid #f9f9f9",
    color: "#444",
  },
  tag: {
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    background: "#1e8e3e",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: "14px",
    fontWeight: 500,
    zIndex: 1000,
  },
};

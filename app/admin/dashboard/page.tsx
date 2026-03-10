"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Submission = {
  id: string;
  name: string;
  district: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  role: "producer" | "transporter" | "distributor";
  docs: { label: string; fileType: string }[];
  cid?: string;
  qrData?: string;
  approvedAt?: string;
  approvedBy?: string;
  blockchain_itemId?: number;
  current_stage?: number;
};

type ActiveView = "subsidy" | "verify";
type RoleFilter = "producer" | "transporter" | "distributor";

function nextActor(role: Submission["role"]) {
  return role === "producer"
    ? "Transporter"
    : role === "transporter"
      ? "Distributor"
      : "Beneficiary";
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });
  const [activeView, setActiveView] = useState<ActiveView>("subsidy");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [activeRoleFilter, setActiveRoleFilter] =
    useState<RoleFilter>("producer");
  const [reviewingItem, setReviewingItem] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  function showToast(msg: string) {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  }

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/submissions");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError("Could not load submissions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 8_000);
    return () => clearInterval(interval);
  }, [fetchSubmissions]);

  useEffect(() => {
    if (reviewingItem) {
      const updated = submissions.find((s) => s.id === reviewingItem.id);
      if (updated) setReviewingItem(updated);
    }
  }, [submissions]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedBy: "Admin" }),
      });
      if (!response.ok) throw new Error("Action failed");
      const updated: Submission = await response.json();
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setReviewingItem(updated);

      // Automatic Blockchain Verification if approved
      if (status === "approved" && updated.blockchain_itemId !== undefined) {
        showToast("✓ Approved. Syncing with blockchain...");
        await handleVerifyOnChain(updated.blockchain_itemId, updated.current_stage || 0, updated.id);
      } else {
        showToast(
          status === "approved"
            ? `✓ Approved — QR released to ${nextActor(updated.role)}`
            : "✗ Document rejected.",
        );
      }
    } catch (err) {
      showToast("Error performing action");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOnChain = async (itemId: number, currentStage: number, dbId: string) => {
    try {
      const res = await fetch("/api/blockchain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, currentStage, dbId }),
      });
      if (!res.ok) throw new Error("Blockchain verification failed");
      showToast("✓ Blockchain Synced Successfully");
    } catch (err) {
      console.error(err);
      showToast("⚠ Approved locally, but blockchain sync failed.");
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes marquee-scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      .marquee-track { display: inline-block; white-space: nowrap; animation: marquee-scroll 60s linear infinite; }
      .marquee-track:hover { animation-play-state: paused; }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  const pendingItems = submissions.filter((s) => s.status === "pending");
  const approvedItems = submissions.filter((s) => s.status === "approved");
  const filteredPending = submissions.filter(
    (s) => s.role === activeRoleFilter && s.status === "pending",
  );

  return (
    <>
      {/* Review Modal */}
      {reviewingItem && (
        <div style={styles.modalOverlay} onClick={() => setReviewingItem(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalHeader}>Review Submission</h2>
            <p style={styles.modalSubHeader}>
              ID: {reviewingItem.id} | {reviewingItem.name}
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  ...styles.badge,
                  background: "#e8f0fe",
                  color: "#1a73e8",
                }}
              >
                {reviewingItem.role}
              </span>
              <span
                style={{
                  ...styles.badge,
                  background:
                    reviewingItem.status === "approved"
                      ? "#e8f5e9"
                      : reviewingItem.status === "rejected"
                        ? "#fce4ec"
                        : "#fff8e1",
                  color:
                    reviewingItem.status === "approved"
                      ? "#16a34a"
                      : reviewingItem.status === "rejected"
                        ? "#dc2626"
                        : "#f59e0b",
                }}
              >
                {reviewingItem.status}
              </span>
            </div>

            <div style={styles.docBox}>
              {reviewingItem.docs.map((doc, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.docRow,
                    borderBottom:
                      i === reviewingItem.docs.length - 1
                        ? "none"
                        : "1px solid #eee",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={styles.docLabel}>{doc.label}</div>
                    <div style={styles.docType}>{doc.fileType}</div>
                  </div>
                  <button style={styles.viewFileBtn}>View File</button>
                </div>
              ))}
            </div>

            {reviewingItem.cid && (
              <div style={styles.cidBox}>
                <span style={styles.cidLabel}>IPFS CID</span>
                <span style={styles.cidValue}>{reviewingItem.cid}</span>
              </div>
            )}

            {/* ── After approval: confirmation message only, no QR ── */}
            {reviewingItem.status === "approved" ? (
              <div style={styles.approvedConfirmBox}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#065f46",
                    marginBottom: 6,
                  }}
                >
                  Documents Verified & QR Released
                </div>
                {/* <div
                  style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}
                >
                  The QR code has been released to the{" "}
                  <strong>{nextActor(reviewingItem.role)}</strong>. They will
                  see it in their dashboard to confirm the handover.
                </div> */}
                {reviewingItem.approvedAt && (
                  <div
                    style={{ fontSize: 11, color: "#6b7280", marginTop: 10 }}
                  >
                    Approved by {reviewingItem.approvedBy} ·{" "}
                    {new Date(reviewingItem.approvedAt).toLocaleString()}
                  </div>
                )}
                {/* ── REAL QR CODE DISPLAY ── */}
                {reviewingItem.qrData && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#3D4B9C", marginBottom: 8 }}>Handover QR</div>
                    <img
                      src={`https://quickchart.io/qr?text=${encodeURIComponent(reviewingItem.qrData)}&size=180`}
                      alt="Verified QR Code"
                      style={{ border: "4px solid #fff", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <div style={{ fontSize: 10, color: "#888", marginTop: 8 }}>Scan to link with Blockchain</div>
                  </div>
                )}
              </div>
            ) : reviewingItem.status === "rejected" ? (
              <div
                style={{
                  ...styles.approvedConfirmBox,
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>✗</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#991b1b",
                    marginBottom: 6,
                  }}
                >
                  Document Rejected
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>
                  The submitter has been notified to re-upload their documents.
                </div>
              </div>
            ) : (
              <div style={styles.modalActionRow}>
                <button
                  style={styles.closeBtn}
                  onClick={() => setReviewingItem(null)}
                  disabled={actionLoading}
                >
                  Close
                </button>
                <button
                  style={{
                    ...styles.rejectQrBtn,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                  onClick={() => handleAction(reviewingItem.id, "rejected")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "…" : "✗ Reject"}
                </button>
                <button
                  style={{
                    ...styles.releaseBtn,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                  onClick={() => handleAction(reviewingItem.id, "approved")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing…" : "Release QR"}
                </button>
              </div>
            )}

            {reviewingItem.status !== "pending" && (
              <button
                style={{ ...styles.closeBtn, marginTop: 16, width: "100%" }}
                onClick={() => setReviewingItem(null)}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Marquee */}
      <div style={styles.marqueeWrapper}>
        <div className="marquee-track">
          {[
            "Upcoming Subsidy Programs: Livestock Support Scheme",
            "Irrigation Equipment Subsidy",
            "Organic Fertilizer Incentive",
          ].map((text, i) => (
            <span key={i} style={styles.marqueeText}>
              {text} &nbsp;•&nbsp;{" "}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.shell}>
        {/* Toast — top right confirmation */}
        {toast.show && <div style={styles.toast}>{toast.message}</div>}

        <aside style={styles.sidebar}>
          <div style={{ marginBottom: "24px" }}>
            <div style={styles.logo}>निश्चित</div>
            <div style={styles.logoSub}>Admin Dashboard</div>
          </div>

          <nav style={styles.nav}>
            <button
              style={{
                ...styles.navItem,
                ...(activeView === "subsidy" && styles.active),
              }}
              onClick={() => {
                setActiveView("subsidy");
                setVerifyOpen(false);
              }}
            >
              Subsidy Overview
            </button>
            <button
              style={{ ...styles.navItem, ...(verifyOpen && styles.active) }}
              onClick={() => setVerifyOpen(!verifyOpen)}
            >
              Pending ({pendingItems.length}) {verifyOpen ? "▲" : "▼"}
            </button>
            {verifyOpen && (
              <div style={styles.subNav}>
                {(
                  ["producer", "transporter", "distributor"] as RoleFilter[]
                ).map((role) => {
                  const count = submissions.filter(
                    (s) => s.role === role && s.status === "pending",
                  ).length;
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        setActiveRoleFilter(role);
                        setActiveView("verify");
                      }}
                      style={{
                        ...styles.subItem,
                        ...(activeView === "verify" &&
                          activeRoleFilter === role &&
                          styles.subActive),
                      }}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}s
                      {count > 0 && (
                        <span style={styles.roleBadgeCount}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          <div style={{ marginTop: "auto" }}>
            <button onClick={() => router.push("/")} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </aside>

        <main style={styles.main}>
          <header style={styles.header}>
            <h1 style={styles.h1}>
              {activeView === "subsidy"
                ? "Subsidy Overview"
                : `${activeRoleFilter.charAt(0).toUpperCase() + activeRoleFilter.slice(1)} Verification`}
            </h1>
            <p style={styles.sub}>
              Government subsidy document & verification console
            </p>
          </header>

          {activeView === "subsidy" && (
            <section style={styles.card}>
              <h2 style={styles.h2}>Program Statistics</h2>
              <div style={styles.grid}>
                <div style={styles.infoCol}>
                  <span style={{ ...styles.statLabel, color: "#3D4B9C" }}>
                    Total Applications
                  </span>
                  <span style={styles.statValue}>{submissions.length}</span>
                </div>
                <div style={styles.infoCol}>
                  <span style={{ ...styles.statLabel, color: "#1e8e3e" }}>
                    Approved
                  </span>
                  <span style={styles.statValue}>{approvedItems.length}</span>
                </div>
                <div style={styles.infoCol}>
                  <span style={{ ...styles.statLabel, color: "#e67e22" }}>
                    Pending
                  </span>
                  <span style={styles.statValue}>{pendingItems.length}</span>
                </div>
              </div>

              {/* ── Approved list: no QR shown, clean rows only ── */}
              {approvedItems.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h2 style={styles.h2}>Approved — QR Released</h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {approvedItems.map((s) => (
                      <div
                        key={s.id}
                        style={styles.approvedRow}
                        onClick={() => setReviewingItem(s)}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div style={styles.approvedCheck}>✓</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {s.role} · {s.id} · {s.district}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#16a34a",
                              fontWeight: 600,
                            }}
                          >
                            QR → {nextActor(s.role)}
                          </div>
                          {s.approvedAt && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                marginTop: 2,
                              }}
                            >
                              {new Date(s.approvedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeView === "verify" && (
            <section style={styles.card}>
              <h2 style={styles.h2}>
                Pending{" "}
                {activeRoleFilter.charAt(0).toUpperCase() +
                  activeRoleFilter.slice(1)}
                s
              </h2>
              {loading && <p>Loading data...</p>}
              {error && <p style={{ color: "red" }}>{error}</p>}
              {!loading && filteredPending.length === 0 && (
                <p style={{ color: "#888", fontSize: 14 }}>
                  No pending applications for this role.
                </p>
              )}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {!loading &&
                  filteredPending.map((v) => (
                    <div key={v.id} style={styles.verifyCard}>
                      <div>
                        <div style={styles.verifyName}>{v.name}</div>
                        <div style={styles.verifyDetails}>
                          ID: {v.id} | District: {v.district}
                        </div>
                        <div
                          style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}
                        >
                          {new Date(v.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        style={styles.reviewBtn}
                        onClick={() => setReviewingItem(v)}
                      >
                        Review Documents
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  marqueeWrapper: {
    width: "100%",
    overflow: "hidden",
    background: "#3D4B9C",
    color: "#fff",
    height: 40,
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: 500,
  },
  marqueeText: { display: "inline-block", paddingRight: 50 },
  shell: {
    display: "flex",
    minHeight: "calc(100vh - 40px)",
    background: "#F0EAD6",
    fontFamily: "system-ui, sans-serif",
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
  logoSub: { fontSize: 12, color: "#555" },
  nav: { display: "flex", flexDirection: "column", gap: 10, marginTop: 20 },
  navItem: {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
  },
  active: {
    background: "rgba(61,75,156,0.08)",
    color: "#3D4B9C",
    border: "1px solid #3D4B9C",
  },
  subNav: { paddingLeft: 10, display: "flex", flexDirection: "column", gap: 4 },
  subItem: {
    background: "transparent",
    border: "none",
    textAlign: "left",
    fontSize: "13px",
    padding: "8px 12px",
    cursor: "pointer",
    color: "#555",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 6,
  },
  subActive: {
    background: "rgba(61,75,156,0.15)",
    color: "#3D4B9C",
    fontWeight: "600",
  },
  roleBadgeCount: {
    background: "#f59e0b",
    color: "#fff",
    borderRadius: 20,
    padding: "1px 7px",
    fontSize: 10,
    fontWeight: 700,
  },
  main: { flex: 1, padding: 28 },
  header: { marginBottom: 22 },
  h1: { fontSize: 24, fontWeight: 600, margin: 0 },
  h2: { fontSize: 18, fontWeight: 600, color: "#3D4B9C", marginBottom: 16 },
  sub: { fontSize: 13, color: "#555" },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid rgba(0,0,0,0.12)",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  infoCol: { display: "flex", flexDirection: "column" },
  statLabel: { fontSize: 12, fontWeight: 600, textTransform: "uppercase" },
  statValue: { fontSize: 15, fontWeight: 400 },
  approvedRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    cursor: "pointer",
  },
  approvedCheck: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#16a34a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  verifyCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 10,
    background: "#fcfcfc",
  },
  verifyName: { fontWeight: 600, fontSize: 16 },
  verifyDetails: { fontSize: 13, color: "#666" },
  reviewBtn: {
    background: "#fff",
    color: "#3D4B9C",
    padding: "10px 18px",
    borderRadius: 8,
    border: "1px solid #3D4B9C",
    fontWeight: 500,
    cursor: "pointer",
  },
  logoutBtn: {
    marginTop: 20,
    padding: "10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    color: "#9a1b1b",
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    background: "#1e8e3e",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 8,
    zIndex: 1000,
    fontSize: 14,
    fontWeight: 500,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  modalContent: {
    background: "#fff",
    padding: "40px",
    borderRadius: "24px",
    width: "520px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  modalHeader: {
    color: "#3D4B9C",
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  modalSubHeader: {
    color: "#555",
    fontSize: "14px",
    marginBottom: "16px",
    fontWeight: "500",
  },
  badge: {
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  docBox: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #eee",
    overflow: "hidden",
    marginBottom: "20px",
  },
  docRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
  },
  docLabel: { fontSize: "16px", fontWeight: "600", color: "#444" },
  docType: { fontSize: "14px", color: "#888", fontWeight: "400" },
  viewFileBtn: {
    background: "#f5f5f5",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    color: "#666",
  },
  cidBox: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    background: "#f3f4f6",
    borderRadius: 6,
    padding: "10px 12px",
    marginBottom: 16,
    textAlign: "left",
  },
  cidLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  cidValue: { fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" },
  approvedConfirmBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: "24px 20px",
    marginBottom: 4,
    textAlign: "center",
  },
  modalActionRow: { display: "flex", gap: "10px" },
  closeBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    color: "#444",
  },
  rejectQrBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "#fce4ec",
    color: "#dc2626",
    fontWeight: "600",
    cursor: "pointer",
  },
  releaseBtn: {
    flex: 3,
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "#3D4B9C",
    color: "#fff",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
  },
};

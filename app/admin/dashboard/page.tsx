"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// Chart components for visualization
const MiniChart = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data, 1);
  return (
    <svg width="60" height="20" style={{ marginTop: 8 }}>
      {data.map((value, index) => (
        <rect
          key={`chart-bar-${index}`}
          x={index * 8}
          y={20 - (value / max) * 20}
          width="6"
          height={(value / max) * 20}
          fill={color}
          opacity="0.8"
        />
      ))}
    </svg>
  );
};

interface Statistics {
  overview: {
    totalApplications: number;
    pendingApplications: number;
    processedApplications: number;
    blockchainSynced: number;
    approvalRate: string;
    blockchainSyncRate: string;
  };
  roleStatistics: any[];
  stageDistribution: any[];
  recentActivity: any[];
  timelineData: any[];
  lastUpdated: string;
}

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
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [filterRole, setFilterRole] = useState<"all" | "producer" | "transporter" | "distributor">("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastRealTimeUpdate, setLastRealTimeUpdate] = useState<string | null>(null);

  // Real-time SSE connection
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectToRealTime = () => {
      try {
        eventSource = new EventSource('/api/admin/realtime');
        
        eventSource.onopen = () => {
          console.log('[RealTime] Connected to real-time updates');
          setIsRealTimeConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'statistics_update') {
              console.log('[RealTime] Received statistics update:', data);
              setLastRealTimeUpdate(data.timestamp);
              
              // Update specific parts of the statistics without full refresh
              if (statistics) {
                setStatistics(prev => prev ? {
                  ...prev,
                  overview: {
                    ...prev.overview,
                    ...data.data
                  },
                  recentActivity: data.data.recentActivity || prev.recentActivity,
                  lastUpdated: data.timestamp
                } : null);
              }
              
              // Also refresh submissions to get the latest data
              fetchSubmissions();
            } else if (data.type === 'heartbeat') {
              console.log('[RealTime] Heartbeat received');
            } else if (data.type === 'initial_connection') {
              console.log('[RealTime] Initial connection established');
            }
          } catch (error) {
            console.error('[RealTime] Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[RealTime] SSE connection error:', error);
          setIsRealTimeConnected(false);
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (eventSource) {
              eventSource.close();
            }
            connectToRealTime();
          }, 3000);
        };

      } catch (error) {
        console.error('[RealTime] Failed to establish SSE connection:', error);
        setIsRealTimeConnected(false);
      }
    };

    connectToRealTime();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [statistics]);

  // Optimized data fetching with debouncing
  const debouncedFetchStatistics = useCallback(
    debounce(() => {
      fetchStatistics();
    }, 1000),
    []
  );

  const debouncedFetchSubmissions = useCallback(
    debounce(() => {
      fetchSubmissions();
    }, 500),
    []
  );

  // Debounce helper function
  function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }

  const handleExport = async (format: "json" | "csv") => {
    try {
      const params = new URLSearchParams({
        format,
        status: filterStatus,
        role: filterRole,
        dateRange: dateRange,
      });

      const response = await fetch(`/api/admin/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subsidy_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast(`✓ Data exported as CSV`);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subsidy_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast(`✓ Data exported as JSON`);
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('✗ Export failed');
    }
  };

  function showToast(msg: string) {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  }

  const fetchStatistics = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/admin/statistics");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

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
    fetchStatistics();
    
    // Only set up polling if real-time is not connected
    const interval = setInterval(() => {
      if (!isRealTimeConnected) {
        fetchSubmissions();
        fetchStatistics();
      }
    }, 15_000); // Reduced to 15 seconds since we have real-time updates
    
    return () => clearInterval(interval);
  }, [fetchSubmissions, fetchStatistics, isRealTimeConnected]);

  useEffect(() => {
    if (reviewingItem) {
      const updated = submissions.find((s) => s.id === reviewingItem.id);
      if (updated) setReviewingItem(updated);
    }
  }, [submissions]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      // Capture the stage BEFORE the patch to pass to blockchain verification
      const beforeStage = submissions.find(s => s.id === id)?.current_stage ?? 0;

      const response = await fetch("/api/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedBy: "Admin" }),
      });
      if (!response.ok) throw new Error("Action failed");
      const updated: Submission = await response.json();
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setReviewingItem(updated);

      if (status === "approved") {
        showToast("✓ Approved. Syncing with blockchain...");
        const numericId = updated.blockchain_itemId != null ? Number(updated.blockchain_itemId) : 0;
        await handleVerifyOnChain(numericId, beforeStage, updated.id);
      } else {
        showToast("✗ Document rejected.");
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
      console.log("[AdminVerify] Starting verification:", { itemId, currentStage, dbId });
      
      const res = await fetch("/api/blockchain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, currentStage, dbId }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[AdminVerify] Failed:", errorText);
        
        let errorMessage = "Blockchain verification failed";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log("[AdminVerify] Success:", result);
      showToast("✓ Blockchain Synced Successfully");
      await fetchSubmissions();
      
      // Log event
      if (result.itemId) {
        fetch("/api/blockchain/logEvent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: result.itemId }),
        }).catch(e => console.warn("[logEvent] failed:", e));
      }
      
    } catch (err: any) {
      console.error("[AdminVerify] Error:", err);
      showToast("⚠ " + err.message);
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes marquee-scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      .marquee-track { display: inline-block; white-space: nowrap; animation: marquee-scroll 60s linear infinite; }
      .marquee-track:hover { animation-play-state: paused; }
      @keyframes pulse { 
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .live-update {
        animation: slideIn 0.3s ease-out;
      }
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

  // Enhanced filtering for subsidy overview
  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch = searchTerm === "" || 
      submission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.district.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || submission.status === filterStatus;
    const matchesRole = filterRole === "all" || submission.role === filterRole;
    
    const submissionDate = new Date(submission.createdAt);
    const today = new Date();
    const matchesDate = dateRange === "all" ||
      (dateRange === "today" && submissionDate.toDateString() === today.toDateString()) ||
      (dateRange === "week" && submissionDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateRange === "month" && submissionDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus && matchesRole && matchesDate;
  });

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
                  key={`doc-${doc.label}-${i}`}
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
                {reviewingItem.qrData && (
                  <div style={{ marginTop: 20, position: 'relative' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#3D4B9C", marginBottom: 8 }}>Handover QR</div>
                    <div style={{ opacity: reviewingItem.current_stage === 0 && reviewingItem.status === 'approved' ? 0.3 : 1 }}>
                      <img
                        src={`https://quickchart.io/qr?text=${encodeURIComponent(reviewingItem.qrData)}&size=180`}
                        alt="Verified QR Code"
                        style={{ border: "4px solid #fff", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      />
                    </div>
                    {reviewingItem.current_stage === 0 && reviewingItem.status === 'approved' && (
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 700, color: '#3D4B9C', border: '1px solid #3D4B9C',
                        textAlign: 'center', pointerEvents: 'none'
                      }}>
                        Blockchain Syncing...<br />Please wait
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#888", marginTop: 8 }}>
                      {reviewingItem.current_stage === 0 && reviewingItem.status === 'approved'
                        ? "⌛ Syncing with Blockchain"
                        : "Scan to link with Blockchain"}
                    </div>
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
            <span key={`marquee-${i}`} style={styles.marqueeText}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h2 style={styles.h2}>Subsidy Overview Dashboard</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isRealTimeConnected ? "#16a34a" : "#dc2626",
                      animation: isRealTimeConnected ? "pulse 2s infinite" : "none"
                    }} />
                    <span style={{ fontSize: 11, color: isRealTimeConnected ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                      {isRealTimeConnected ? "Live" : "Offline"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {lastRealTimeUpdate && (
                    <span style={{ fontSize: 10, color: "#666" }}>
                      Live update: {new Date(lastRealTimeUpdate).toLocaleTimeString()}
                    </span>
                  )}
                  {statistics && (
                    <span style={{ fontSize: 11, color: "#888" }}>
                      Last sync: {new Date(statistics.lastUpdated).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div style={{ marginBottom: 24, padding: "16px", background: "#f8f9ff", borderRadius: "8px", border: "1px solid #e0e7ff" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Search by name, ID, or district..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: "200px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  >
                    <option value="all">All Roles</option>
                    <option value="producer">Producers</option>
                    <option value="transporter">Transporters</option>
                    <option value="distributor">Distributors</option>
                  </select>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Showing {filteredSubmissions.length} of {submissions.length} applications
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleExport("csv")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #16a34a",
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #3D4B9C",
                      background: "#3D4B9C",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              {/* Enhanced Statistics Cards */}
              {statsLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>Loading statistics...</div>
              ) : statistics ? (
                <>
                  {/* Key Metrics Row */}
                  <div style={{ ...styles.grid, marginBottom: 24 }}>
                    <div style={{ ...styles.infoCol, ...styles.metricCard }}>
                      <span style={{ ...styles.statLabel, color: "#3D4B9C" }}>
                        Total Applications
                      </span>
                      <span style={styles.statValue}>{statistics.overview.totalApplications}</span>
                      <MiniChart data={[5, 8, 12, 15, statistics.overview.totalApplications]} color="#3D4B9C" />
                    </div>
                    <div style={{ ...styles.infoCol, ...styles.metricCard }}>
                      <span style={{ ...styles.statLabel, color: "#1e8e3e" }}>
                        Processed
                      </span>
                      <span style={styles.statValue}>{statistics.overview.processedApplications}</span>
                      <div style={{ fontSize: 11, color: "#1e8e3e", marginTop: 4 }}>
                        {statistics.overview.approvalRate}% approval rate
                      </div>
                    </div>
                    <div style={{ ...styles.infoCol, ...styles.metricCard }}>
                      <span style={{ ...styles.statLabel, color: "#e67e22" }}>
                        Pending
                      </span>
                      <span style={styles.statValue}>{statistics.overview.pendingApplications}</span>
                      <div style={{ fontSize: 11, color: "#e67e22", marginTop: 4 }}>
                        Need attention
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Sync Status */}
                  <div style={{ ...styles.grid, marginBottom: 24 }}>
                    <div style={{ ...styles.infoCol, ...styles.metricCard, background: "#f8f9ff" }}>
                      <span style={{ ...styles.statLabel, color: "#6366f1" }}>
                        Blockchain Synced
                      </span>
                      <span style={styles.statValue}>{statistics.overview.blockchainSynced}</span>
                      <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4 }}>
                        {statistics.overview.blockchainSyncRate}% sync rate
                      </div>
                    </div>
                    <div style={{ ...styles.infoCol, ...styles.metricCard, background: "#f0fdf4" }}>
                      <span style={{ ...styles.statLabel, color: "#16a34a" }}>
                        Active Today
                      </span>
                      <span style={styles.statValue}>
                        {statistics.timelineData.filter(d => d.date === new Date().toISOString().split('T')[0]).reduce((sum, d) => sum + d.count, 0)}
                      </span>
                      <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                        New submissions
                      </div>
                    </div>
                    <div style={{ ...styles.infoCol, ...styles.metricCard, background: "#fff7ed" }}>
                      <span style={{ ...styles.statLabel, color: "#ea580c" }}>
                        Avg Processing Time
                      </span>
                      <span style={styles.statValue}>2.3 days</span>
                      <div style={{ fontSize: 11, color: "#ea580c", marginTop: 4 }}>
                        Last 7 days
                      </div>
                    </div>
                  </div>

                  {/* Role-wise Statistics */}
                  {statistics.roleStatistics.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#3D4B9C", marginBottom: 12 }}>
                        Role-wise Activity
                      </h3>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {statistics.roleStatistics.map((role: any, index: number) => (
                          <div key={`role-${role.node_role}-${index}`} style={{ ...styles.roleStatCard }}>
                            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize", color: "#444" }}>
                              {role.node_role}s
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#3D4B9C", marginTop: 4 }}>
                              {role.unique_nodes}
                            </div>
                            <div style={{ fontSize: 11, color: "#888" }}>
                              {role.document_count} documents
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stage Distribution */}
                  {statistics.stageDistribution.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#3D4B9C", marginBottom: 12 }}>
                        Application Stages
                      </h3>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {statistics.stageDistribution.map((stage: any, index: number) => (
                          <div key={`stage-${stage.current_stage}-${stage.status}-${index}`} style={{ ...styles.stageBadge }}>
                            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
                              Stage {stage.current_stage}
                            </div>
                            <div style={{ fontSize: 11, color: "#666" }}>
                              {stage.status}: {stage.count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {statistics.recentActivity.length > 0 && (
                    <div className={lastRealTimeUpdate ? "live-update" : ""}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#3D4B9C", marginBottom: 12 }}>
                        Recent Activity
                        {lastRealTimeUpdate && (
                          <span style={{ 
                            fontSize: 10, 
                            color: "#16a34a", 
                            marginLeft: 8,
                            fontWeight: 500
                          }}>
                            ● Live
                          </span>
                        )}
                      </h3>
                      <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {statistics.recentActivity.map((activity: any, index: number) => (
                          <div 
                            key={`activity-${activity.application_id}-${index}`} 
                            style={{
                              ...styles.activityRow,
                              borderLeft: lastRealTimeUpdate && index < 3 ? "3px solid #16a34a" : "1px solid #f0f0f0",
                              background: lastRealTimeUpdate && index < 3 ? "#f0fdf4" : "#fafafa"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>
                                Application #{activity.application_id}
                              </div>
                              <div style={{ fontSize: 11, color: "#666" }}>
                                {activity.node_role && `${activity.node_role} • `}Status: {activity.status}
                                {activity.blockchain_itemId && ` • BC: #${activity.blockchain_itemId}`}
                              </div>
                            </div>
                            <div style={{ fontSize: 10, color: "#888" }}>
                              {new Date(activity.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                  No statistics available
                </div>
              )}

              {/* Filtered Applications List */}
              {filteredSubmissions.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#3D4B9C", marginBottom: 12 }}>
                    Filtered Applications
                  </h3>
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {filteredSubmissions.slice(0, 10).map((submission) => (
                      <div
                        key={submission.id}
                        style={{
                          ...styles.activityRow,
                          cursor: "pointer",
                          background: submission.status === "approved" ? "#f0fdf4" : 
                                      submission.status === "rejected" ? "#fef2f2" : "#fff",
                        }}
                        onClick={() => setReviewingItem(submission)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                            {submission.name}
                            <span style={{
                              ...styles.badge,
                              background: submission.status === "approved" ? "#dcfce7" : 
                                          submission.status === "rejected" ? "#fecaca" : "#fef3c7",
                              color: submission.status === "approved" ? "#16a34a" : 
                                     submission.status === "rejected" ? "#dc2626" : "#d97706",
                              fontSize: 10,
                              padding: "2px 6px"
                            }}>
                              {submission.status}
                            </span>
                            <span style={{
                              ...styles.badge,
                              background: "#e0e7ff",
                              color: "#3730a3",
                              fontSize: 10,
                              padding: "2px 6px"
                            }}>
                              {submission.role}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                            ID: {submission.id} • {submission.district}
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                            {new Date(submission.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {submission.status === "approved" && submission.qrData && (
                            <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>
                              QR Released
                            </div>
                          )}
                          {submission.blockchain_itemId && (
                            <div style={{ fontSize: 10, color: "#6366f1" }}>
                              BC: #{submission.blockchain_itemId}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredSubmissions.length > 10 && (
                      <div style={{ textAlign: "center", fontSize: 12, color: "#888", padding: 8 }}>
                        ... and {filteredSubmissions.length - 10} more applications
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Original Approved List - Enhanced */}
              {approvedItems.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h2 style={styles.h2}>Recently Approved Applications</h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {approvedItems.slice(0, 5).map((s) => (
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
                    {approvedItems.length > 5 && (
                      <div style={{ textAlign: "center", fontSize: 12, color: "#888", padding: 8 }}>
                        ... and {approvedItems.length - 5} more approved applications
                      </div>
                    )}
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
  // Enhanced styles for statistics dashboard
  metricCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "all 0.2s ease",
  },
  roleStatCard: {
    background: "#fff",
    borderRadius: "8px",
    padding: "12px 16px",
    border: "1px solid rgba(0,0,0,0.08)",
    minWidth: "120px",
    textAlign: "center" as const,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  stageBadge: {
    background: "#f8f9ff",
    borderRadius: "6px",
    padding: "8px 12px",
    border: "1px solid #e0e7ff",
    textAlign: "center" as const,
    minWidth: "80px",
  },
  activityRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #f0f0f0",
    background: "#fafafa",
    marginBottom: "6px",
    fontSize: "12px",
  },
};

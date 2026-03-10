"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRScanner from "@/app/components/QRScanner";

type SubmissionStatus = "pending" | "approved" | "rejected" | "claimed";
type SubmissionRole = "producer" | "transporter" | "distributor";

type Submission = {
    id: string;
    name: string;
    district: string;
    createdAt: string;
    status: SubmissionStatus;
    role: SubmissionRole;
    docs: { label: string; fileType: string }[];
    cid?: string;
    approvedAt?: string;
    approvedBy?: string;
    phone?: string;
    blockchain_itemId?: number;
    current_stage?: number;
    qrData?: string;
    nextStage?: string;
};

type StepStatus = "done" | "active" | "pending";

const STAGES: { label: string }[] = [
    { label: "Application Created" },
    { label: "Admin Verified (Processor Handover)" },
    { label: "Transporter Pickup Docs Uploaded" },
    { label: "Admin Verified (In Transit)" },
    { label: "Distributor Delivery Docs Uploaded" },
    { label: "Admin Verified (Delivered)" },
    { label: "Claimed by Beneficiary" },
];

// ---------------------------------------------------------------------------
// Timeline resolver — uses the HIGHEST current_stage across ALL submissions
// because stages progress through different roles (producer, transporter, distributor)
// ---------------------------------------------------------------------------
function resolveTimelineWithLogs(
    logs: any[],
    submissions: Submission[]
): { label: string; date: string; status: StepStatus; txHash?: string }[] {
    if (submissions.length === 0) {
        return STAGES.map((s, i) => ({
            label: s.label,
            date: i === 0 ? "Pending application" : "Locked",
            status: "pending" as StepStatus,
        }));
    }

    // Parse stages from logs
    const logStages = logs.map(log => {
        if (log.eventName === "ItemCreated") return { stage: 0, date: log.timestamp, txHash: log.transactionHash };
        if (log.eventName === "ItemVerified") return { stage: Number(log.args.newStage), date: log.timestamp, txHash: log.transactionHash };
        if (log.eventName === "DocumentUploaded") return { stage: Number(log.args.stage), date: log.timestamp, txHash: log.transactionHash };
        if (log.eventName === "SubsidyClaimed") return { stage: 6, date: log.timestamp, txHash: log.transactionHash };
        return null;
    }).filter(Boolean) as { stage: number, date: number, txHash: string }[];

    // Find the highest stage index that has a VERIFIED log or evidence
    let effectiveDoneIdx = logStages.length > 0 ? Math.max(...logStages.map(l => l.stage)) : -1;

    // Fallback if logs are not perfectly synced but admin approved submission locally
    if (effectiveDoneIdx === -1) {
        const approved = {
            producer: submissions.some(s => s.role === "producer" && s.status === "approved"),
            transporter: submissions.some(s => s.role === "transporter" && s.status === "approved"),
            distributor: submissions.some(s => s.role === "distributor" && s.status === "approved"),
            claimed: submissions.some(s => s.status === "claimed"),
        };
        const maxSubStage = Math.max(-1, ...submissions.map(s => (s as any).current_stage ?? -1));

        if (approved.claimed || maxSubStage === 6) effectiveDoneIdx = 6;
        else if (approved.distributor || maxSubStage === 5) effectiveDoneIdx = 5;
        else if (maxSubStage === 4) effectiveDoneIdx = 4;
        else if (approved.transporter || maxSubStage === 3) effectiveDoneIdx = 3;
        else if (maxSubStage === 2) effectiveDoneIdx = 2;
        else if (approved.producer || maxSubStage === 1) effectiveDoneIdx = 1;
        else if (submissions.length > 0) effectiveDoneIdx = 0;
    }

    return STAGES.map((s, i) => {
        let status: StepStatus = "pending";
        if (i <= effectiveDoneIdx) status = "done";
        else if (i === effectiveDoneIdx + 1) status = "active";

        const logForStage = logStages.find(l => l.stage === i);

        // Find rough fallback dates from local database when blockchain is missing
        let fallbackDate: string | undefined = undefined;
        if (i === 6) {
            const cSub = submissions.find(sub => (sub as any).claimedAt);
            if (cSub) fallbackDate = (cSub as any).claimedAt;
        } else if (i === 5) {
            const cSub = submissions.find(sub => sub.role === "distributor" && sub.approvedAt);
            if (cSub) fallbackDate = cSub.approvedAt;
        } else if (i === 4) {
            const cSub = submissions.find(sub => sub.role === "distributor" && sub.createdAt);
            if (cSub) fallbackDate = cSub.createdAt;
        } else if (i === 3) {
            const cSub = submissions.find(sub => sub.role === "transporter" && sub.approvedAt);
            if (cSub) fallbackDate = cSub.approvedAt;
        } else if (i === 2) {
            const cSub = submissions.find(sub => sub.role === "transporter" && sub.createdAt);
            if (cSub) fallbackDate = cSub.createdAt;
        } else if (i === 1) {
            const cSub = submissions.find(sub => sub.role === "producer" && sub.approvedAt);
            if (cSub) fallbackDate = cSub.approvedAt;
        } else if (i === 0) {
            const cSub = submissions.find(sub => sub.role === "producer" && sub.createdAt);
            if (cSub) fallbackDate = cSub.createdAt;
        }

        let dateLabel = "Locked";
        if (logForStage) {
            dateLabel = new Date(logForStage.date).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
        } else if (status === "done") {
            dateLabel = fallbackDate ? new Date(fallbackDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "✓ Completed";
        } else if (status === "active") {
            dateLabel = "In Progress...";
        }

        return {
            label: s.label,
            date: dateLabel,
            status,
            txHash: logForStage?.txHash
        };
    });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BeneficiaryDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const phone = searchParams.get("phone") ?? "";

    const [activeView, setActiveView] = useState<"status" | "scan">("status");
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [blockchainLogs, setBlockchainLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchBlockchainLogs = useCallback(async (itemId: number) => {
        try {
            const res = await fetch("/api/blockchain/logs?itemId=" + itemId);
            if (res.ok) {
                const logs = await res.json();
                setBlockchainLogs(logs);
            }
        } catch (e) {
            console.error("Failed to load blockchain logs", e);
        }
    }, []);

    const fetchSubmissions = useCallback(async () => {
        try {
            const res = await fetch("/api/submissions");
            if (!res.ok) throw new Error();
            const all: Submission[] = await res.json();
            const valid = Array.isArray(all) ? all : [];
            setSubmissions(valid);
            setLastUpdated(new Date());

            // If we have a producer submission with a blockchain item ID, fetch its logs
            const pSub = valid.filter(s => s.role === "producer").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            if (pSub && pSub.blockchain_itemId !== undefined) {
                await fetchBlockchainLogs(pSub.blockchain_itemId);
            }
        } catch {
            console.error("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    }, [fetchBlockchainLogs]);

    useEffect(() => {
        fetchSubmissions();
        const interval = setInterval(fetchSubmissions, 8_000);
        return () => clearInterval(interval);
    }, [fetchSubmissions]);

    const timeline = resolveTimelineWithLogs(blockchainLogs, submissions);

    // Use the latest producer submission for identity info
    const producerSub = [...submissions]
        .filter(s => s.role === "producer")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Current effective stage for status badge (Show what was LAST reached)
    const effectiveDoneIdx = timeline.reduce((acc, s, i) => (s.status === "done" ? i : acc), -1);
    const stageLabel = effectiveDoneIdx >= 0
        ? STAGES[effectiveDoneIdx].label
        : "No Active Application";

    return (
        <div style={styles.shell}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
                <div style={{ marginBottom: "24px" }}>
                    <div style={styles.logo}>निश्चित</div>
                    <div style={styles.logoSub}>Beneficiary Portal</div>
                </div>
                <nav style={styles.nav}>
                    <button
                        style={{ ...styles.navItem, ...(activeView === "status" && styles.active) }}
                        onClick={() => setActiveView("status")}
                    >
                        Application Status
                    </button>
                    <button
                        style={{ ...styles.navItem, ...(activeView === "scan" && styles.active) }}
                        onClick={() => setActiveView("scan")}
                    >
                        Scan QR to Claim
                    </button>
                </nav>
                <div style={{ marginTop: "auto" }}>
                    <button onClick={() => fetchSubmissions()} style={styles.refreshBtn}>
                        ↻ Refresh
                    </button>
                    <button onClick={() => router.push("/")} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={styles.main}>
                <header style={styles.header}>
                    <h1 style={styles.h1}>
                        {activeView === "status" ? "Application Status" : "Scan QR Code"}
                    </h1>
                    <p style={styles.sub}>
                        {activeView === "status"
                            ? lastUpdated
                                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                                : "Loading..."
                            : "Scan the Distributor's QR code to claim your subsidy"}
                    </p>
                </header>

                {loading ? (
                    <div style={{ color: "#aaa", fontSize: 14, padding: "32px 0" }}>
                        Loading your application…
                    </div>
                ) : (
                    <>
                        {activeView === "status" && (
                            <section style={styles.card}>
                                <h2 style={styles.h2}>Application Overview</h2>

                                {/* Current status badge */}
                                <div style={styles.stageBadge}>
                                    <span style={styles.stageDot} />
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                                        Current Stage: {stageLabel}
                                    </span>
                                </div>

                                <div style={styles.grid}>
                                    <InfoItem label="Applicant Name" value={producerSub?.name ?? "—"} />
                                    <InfoItem label="District" value={producerSub?.district ?? "—"} />
                                    <InfoItem label="Phone Number" value={phone || "—"} />
                                    <InfoItem label="Application ID" value={producerSub?.id ?? "—"} />
                                    <InfoItem
                                        label="Submitted On"
                                        value={
                                            producerSub
                                                ? new Date(producerSub.createdAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "—"
                                        }
                                    />
                                    <InfoItem label="Subsidy Type" value="Fertilizer Subsidy" />
                                </div>

                                {/* Live Timeline */}
                                <div style={{ marginTop: 28 }}>
                                    <div style={styles.timelineHeading}>Application Timeline</div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        {timeline.map((step, i) => (
                                            <TimelineStep
                                                key={i}
                                                label={step.label}
                                                date={step.date}
                                                status={step.status}
                                                txHash={step.txHash}
                                                isLast={i === timeline.length - 1}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {submissions.length === 0 && (
                                    <div style={{ textAlign: "center", color: "#aaa", paddingTop: 24, fontSize: 13 }}>
                                        No applications found. Please submit your documents via the Processing office.
                                    </div>
                                )}
                            </section>
                        )}

                        {activeView === "scan" && (
                            <QRScannerView
                                onClaimSuccess={async () => {
                                    await fetchSubmissions();
                                    setActiveView("status");
                                }}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

/* ── QR Scanner View ── */
function QRScannerView({ onClaimSuccess }: { onClaimSuccess?: () => void }) {
    const [error, setError] = useState("");
    const [scannedData, setScannedData] = useState<{ blockchain_itemId: number | null; submissionId: string } | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleClaim = async () => {
        if (!scannedData) return;
        setClaiming(true);
        try {
            const res = await fetch("/api/blockchain/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemId: scannedData.blockchain_itemId,
                    dbId: scannedData.submissionId,
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Claim failed");
            }
            setSuccess(true);
            setScannedData(null);
        } catch (err: any) {
            setError("Error claiming subsidy: " + err.message);
        } finally {
            setClaiming(false);
        }
    };

    return (
        <section style={styles.card}>
            <h2 style={styles.h2}>Scan QR Code</h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 24, marginTop: 0 }}>
                Scan the QR code from the Distributor to finalize your subsidy claim on the blockchain.
            </p>

            {success ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#065f46" }}>
                        Subsidy Claimed Successfully!
                    </div>
                    <p style={{ fontSize: 13, color: "#666" }}>
                        Your transaction has been recorded on the blockchain.
                    </p>
                    <button
                        onClick={() => { setSuccess(false); setError(""); }}
                        style={styles.startBtn}
                    >
                        Back to Dashboard
                    </button>
                </div>
            ) : scannedData ? (
                <div style={styles.scannedBox}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#065f46", marginBottom: 12 }}>
                        ✓ QR Verified Successfully
                    </div>
                    <div style={styles.scannedDetails}>
                        <div style={styles.row}>
                            <span>Blockchain ID:</span>
                            <strong>{scannedData.blockchain_itemId != null ? `#${scannedData.blockchain_itemId}` : "N/A"}</strong>
                        </div>
                        <div style={styles.row}>
                            <span>Submission ID:</span>
                            <strong>{scannedData.submissionId}</strong>
                        </div>
                    </div>
                    {error && <div style={{ ...styles.errorBox, marginTop: 12 }}>{error}</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                        <button
                            disabled={claiming}
                            onClick={handleClaim}
                            style={{ ...styles.startBtn, flex: 1, opacity: claiming ? 0.7 : 1 }}
                        >
                            {claiming ? "Claiming..." : "Finalize Claim on Blockchain"}
                        </button>
                        <button
                            onClick={() => { setScannedData(null); setError(""); }}
                            style={{ ...styles.cancelBtn }}
                        >
                            Re-scan
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <QRScanner
                        onResult={(res) => {
                            try {
                                const cleaned = res.trim();
                                console.log("[QRScan Beneficiary] Raw:", cleaned);
                                const data = JSON.parse(cleaned);
                                if (!data.submissionId) throw new Error("Not a system QR — missing submissionId");
                                setScannedData({
                                    blockchain_itemId: data.itemId ?? null,
                                    submissionId: data.submissionId,
                                });
                                setError("");
                            } catch (err: any) {
                                console.error("[QRScan] Error:", res, err);
                                setError("QR Error: " + err.message);
                            }
                        }}
                        onError={(err) => console.warn("[QRScanner]", err)}
                    />
                    {error && <div style={{ ...styles.errorBox, marginTop: 16 }}>{error}</div>}
                </>
            )}
        </section>
    );
}

/* ── Timeline Step ── */
function TimelineStep({
    label, date, status, isLast, txHash
}: {
    label: string; date: string; status: StepStatus; isLast: boolean; txHash?: string;
}) {
    const dotColor =
        status === "done" ? "#1e8e3e" : status === "active" ? "#3D4B9C" : "#d1d5db";
    const labelColor =
        status === "done" ? "#333" : status === "active" ? "#3D4B9C" : "#9ca3af";

    return (
        <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                <div
                    style={{
                        width: 16, height: 16, borderRadius: "50%",
                        background: dotColor, flexShrink: 0, marginTop: 2,
                        boxShadow: status === "active" ? "0 0 0 4px rgba(61,75,156,0.15)" : "none",
                    }}
                />
                {!isLast && <div style={{ width: 2, flex: 1, background: "#e5e7eb", minHeight: 28 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: labelColor }}>{label}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, display: "flex", gap: "8px", alignItems: "center" }}>
                    <span>{date}</span>
                    {txHash && (
                        <span style={{ fontSize: 10, background: "#f0f4ff", color: "#3D4B9C", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            {txHash.substring(0, 8)}...
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Info Item ── */
function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#3D4B9C", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {label}
            </span>
            <span style={{ fontSize: 14, color: "#222", fontWeight: 500 }}>{value}</span>
        </div>
    );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
    shell: { display: "flex", minHeight: "100vh", background: "#F0EAD6", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", color: "#333" },
    sidebar: { width: 260, background: "#fff", borderRight: "1px solid rgba(0,0,0,0.1)", padding: "18px", display: "flex", flexDirection: "column" },
    logo: { fontSize: 20, fontWeight: 700, color: "#3D4B9C" },
    logoSub: { fontSize: 11, color: "#666", marginBottom: 16 },
    nav: { display: "flex", flexDirection: "column", gap: 8 },
    navItem: { textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: "14px", fontWeight: 500, cursor: "pointer", color: "#444" },
    active: { background: "rgba(61,75,156,0.08)", color: "#3D4B9C", border: "1px solid #3D4B9C" },
    refreshBtn: { padding: "9px", borderRadius: 8, border: "1px solid rgba(61,75,156,0.3)", background: "#f0f4ff", cursor: "pointer", fontWeight: 600, color: "#3D4B9C", width: "100%", fontSize: "13px", marginBottom: 8 },
    logoutBtn: { padding: "10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontWeight: 500, color: "#9a1b1b", width: "100%", fontSize: "13px" },
    main: { flex: 1, padding: 28 },
    header: { marginBottom: 20 },
    h1: { margin: 0, fontSize: 22, fontWeight: 600, color: "#111" },
    sub: { fontSize: 12, color: "#666", marginTop: 4 },
    card: { background: "#fff", borderRadius: 12, padding: 24, border: "1px solid rgba(0,0,0,0.12)" },
    h2: { marginTop: 0, marginBottom: 20, fontSize: 16, fontWeight: 600, color: "#3D4B9C" },
    stageBadge: { display: "flex", alignItems: "center", gap: 8, background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "8px 14px", marginBottom: 20, width: "fit-content" },
    stageDot: { width: 10, height: 10, borderRadius: "50%", background: "#3D4B9C", flexShrink: 0 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 8 },
    timelineHeading: { fontSize: 13, fontWeight: 700, color: "#3D4B9C", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 },
    scannedBox: { background: "#f0fdf4", border: "1px solid #86efac", padding: 24, borderRadius: 12, marginBottom: 24 },
    scannedDetails: { background: "#fff", padding: 16, borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 },
    row: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" },
    startBtn: { background: "#3D4B9C", color: "white", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    cancelBtn: { padding: "12px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#444" },
    errorBox: { fontSize: 13, color: "#dc2626", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", textAlign: "center" },
};
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
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
    { label: "Transporter Pickup" },
    { label: "Admin Verified (In Transit)" },
    { label: "Distributor Delivery" },
    { label: "Admin Verified (Delivered)" },
    { label: "Claimed by Beneficiary" },
];

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
    shell: { display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", color: "#1e293b" },
    sidebar: { width: 280, background: "#ffffff", borderRight: "1px solid #e2e8f0", padding: "24px", display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.02)" },
    logo: { fontSize: 24, fontWeight: 800, color: "#2563eb", letterSpacing: "-0.02em" },
    logoSub: { fontSize: 12, color: "#64748b", marginBottom: 32, fontWeight: 500 },
    nav: { display: "flex", flexDirection: "column", gap: 8 },
    navItem: { textAlign: "left", padding: "12px 16px", borderRadius: 12, border: "1px solid transparent", background: "transparent", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#475569", transition: "all 0.2s ease" },
    active: { background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe" },
    refreshBtn: { padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff", cursor: "pointer", fontWeight: 600, color: "#475569", width: "100%", fontSize: "13px", marginBottom: 12, transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    logoutBtn: { padding: "12px", borderRadius: 12, border: "1px solid #fee2e2", background: "#fef2f2", cursor: "pointer", fontWeight: 600, color: "#dc2626", width: "100%", fontSize: "13px", transition: "all 0.2s ease" },
    main: { flex: 1, padding: "40px 48px", overflowY: "auto" },
    header: { marginBottom: 32 },
    h1: { margin: 0, fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" },
    sub: { fontSize: 14, color: "#64748b", marginTop: 8, fontWeight: 500 },
    card: { background: "#ffffff", borderRadius: 24, padding: 32, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)" },
    h2: { marginTop: 0, marginBottom: 24, fontSize: 18, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 10 },
    stageBadge: { display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1px solid #e0f2fe", borderRadius: 100, padding: "6px 16px", marginBottom: 24, width: "fit-content" },
    stageDot: { width: 8, height: 8, borderRadius: "50%", background: "#0ea5e9", flexShrink: 0 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginBottom: 8 },
    timelineHeading: { fontSize: 14, fontWeight: 800, color: "#475569", marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.05em" },
    scannedBox: { background: "#f0fdf4", border: "1px solid #dcfce7", padding: 32, borderRadius: 24, marginBottom: 24 },
    scannedDetails: { background: "#ffffff", padding: 24, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16, border: "1px solid #dcfce7" },
    row: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#334155", fontWeight: 500 },
    startBtn: { background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)", transition: "all 0.2s ease" },
    cancelBtn: { padding: "14px 24px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#475569", transition: "all 0.2s ease" },
    errorBox: { fontSize: 14, color: "#dc2626", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: "12px 16px", textAlign: "center", fontWeight: 500 },
    stepperContainer: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 24,
        padding: "40px 32px",
        marginTop: 24,
    },
    stepperIcons: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 24,
        padding: "0 12px"
    },
    stepperItem: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    stepperLineContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        marginBottom: 16
    },
    stepperLabels: {
        display: "flex",
        justifyContent: "space-between",
        padding: "0 8px"
    },
    nodeLogCard: { marginTop: 32, background: "#ffffff", borderRadius: 24, padding: 32, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
    nodeRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        background: "#ffffff",
        border: "1px solid #f1f5f9",
        borderRadius: 16,
        marginBottom: 12,
        transition: "all 0.2s ease",
        ":hover": { borderColor: "#e2e8f0", background: "#f8fafc" }
    } as any,
    nodeInfo: { display: "flex", alignItems: "center", gap: 16 },
    nodeRoleBadge: {
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 100,
        background: "#f1f5f9",
        color: "#475569",
        letterSpacing: "0.025em"
    },
    nodeStatus: { fontSize: 13, fontWeight: 700, color: "#16a34a" }
};

// ---------------------------------------------------------------------------
// Timeline resolver — uses the HIGHEST current_stage across ALL submissions
// because stages progress through different roles (producer, transporter, distributor)
// ---------------------------------------------------------------------------
function resolveTimelineWithLogs(
    logs: any[],
    submissions: Submission[]
): { label: string; date: string; status: StepStatus; txHash?: string; cid?: string; details?: string }[] {
    if (submissions.length === 0) {
        return STAGES.map((s, i) => ({
            label: s.label,
            date: i === 0 ? "Pending application" : "Locked",
            status: "pending" as StepStatus,
        }));
    }

    // Parse stages from logs
    const logEntries = logs.map(log => {
        let stage = -1;
        if (log.eventName === "ItemCreated") stage = 0;
        else if (log.eventName === "ItemVerified") stage = Number(log.args.newStage);
        else if (log.eventName === "DocumentUploaded") stage = Number(log.args.stage);
        else if (log.eventName === "SubsidyClaimed") stage = 6;

        return {
            stage,
            date: log.timestamp,
            txHash: log.transactionHash,
            cid: log.args.ipfsHash,
            eventName: log.eventName
        };
    }).filter(l => l.stage !== -1);

    // Find the highest stage index that has a VERIFIED log or evidence
    let effectiveDoneIdx = logEntries.length > 0 ? Math.max(...logEntries.map(l => l.stage)) : -1;

    // Fallback/Augmentation: Check local submissions for current_stage if logs are lagging
    const maxSubStage = Math.max(-1, ...submissions.map(s => (s as any).current_stage ?? -1));
    if (maxSubStage > effectiveDoneIdx) {
        effectiveDoneIdx = maxSubStage;
    }

    // If we have at least one submission, we are at least at Stage 0
    if (effectiveDoneIdx === -1 && submissions.length > 0) {
        effectiveDoneIdx = 0;
    }

    return STAGES.map((s, i) => {
        let status: StepStatus = "pending";
        if (i <= effectiveDoneIdx) status = "done";
        else if (i === effectiveDoneIdx + 1) status = "active";

        // Find logs for this specific stage
        const logsForThisStage = logEntries.filter(l => l.stage === i);
        const primaryLog = logsForThisStage[0];
        const cid = logsForThisStage.find(l => l.cid)?.cid;

        // Details for the stage
        let details = "";
        if (i === 0) details = "Beneficiary application created and waiting for Admin approval.";
        else if (i === 1) details = "Admin verified documents. Processor handover is now possible.";
        else if (i === 2) details = "Transporter has scanned the QR and confirmed item pickup.";
        else if (i === 3) details = "Admin verified pickup. Item is now in transit to the destination.";
        else if (i === 4) details = "Distributor received the item and uploaded distribution logs.";
        else if (i === 5) details = "Admin verified delivery. Subsidy is now ready for final claim.";
        else if (i === 6) details = "Beneficiary claimed the subsidy using the final handover QR.";

        // Find rough fallback dates
        let fallbackDate: string | undefined = undefined;
        if (i === 0) fallbackDate = submissions.find(sub => sub.role === "producer")?.createdAt;
        else if (i === 1) fallbackDate = submissions.find(sub => sub.role === "producer")?.approvedAt;
        else if (i === 2) fallbackDate = submissions.find(sub => sub.role === "transporter")?.createdAt;
        else if (i === 3) fallbackDate = submissions.find(sub => sub.role === "transporter")?.approvedAt;
        else if (i === 4) fallbackDate = submissions.find(sub => sub.role === "distributor")?.createdAt;
        else if (i === 5) fallbackDate = submissions.find(sub => sub.role === "distributor")?.approvedAt;
        else if (i === 6) fallbackDate = (submissions.find(s => (s as any).claimedAt) as any)?.claimedAt;

        let dateLabel = "Locked";
        if (primaryLog) {
            dateLabel = new Date(primaryLog.date).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
        } else if (status === "done") {
            dateLabel = fallbackDate ? new Date(fallbackDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "✓ Completed";
        } else if (status === "active") {
            dateLabel = "Awaiting Action...";
        }

        return {
            label: s.label,
            date: dateLabel,
            status,
            txHash: primaryLog?.txHash,
            cid,
            details: status === "done" ? details : ""
        };
    });
}


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BeneficiaryDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const phone = searchParams.get("phone") ?? "";
    const locale = params.locale as string;

    const [activeView, setActiveView] = useState<"status" | "scan">("status");
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [blockchainLogs, setBlockchainLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchBlockchainLogs = useCallback(async (itemId: number) => {
        try {
            // Use logEvent so we get fresh structured data including stage names
            const res = await fetch("/api/blockchain/logEvent?itemId=" + itemId);
            if (res.ok) {
                const data = await res.json();
                // logEvent returns { logs: [...] }; logs route returns the array directly
                setBlockchainLogs(Array.isArray(data) ? data : (data.logs ?? []));
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

            // 1. Find the core identity submissions (producer/processor) for this phone
            const beneficiaryIdentitySub = valid.filter(s => s.phone === phone && s.role === "producer");

            // 2. Extract item IDs linked to this beneficiary
            const myItemIds = beneficiaryIdentitySub
                .map(s => s.blockchain_itemId)
                .filter((id): id is number => id !== undefined && id !== null);

            // 3. Include all submissions matching the phone OR sharing the same blockchain Item ID
            // This ensures transporter/distributor docs show up in the timeline
            const mySubmissions = valid.filter(s =>
                (s.phone === phone) ||
                (s.blockchain_itemId !== undefined && myItemIds.includes(s.blockchain_itemId))
            );

            setSubmissions(mySubmissions);
            setLastUpdated(new Date());

            // 4. Fetch blockchain logs for all relevant item IDs
            if (myItemIds.length > 0) {
                // For now we fetch for the most recent one to keep it simple, or we could loop
                const latestId = Math.max(...myItemIds);
                await fetchBlockchainLogs(latestId);
            }
        } catch (e) {
            console.error("Failed to load submissions", e);
        } finally {
            setLoading(false);
        }
    }, [fetchBlockchainLogs, phone]);

    // Poll every 4s + refresh immediately when the user tabs back to this page
    useEffect(() => {
        fetchSubmissions();
        const interval = setInterval(fetchSubmissions, 4_000);

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                fetchSubmissions();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [fetchSubmissions]);

    const timeline = resolveTimelineWithLogs(blockchainLogs, submissions);
    console.log("[BeneficiaryDashboard] Submissions:", submissions.map(s => ({ id: s.id, role: s.role, stage: (s as any).current_stage })));
    console.log("[BeneficiaryDashboard] Timeline Status:", timeline.map(t => ({ label: t.label, status: t.status })));

    // Use the latest producer submission for identity info (already filtered by phone in fetchSubmissions)
    const producerSub = [...submissions]
        .filter(s => s.role === "producer")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Current effective stage for status badge
    const activeStageIdx = timeline.findIndex(s => s.status === "active");
    const lastDoneIdx = timeline.reduce((acc, s, i) => (s.status === "done" ? i : acc), -1);
    
    const stageLabel = activeStageIdx !== -1 
        ? STAGES[activeStageIdx].label 
        : lastDoneIdx !== -1 
            ? STAGES[lastDoneIdx].label 
            : "Initializing System";
    const isProcessing = activeStageIdx !== -1;

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
                    <button
                        style={{ ...styles.navItem, background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}
                        onClick={() => router.push(`/${locale}/apply`)}
                    >
                        Apply for Subsidy
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
                            !producerSub || producerSub.status === "claimed" ? (
                                <section style={styles.card}>
                                    <div style={{ textAlign: "center", padding: "48px 24px" }}>
                                        <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.5 }}>📋</div>
                                        <h2 style={{ ...styles.h2, fontSize: 20 }}>No Active Subsidy Tracking</h2>
                                        <p style={{ color: "#666", maxWidth: 400, margin: "0 auto 32px", lineHeight: 1.6 }}>
                                            {producerSub?.status === "claimed"
                                                ? "Your previous subsidy has been successfully claimed and the lifecycle is complete. Thank you for using Nischit."
                                                : "You don't have an active subsidy application being tracked. Information will appear here once your application is processed at the local center."}
                                        </p>
                                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                                            <button
                                                onClick={() => router.push("/apply")}
                                                style={{ ...styles.startBtn, padding: "10px 24px" }}
                                            >
                                                Apply for New Subsidy
                                            </button>
                                            {producerSub?.status === "claimed" && (
                                                <button
                                                    onClick={() => window.print()}
                                                    style={{ ...styles.cancelBtn, padding: "10px 24px" }}
                                                >
                                                    Print Claim Receipt
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <>
                                    <section style={styles.card}>
                                        <h2 style={styles.h2}>Application Overview</h2>

                                        {/* Current status badge */}
                                        <div style={{
                                            ...styles.stageBadge,
                                            background: isProcessing ? "#fff7ed" : "#f0f9ff",
                                            borderColor: isProcessing ? "#ffedd5" : "#e0f2fe",
                                        }}>
                                            <span style={{
                                                ...styles.stageDot,
                                                background: isProcessing ? "#f97316" : "#0ea5e9",
                                                animation: isProcessing ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
                                            }} />
                                            <span style={{ 
                                                fontSize: 13, 
                                                fontWeight: 700, 
                                                color: isProcessing ? "#9a3412" : "#0369a1" 
                                            }}>
                                                {isProcessing ? "Currently At: " : "Last Completed: "} {stageLabel}
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

                                        {/* Track Your Subsidy - Visual Stepper */}
                                        <div style={{ marginTop: 28 }}>
                                            <div style={styles.timelineHeading}>Track Your Subsidy</div>
                                            <HorizontalStepper currentStage={lastDoneIdx} />
                                        </div>

                                        {/* Detailed Vertical Timeline */}
                                        <div style={{ marginTop: 40, borderTop: "2px solid #1e8e3e", paddingTop: 24 }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {[...timeline].reverse().map((step, i) => (
                                                    (step.status === "done" || step.status === "active") && (
                                                        <TimelineStep
                                                            key={i}
                                                            label={step.label}
                                                            date={step.date}
                                                            status={step.status}
                                                            txHash={step.txHash}
                                                            cid={step.cid}
                                                            details={step.details}
                                                            isLast={i === timeline.filter(s => s.status === "done" || s.status === "active").length - 1}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    <section style={styles.nodeLogCard}>
                                        <h2 style={styles.h2}>Processing Nodes & Handover History</h2>
                                        <p style={{ fontSize: 12, color: "#666", marginBottom: 20, marginTop: -14 }}>
                                            Verification records from government officials and logistics partners.
                                        </p>

                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            {submissions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((s, i) => (
                                                <div key={s.id} style={styles.nodeRow}>
                                                    <div style={styles.nodeInfo}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: "50%",
                                                            background: s.status === "approved" ? "#1e8e3e" : "#3D4B9C",
                                                            display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                                                        }}>
                                                            {s.role === "producer" ? "🏛️" : s.role === "transporter" ? "🚚" : "📍"}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                                                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                                                <span style={styles.nodeRoleBadge}>{s.role}</span>
                                                                <span style={{ fontSize: 11, color: "#666" }}>{s.district}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={styles.nodeStatus}>
                                                            {s.status === "approved" ? "✓ Verified" : "● Processing"}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                                                            {new Date(s.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {submissions.length === 0 && (
                                                <div style={{ textAlign: "center", padding: "20px", color: "#999", fontSize: 13 }}>
                                                    Assigning processing nodes...
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </>
                            ))
                        }

                        {activeView === "scan" && (
                            <QRScannerView
                                onScanUpdate={fetchSubmissions}
                                onClaimSuccess={async () => {
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
function QRScannerView({ onClaimSuccess, onScanUpdate }: { onClaimSuccess?: () => void; onScanUpdate?: () => void }) {
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
            // Fire-and-forget: log the SubsidyClaimed event
            if (scannedData.blockchain_itemId !== null) {
                fetch("/api/blockchain/logEvent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ itemId: scannedData.blockchain_itemId }),
                }).then(r => r.json()).then(data =>
                    console.log("[logEvent] Claim events:", data.totalEvents)
                ).catch(e => console.warn("[logEvent] Claim log failed:", e));
            }
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
                        onClick={() => { 
                            setSuccess(false); 
                            setError(""); 
                            onScanUpdate?.();
                            onClaimSuccess?.();
                        }}
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
                                if (!data.submissionId) throw new Error("Not a system QR code");
                                if (data.itemId == null) throw new Error("Invalid Handover: Missing Blockchain ID.");

                                // Security check: Ensure this QR is meant for final delivery
                                if (data.nextStage !== "beneficiary_delivery") {
                                    throw new Error("Invalid Handover: This code is for internal transit and cannot be used for direct claiming.");
                                }

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

/* ── Horizontal Stepper ── */
function HorizontalStepper({ currentStage }: { currentStage: number }) {
    const steps = [
        { label: "Application Created", icon: "📝", threshold: 0 },
        { label: "Admin Verified (Handover)", icon: "✅", threshold: 1 },
        { label: "Transporter Pickup", icon: "📦", threshold: 2 },
        { label: "Admin Verified (In Transit)", icon: "🤝", threshold: 3 },
        { label: "Distributor Delivery", icon: "🚚", threshold: 4 },
        { label: "Admin Verified (Delivered)", icon: "✔️", threshold: 5 },
        { label: "Claimed by Beneficiary", icon: "👤", threshold: 6 },
    ];
    return (
        <div style={styles.stepperContainer}>
            <div style={styles.stepperIcons}>
                {steps.map((step, i) => (
                    <div key={i} style={styles.stepperItem}>
                        <div style={{
                            fontSize: 32,
                            marginBottom: 8,
                            opacity: currentStage >= step.threshold ? 1 : 0.2,
                            filter: currentStage >= step.threshold ? "none" : "grayscale(100%)",
                            color: currentStage >= step.threshold ? "#2563eb" : "#94a3b8",
                            transition: "all 0.5s ease"
                        }}>
                            {step.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.stepperLineContainer}>
                {steps.map((step, i) => (
                    <React.Fragment key={i}>
                        <div style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: currentStage >= step.threshold ? "#1e8e3e" : "#d1d5db",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: 12, zIndex: 2,
                            boxShadow: currentStage === step.threshold ? "0 0 0 4px rgba(30,142,62,0.2)" : "none",
                            transition: "all 0.4s ease"
                        }}>
                            {currentStage >= step.threshold ? "✓" : ""}
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1, height: 2,
                                background: currentStage > step.threshold ? "#1e8e3e" : "#e5e7eb",
                                borderStyle: currentStage >= step.threshold ? "solid" : "dotted",
                                borderWidth: 0,
                                borderTopWidth: 2,
                                margin: "0 4px",
                                transition: "all 0.4s ease"
                            }} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div style={styles.stepperLabels}>
                {steps.map((step, i) => (
                    <div key={i} style={{
                        flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700,
                        color: currentStage >= step.threshold ? "#333" : "#9ca3af",
                        padding: "0 4px"
                    }}>
                        {step.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Timeline Step ── */
function TimelineStep({
    label, date, status, isLast, txHash, cid, details
}: {
    label: string; date: string; status: StepStatus; isLast: boolean; txHash?: string; cid?: string; details?: string;
}) {
    const dotColor =
        status === "done" ? "#10b981" : status === "active" ? "#2563eb" : "#e2e8f0";
    const labelColor =
        status === "done" ? "#1e293b" : status === "active" ? "#2563eb" : "#64748b";

    return (
        <div style={{ display: "flex", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                <div
                    style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: dotColor, flexShrink: 0, marginTop: 6,
                        boxShadow: status === "active" ? "0 0 0 4px rgba(37, 99, 235, 0.1)" : "none",
                        transition: "all 0.3s ease"
                    }}
                />
                {!isLast && <div style={{ width: 2, flex: 1, background: "#f1f5f9", minHeight: 32, margin: "8px 0" }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 32, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: labelColor }}>{label}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{date}</div>
                </div>

                {details && (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 1.6, fontWeight: 500 }}>
                        {details}
                    </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {txHash && (
                        <a
                            href={`https://etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontSize: 11, background: "#eff6ff", color: "#2563eb",
                                padding: "4px 10px", borderRadius: 100, fontFamily: "monospace",
                                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                                border: "1px solid #dbeafe", fontWeight: 600
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            TX: {txHash.substring(0, 10)}...
                        </a>
                    )}
                    {cid && (
                        <a
                            href={`https://gateway.pinata.cloud/ipfs/${cid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontSize: 11, background: "#f0fdf4", color: "#16a34a",
                                padding: "4px 10px", borderRadius: 100, fontWeight: 600,
                                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                                border: "1px solid #dcfce7"
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            View Proof
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </span>
            <span style={{ fontSize: 15, color: "#0f172a", fontWeight: 600 }}>{value}</span>
        </div>
    );
}


/* ── Styles ── */

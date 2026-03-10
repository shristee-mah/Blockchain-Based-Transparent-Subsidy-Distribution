"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export default function CompletedPage() {
  const t = useTranslations("CompletedV2");
  const router = useRouter();
  const { locale } = useParams() as { locale: string };

  const today = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }, []);

  // simple id (UI only). Later you can replace with real generated id.
  const applicationId = "SUB-598411";

  function backToHome() {
    router.push(`/${locale}`);
  }

  function printConfirmation() {
    window.print();
  }

  const steps = [
    { number: 1, label: t("steps.general"), active: false },
    { number: 2, label: t("steps.kyc"), active: false },
    { number: 3, label: t("steps.scheme"), active: false },
    { number: 4, label: t("steps.upload"), active: false },
    { number: 5, label: t("steps.agreement"), active: false },
    { number: 6, label: t("steps.completed"), active: true },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0EAD6",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Progress Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "3rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {steps.map((step, index) => (
          <div key={step.number} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: step.active ? "#3D4B9C" : "#ccc",
                color: step.active ? "#fff" : "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              {step.number}
            </div>

            <span
              style={{
                marginLeft: "8px",
                color: step.active ? "#3D4B9C" : "#666",
                fontSize: "12px",
                fontWeight: step.active ? "bold" : "normal",
              }}
            >
              {step.label}
            </span>

            {index < steps.length - 1 && (
              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: "#ccc",
                  margin: "0 8px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card (same proportions as other pages) */}
      <div
        style={{
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        {/* Green icon */}
        <div
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: "#28a745",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 14px",
          }}
          aria-hidden
        >
          <span style={{ color: "white", fontSize: "44px", fontWeight: 900 }}>✓</span>
        </div>

        <h1
          style={{
            color: "#28a745",
            fontSize: "1.8rem",
            fontWeight: 600,
            margin: "0 0 8px",
          }}
        >
          {t("title")}
        </h1>

        <div style={{ fontSize: "1rem", marginBottom: "12px", color: "#222" }}>
          {t("subtitle")}
        </div>

        <p
          style={{
            color: "#444",
            fontSize: "1rem",
            lineHeight: 1.6,
            maxWidth: "640px",
            margin: "0 auto 18px",
          }}
        >
          {t("description")}
        </p>

        {/* Summary Box */}
        <div
          style={{
            textAlign: "left",
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "16px",
            maxWidth: "700px",
            margin: "0 auto 20px",
            background: "#fff",

          }}
        >
          <div style={{ color: "#3D4B9C", fontWeight: 600, fontSize: "1.1rem", marginBottom: "10px" }}>
            {t("summaryTitle")}
          </div>

          <SummaryRow label={t("applicationDate")} value={today} />
          <SummaryRow label={t("applicationId")} value={applicationId} />
          <SummaryRow
            label={t("status")}
            value={<span style={{ color: "#28a745", fontWeight: 600 }}>{t("statusSubmitted")}</span>}
          />
          <SummaryRow label={t("nextStep")} value={t("nextStepValue")} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
          <button onClick={backToHome} style={primaryButtonStyle}>
            {t("backHome")}
          </button>
          <button onClick={printConfirmation} style={outlineButtonStyle}>
            {t("print")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
      <div style={{ fontWeight: 600, minWidth: "170px" }}>{label}:</div>
      <div style={{ color: "#222" }}>{value}</div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  background: "#3D4B9C",
  color: "#fff",
  padding: "1rem 1.25rem",
  border: "none",
  borderRadius: "8px",
  fontSize: "1.05rem",
  fontWeight: "bold",
  cursor: "pointer",
  minWidth: "220px",
};

const outlineButtonStyle: React.CSSProperties = {
  background: "#fff",
  color: "#3D4B9C",
  padding: "1rem 1.25rem",
  border: "2px solid #3D4B9C",
  borderRadius: "8px",
  fontSize: "1.05rem",
  fontWeight: "bold",
  cursor: "pointer",
  minWidth: "220px",
};

"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export default function AgreementPage() {
  const t = useTranslations("Agreement");
  const router = useRouter();
  const { locale } = useParams() as { locale: string };

  const [accepted, setAccepted] = useState(false);

  function goBack() {
    router.push(`/${locale}/apply/upload`);
  }

  // function submitApplication(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault();

  //   if (!accepted) return;

  //   // Final step (we'll create /completed next)
  //   router.push(`/${locale}/apply/completed`);
  // }
  async function submitApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accepted) return;

    const application_id = localStorage.getItem("application_id");

    try {
      const response = await fetch("/api/save-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: application_id }),
      });

      const result = await response.json();
      if (result.success) {
        router.push(`/${locale}/apply/completed`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit agreement.");
    }
  }

  const steps = [
    { number: 1, label: t("steps.general"), active: false },
    { number: 2, label: t("steps.kyc"), active: false },
    { number: 3, label: t("steps.scheme"), active: false },
    { number: 4, label: t("steps.upload"), active: false },
    { number: 5, label: t("steps.agreement"), active: true },
    { number: 6, label: t("steps.completed"), active: false },
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

      {/* Container */}
      <div
        style={{
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            color: "#3D4B9C",
            fontSize: "1.8rem",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          {t("title")}
        </h2>

        <p style={{ textAlign: "center", color: "#555", marginBottom: "1.5rem" }}>
          {t("subtitle")}
        </p>

        {/* Agreement box */}
        <div
          style={{
            border: "1px solid #e6e6e6",
            borderRadius: "10px",
            padding: "16px",
            background: "#fafafa",
            maxHeight: "260px",
            overflowY: "auto",
            lineHeight: 1.6,
            color: "#333",
          }}
        >
          <p style={{ marginTop: 0 }}>{t("content.p1")}</p>
          <p>{t("content.p2")}</p>
          <p>{t("content.p3")}</p>
          <ul style={{ paddingLeft: "18px" }}>
            <li>{t("content.li1")}</li>
            <li>{t("content.li2")}</li>
            <li>{t("content.li3")}</li>
          </ul>
          <p style={{ marginBottom: 0 }}>{t("content.p4")}</p>
        </div>

        <form onSubmit={submitApplication} style={{ marginTop: "1.5rem" }}>
          <label style={{ display: "flex", gap: "10px", alignItems: "center", color: "#222" }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>{t("acceptText")}</span>
          </label>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button type="button" onClick={goBack} style={secondaryButtonStyle}>
              {t("back")}
            </button>

            <button type="submit" disabled={!accepted} style={accepted ? buttonStyle : disabledButtonStyle}>
              {t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  flex: 1,
  background: "#3D4B9C",
  color: "#fff",
  padding: "1rem 1.25rem",
  border: "none",
  borderRadius: "8px",
  fontSize: "1.05rem",
  fontWeight: "bold",
  cursor: "pointer",
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#B9BEDD",
  cursor: "not-allowed",
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: 1,
  background: "#E9E9EF",
  color: "#111",
  padding: "1rem 1.25rem",
  border: "none",
  borderRadius: "8px",
  fontSize: "1.05rem",
  fontWeight: "bold",
  cursor: "pointer",
};

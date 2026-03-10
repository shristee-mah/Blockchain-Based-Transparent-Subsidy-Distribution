"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export default function SchemePage() {
  const t = useTranslations("SchemeV2");
  const router = useRouter();
  const { locale } = useParams() as { locale: string };

  const [schemes, setSchemes] = useState({
    fertilizers: true,
    seed: false,
    equipment: false,
    livestock: false,
  });

  const [previousRecord, setPreviousRecord] = useState("");
  const [declaration, setDeclaration] = useState(false);

  function toggleScheme(key: keyof typeof schemes) {
    setSchemes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function goBack() {
    router.push(`/${locale}/apply/kyc`);
  }

  // function onSubmit(e: React.FormEvent) {
  //   e.preventDefault();
  //   router.push(`/${locale}/apply/upload`);
  // }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const application_id = Number(localStorage.getItem("application_id"));

    const response = await fetch("/api/save-scheme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: application_id,
        scheme_name: (Object.keys(schemes) as (keyof typeof schemes)[])
          .filter((key) => schemes[key]),
        previous_subsidy: previousRecord,
        declaration: declaration
      }),
    });

    const data = await response.json();
    console.log(data);
    router.push(`/${locale}/apply/upload`);
  }



  const steps = [
    { number: 1, label: t("steps.general"), active: false },
    { number: 2, label: t("steps.kyc"), active: false },
    { number: 3, label: t("steps.scheme"), active: true },
    { number: 4, label: t("steps.upload"), active: false },
    { number: 5, label: t("steps.agreement"), active: false },
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
      {/* Stepper*/}
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

      {/* Card (match KYC exactly) */}
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
            marginBottom: "2rem",
            textAlign: "center",
            // fontWeight:"800",
          }}
        >
          {t("title")}
        </h2>

        <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} onSubmit={onSubmit}>
          {/* Scheme applying for */}
          <div>
            <label style={labelStyle}>
              {t("schemeApplyingFor")} <span style={{ color: "red" }}>*</span>
            </label>

            <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
              <label style={checkRowStyle}>
                <input
                  type="checkbox"
                  checked={schemes.fertilizers}
                  onChange={() => toggleScheme("fertilizers")}
                />
                {t("fertilizers")}
              </label>

              <label style={checkRowStyle}>
                <input type="checkbox" checked={schemes.seed} onChange={() => toggleScheme("seed")} />
                {t("seed")}
              </label>

              <label style={checkRowStyle}>
                <input
                  type="checkbox"
                  checked={schemes.equipment}
                  onChange={() => toggleScheme("equipment")}
                />
                {t("equipment")}
              </label>

              <label style={checkRowStyle}>
                <input
                  type="checkbox"
                  checked={schemes.livestock}
                  onChange={() => toggleScheme("livestock")}
                />
                {t("livestock")}
              </label>
            </div>
          </div>

          {/* Previous subsidy record */}
          <div>
            <label style={labelStyle}>{t("previousSubsidyRecord")}</label>
            <textarea
              value={previousRecord}
              onChange={(e) => setPreviousRecord(e.target.value)}
              placeholder={t("previousSubsidyPlaceholder")}
              style={{
                width: "100%",
                minHeight: "90px",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "1rem",
                background: "#fff",
                color: "#2c2c2c",
                marginTop: "0.5rem",
              }}
            />
          </div>

          {/* Declaration */}
          <div>
            <label style={labelStyle}>
              {t("declarationTitle")} <span style={{ color: "red" }}>*</span>
            </label>

            <label style={{ ...checkRowStyle, marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                required
              />
              {t("declarationText")}
            </label>
          </div>

          {/* Buttons (match KYC spacing/size) */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={goBack} style={secondaryButtonStyle}>
              {t("back")}
            </button>

            <button type="submit" style={primaryButtonStyle}>
              {t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  color: "#3D4B9C",
  fontWeight: "bold",
  display: "block",
  marginBottom: "0.25rem",
};

const checkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "1rem",
  color: "#2c2c2c",
};

const primaryButtonStyle: React.CSSProperties = {
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

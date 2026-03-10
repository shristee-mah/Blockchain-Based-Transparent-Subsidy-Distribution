"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";


type UploadKey =
  | "farmerId"
  | "photo"
  | "citizenshipFront"
  | "citizenshipBack"
  | "lalpurja";

export default function UploadPage() {
  const t = useTranslations("UploadV2");
  const router = useRouter();
  const { locale } = useParams() as { locale: string };

  const [files, setFiles] = useState<Record<UploadKey, File | null>>({
    farmerId: null,
    photo: null,
    citizenshipFront: null,
    citizenshipBack: null,
    lalpurja: null,
  });
  const [error, setError] = useState<string | null>(null);


  function setFile(key: UploadKey, file: File | null) {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }

  // function goBack() {
  //   router.push(`/${locale}/apply/scheme`);
  // }
  function goBack() {
    router.push(`/${locale}/apply/scheme`);
  }

  async function uploadFile(file: File, docType: string) {
    const application_id = localStorage.getItem("application_id");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("application_id", application_id!);
    formData.append("doc_type", docType);

    const response = await fetch("/api/upload-documents", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!result.success) throw new Error("Upload failed");
    return result.hash;
  }

  // function onSubmit(e: React.FormEvent) {
  //   e.preventDefault();

  //   const missing = items.filter((item) => item.required && !files[item.key]);

  //   if (missing.length > 0) {
  //     setError("Please upload all required documents.");
  //     return;
  //   }

  //   setError(null);
  //   router.push(`/${locale}/apply/agreement`);
  // }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const missing = items.filter((item) => item.required && !files[item.key]);
    if (missing.length > 0) {
      setError("Please upload all required documents.");
      return;
    }

    setError(null);

    try {
      if (files.farmerId) await uploadFile(files.farmerId, "farmer_id");
      if (files.photo) await uploadFile(files.photo, "photo");
      if (files.citizenshipFront) await uploadFile(files.citizenshipFront, "citizenship_front");
      if (files.citizenshipBack) await uploadFile(files.citizenshipBack, "citizenship_back");
      if (files.lalpurja) await uploadFile(files.lalpurja, "lalpurja");

      router.push(`/${locale}/apply/agreement`);
    } catch (error) {
      console.error(error);
      setError("File upload failed.");
    }
  }

  const steps = [
    { number: 1, label: t("steps.general"), active: false },
    { number: 2, label: t("steps.kyc"), active: false },
    { number: 3, label: t("steps.scheme"), active: false },
    { number: 4, label: t("steps.upload"), active: true },
    { number: 5, label: t("steps.agreement"), active: false },
    { number: 6, label: t("steps.completed"), active: false },
  ];

  const items: Array<{ key: UploadKey; label: string; required?: boolean }> = [
    { key: "farmerId", label: t("farmerId"), required: true },
    { key: "photo", label: t("photo"), required: true },
    { key: "citizenshipFront", label: t("citizenshipFront"), required: true },
    { key: "citizenshipBack", label: t("citizenshipBack"), required: true },
    { key: "lalpurja", label: t("lalpurja"), required: true },
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
          <div
            key={step.number}
            style={{ display: "flex", alignItems: "center" }}
          >
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

      {/* Card */}
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
          }}
        >
          {t("title")}
        </h2>

        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: "2rem" }}>
            {items.map((item) => (
              <UploadRow
                key={item.key}
                label={item.label}
                required={item.required}
                file={files[item.key]}
                onPick={(f) => setFile(item.key, f)}
                uploadedText={t("uploaded")}
                uploadBtn={t("uploadBtn")}
              />
            ))}
          </div>

          {error && (
            <div style={{ color: "red", marginTop: "1rem", fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "2.25rem" }}>
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

function UploadRow({
  label,
  required,
  file,
  onPick,
  uploadedText,
  uploadBtn,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onPick: (file: File | null) => void;
  uploadedText: string;
  uploadBtn: string;
}) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "16px",
        alignItems: "start",
      }}
    >
      <div>
        <div style={{ color: "#3D4B9C", fontWeight: 600, fontSize: "1.1rem" }}>
          {label} {required && <span style={{ color: "red" }}>*</span>}{" "}
          {file && (
            <span
              style={{ color: "green", fontWeight: 900, marginLeft: "6px" }}
            >
              ✓
            </span>
          )}
        </div>

        {file && (
          <div style={{ marginTop: "8px", color: "green", fontSize: "1rem" }}>
            {uploadedText}: {file.name}
          </div>
        )}
      </div>

      {/* Hidden file input + visible button */}
      <div style={{ textAlign: "right" }}>
        <input
          id={inputId}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <label htmlFor={inputId} style={uploadBtnStyle}>
          {uploadBtn}
        </label>
      </div>
    </div>
  );
}

const uploadBtnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 18px",
  borderRadius: "8px",
  border: "2px solid #3D4B9C",
  color: "#3D4B9C",
  fontWeight: 600,
  cursor: "pointer",
  userSelect: "none",
  background: "#fff",
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

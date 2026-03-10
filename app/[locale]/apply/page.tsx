"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export default function ApplyPage() {
  const t = useTranslations("Apply");
  const router = useRouter();
  const { locale } = useParams() as { locale: string };

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    gender: "",
    phone: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault();
  //   router.push(`/${locale}/apply/kyc`);
  // }
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const data = {
      first_name: form.firstName,
      middle_name: form.middleName,
      last_name: form.lastName,
      dob_bs: form.dob,
      gender: form.gender,
      phone: form.phone,
    };

    try {
      const response = await fetch("/api/save-general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      localStorage.setItem("application_id", result.application_id);
      router.push(`/${locale}/apply/kyc`);

    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  const steps = [
    { number: 1, label: t("steps.general"), active: true },
    { number: 2, label: t("steps.kyc"), active: false },
    { number: 3, label: t("steps.scheme"), active: false },
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

      {/* Form Container */}
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

        <form
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          onSubmit={handleSubmit}
        >
          {/* Name Row */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>
                {t("firstName")} <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder={t("firstNamePlaceholder")}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>{t("middleName")}</label>
              <input
                type="text"
                name="middleName"
                value={form.middleName}
                onChange={handleChange}
                placeholder={t("middleNamePlaceholder")}
                style={inputStyle}
              />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>
                {t("lastName")} <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder={t("lastNamePlaceholder")}
                required
                style={inputStyle}
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label style={labelStyle}>
              {t("dob")} <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              placeholder={t("dobPlaceholder")}
              required
              style={inputStyle}
            />
          </div>

          {/* Gender */}
          <div>
            <label style={labelStyle}>
              {t("gender")} <span style={{ color: "red" }}>*</span>
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="">{t("genderSelect")}</option>
              <option value="female">{t("genderFemale")}</option>
              <option value="male">{t("genderMale")}</option>
              <option value="others">{t("genderOther")}</option>
            </select>
          </div>

          {/* Phone Number */}
          <div>
            <label style={labelStyle}>
              {t("phone")} <span style={{ color: "red" }}>*</span>
            </label>

            <div style={{ display: "flex", alignItems: "center", width: "100%", }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "6px 0 0 6px",
                  padding: " 0.75rem",
                  fontSize: "1rem",
                  color: "#2c2c2c",
                  borderRight: "none",
                  height: "48px",
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",

                }}
              >
                <span style={{ fontSize: "1.25rem", marginRight: "0.5rem" }} aria-hidden>
                  🇳🇵
                </span>
                +977
              </span>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder={t("phonePlaceholder")}
                required
                style={{
                  ...inputStyle,
                  borderRadius: "0 6px 6px 0",
                  borderLeft: "none",
                  flex: 1,
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" style={buttonStyle}>
            {t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  color: "#3D4B9C",
  fontWeight: "bold",
  display: "block",
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "48px",
  padding: "0.75rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "1rem",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  background: "#3D4B9C",
  color: "#fff",
  padding: "1rem 2rem",
  border: "none",
  borderRadius: "8px",
  fontSize: "1.1rem",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "1rem",
};

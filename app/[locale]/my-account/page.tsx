"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BLUE = "#3D4B9C";

export default function MyAccountPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit phone number.");
      return;
    }
    setPhoneError("");
    setStep("otp");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleResend = () => {
    setOtp(["", "", "", ""]);
    otpRefs[0].current?.focus();
  };

  const handleVerify = () => {
    router.push(`/${locale}/my-account/dashboard?phone=${encodeURIComponent(phone)}`);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F0EAD6",
        display: "grid",
        placeItems: "center",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "48px 40px",
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          textAlign: "center",
        }}
      >
        <img
          src="/nepal-emblem.png"
          alt="Nepal Government Emblem"
          style={{
            width: 80,
            height: 80,
            objectFit: "contain",
            marginBottom: 20,
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        {/* ── STEP 1: Phone ── */}
        {step === "phone" && (
          <>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: BLUE,
                margin: "0 0 28px 0",
              }}
            >
              Enter your Mobile Number
            </h1>

            <form onSubmit={handlePhoneSubmit}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: `2px solid ${phoneError ? "#dc2626" : BLUE}`,
                  borderRadius: "10px",
                  overflow: "hidden",
                  marginBottom: phoneError ? "8px" : "24px",
                }}
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(val);
                    if (phoneError) setPhoneError("");
                  }}
                  placeholder="Mobile No."
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    border: "none",
                    outline: "none",
                    fontSize: "16px",
                    color: "#333",
                    background: "transparent",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: BLUE,
                    border: "none",
                    padding: "0 18px",
                    height: "52px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
              {phoneError && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#dc2626",
                    margin: "0 0 20px 0",
                    textAlign: "left",
                  }}
                >
                  {phoneError}
                </p>
              )}
            </form>

            <button
              onClick={() => router.back()}
              style={{
                background: "none",
                border: "none",
                color: BLUE,
                fontSize: "13px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              ← Back
            </button>
          </>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === "otp" && (
          <>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: BLUE,
                margin: "0 0 28px 0",
              }}
            >
              Enter your OTP Number
            </h1>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "14px",
                marginBottom: "28px",
              }}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: "58px",
                    height: "62px",
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: 600,
                    border: `2px solid ${BLUE}`,
                    borderRadius: "10px",
                    outline: "none",
                    color: BLUE,
                  }}
                />
              ))}
            </div>

            <p
              style={{
                fontSize: "14px",
                color: "#555",
                lineHeight: 1.6,
                margin: "0 0 20px 0",
              }}
            >
              A message with a verification code has been sent to your devices.
              Enter the code to continue.
            </p>

            <button
              onClick={handleResend}
              style={{
                background: "none",
                border: "none",
                color: BLUE,
                fontSize: "14px",
                cursor: "pointer",
                marginBottom: "28px",
                display: "block",
                width: "100%",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              Didn't get a verification code? Resend code
            </button>

            <button
              onClick={handleVerify}
              style={{
                background: BLUE,
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "13px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
                marginBottom: "16px",
              }}
            >
              Verify
            </button>

            <button
              onClick={() => {
                setStep("phone");
                setOtp(["", "", "", ""]);
                setPhoneError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: BLUE,
                fontSize: "13px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Change number
            </button>
          </>
        )}
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // 🔐 Dummy credentials
    if (username === "admin" && password === "admin123") {
      router.push("/processing/dashboard");
    } else {
      alert("Invalid username or password");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0EAD6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#fff",
          padding: "2.5rem",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#3D4B9C",
            marginBottom: "0.5rem",
          }}
        >
          Processor Login
        </h1>

        <p style={{ textAlign: "center", marginBottom: "2rem" }}>
          Enter your credentials to continue
        </p>

        <label style={{ fontWeight: 700 }}>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={inputStyle}
        />

        <label style={{ fontWeight: 700 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button type="submit" style={buttonStyle}>
          Login
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          style={backStyle}
        >
          ← Back to role selection
        </button>
      </form>
    </div>
  );
}

/* ---------- styles ---------- */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginTop: "6px",
  marginBottom: "16px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  background: "#3D4B9C",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "10px",
};

const backStyle: React.CSSProperties = {
  marginTop: "14px",
  background: "transparent",
  border: "none",
  color: "#3D4B9C",
  cursor: "pointer",
  width: "100%",
};

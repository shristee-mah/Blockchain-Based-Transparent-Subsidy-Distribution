"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getRoleDisplayName, type Role } from "@/lib/auth";

export default function RoleLoginRolePage() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validRoles: Role[] = ["admin", "processing", "transportation", "distribution"];
  const roleMap: Record<string, Role> = {
    admin: "admin",
    processing: "processing",
    transportation: "transportation",
    distribution: "distribution",
  };

  const currentRole = roleMap[role];

  useEffect(() => {
    if (!currentRole || !validRoles.includes(currentRole)) {
      router.push("/role-login");
    }
  }, [currentRole, router]);

  if (!currentRole || !validRoles.includes(currentRole)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Also set localStorage for convenience
      if (typeof window !== "undefined") {
        localStorage.setItem("session_role", data.user.role);
        localStorage.setItem("session_user", data.user.username);
      }

      // Verify the user's role matches the expected role
      if (data.user.role !== currentRole) {
        setError(`Invalid credentials for ${getRoleDisplayName(currentRole)}`);
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push(`/dashboard/${currentRole}`);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0EAD6",
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
          background: "#fff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            color: "#3D4B9C",
            fontSize: "1.8rem",
            marginBottom: "0.5rem",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {getRoleDisplayName(currentRole)} Login
        </h1>
        <p
          style={{
            color: "#666",
            textAlign: "center",
            marginBottom: "2rem",
            fontSize: "0.9rem",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Enter your credentials to continue
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem",
                background: "#fee",
                border: "1px solid #fcc",
                borderRadius: "6px",
                color: "#c33",
                fontSize: "0.9rem",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              style={{
                color: "#3D4B9C",
                fontWeight: "bold",
                display: "block",
                marginBottom: "0.5rem",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "1rem",
                fontFamily: "Arial, sans-serif",
              }}
            />
          </div>

          <div>
            <label
              style={{
                color: "#3D4B9C",
                fontWeight: "bold",
                display: "block",
                marginBottom: "0.5rem",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "1rem",
                fontFamily: "Arial, sans-serif",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#ccc" : "#3D4B9C",
              color: "#fff",
              padding: "1rem",
              border: "none",
              borderRadius: "8px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link
            href="/role-login"
            style={{
              color: "#3D4B9C",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontFamily: "Arial, sans-serif",
            }}
          >
            ← Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
}

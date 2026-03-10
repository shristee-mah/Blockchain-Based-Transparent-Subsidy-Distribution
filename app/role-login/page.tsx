"use client";

import Link from "next/link";

export default function RoleLoginPage() {
  const roles = [
    {
      path: "admin",
      name: "Admin",
      description: "Administrative access to the system",
    },
    {
      path: "processing",
      name: "Processing Node",
      description: "Process subsidy applications",
    },
    {
      path: "transportation",
      name: "Transportation Node",
      description: "Manage transportation logistics",
    },
    {
      path: "distribution",
      name: "Distribution Node",
      description: "Handle subsidy distribution",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0EAD6",
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
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
            fontSize: "2rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          Login as
        </h1>
        <p
          style={{
            color: "#666",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Select your role to continue
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {roles.map((role) => (
            <Link
              key={role.path}
              href={`/role-login/${role.path}`}
              style={{
                display: "block",
                padding: "1.5rem",
                border: "2px solid #3D4B9C",
                borderRadius: "8px",
                textDecoration: "none",
                color: "#3D4B9C",
                transition: "all 0.2s",
                background: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#3D4B9C";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = "#3D4B9C";
              }}
            >
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                {role.name}
              </h3>
              <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                {role.description}
              </p>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link
            href="/"
            style={{
              color: "#3D4B9C",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

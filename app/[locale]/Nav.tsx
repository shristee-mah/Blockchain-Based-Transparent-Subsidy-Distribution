"use client";

import { useTranslations } from "next-intl";

export default function Nav({ locale }: { locale: string }) {
  const t = useTranslations("Nav");

  return (
    <nav
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: "none",
        boxShadow: "none",
        padding: "0 2rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 100,
        fontFamily: "Arial, sans-serif", 
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 1,
        }}
      />

      <span
        style={{
          fontWeight: 700,
          fontSize: "1.5rem",
          color: "#F0EAD6",
          letterSpacing: "1px",
          position: "relative",
          zIndex: 2,
          fontFamily: "Arial, sans-serif", 
        }}
      >
        निश्चित
      </span>

      <div
        style={{
          display: "flex",
          gap: "2rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        <a
          href="/"
          style={{ 
            color: "#F0EAD6", 
            fontWeight: 500, 
            textDecoration: "none",
            fontFamily: "Arial, sans-serif" 
          }}
        >
          {t("home")}
        </a>

        <a
          href={`/${locale}/apply`}
          style={{ 
            color: "#F0EAD6", 
            fontWeight: 500, 
            textDecoration: "none",
            fontFamily: "Arial, sans-serif" 
          }}
        >
          {t("apply")}
        </a>

        <a
          href={`/${locale}/admin`}
          style={{ 
            color: "#F0EAD6", 
            fontWeight: 500, 
            textDecoration: "none",
            fontFamily: "Arial, sans-serif" 
          }}
        >
          {t("admin")}
        </a>
      </div>
    </nav>
  );
}

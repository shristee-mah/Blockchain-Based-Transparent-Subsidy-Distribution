"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import en from "../../messages/en.json";
import ne from "../../messages/ne.json";

type Locale = "en" | "ne";

/* ---------- Language Toggle Component ---------- */
function LanguageToggle({
  locale,
  onToggle,
}: {
  locale: Locale;
  onToggle: () => void;
}) {
  const isNep = locale === "ne";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 10px",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.6)",
        background: "rgba(0,0,0,0.25)",
        color: "white",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
      }}
    >
      <span
        style={{ fontSize: "12px", fontWeight: 800, opacity: isNep ? 0.5 : 1 }}
      >
        EN
      </span>

      {/* Switch */}
      <span
        style={{
          width: "44px",
          height: "22px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.35)",
          position: "relative",
          display: "inline-block",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: isNep ? "24px" : "2px",
            width: "18px",
            height: "18px",
            borderRadius: "999px",
            background: "white",
            transition: "left 180ms ease",
          }}
        />
      </span>

      <span
        style={{ fontSize: "12px", fontWeight: 800, opacity: isNep ? 1 : 0.5 }}
      >
        NEP
      </span>
    </button>
  );
}

/* ---------- Login Dropdown Component ---------- */
function LoginDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loginLinks = [
    { href: "/role-login/admin", label: "Admin Login" },
    { href: "/role-login/processing", label: "Processor Login" },
    { href: "/role-login/transportation", label: "Transporter Login" },
    { href: "/role-login/distribution", label: "Distributor Login" },
  ];

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: 99999,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        style={{
          background: "rgba(255, 255, 255, 0.10)",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          color: "white",
          padding: "6px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          backdropFilter: "blur(6px)",
          position: "relative",
          zIndex: 99999,
        }}
      >
        Login as {isOpen ? "▲" : "▼"}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            minWidth: "240px",
            zIndex: 999999,
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          {loginLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              style={{
                display: "block",
                padding: "12px 14px",
                color: "#111",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f4f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Landing Page ---------- */
export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams() as { locale: string };

  const locale: Locale = params.locale === "ne" ? "ne" : "en";

  const t = useMemo(() => {
    const dict = locale === "en" ? en : ne;
    return dict.Landing;
  }, [locale]);

  const brandText = locale === "ne" ? "निश्चित" : t.brand;

  const hrefs = {
    home: `/${locale}`,
    myAccount: `/${locale}/my-account`,
    apply: `/${locale}/apply`,
    about: `/${locale}/about`,
  };

  function handleToggleLanguage() {
    const nextLocale: Locale = locale === "en" ? "ne" : "en";
    const pathWithoutLocale = pathname.replace(/^\/(en|ne)/, "") || "/";
    router.push(`/${nextLocale}${pathWithoutLocale}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/landing-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.9)",
          transform: "scale(1.02)",
          zIndex: 0,
        }}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Navbar */}
      <header
        style={{
          position: "relative",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          color: "white",
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: "0.5px" }}>
          {brandText}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <nav style={{ display: "flex", gap: "18px", fontSize: "14px" }}>
            <Link
              href={hrefs.home}
              style={{ color: "white", textDecoration: "none" }}
            >
              {t.home}
            </Link>
            <Link
              href={hrefs.myAccount}
              style={{ color: "white", textDecoration: "none" }}
            >
              My Account
            </Link>
            <Link
              href={hrefs.about}
              style={{ color: "white", textDecoration: "none" }}
            >
              {t.about}
            </Link>
          </nav>

          {/* Login as Dropdown */}
          <LoginDropdown />

          {/* Toggle Switch */}
          <LanguageToggle locale={locale} onToggle={handleToggleLanguage} />
        </div>
      </header>

      {/* Hero content */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100vh - 64px)",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
          color: "white",
        }}
      >
        <div style={{ maxWidth: "780px" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1.1,
              fontWeight: 800,
              marginBottom: "16px",
              textShadow: "0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            {t.titleLine1}
            <br />
            <span style={{ fontWeight: 900 }}>{t.titleLine2}</span>
          </h1>

          <Link
            href={hrefs.apply}
            style={{
              display: "inline-block",
              marginTop: "12px",
              background: "white",
              color: "#111",
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: "999px",
              fontWeight: 800,
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
          >
            {t.cta}
          </Link>
        </div>
      </section>
    </main>
  );
}

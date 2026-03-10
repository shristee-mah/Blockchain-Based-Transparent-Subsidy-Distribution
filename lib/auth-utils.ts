"use client";

import { type Role } from "./auth";

export function getSessionFromStorage(): { role: Role | null; user: string | null } {
  if (typeof window === "undefined") {
    return { role: null, user: null };
  }

  const role = localStorage.getItem("session_role") as Role | null;
  const user = localStorage.getItem("session_user");

  return { role, user };
}

export function clearSessionFromStorage(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("session_role");
  localStorage.removeItem("session_user");
}

"use client";
import { usePathname } from "next/navigation";

const isAdmin = (p) => p === "/admin" || (p || "").startsWith("/admin/");

// /admin par site ka Header/Ticker/Footer chhupa deta hai
export function HideOnAdmin({ children }) {
  return isAdmin(usePathname()) ? null : children;
}

export function MainShell({ children }) {
  return <main className={isAdmin(usePathname()) ? "admin-main" : "wrap main"}>{children}</main>;
}
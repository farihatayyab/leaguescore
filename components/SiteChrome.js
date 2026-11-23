"use client";
import { usePathname } from "next/navigation";

const isAdmin = (p) => p === "/admin" || (p || "").startsWith("/admin/");

// Login, register, forgot aur reset password pages: sirf form, header/ticker/footer nahi
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];
const isAuth = (p) => AUTH_PATHS.some((a) => p === a || (p || "").startsWith(a + "/"));

// /admin aur auth pages par site ka Header/Ticker/Footer chhupa deta hai
export function HideOnAdmin({ children }) {
  const p = usePathname();
  return isAdmin(p) || isAuth(p) ? null : children;
}

export function MainShell({ children }) {
  const p = usePathname();
  return <main className={isAdmin(p) || isAuth(p) ? "admin-main" : "wrap main"}>{children}</main>;
}
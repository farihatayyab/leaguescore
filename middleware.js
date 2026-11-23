import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF: state-badalne wali requests (POST/PUT/PATCH/DELETE) sirf apni hi website se aani chahiye.
// Session cookie SameSite=Lax hai (pehli deewar); ye Origin/Sec-Fetch-Site check doosri deewar hai.
function sameOrigin(req) {
  if (SAFE.has(req.method)) return true;
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = new URL(origin).host.toLowerCase();
      if (o === host) return true;
      const app = process.env.NEXT_PUBLIC_APP_URL;
      return !!app && new URL(app).host.toLowerCase() === o;
    } catch {
      return false;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

// /api/auth/*: sirf CSRF check. /admin, /api/admin, /dashboard: valid login session bhi zaroori.
// Role (admin / user) ki asli jaanch database se server mein hoti hai (app/admin/layout.js aur lib/admin.js getAdmin()).
export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  let valid = false;
  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      valid = true;
    } catch {}
  }
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*", "/dashboard/:path*"] };

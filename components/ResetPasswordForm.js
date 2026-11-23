"use client";
import { useState } from "react";
import { validatePassword } from "@/lib/validators";
import PasswordInput from "./PasswordInput";

export default function ResetPasswordForm({ token }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    const problem = validatePassword(pw);
    if (problem) return setError(problem);
    if (pw !== pw2) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw, confirmPassword: pw2 }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Something went wrong.");
      setSuccess(data.message);
      setPw("");
      setPw2("");
      setTimeout(() => window.location.assign("/login?reset=ok"), 2500);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label>New password
        <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password"
          placeholder="At least 8 characters, with a letter and a number" required disabled={!!success} />
      </label>
      <label>Confirm new password
        <PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password"
          placeholder="Repeat the new password" required disabled={!!success} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success} Redirecting to log in…</p>}
      <button className="btn-grad" disabled={loading || !!success}>{loading ? "Please wait..." : "Reset password"}</button>
    </form>
  );
}
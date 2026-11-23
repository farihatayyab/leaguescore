"use client";
import { useState } from "react";
import Link from "next/link";
import { useT } from "./LanguageProvider";
import PasswordInput from "./PasswordInput";
import { validateEmail, validateName, validatePassword, normalizeEmail } from "@/lib/validators";

// mode: "login" | "signup" | "forgot". Teeno pages (/login, /register, /forgot-password) yahi use karte hain.
export default function AuthForm({ mode, notice = "" }) {
  const t = useT();
  const [form, setForm] = useState({ name: "", email: "", password: "", newsletter: true });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(notice);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false); // login/signup ho gaya, redirect ho raha hai

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const email = normalizeEmail(form.email);
    const bad =
      validateEmail(email) ||
      (mode === "signup" && (validateName(form.name) || validatePassword(form.password))) ||
      (mode === "login" && !form.password ? t("connect.pwOld") : null);
    if (bad) return setError(bad);

    setLoading(true);
    try {
      const url = mode === "forgot" ? "/api/auth/forgot-password" : mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "forgot" ? { email } : { ...form, email }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);

      if (mode === "forgot") return setSuccess(data.message);

      setDone(true);
      setSuccess(mode === "login" ? t("connect.okLogin") : t("connect.okSignup"));
      // role ke mutabiq redirect: admin -> /admin, user -> /dashboard
      setTimeout(() => window.location.assign(data.redirect || "/"), 1000);
    } catch {
      setError(t("err.server"));
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? t("connect.wait")
    : mode === "login" ? t("connect.login") : mode === "forgot" ? t("connect.sendLink") : t("connect.create");

  return (
    <div className="auth-page">
      <div className="modal static">
        <div className="modal-logo">League<b>Score</b></div>
        <h1 className="auth-title">
          {mode === "login" ? t("connect.login") : mode === "signup" ? t("connect.signup") : t("connect.forgot")}
        </h1>
        <p className="modal-sub">{mode === "forgot" ? t("connect.forgotSub") : t("connect.sub")}</p>

        <form onSubmit={submit} noValidate>
          {mode === "signup" && (
            <label>{t("connect.name")}
              <input value={form.name} onChange={set("name")} placeholder={t("connect.namePh")} autoComplete="name" required />
            </label>
          )}
          <label>{t("connect.email")}
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" autoComplete="email" required />
          </label>
          {mode !== "forgot" && (
            <label>{t("connect.password")}
              <PasswordInput
                value={form.password}
                onChange={set("password")}
                placeholder={mode === "signup" ? t("connect.pwNew") : t("connect.pwOld")}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </label>
          )}
          {mode === "login" && (
            <div className="row-end">
              <Link href="/forgot-password" className="link-btn">{t("connect.forgot")}</Link>
            </div>
          )}
          {mode === "signup" && (
            <label className="check">
              <input type="checkbox" checked={form.newsletter} onChange={set("newsletter")} />
              {t("connect.newsletter")}
            </label>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}

          <button className="btn-grad" disabled={loading || done}>{submitLabel}</button>
        </form>

        <p className="modal-foot">
          {mode === "login" && (<>{t("connect.newHere")} <Link href="/register">{t("connect.createFree")}</Link></>)}
          {mode === "signup" && (<>{t("connect.haveAcc")} <Link href="/login">{t("connect.login")}</Link></>)}
          {mode === "forgot" && <Link href="/login">{t("connect.backLogin")}</Link>}
        </p>
      </div>
    </div>
  );
}
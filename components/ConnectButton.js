"use client";
import { useEffect, useState } from "react";
import { useT } from "./LanguageProvider";

export default function ConnectButton() {
  const t = useT();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", newsletter: true });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  function switchTab(t) {
    setTab(t);
    setError("");
  }

async function submit(e) {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccess("");
  try {
    const res = await fetch(`/api/auth/${tab === "login" ? "login" : "signup"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);

    setSuccess(tab === "login" ? t("connect.okLogin") : t("connect.okSignup"));
    setTimeout(() => {
      setUser(data.user);
      setOpen(false);
      setSuccess("");
      setForm({ name: "", email: "", password: "", newsletter: true });
    }, 1500);
  } catch {
    setError(t("err.server"));
  } finally {
    setLoading(false);
  }
}

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (user) {
    return (
      <button className="btn-connect" onClick={logout} title={t("connect.logout")}>
        {user.name.split(" ")[0]} · {t("connect.logout")}
      </button>
    );
  }

  return (
    <>
      <button className="btn-connect" onClick={() => setOpen(true)}>{t("connect")}</button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" aria-label={t("close")} onClick={() => setOpen(false)}>✕</button>
            <div className="modal-logo">League<b>Score</b></div>
            <p className="modal-sub">{t("connect.sub")}</p>

            <div className="seg">
              <button type="button" className={tab === "login" ? "on" : ""} onClick={() => switchTab("login")}>{t("connect.login")}</button>
              <button type="button" className={tab === "signup" ? "on" : ""} onClick={() => switchTab("signup")}>{t("connect.signup")}</button>
            </div>

            <form onSubmit={submit}>
              {tab === "signup" && (
                <label>{t("connect.name")}
                  <input value={form.name} onChange={set("name")} placeholder={t("connect.namePh")} required />
                </label>
              )}
              <label>{t("connect.email")}
                <input type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required />
              </label>
              <label>{t("connect.password")}
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder={tab === "signup" ? t("connect.pwNew") : t("connect.pwOld")}
                  minLength={6}
                  required
                />
              </label>

              {tab === "signup" && (
                <label className="check">
                  <input type="checkbox" checked={form.newsletter} onChange={set("newsletter")} />
                  {t("connect.newsletter")}
                </label>
              )}

              {error && <p className="form-error">{error}</p>}

              {success && <p className="form-success">{success}</p>}

           <button className="btn-grad" disabled={loading || !!success}>
                {loading ? t("connect.wait") : tab === "login" ? t("connect.login") : t("connect.create")}
              </button>
            </form>

            <p className="modal-foot">
              {tab === "login" ? t("connect.newHere") : t("connect.haveAcc")}{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); switchTab(tab === "login" ? "signup" : "login"); }}>
                {tab === "login" ? t("connect.createFree") : t("connect.login")}
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

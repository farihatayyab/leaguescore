"use client";
import { useState } from "react";
import { useT } from "./LanguageProvider";

// value English hi rehti hai (admin ko English category milti hai); sirf dikhane wala text translate hota hai
const CATEGORIES = ["Suggestion", "Bug / something is broken", "Wrong score or data", "Other"];

// kind = "contact" ya "feedback"
export default function ContactForm({ kind = "contact" }) {
  const t = useT();
  const [form, setForm] = useState({ name: "", email: "", subject: "", category: CATEGORIES[0], message: "", website: "" });
  const [state, setState] = useState({ busy: false, ok: "", err: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, ok: "", err: "" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kind }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setState({ busy: false, ok: "", err: d.error || t("err.generic") });
      setForm({ name: "", email: "", subject: "", category: CATEGORIES[0], message: "", website: "" });
      setState({ busy: false, ok: d.message || t("cf.thanks"), err: "" });
    } catch {
      setState({ busy: false, ok: "", err: t("err.server") });
    }
  }

  return (
    <form className="cf" onSubmit={submit}>
      <div className="row">
        <label>
          {t("cf.name")}
          <input value={form.name} onChange={set("name")} maxLength={100} required autoComplete="name" />
        </label>
        <label>
          {t("connect.email")} {kind === "feedback" ? t("cf.optional") : ""}
          <input type="email" value={form.email} onChange={set("email")} maxLength={190} required={kind === "contact"} autoComplete="email" />
        </label>
      </div>

      {kind === "contact" ? (
        <label>
          {t("cf.subject")}
          <input value={form.subject} onChange={set("subject")} maxLength={150} required />
        </label>
      ) : (
        <label>
          {t("cf.type")}
          <select value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c, i) => (
              <option key={c} value={c}>{t(`cf.cat${i}`)}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        {t("cf.message")}
        <textarea value={form.message} onChange={set("message")} minLength={10} maxLength={4000} required />
      </label>

      {/* honeypot: insaan ise nahi dekhta, bots bhar dete hain */}
      <label className="hp" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </label>

      {state.ok && <div className="cf-msg ok" role="status">{state.ok}</div>}
      {state.err && <div className="cf-msg err" role="alert">{state.err}</div>}

      <button className="btn-grad inline" disabled={state.busy} style={{ justifySelf: "start" }}>
        {state.busy ? t("cf.sending") : kind === "feedback" ? t("cf.sendFeedback") : t("cf.sendMessage")}
      </button>
    </form>
  );
}

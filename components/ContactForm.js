"use client";
import { useState } from "react";

const CATEGORIES = ["Suggestion", "Bug / something is broken", "Wrong score or data", "Other"];

// kind = "contact" ya "feedback"
export default function ContactForm({ kind = "contact" }) {
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
      if (!res.ok) return setState({ busy: false, ok: "", err: d.error || "Something went wrong. Please try again." });
      setForm({ name: "", email: "", subject: "", category: CATEGORIES[0], message: "", website: "" });
      setState({ busy: false, ok: d.message || "Thank you! Your message has been sent.", err: "" });
    } catch {
      setState({ busy: false, ok: "", err: "Could not reach the server. Please try again." });
    }
  }

  return (
    <form className="cf" onSubmit={submit}>
      <div className="row">
        <label>
          Your name
          <input value={form.name} onChange={set("name")} maxLength={100} required autoComplete="name" />
        </label>
        <label>
          Email {kind === "feedback" ? "(optional)" : ""}
          <input type="email" value={form.email} onChange={set("email")} maxLength={190} required={kind === "contact"} autoComplete="email" />
        </label>
      </div>

      {kind === "contact" ? (
        <label>
          Subject
          <input value={form.subject} onChange={set("subject")} maxLength={150} required />
        </label>
      ) : (
        <label>
          Type of feedback
          <select value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Message
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
        {state.busy ? "Sending…" : kind === "feedback" ? "Send feedback" : "Send message"}
      </button>
    </form>
  );
}

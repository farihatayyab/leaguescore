"use client";
import { useEffect, useState } from "react";

export default function ConnectButton() {
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

    setSuccess(tab === "login" ? "Logged in successfully!" : "Account created successfully!");
    setTimeout(() => {
      setUser(data.user);
      setOpen(false);
      setSuccess("");
      setForm({ name: "", email: "", password: "", newsletter: true });
    }, 1500);
  } catch {
    setError("Could not reach the server. Please try again.");
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
      <button className="btn-connect" onClick={logout} title="Log out">
        {user.name.split(" ")[0]} · Log out
      </button>
    );
  }

  return (
    <>
      <button className="btn-connect" onClick={() => setOpen(true)}>Connect</button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            <div className="modal-logo">League<b>Score</b></div>
            <p className="modal-sub">One free account for scores, favorites and alerts.</p>

            <div className="seg">
              <button type="button" className={tab === "login" ? "on" : ""} onClick={() => switchTab("login")}>Log in</button>
              <button type="button" className={tab === "signup" ? "on" : ""} onClick={() => switchTab("signup")}>Sign up</button>
            </div>

            <form onSubmit={submit}>
              {tab === "signup" && (
                <label>Name
                  <input value={form.name} onChange={set("name")} placeholder="Your name" required />
                </label>
              )}
              <label>Email
                <input type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required />
              </label>
              <label>Password
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder={tab === "signup" ? "At least 6 characters" : "Your password"}
                  minLength={6}
                  required
                />
              </label>

              {tab === "signup" && (
                <label className="check">
                  <input type="checkbox" checked={form.newsletter} onChange={set("newsletter")} />
                  Keep me posted with news and updates
                </label>
              )}

              {error && <p className="form-error">{error}</p>}

              {success && <p className="form-success">{success}</p>}

           <button className="btn-grad" disabled={loading || !!success}>
                {loading ? "Please wait..." : tab === "login" ? "Log in" : "Create account"}
              </button>
            </form>

            <p className="modal-foot">
              {tab === "login" ? "New here? " : "Already have an account? "}
              <a href="#" onClick={(e) => { e.preventDefault(); switchTab(tab === "login" ? "signup" : "login"); }}>
                {tab === "login" ? "Create a free account" : "Log in"}
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

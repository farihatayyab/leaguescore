"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { useToast } from "./Toast";
import { TZ } from "@/lib/format";

const fmt = (iso) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ });

export default function MessagesList({ items }) {
  const router = useRouter();
  const [toastNode, toast] = useToast();
  const [kind, setKind] = useState("all");
  const [open, setOpen] = useState(null);

  const list = items.filter((m) => kind === "all" || m.kind === kind);
  const unread = items.filter((m) => !m.is_read).length;

  async function act(fn, ok) {
    try {
      await fn();
      if (ok) toast(ok);
      router.refresh();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Messages</h1>
          <p>{items.length} total · {unread} unread. Contact aur Feedback forms se aaye messages.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "contact", "feedback"].map((k) => (
            <button key={k} className={`adm-btn sm ${kind === k ? "" : "ghost"}`} onClick={() => setKind(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
          {unread > 0 && (
            <button className="adm-btn sm ghost" onClick={() => act(() => api("/api/admin/messages", "PUT", { all: true }), "Sab read mark ho gaye.")}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="adm-panel">
        {!list.length && <div className="adm-empty">No messages yet.</div>}
        {list.map((m) => (
          <div key={m.id} className="adm-li" style={{ alignItems: "flex-start", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ whiteSpace: "normal" }}>
                  {!m.is_read && <span style={{ color: "var(--brand)" }}>● </span>}
                  {m.subject || m.category || "Feedback"}
                </b>
                <small>
                  {m.name}
                  {m.email ? ` · ${m.email}` : ""} · {m.kind} · {fmt(m.created_at)}
                </small>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="adm-btn sm ghost" onClick={() => setOpen(open === m.id ? null : m.id)}>
                  {open === m.id ? "Hide" : "Read"}
                </button>
                {m.email && (
                  <a className="adm-btn sm ghost" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Your feedback"))}`}>
                    Reply
                  </a>
                )}
                <button className="adm-btn sm ghost" onClick={() => act(() => api("/api/admin/messages", "PUT", { id: m.id, read: !m.is_read }))}>
                  {m.is_read ? "Mark unread" : "Mark read"}
                </button>
                <button
                  className="adm-btn sm danger"
                  onClick={() => confirm("Delete this message?") && act(() => api(`/api/admin/messages?id=${m.id}`, "DELETE"), "Deleted.")}
                >
                  Delete
                </button>
              </div>
            </div>
            {open === m.id && (
              <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, maxWidth: "100%", wordBreak: "break-word" }}>
                {m.message}
              </p>
            )}
          </div>
        ))}
      </div>
      {toastNode}
    </>
  );
}

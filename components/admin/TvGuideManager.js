"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "./api";
import { useToast } from "./Toast";

const when = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "Never";

export default function TvGuideManager({ sources }) {
  const router = useRouter();
  const [toastNode, toast] = useToast();
  const [name, setName] = useState("TV Guide");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null); // "add" | "<id>" | null
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ name: "", url: "" });

  // While a sync is running, refresh the status every 3 seconds
  const syncing = sources.some((s) => s.syncing);
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [syncing, router]);

  async function run(key, fn, ok) {
    setBusy(key);
    try {
      const d = await fn();
      toast(d?.started ? `${ok} — data is loading in the background; the status is shown below.` : ok);
      router.refresh();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusy(null);
  }

  const add = (e) => {
    e.preventDefault();
    run("add", async () => {
      const d = await api("/api/admin/tv-guide", "POST", { name, url });
      setUrl("");
      return d;
    }, "TV Guide link added");
  };

  const save = (s) =>
    run(String(s.id), async () => {
      const d = await api("/api/admin/tv-guide", "PUT", { id: s.id, ...edit });
      setEditId(null);
      return d;
    }, "Link updated");

  const del = (s) => {
    if (!confirm(`Delete "${s.name}"?\nAll channels and programmes from this link will be removed from the website.`)) return;
    run(String(s.id), () => api(`/api/admin/tv-guide?id=${s.id}`, "DELETE"), "Link deleted");
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>TV Guide</h1>
          <p>Add an EPG (XMLTV) link here. The backend downloads the data, stores it in the database and shows it on the website’s “TV Guide” page. The data refreshes automatically every 6 hours.</p>
        </div>
        <Link href="/tv-guide" target="_blank" className="adm-btn ghost"><Icon name="link" size={16} /> View TV Guide</Link>
      </div>

      <section className="adm-panel adm-panel-b" style={{ marginBottom: 18 }}>
        <form onSubmit={add} className="adm-fields">
          <div className="adm-field">
            <label htmlFor="tvn">Name</label>
            <input id="tvn" className="adm-in" value={name} maxLength={120} required onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="tvu">EPG link (.xml / .xml.gz) or local file path, e.g. C:\epg\guide.xml</label>
            <input id="tvu" className="adm-in" type="text" value={url} required
              placeholder="https://api.m3u-editor.net/v1/epg/public/…xml" onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div>
            <button className="adm-btn" disabled={!!busy}>
              <Icon name="plus" size={16} /> Add link
            </button>
          </div>
        </form>
      </section>

      <section className="adm-panel">
        {sources.map((s) => (
          <div className="adm-cat" key={s.id} style={{ alignItems: "flex-start" }}>
            <div className="adm-cat-info" style={{ minWidth: 0 }}>
              {editId === s.id ? (
                <div className="adm-fields">
                  <input className="adm-in" value={edit.name} maxLength={120} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  <input className="adm-in" type="text" value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} />
                  <div className="adm-actions" style={{ justifyContent: "flex-start" }}>
                    <button className="adm-btn sm" disabled={!!busy} onClick={() => save(s)}>Save &amp; sync</button>
                    <button className="adm-btn ghost sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <b>{s.name} {" "}
                    <span className={`adm-badge ${s.active ? "ok" : "muted"}`}>{s.active ? "Active" : "Hidden"}</span>
                  </b>
                  <small style={{ wordBreak: "break-all", display: "block" }}>{s.url}</small>
                  <small>
                    {s.channel_count} channels · {s.programme_count} programmes · Last sync: {when(s.last_synced_at)}
                  </small>
                  {s.last_status.startsWith("error") && (
                    <small style={{ display: "block", color: "var(--live)" }}>{s.last_status}</small>
                  )}
                  {s.syncing && <small style={{ display: "block", color: "var(--brand)" }}>{s.last_status || "syncing…"}</small>}
                </>
              )}
            </div>
            {editId !== s.id && (
              <div className="adm-actions">
                <button className="adm-btn sm" disabled={!!busy || s.syncing} onClick={() => run(String(s.id), () => api("/api/admin/tv-guide", "PUT", { id: s.id, action: "sync" }), "Sync started")}>
                  {s.syncing ? "Syncing…" : "Sync now"}
                </button>
                <button className="adm-btn ghost sm" disabled={!!busy} onClick={() => run(String(s.id), () => api("/api/admin/tv-guide", "PUT", { id: s.id, active: !s.active }), s.active ? "Link hidden from the website" : "Link is visible on the website again")}>
                  {s.active ? "Hide" : "Show"}
                </button>
                <button className="adm-btn ghost icon" disabled={!!busy} title="Edit" onClick={() => { setEditId(s.id); setEdit({ name: s.name, url: s.url }); }}><Icon name="edit" size={16} /></button>
                <button className="adm-btn danger icon" disabled={!!busy} title="Delete" onClick={() => del(s)}><Icon name="trash" size={16} /></button>
              </div>
            )}
          </div>
        ))}
        {!sources.length && <p className="adm-empty">No EPG link added yet.</p>}
      </section>
      {toastNode}
    </>
  );
}
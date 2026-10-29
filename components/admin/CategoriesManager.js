"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "./api";
import { useToast } from "./Toast";

export default function CategoriesManager({ cats, counts }) {
  const router = useRouter();
  const [toastNode, toast] = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  async function run(fn, ok) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      router.refresh();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  const add = (e) => {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/categories", "POST", { name });
      setName("");
    }, "Category add ho gayi. Ab ye news ke sub navbar me dikhegi.");
  };

  const rename = (c) =>
    run(async () => {
      await api("/api/admin/categories", "PUT", { id: c.id, name: editName });
      setEditId(null);
    }, "Category renamed.");

  const del = (c) => {
    if (!confirm(`Delete "${c.name}"?\nIs ki news rahegi, bas category khatam ho jayegi.`)) return;
    run(() => api(`/api/admin/categories?id=${c.id}`, "DELETE"), "Category deleted.");
  };

  const move = (i, dir) => {
    const ids = cats.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => api("/api/admin/categories", "PUT", { order: ids }));
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Categories</h1>
          <p>Jo naam yahan likhoge wahi news page ke sub navbar me aayega. 7 se zyada hon to “More” me chali jayengi.</p>
        </div>
      </div>

      <section className="adm-panel adm-panel-b" style={{ marginBottom: 18 }}>
        <form onSubmit={add} className="adm-add">
          <input className="adm-in" type="text" value={name} maxLength={80} required
            placeholder="Naya category naam, e.g. Premier League" onChange={(e) => setName(e.target.value)} />
          <button className="adm-btn" disabled={busy}><Icon name="plus" size={16} /> Add category</button>
        </form>
      </section>

      <section className="adm-panel">
        {cats.map((c, i) => (
          <div className="adm-cat" key={c.id}>
            <div className="adm-cat-info">
              {editId === c.id ? (
                <form onSubmit={(e) => { e.preventDefault(); rename(c); }} className="adm-add">
                  <input className="adm-in" autoFocus value={editName} maxLength={80} required onChange={(e) => setEditName(e.target.value)} />
                  <button className="adm-btn sm" disabled={busy}>Save</button>
                  <button type="button" className="adm-btn ghost sm" onClick={() => setEditId(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <b>{c.name}</b>
                  <small>{counts[c.id] || 0} news · /news/category/{c.slug}</small>
                </>
              )}
            </div>
            <div className="adm-actions">
              <Link href={`/admin/news/new?cat=${c.id}`} className="adm-btn sm"><Icon name="plus" size={14} /> Add news</Link>
              <Link href={`/news/category/${c.slug}`} target="_blank" className="adm-btn ghost icon" title="View on site"><Icon name="eye" size={16} /></Link>
              <button className="adm-btn ghost icon" disabled={busy || i === 0} onClick={() => move(i, -1)} title="Move up">↑</button>
              <button className="adm-btn ghost icon" disabled={busy || i === cats.length - 1} onClick={() => move(i, 1)} title="Move down">↓</button>
              <button className="adm-btn ghost icon" disabled={busy} onClick={() => { setEditId(c.id); setEditName(c.name); }} title="Rename"><Icon name="edit" size={16} /></button>
              <button className="adm-btn danger icon" disabled={busy} onClick={() => del(c)} title="Delete"><Icon name="trash" size={16} /></button>
            </div>
          </div>
        ))}
        {!cats.length && <p className="adm-empty">Abhi koi category nahi hai.</p>}
      </section>
      {toastNode}
    </>
  );
}
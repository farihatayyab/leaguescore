"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = {
  id: null, title: "", summary: "", body: "", image_url: "",
  category_id: "", is_top: false, is_editor_pick: false, published: true,
};

async function api(url, method, body) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}

export default function AdminPanel({ cats, articles }) {
  const router = useRouter();
  const [tab, setTab] = useState("articles");
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function run(fn, ok) {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      if (ok) setMsg(ok);
      router.refresh();
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/articles", form.id ? "PUT" : "POST", form);
      setForm(EMPTY);
    }, form.id ? "Article updated." : "Article published.");
  };

  const edit = (id) =>
    run(async () => {
      const { article: a } = await api(`/api/admin/articles?id=${id}`, "GET");
      setForm({
        id: a.id, title: a.title, summary: a.summary || "", body: a.body || "",
        image_url: a.image_url || "", category_id: a.category_id || "",
        is_top: !!a.is_top, is_editor_pick: !!a.is_editor_pick, published: !!a.published,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  const remove = (id) => {
    if (!confirm("Delete this article?")) return;
    run(() => api(`/api/admin/articles?id=${id}`, "DELETE"), "Article deleted.");
  };

  const upload = (file) => {
    if (!file) return;
    run(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Upload failed");
      set("image_url", d.url);
    }, "Image uploaded.");
  };

  const addCat = (e) => {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/categories", "POST", { name: newCat });
      setNewCat("");
    }, "Category added.");
  };

  const renameCat = (c) => {
    const name = prompt("New name", c.name);
    if (name && name.trim()) run(() => api("/api/admin/categories", "PUT", { id: c.id, name }), "Category renamed.");
  };

  const delCat = (c) => {
    if (!confirm(`Delete "${c.name}"? Its articles will stay but without a category.`)) return;
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
    <div className="ad-wrap">
      <div className="page-head"><h1>News admin</h1></div>

      <div className="ad-tabs">
        <button className={tab === "articles" ? "ad-btn" : "ad-btn sec"} onClick={() => setTab("articles")}>Articles</button>
        <button className={tab === "cats" ? "ad-btn" : "ad-btn sec"} onClick={() => setTab("cats")}>Categories (sub navbar)</button>
      </div>

      {msg && <div className="ad-msg">{msg}</div>}

      {tab === "articles" && (
        <>
          <form className="panel ad-form" onSubmit={save}>
            <h3>{form.id ? "Edit article" : "Add new article"}</h3>
            <label>Title
              <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={255} />
            </label>
            <label>Short summary (optional)
              <input type="text" value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={500} />
            </label>
            <label>Category
              <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">— No category —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Image URL (ya neeche se upload karo)
              <input type="text" value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://... ya /uploads/..." />
            </label>
            <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt="" style={{ maxWidth: 260, borderRadius: 10 }} />
            )}
            <label>Article text (paragraph ke beech me khali line chhodo)
              <textarea value={form.body} onChange={(e) => set("body", e.target.value)} />
            </label>
            <div className="ad-checks">
              <label><input type="checkbox" checked={form.is_top} onChange={(e) => set("is_top", e.target.checked)} /> Top News</label>
              <label><input type="checkbox" checked={form.is_editor_pick} onChange={(e) => set("is_editor_pick", e.target.checked)} /> Editors’ Pick</label>
              <label><input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Published</label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ad-btn" disabled={busy}>{form.id ? "Update" : "Publish"}</button>
              {form.id && <button type="button" className="ad-btn sec" onClick={() => setForm(EMPTY)}>Cancel</button>}
            </div>
          </form>

          <div className="panel" style={{ overflowX: "auto" }}>
            <table className="ad-table">
              <thead><tr><th>Title</th><th>Category</th><th>Flags</th><th>Views</th><th></th></tr></thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.cat_name || "—"}</td>
                    <td>{a.is_top ? "Top " : ""}{a.is_editor_pick ? "Editor " : ""}{a.published ? "" : "Draft"}</td>
                    <td>{a.views}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="ad-btn sec" onClick={() => edit(a.id)} disabled={busy}>Edit</button>{" "}
                      <button className="ad-btn del" onClick={() => remove(a.id)} disabled={busy}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!articles.length && <tr><td colSpan={5} className="muted">No articles yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "cats" && (
        <div className="panel ad-form">
          <h3>Sub navbar categories</h3>
          <form onSubmit={addCat} style={{ display: "flex", gap: 10 }}>
            <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Premier League" maxLength={80} style={{ flex: 1 }} required />
            <button className="ad-btn" disabled={busy}>Add</button>
          </form>
          <table className="ad-table">
            <tbody>
              {cats.map((c, i) => (
                <tr key={c.id}>
                  <td>{c.name} <span className="muted">/news/category/{c.slug}</span></td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="ad-btn sec" onClick={() => move(i, -1)} disabled={busy || i === 0}>↑</button>{" "}
                    <button className="ad-btn sec" onClick={() => move(i, 1)} disabled={busy || i === cats.length - 1}>↓</button>{" "}
                    <button className="ad-btn sec" onClick={() => renameCat(c)} disabled={busy}>Rename</button>{" "}
                    <button className="ad-btn del" onClick={() => delCat(c)} disabled={busy}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
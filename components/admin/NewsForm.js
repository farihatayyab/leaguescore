"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "./api";
import { useToast } from "./Toast";

export default function NewsForm({ cats: initialCats, article = null, defaultCat = "" }) {
  const [cats, setCats] = useState(initialCats);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const router = useRouter();
  const [toastNode, toast] = useToast();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(null);
  const [f, setF] = useState({
    id: article?.id ?? null,
    title: article?.title ?? "",
    summary: article?.summary ?? "",
    body: article?.body ?? "",
    image_url: article?.image_url ?? "",
    category_id: article?.category_id ?? (defaultCat ? Number(defaultCat) : ""),
    is_top: !!article?.is_top,
    is_editor_pick: !!article?.is_editor_pick,
    published: article ? !!article.published : true,
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!f.category_id) return toast("Category select karo.", "err");
    setBusy(true);
    try {
      const d = await api("/api/admin/articles", f.id ? "PUT" : "POST", f);
      router.refresh();
      if (f.id) toast("Changes saved.");
      else setDone({ slug: d.slug, published: f.published });
    } catch (err) {
      toast(err.message, "err");
    }
    setBusy(false);
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      const d = await api("/api/admin/categories", "POST", { name });
      setCats((c) => [...c, d.category]);
      set("category_id", d.category.id);
      setNewCat("");
      router.refresh();
      toast("Category add ho gayi aur subnavbar me dikhne lagi.");
    } catch (err) {
      toast(err.message, "err");
    }
    setAddingCat(false);
  }

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Upload failed");
      set("image_url", d.url);
    } catch (err) {
      toast(err.message, "err");
    }
    setUploading(false);
  }

  if (done) {
    return (
      <div className="adm-done adm-panel">
        <div className="adm-done-ic"><Icon name="check" size={30} /></div>
        <h2>{done.published ? "News publish ho gayi!" : "Draft save ho gaya"}</h2>
        <p className="muted">
          {done.published
            ? "Ye news ab apne alag page par aur category page par dikh rahi hai."
            : "Draft website par nahi dikhta. Jab ready ho to edit karke Published kar do."}
        </p>
        <div className="adm-done-btns">
          {done.published && (
            <Link href={`/news/${done.slug}`} target="_blank" className="adm-btn"><Icon name="eye" size={16} /> View on site</Link>
          )}
          <button className="adm-btn ghost" onClick={() => window.location.assign("/admin/news/new")}>Add another</button>
          <Link href="/admin/news" className="adm-btn ghost">All news</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <div className="adm-crumb"><Link href="/admin/news">All news</Link> › {f.id ? "Edit" : "Add"}</div>
          <h1>{f.id ? "Edit news" : "Add news"}</h1>
        </div>
      </div>

      <form className="adm-form" onSubmit={save}>
        <div className="adm-col">
          <section className="adm-panel adm-panel-b adm-fields">
            <div className="adm-field">
              <label htmlFor="t">Title</label>
              <input id="t" className="adm-in" type="text" value={f.title} maxLength={255} required
                placeholder="News ka headline likho" onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="s">Short summary <em>(optional)</em></label>
              <input id="s" className="adm-in" type="text" value={f.summary} maxLength={500}
                placeholder="Ek do line ka khulasa" onChange={(e) => set("summary", e.target.value)} />
              <small>{f.summary.length}/500</small>
            </div>
            <div className="adm-field">
              <label htmlFor="b">News text</label>
              <textarea id="b" className="adm-in adm-body" value={f.body}
                placeholder="Poori news yahan likho. Paragraph ke beech me ek khali line chhodo."
                onChange={(e) => set("body", e.target.value)} />
              <small>{f.body.trim() ? f.body.trim().split(/\s+/).length : 0} words</small>
            </div>
          </section>
        </div>

        <div className="adm-col">
          <section className="adm-panel adm-panel-b adm-fields">
            <h3>Publish</h3>
            <div className="adm-seg">
              <button type="button" className={f.published ? "on" : ""} onClick={() => set("published", true)}>Published</button>
              <button type="button" className={!f.published ? "on" : ""} onClick={() => set("published", false)}>Draft</button>
            </div>
            <button className="adm-btn" disabled={busy || uploading}>
              {busy ? "Saving…" : f.id ? "Save changes" : f.published ? "Publish news" : "Save draft"}
            </button>
            <div className="adm-actions" style={{ justifyContent: "space-between" }}>
              <Link href="/admin/news" className="adm-link">Cancel</Link>
              {f.id && article?.published ? (
                <Link href={`/news/${article.slug}`} target="_blank" className="adm-link">View on site ↗</Link>
              ) : null}
            </div>
          </section>

          <section className="adm-panel adm-panel-b adm-fields">
            <h3>Category</h3>
            <select className="adm-in" value={f.category_id} required onChange={(e) => set("category_id", e.target.value)}>
              <option value="">— Select category —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="adm-add">
              <input className="adm-in" type="text" value={newCat} maxLength={80} placeholder="+ Nayi category"
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
              <button type="button" className="adm-btn sm" disabled={addingCat || !newCat.trim()} onClick={addCategory}>Add</button>
            </div>
            <small>Nayi category news site ke subnavbar me foran aa jati hai. <Link href="/admin/categories" className="adm-link">Manage</Link></small>
          </section>

          <section className="adm-panel adm-panel-b adm-fields">
            <h3>Cover image</h3>
            {f.image_url ? (
              <div className="adm-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image_url} alt="" />
                <button type="button" className="adm-btn danger sm" onClick={() => set("image_url", "")}>Remove</button>
              </div>
            ) : (
              <label className="adm-drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}>
                <Icon name="image" size={26} />
                <b>{uploading ? "Uploading…" : "Click ya drag & drop"}</b>
                <small>JPG, PNG, WEBP, GIF · max 5 MB</small>
                <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            )}
            <input className="adm-in" type="text" value={f.image_url} placeholder="ya image URL paste karo"
              onChange={(e) => set("image_url", e.target.value)} />
          </section>

          <section className="adm-panel adm-panel-b adm-fields">
            <h3>Display options</h3>
            <label className="adm-check">
              <input type="checkbox" checked={f.is_top} onChange={(e) => set("is_top", e.target.checked)} />
              <span><b>Hero article</b><small>Category page par bada dikhega</small></span>
            </label>
            <label className="adm-check">
              <input type="checkbox" checked={f.is_editor_pick} onChange={(e) => set("is_editor_pick", e.target.checked)} />
              <span><b>Editors’ Pick</b><small>News page ke Editors’ Picks me aayegi</small></span>
            </label>
          </section>
        </div>
      </form>
      {toastNode}
    </>
  );
}
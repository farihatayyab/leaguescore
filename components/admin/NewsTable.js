"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "./api";
import { useToast } from "./Toast";
import { TZ } from "@/lib/format";

const PER = 10;
const fmt = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });

export default function NewsTable({ articles, cats }) {
  const router = useRouter();
  const [toastNode, toast] = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return articles.filter((a) => {
      if (s && !a.title.toLowerCase().includes(s)) return false;
      if (cat === "none" && a.category_id) return false;
      if (cat !== "all" && cat !== "none" && String(a.category_id) !== cat) return false;
      if (status === "published" && !a.published) return false;
      if (status === "draft" && a.published) return false;
      return true;
    });
  }, [articles, q, cat, status]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages - 1);
  const rows = list.slice(cur * PER, cur * PER + PER);
  const reset = (fn) => (e) => { fn(e.target.value); setPage(0); };

  async function remove(a) {
    if (!confirm(`Delete "${a.title}"?\nIs ko wapis nahi la sakte.`)) return;
    setBusy(a.id);
    try {
      await api(`/api/admin/articles?id=${a.id}`, "DELETE");
      toast("News deleted.");
      router.refresh();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusy(null);
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>All news</h1>
          <p>{articles.length} articles total</p>
        </div>
        <Link href="/admin/news/new" className="adm-btn"><Icon name="plus" size={16} /> Add news</Link>
      </div>

      <section className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" size={16} />
            <input type="text" placeholder="Search by title…" value={q} onChange={reset(setQ)} />
          </div>
          <select className="adm-in" value={cat} onChange={reset(setCat)}>
            <option value="all">All categories</option>
            {cats.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            <option value="none">No category</option>
          </select>
          <select className="adm-in" value={status} onChange={reset(setStatus)}>
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr><th>News</th><th>Category</th><th>Status</th><th>Views</th><th>Date</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="adm-news-cell">
                      {a.image_url
                        ? // eslint-disable-next-line @next/next/no-img-element
                          <img className="adm-thumb" src={a.image_url} alt="" />
                        : <span className="adm-thumb ph"><Icon name="image" size={18} /></span>}
                      <div>
                        <Link href={`/admin/news/${a.id}/edit`} className="adm-title">{a.title}</Link>
                        <div className="adm-flags">
                          {a.is_top ? <span className="adm-badge brand">Hero</span> : null}
                          {a.is_editor_pick ? <span className="adm-badge brand">Editor’s pick</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{a.cat_name ? <span className="adm-badge muted">{a.cat_name}</span> : <span className="muted">—</span>}</td>
                  <td><span className={`adm-badge ${a.published ? "ok" : "draft"}`}>{a.published ? "Published" : "Draft"}</span></td>
                  <td>{a.views}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmt(a.created_at)}</td>
                  <td>
                    <div className="adm-actions">
                      {a.published ? (
                        <Link href={`/news/${a.slug}`} target="_blank" className="adm-btn ghost icon" title="View on site"><Icon name="eye" size={16} /></Link>
                      ) : null}
                      <Link href={`/admin/news/${a.id}/edit`} className="adm-btn ghost icon" title="Edit"><Icon name="edit" size={16} /></Link>
                      <button className="adm-btn danger icon" title="Delete" disabled={busy === a.id} onClick={() => remove(a)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="adm-empty">Koi news nahi mili.</p>}
        </div>

        {list.length > PER && (
          <div className="adm-pager">
            <span className="muted">
              {cur * PER + 1}–{Math.min(list.length, cur * PER + PER)} of {list.length}
            </span>
            <div>
              <button className="adm-btn ghost sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Prev</button>{" "}
              <button className="adm-btn ghost sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button>
            </div>
          </div>
        )}
      </section>
      {toastNode}
    </>
  );
}
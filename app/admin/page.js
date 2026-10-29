import Link from "next/link";
import { adminArticles, adminStats, getCategories, timeAgo } from "@/lib/news";
import Icon from "@/components/admin/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const [stats, articles, cats] = await Promise.all([adminStats(), adminArticles(), getCategories()]);
  const recent = articles.slice(0, 6);
  const top = [...articles].sort((a, b) => b.views - a.views).slice(0, 5);
  const breakdown = cats.map((c) => ({ ...c, n: articles.filter((a) => a.category_id === c.id).length }));
  const max = Math.max(1, ...breakdown.map((b) => b.n));

  const cards = [
    { icon: "news", n: stats.total, label: "Total news" },
    { icon: "check", n: stats.published, label: `Published · ${stats.drafts} draft` },
    { icon: "eye", n: stats.views.toLocaleString("en-US"), label: "Total views" },
    { icon: "tag", n: stats.categories, label: "Categories" },
  ];

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p>Aapki news ka overview ek nazar me.</p>
        </div>
        <Link href="/admin/news/new" className="adm-btn"><Icon name="plus" size={16} /> Add news</Link>
      </div>

      <div className="adm-stats">
        {cards.map((c) => (
          <div className="adm-stat" key={c.label}>
            <div className="adm-stat-ic"><Icon name={c.icon} size={22} /></div>
            <div><b>{c.n}</b><span>{c.label}</span></div>
          </div>
        ))}
      </div>

      <div className="adm-grid2">
        <section className="adm-panel">
          <div className="adm-panel-h">
            <h3>Recent news</h3>
            <Link href="/admin/news" className="adm-link">View all</Link>
          </div>
          {recent.map((a) => (
            <Link key={a.id} href={`/admin/news/${a.id}/edit`} className="adm-li">
              <div>
                <b>{a.title}</b>
                <small>{a.cat_name || "No category"} · {timeAgo(a.created_at)}</small>
              </div>
              <span className={`adm-badge ${a.published ? "ok" : "draft"}`}>{a.published ? "Published" : "Draft"}</span>
            </Link>
          ))}
          {!recent.length && <p className="adm-empty">Abhi koi news nahi hai. Pehli news add karo.</p>}
        </section>

        <div style={{ display: "grid", gap: 18 }}>
          <section className="adm-panel">
            <div className="adm-panel-h"><h3>News by category</h3></div>
            <div className="adm-panel-b" style={{ display: "grid", gap: 14 }}>
              {breakdown.map((b) => (
                <div key={b.id}>
                  <div className="adm-bar-top"><span>{b.name}</span><b>{b.n}</b></div>
                  <div className="adm-bar"><i style={{ width: `${(b.n / max) * 100}%` }} /></div>
                </div>
              ))}
              {!breakdown.length && <p className="muted">No categories yet.</p>}
            </div>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-h"><h3>Most read</h3></div>
            {top.map((a, i) => (
              <div key={a.id} className="adm-li static">
                <div><b>{i + 1}. {a.title}</b></div>
                <span className="adm-badge muted">{a.views} views</span>
              </div>
            ))}
            {!top.length && <p className="adm-empty">No data yet.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
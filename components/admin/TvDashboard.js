import Link from "next/link";
import Icon from "./Icon";
import AutoRefresh from "./AutoRefresh";

const when = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "Never";
const num = (n) => Number(n || 0).toLocaleString("en-US");

function state(s) {
  if (s.syncing) return { cls: "brand", text: "Syncing…" };
  if (s.last_status?.startsWith("error")) return { cls: "err", text: "Error" };
  if (!s.active) return { cls: "muted", text: "Hidden" };
  return { cls: "ok", text: "Active" };
}

// TV Guide overview for the admin dashboard
export default function TvDashboard({ tv }) {
  const cards = [
    { icon: "tv", n: tv.sources.length, label: `EPG links · ${tv.active} active` },
    { icon: "dash", n: num(tv.channels), label: "Channels" },
    { icon: "news", n: num(tv.programmes), label: "Programmes" },
    { icon: "check", n: when(tv.lastSync), label: "Last successful sync", small: true },
  ];
  return (
    <section className="adm-panel" style={{ marginBottom: 22 }}>
      <AutoRefresh active={tv.syncing} />
      <div className="adm-panel-h">
        <h3>TV Guide</h3>
        <span style={{ display: "flex", gap: 14 }}>
          <Link href="/tv-guide" target="_blank" className="adm-link">View TV Guide</Link>
          <Link href="/admin/tv-guide" className="adm-link">Manage EPG links</Link>
        </span>
      </div>
      <div className="adm-panel-b">
        <div className="adm-stats" style={{ marginBottom: 0 }}>
          {cards.map((c) => (
            <div className="adm-stat" key={c.label}>
              <div className="adm-stat-ic"><Icon name={c.icon} size={22} /></div>
              <div><b style={c.small ? { fontSize: 18, paddingTop: 5 } : undefined}>{c.n}</b><span>{c.label}</span></div>
            </div>
          ))}
        </div>
      </div>
      {tv.sources.map((s) => {
        const st = state(s);
        return (
          <Link key={s.id} href="/admin/tv-guide" className="adm-li">
            <div>
              <b>{s.name}</b>
              <small style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{s.url}</small>
              <small style={{ display: "block" }}>
                {num(s.channel_count)} channels · {num(s.programme_count)} programmes · Last sync: {when(s.last_synced_at)}
              </small>
              {s.syncing && <small style={{ display: "block", color: "var(--brand)" }}>{s.last_status || "Syncing…"}</small>}
              {!s.syncing && st.cls === "err" && (
                <small style={{ display: "block", color: "var(--live)" }}>
                  {s.last_status}
                  {s.programme_count > 0 && " — the website keeps showing the last downloaded data."}
                </small>
              )}
            </div>
            <span className={`adm-badge ${st.cls}`}>{st.text}</span>
          </Link>
        );
      })}
      {!tv.sources.length && (
        <p className="adm-empty">No EPG link yet. <Link href="/admin/tv-guide" className="adm-link">Add your first XMLTV link</Link> and it will appear here.</p>
      )}
    </section>
  );
}

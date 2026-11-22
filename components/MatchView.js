"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Crest from "./Crest";
import { fmtFull, slugify } from "@/lib/format";
import { useT } from "./LanguageProvider";

// stat ka label translate karo; agar translation na ho to API ka original label dikhao
const statLabel = (tx, label) => {
  const k = `st.${label}`;
  const v = tx(k);
  return v === k ? label : v;
};

const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
const sideOf = (i) => (i.side === "away" ? "away" : "home");

function iconFor(i) {
  const t = String(i.type || "").toLowerCase();
  if (i.is_goal || t.includes("goal")) return "⚽";
  if (t.includes("red")) return "🟥";
  if (i.is_card || t.includes("yellow") || t.includes("card")) return "🟨";
  if (i.is_sub || t.includes("sub")) return "⇄";
  if (t.includes("var")) return "VAR";
  return "•";
}

// incidents me se kisi side ke cards/events ginti
const cnt = (m, side, re) =>
  m.incidents.filter((i) => sideOf(i) === side && re.test(String(i.type || "").toLowerCase())).length;

// ---------- Stats rows (API na de to zeros) ----------
const BASE = [
  "Total Goals", "Corner Kicks", "Yellow Cards", "Red Cards", "Ball Possession",
  "Total Shots", "Shots on Target", "Shots off Target", "Attacks", "Dangerous Attacks",
];

function statRows(m) {
  const api = m.stats || [];
  const find = (label) =>
    api.find(
      (s) =>
        s.label.toLowerCase() === label.toLowerCase() ||
        (label === "Corner Kicks" && /corner/i.test(s.label)) ||
        (label === "Total Shots" && /^(total )?shots$/i.test(s.label))
    );
  const fb = {
    "Total Goals": [m.hs ?? 0, m.as ?? 0],
    "Yellow Cards": [cnt(m, "home", /yellow/), cnt(m, "away", /yellow/)],
    "Red Cards": [cnt(m, "home", /red/), cnt(m, "away", /red/)],
  };
  const rows = BASE.map((label) => {
    const s = find(label);
    const f = fb[label] || [0, 0];
    return { label, home: s ? s.home : f[0], away: s ? s.away : f[1] };
  });
  for (const s of api) {
    if (!BASE.some((b) => find(b) === s)) rows.push({ label: s.label, home: s.home, away: s.away });
  }
  return rows.map((r) =>
    /possession/i.test(r.label) ? { ...r, home: `${r.home}%`, away: `${r.away}%` } : r
  );
}

// ---------- Green pitch panel ----------
function Pitch({ m, rows }) {
  const tx = useT();
  const poss = rows.find((r) => /possession/i.test(r.label));
  const hp = parseFloat(poss?.home) || 0;
  const ap = parseFloat(poss?.away) || 0;
  const tot = hp + ap || 1;
  const big = m.live ? m.minute || "" : m.state === "finished" ? tx("ft") : m.time;

  return (
    <section className="pitch-card">
      <div className="pitch-head">
        <Crest src={m.compLogo} name={m.competition} size={20} round />
        <b>{m.competition}{m.country && m.country !== m.competition ? <span className="muted"> · {m.country}</span> : null}</b>
        <span>{m.day} | {m.time}</span>
      </div>

      <div className="pitch">
        <div className="pitch-top">
          <span>{m.home}</span>
          <b>{m.hs ?? 0} – {m.as ?? 0}</b>
          <span>{m.away}</span>
        </div>
        <div className="pitch-mid">
          {m.live && <span className="live-badge big"><i />{tx("live")}</span>}
          <div className="pitch-score">{m.hs ?? 0} – {m.as ?? 0}</div>
          {big !== "" && <div className="pitch-min">{big}</div>}
          <p>
            {m.live ? tx("m.liveText") : m.state === "finished" ? tx("m.finishedText") : tx("m.notStarted")}
          </p>
        </div>
      </div>

      <div className="pitch-foot">
        <span className="pf-cards">
          <i className="yc" />{cnt(m, "home", /yellow/)} <i className="rc" />{cnt(m, "home", /red/)}
        </span>
        <span className="pf-poss">
          <small>{tx("m.possession")}</small>
          <span className="pf-bar"><i style={{ width: `${(hp / tot) * 100}%` }} /><i className="b" style={{ width: `${(ap / tot) * 100}%` }} /></span>
        </span>
        <span className="pf-cards">
          <i className="yc" />{cnt(m, "away", /yellow/)} <i className="rc" />{cnt(m, "away", /red/)}
        </span>
      </div>
    </section>
  );
}

// ---------- Timeline / Commentary ----------
function Timeline({ incidents }) {
  const tx = useT();
  if (!incidents.length) {
    return <p className="empty">{tx("m.noTimeline")}</p>;
  }
  const list = [...incidents].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  return (
    <ul className="tl">
      {list.map((i, n) => {
        const side = sideOf(i);
        const text = i.is_sub ? (
          <>
            <span className="in">▲ {i.player_in}</span>
            <span className="out">▼ {i.player_out}</span>
          </>
        ) : (
          <>
            <b>{i.player || i.type}</b>
            {i.is_goal && i.home_score !== undefined && <small>{i.home_score} - {i.away_score}</small>}
          </>
        );
        return (
          <li key={n} className={`tl-row ${side}`}>
            <span className="tl-side">{side === "home" && <span className="tl-text">{text}</span>}</span>
            <span className="tl-mid">
              <em>{i.time}&apos;</em>
              <i title={i.type}>{iconFor(i)}</i>
            </span>
            <span className="tl-side">{side === "away" && <span className="tl-text">{text}</span>}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Commentary({ m }) {
  const tx = useT();
  if (!m.incidents.length) {
    return <p className="empty">{tx("m.noCommentary")}</p>;
  }
  const list = [...m.incidents].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
  return (
    <ul className="cm">
      {list.map((i, n) => (
        <li key={n}>
          <em>{i.time}&apos;</em>
          <span className="cm-ic">{iconFor(i)}</span>
          <b>{i.is_sub ? tx("m.sub", { in: i.player_in || "", out: i.player_out || "" }) : i.player ? `${i.type} – ${i.player}` : i.type}</b>
          <span className="chip cm-team">{sideOf(i) === "home" ? m.home : m.away}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Lineups ----------
function Squad({ title, formation, xi = [], subs = [], sport }) {
  const tx = useT();
  const pl = (name) =>
    sport === "football" ? (
      <Link href={`/${sport}/player/${slugify(name)}`} className="plink">{name}</Link>
    ) : (
      name
    );
  return (
    <div className="squad">
      <h4>
        {title} {formation && <span className="chip">{formation}</span>}
      </h4>
      <ul>
        {xi.map((p, i) => (
          <li key={i}>
            <span className="num">{p.number}</span>
            <span className="pname">{pl(p.name)}{p.captain && <em> (C)</em>}</span>
            <span className="pos">{p.position}</span>
          </li>
        ))}
      </ul>
      {subs.length > 0 && (
        <>
          <h5>{tx("m.subs")}</h5>
          <ul className="subs">
            {subs.map((p, i) => (
              <li key={i}>
                <span className="num">{p.number}</span>
                <span className="pname">{pl(p.name)}</span>
                <span className="pos">{p.position}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LineupsBlock({ m, sport }) {
  const tx = useT();
  if (!m.lineups) {
    return (
      <div className="ph">
        <div className="ph-ic">⚽</div>
        <b>{tx("m.lineupSoon")}</b>
        <p className="muted">{tx("m.lineupSoonText")}</p>
        <div className="ph-teams">
          <span><Crest src={m.homeLogo} name={m.home} size={22} /> {m.home}</span>
          <span><Crest src={m.awayLogo} name={m.away} size={22} /> {m.away}</span>
        </div>
      </div>
    );
  }
  const l = m.lineups;
  return (
    <>
      {l.confirmed === false && <span className="chip">{tx("m.predicted")}</span>}
      <div className="squads">
        <Squad sport={sport} title={m.home} formation={l.home_formation} xi={l.home_xi} subs={l.home_subs} />
        <Squad sport={sport} title={m.away} formation={l.away_formation} xi={l.away_xi} subs={l.away_subs} />
      </div>
    </>
  );
}

// ---------- Stats (sidebar) ----------
function Stats({ stats }) {
  const tx = useT();
  return (
    <div className="stats-list">
      {stats.map((s, i) => {
        const h = parseFloat(s.home) || 0;
        const a = parseFloat(s.away) || 0;
        const total = h + a || 1;
        return (
          <div className="stat" key={i}>
            <div className="stat-top">
              <b>{s.home}</b>
              <span>{statLabel(tx, s.label)}</span>
              <b>{s.away}</b>
            </div>
            <div className="stat-bar">
              <i style={{ width: `${(h / total) * 100}%` }} />
              <i className="b" style={{ width: `${(a / total) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Standings / H2H / League / About ----------
function StandingsTab({ tables, m, sport }) {
  const tx = useT();
  if (!tables?.length) return <p className="empty">{tx("m.noStandings")}</p>;
  return tables.map((t, n) => (
    <div key={n} className="tbl-wrap">
      {t.title && <h4 className="tbl-title">{t.title}</h4>}
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th className="c-name">{tx("tbl.team")}</th>
            {t.cols.filter((c) => c.key !== "pos").map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => {
            const hi = r.name === m.home || r.name === m.away;
            return (
              <tr key={i} style={hi ? { background: "var(--hover)", fontWeight: 700 } : null}>
                <td>{r.cells.pos ?? i + 1}</td>
                <td className="c-name">
                  <Link href={`/${sport}/team/${slugify(r.name || "")}`} className="tbl-team">
                    <Crest src={r.logo} name={r.name || "?"} size={22} round />
                    <span>{r.name}</span>
                  </Link>
                </td>
                {t.cols.filter((c) => c.key !== "pos").map((c) => (
                  <td key={c.key} className={c.key === "pts" ? "c-pts" : ""}>{r.cells[c.key] ?? "–"}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ));
}

function H2HTab({ h2h, m, sport }) {
  const tx = useT();
  if (!h2h || !h2h.list.length) {
    return <p className="empty big">{tx("m.noH2h")}</p>;
  }
  return (
    <>
      <div className="h2h-sum">
        <div><b>{h2h.homeWins}</b><span>{tx("m.winsOf", { team: m.home })}</span></div>
        <div><b>{h2h.draws}</b><span>{tx("m.draws")}</span></div>
        <div><b>{h2h.awayWins}</b><span>{tx("m.winsOf", { team: m.away })}</span></div>
      </div>
      {h2h.list.map((x) => (
        <Link key={x.slug + x.id} href={`/${sport}/match/${x.slug}`} className="lg-row">
          <small>{x.dayLabel}</small>
          <span className="lg-t">{x.home}</span>
          <b>{x.hs} - {x.as}</b>
          <span className="lg-t">{x.away}</span>
        </Link>
      ))}
    </>
  );
}

function LeagueMore({ extras, m, sport }) {
  const tx = useT();
  if (!extras || (!extras.recent.length && !extras.upcoming.length)) return null;
  const Row = ({ x }) => (
    <Link href={`/${sport}/match/${x.slug}`} className="lg-row">
      <small>{x.dayLabel}</small>
      <span className="lg-t">{x.home}</span>
      <b>{x.state === "finished" ? `${x.hs} - ${x.as}` : x.time}</b>
      <span className="lg-t">{x.away}</span>
    </Link>
  );
  return (
    <section className="panel">
      <div className="sec-head"><span>{tx("m.moreIn", { comp: m.competition })}</span></div>
      <div className="lg-cols">
        <div>
          <h4 className="tbl-title" style={{ padding: "10px 16px 0" }}>{tx("m.recent")}</h4>
          {extras.recent.length
            ? extras.recent.map((x) => <Row key={x.slug + x.id} x={x} />)
            : <p className="empty">{tx("m.noRecent")}</p>}
        </div>
        <div>
          <h4 className="tbl-title" style={{ padding: "10px 16px 0" }}>{tx("m.upFixtures")}</h4>
          {extras.upcoming.length
            ? extras.upcoming.map((x) => <Row key={x.slug + x.id} x={x} />)
            : <p className="empty">{tx("m.noUp")}</p>}
        </div>
      </div>
    </section>
  );
}

function About({ m, extras }) {
  const tx = useT();
  const hr = extras?.homeRow;
  const ar = extras?.awayRow;
  const h = extras?.h2h;
  return (
    <section className="panel pad">
      <h3>{tx("m.aboutTitle", { home: m.home, away: m.away })}</h3>
      <h4 style={{ marginTop: 12 }}>{tx("m.preview")}</h4>
      <p className="muted">
        {tx("m.previewText", { home: m.home, away: m.away, comp: m.competition, when: fmtFull(m.iso), verb: m.state === "scheduled" ? tx("m.faces") : tx("m.playing") })}
        {m.live && ` ${tx("m.currentScore", { hs: m.hs ?? 0, as: m.as ?? 0 })}`}
        {m.state === "finished" && ` ${tx("m.finalScore", { hs: m.hs ?? 0, as: m.as ?? 0 })}`}
      </p>
      {(hr || ar) && (
        <>
          <h4 style={{ marginTop: 12 }}>{tx("m.leaguePos")}</h4>
          <p className="muted">
            {hr && `${tx("m.posText", { team: m.home, pos: hr.pos })}${hr.pts != null ? ` ${tx("m.withPts", { n: hr.pts })}` : ""}${hr.p != null ? ` ${tx("m.fromMatches", { n: hr.p })}` : ""}. `}
            {ar && `${tx("m.posText", { team: m.away, pos: ar.pos })}${ar.pts != null ? ` ${tx("m.withPts", { n: ar.pts })}` : ""}${ar.p != null ? ` ${tx("m.fromMatches", { n: ar.p })}` : ""}.`}
          </p>
        </>
      )}
      {h && h.list.length > 0 && (
        <>
          <h4 style={{ marginTop: 12 }}>{tx("m.h2hHistory")}</h4>
          <p className="muted">
            {tx("m.h2hText", { n: h.list.length, home: m.home, hw: h.homeWins, away: m.away, aw: h.awayWins, d: h.draws })}
          </p>
        </>
      )}
    </section>
  );
}

// ---------- Main ----------
export default function MatchView({ initial, sport, slug, extras }) {
  const tx = useT();
  const [m, setM] = useState(initial);
  const [tab, setTab] = useState("Overview");

  // live match ho to har 30s baad refresh (hamare apne cache se, API par bojh nahi)
  useEffect(() => {
    if (!m.live) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      fetch(`/api/match?sport=${sport}&slug=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((d) => d.match && setM(d.match))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [m.live, sport, slug]);

  const tabs = ["Overview", "Lineups", "H2H", ...(extras?.standings?.length ? ["Standings"] : []), "Commentary"];
  const scheduled = m.state === "scheduled" || m.state === "other";
  const rows = statRows(m);
  const season = (m.iso || "").slice(0, 4);

  return (
    <>
      <p className="crumb">
        <Link href={`/${sport}`}>{tx(`sport.${sport}`)}</Link> › {m.competition} › {m.home} vs {m.away}
      </p>

      <section className="hero">
        <div className="hero-top">
          <span className="hero-comp">
            <Crest src={m.compLogo} name={m.competition} size={22} round />
            <Link href={`/${sport}/competition/${m.compSlug}`}>{m.competition}</Link>
          </span>
          {m.live ? (
            <span className="live-badge big"><i />{tx("live")}{m.minute ? ` ${m.minute}'` : ""}</span>
          ) : (
            <span className="status-pill">{m.state === "finished" ? tx("m.fullTime") : m.statusText || tx("m.upcoming")}</span>
          )}
        </div>

        <div className="hero-main">
          <div className="hero-team">
            <Crest src={m.homeLogo} name={m.home} size={84} />
            <Link href={`/${sport}/team/${slugify(m.home)}`}><strong>{m.home}</strong></Link>
          </div>

          <div className="hero-score">
            {scheduled ? (
              <>
                <span className="vs-big">{tx("vs")}</span>
                <small>{m.time}</small>
              </>
            ) : (
              <>
                <span className={m.live ? "score-big livec" : "score-big"}>
                  {m.hs ?? 0}<i>-</i>{m.as ?? 0}
                </span>
                {m.htHome !== null && m.htAway !== null && <small>HT {m.htHome} - {m.htAway}</small>}
              </>
            )}
          </div>

          <div className="hero-team">
            <Crest src={m.awayLogo} name={m.away} size={84} />
            <Link href={`/${sport}/team/${slugify(m.away)}`}><strong>{m.away}</strong></Link>
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {tabs.map((k) => (
          <button key={k} role="tab" aria-selected={k === tab} className={k === tab ? "tab on" : "tab"} onClick={() => setTab(k)}>
            {tx(`m.${k.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <div className="mgrid">
        <div className="mleft">
          {tab === "Overview" && (
            <>
              <Pitch m={m} rows={rows} />
              <section className="panel pad">
                <h3>{tx("m.timeline")}</h3>
                <Timeline incidents={m.incidents} />
              </section>
              <section className="panel pad">
                <h3>{tx("m.commentary")}</h3>
                <Commentary m={m} />
              </section>
              <section className="panel pad">
                <h3>{tx("m.h2hTitle")}</h3>
                <H2HTab h2h={extras?.h2h} m={m} sport={sport} />
              </section>
              <section className="panel pad">
                <h3>{tx("m.lineups")}</h3>
                <LineupsBlock m={m} sport={sport} />
              </section>
              <LeagueMore extras={extras} m={m} sport={sport} />
              <About m={m} extras={extras} />
            </>
          )}
          {tab === "Lineups" && (
            <section className="panel pad">
              <h3>{tx("m.lineups")}</h3>
              <LineupsBlock m={m} sport={sport} />
            </section>
          )}
          {tab === "H2H" && (
            <section className="panel pad">
              <h3>{tx("m.h2hTitle")}</h3>
              <H2HTab h2h={extras?.h2h} m={m} sport={sport} />
            </section>
          )}
          {tab === "Standings" && (
            <section className="panel pad">
              <h3>{tx("m.standingsOf", { comp: m.competition })}</h3>
              <StandingsTab tables={extras?.standings} m={m} sport={sport} />
            </section>
          )}
          {tab === "Commentary" && (
            <section className="panel pad">
              <h3>{tx("m.commentary")}</h3>
              <Commentary m={m} />
            </section>
          )}
        </div>

        <aside className="mright">
          <section className="panel pad">
            <h3>{tx("m.stats")}</h3>
            <div className="stat-teams">
              <span><Crest src={m.homeLogo} name={m.home} size={20} /> {m.home}</span>
              <span>{m.away} <Crest src={m.awayLogo} name={m.away} size={20} /></span>
            </div>
            <Stats stats={rows} />
          </section>

          <section className="panel pad">
            <h3>{tx("m.about")}</h3>
            <dl className="info">
              <dt>{tx("m.match")}</dt><dd>{m.home} {tx("vs")} {m.away}</dd>
              <dt>{tx("m.competition")}</dt>
              <dd><Link href={`/${sport}/competition/${m.compSlug}`} className="plink">{m.competition}</Link></dd>
              {season && (<><dt>{tx("m.season")}</dt><dd>{season}</dd></>)}
              <dt>{tx("m.kickoff")}</dt><dd>{fmtFull(m.iso)}</dd>
              <dt>{tx("m.status")}</dt><dd>{m.live ? tx("f.live") : m.statusText || cap(m.state)}</dd>
              {m.htHome !== null && m.htAway !== null && (<><dt>{tx("m.halftime")}</dt><dd>{m.htHome} - {m.htAway}</dd></>)}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
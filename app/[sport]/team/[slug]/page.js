import { notFound } from "next/navigation";
import Link from "next/link";
import { isSport } from "@/lib/sports";
import { fetchTeam, fetchStandings, fetchTopScorers } from "@/lib/sportscore";
import { buildTeamStats } from "@/lib/teamStats";
import { fmtFull } from "@/lib/format";
import Crest from "@/components/Crest";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { sport, slug } = await params;
  const t = isSport(sport) ? await fetchTeam(sport, slug) : null;
  return t ? { title: `${t.name} – Schedule, Results, Form & Stats` } : {};
}

function MatchRow({ m, sport, team }) {
  const showScore = m.state === "finished" || m.live;
  return (
    <Link href={`/${sport}/match/${m.slug}`} className="mrow mlink2">
      <span className="tm">
        {m.live ? <b className="live-badge"><i />LIVE{m.minute ? ` ${m.minute}'` : ""}</b> : <span>{m.dayLabel}</span>}
        <small>{m.state === "finished" ? "FT" : m.time}</small>
      </span>
      <span className="t home">
        <span className="tname" style={m.home === team ? { fontWeight: 700 } : null}>{m.home}</span>
        <Crest src={m.homeLogo} name={m.home} />
      </span>
      <span className={m.live ? "sc livec" : showScore ? "sc" : "sc vs"}>
        {showScore ? `${m.hs ?? 0} - ${m.as ?? 0}` : "vs"}
      </span>
      <span className="t">
        <Crest src={m.awayLogo} name={m.away} />
        <span className="tname" style={m.away === team ? { fontWeight: 700 } : null}>{m.away}</span>
      </span>
      <span className="comp-note">{m.competition}</span>
    </Link>
  );
}

export default async function TeamPage({ params }) {
  const { sport, slug } = await params;
  if (!isSport(sport)) notFound();
  const t = await fetchTeam(sport, slug);
  if (!t) notFound();

  const s = buildTeamStats(t.name, t.matches);
  const [standings, scorers] = s.comp
    ? await Promise.all([fetchStandings(sport, s.comp.slug), fetchTopScorers(sport, s.comp.slug)])
    : [null, null];

  // league table: team wali table dhoondo, uske aas-paas ki 5 rows
  const table = (standings || []).find((tb) => tb.rows.some((r) => r.name === t.name));
  const idx = table ? table.rows.findIndex((r) => r.name === t.name) : -1;
  const around = table ? table.rows.slice(Math.max(0, idx - 2), idx + 3) : [];
  const me = idx >= 0 ? table.rows[idx] : null;

  const topScorers = (scorers || [])
    .flatMap((tb) => tb.rows)
    .filter((r) => r.team === t.name)
    .slice(0, 5);

  const next = s.live[0] || s.upcoming[0] || null;
  const gd = s.gf - s.ga;
  const posts = { GK: "Goalkeepers", G: "Goalkeepers", D: "Defenders", M: "Midfielders", F: "Forwards" };
  const squadGroups = t.squad.reduce((acc, p) => {
    const k = posts[String(p.position || "")[0]?.toUpperCase()] || "Players";
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <p className="crumb"><Link href={`/${sport}`}>Home</Link> › {s.comp && <>{s.comp.name} › </>}{t.name}</p>

      <div className="team-head">
        <Crest src={t.logo} name={t.name} size={64} round />
        <div>
          <h1>{t.name}</h1>
          {s.comp && <span className="muted">{s.comp.name}</span>}
        </div>
        {s.form.length > 0 && (
          <div className="form-dots" title="Last 5 matches">
            {s.form.map((x, i) => <span key={i} className={`f f-${x.res}`}>{x.res}</span>)}
          </div>
        )}
      </div>

      {s.live.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="sec-head sec-live"><span>Live now</span><span className="cnt">{s.live.length}</span></div>
          {s.live.map((m) => <MatchRow key={m.slug + m.id} m={m} sport={sport} team={t.name} />)}
        </div>
      )}

      <div className="team-grid">
        <div className="team-main">
          {/* Form summary */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="sec-head"><span>{t.name} form – last {s.played} matches</span></div>
            <div className="stat-grid" style={{ padding: 16 }}>
              <div className="panel"><b>{s.wins}</b><span>Wins</span></div>
              <div className="panel"><b>{s.draws}</b><span>Draws</span></div>
              <div className="panel"><b>{s.losses}</b><span>Losses</span></div>
              <div className="panel"><b>{gd > 0 ? `+${gd}` : gd}</b><span>Goal diff</span></div>
              <div className="panel"><b>{s.gf}</b><span>Goals for</span></div>
              <div className="panel"><b>{s.ga}</b><span>Goals against</span></div>
              <div className="panel"><b>{s.cleanSheets}</b><span>Clean sheets</span></div>
              <div className="panel"><b>{s.failedToScore}</b><span>Failed to score</span></div>
            </div>
            <div className="split2">
              <div><small>HOME</small><b>{s.homeRec}</b></div>
              <div><small>AWAY</small><b>{s.awayRec}</b></div>
            </div>
            {(s.biggestWin || s.biggestLoss) && (
              <div className="split2">
                {s.biggestWin && <div><small>BIGGEST WIN</small><b>{s.biggestWin.m.home} {s.biggestWin.m.hs}–{s.biggestWin.m.as} {s.biggestWin.m.away}</b></div>}
                {s.biggestLoss && <div><small>BIGGEST LOSS</small><b>{s.biggestLoss.m.home} {s.biggestLoss.m.hs}–{s.biggestLoss.m.as} {s.biggestLoss.m.away}</b></div>}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="sec-head sec-up"><span>Upcoming fixtures</span><span className="cnt">{s.upcoming.length}</span></div>
            {s.upcoming.length === 0 && <p className="empty">No upcoming fixtures.</p>}
            {s.upcoming.map((m) => <MatchRow key={m.slug + m.id} m={m} sport={sport} team={t.name} />)}
          </div>

          {/* Recent results */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="sec-head sec-fin"><span>Recent results</span><span className="cnt">{s.results.length}</span></div>
            {s.results.length === 0 && <p className="empty">No results yet.</p>}
            {s.results.map((x) => <MatchRow key={x.m.slug + x.m.id} m={x.m} sport={sport} team={t.name} />)}
          </div>

          {/* H2H */}
          {s.h2h.length > 0 && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="sec-head"><span>{t.name} head-to-head records</span></div>
              {s.h2h.map((h) => (
                <div className="h2h-row" key={h.opp}>
                  <Crest src={h.logo} name={h.opp} size={22} round />
                  <span className="h2h-name">{t.name} vs {h.opp}</span>
                  <span className="muted">{h.n} {h.n === 1 ? "meeting" : "meetings"} · {h.w}W {h.d}D {h.l}L</span>
                </div>
              ))}
            </div>
          )}

          {/* Squad (sirf tab jab API data de) */}
          {t.squad.length > 0 && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="sec-head"><span>{t.name} squad</span><span className="cnt">{t.squad.length}</span></div>
              {Object.entries(squadGroups).map(([group, list]) => (
                <div key={group}>
                  <div className="lh"><b>{group}</b></div>
                  <div className="squad-grid">
                    {list.map((p, i) => (
                      <span key={i} className="squad-p">
                        <i>{p.number || (p.name || "?")[0]}</i>
                        {sport === "football" && p.name ? <Link href={`/${sport}/player/${p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{p.name}</Link> : p.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* About + FAQ */}
          <div className="panel about" style={{ marginBottom: 16 }}>
            <div className="sec-head"><span>About {t.name}</span></div>
            <div style={{ padding: 16 }}>
              <p>
                {t.name} {t.country ? `is a ${sport} team from ${t.country}` : `is a ${sport} team`}
                {s.comp ? ` currently playing in ${s.comp.name}.` : "."}{" "}
                {s.played > 0 && `In their last ${s.played} matches they have ${s.wins} wins, ${s.draws} draws and ${s.losses} losses.`}
              </p>
              {next && <p style={{ marginTop: 8 }}>
                {s.live[0] ? "Currently playing: " : "Next match: "}
                {next.home} vs {next.away}{next.live ? "" : ` on ${fmtFull(next.iso)}`}.
              </p>}
            </div>
          </div>

          <div className="panel faq" style={{ marginBottom: 16 }}>
            <div className="sec-head"><span>Frequently asked questions about {t.name}</span></div>
            <details><summary>When does {t.name} play next?</summary>
              <p>{next ? `${next.home} vs ${next.away}, ${fmtFull(next.iso)}.` : "No upcoming fixture is listed yet."}</p></details>
            {s.comp && <details><summary>Which league does {t.name} play in?</summary><p>{s.comp.name}.</p></details>}
            {me && <details><summary>What position is {t.name} in the league table?</summary>
              <p>{t.name} is #{me.cells.pos}{me.cells.pts != null ? ` with ${me.cells.pts} points` : ""} in {s.comp.name}.</p></details>}
            <details><summary>How are {t.name} performing this season?</summary>
              <p>{s.wins}W {s.draws}D {s.losses}L in the last {s.played} matches, goals {s.gf}–{s.ga}.</p></details>
            {topScorers[0] && <details><summary>Who is {t.name}&apos;s top scorer?</summary>
              <p>{topScorers[0].name} with {topScorers[0].cells.goals} goals.</p></details>}
            {s.h2h[0] && <details><summary>Who is {t.name}&apos;s biggest rival?</summary>
              <p>Most meetings in this data: {s.h2h[0].opp} ({s.h2h[0].n}).</p></details>}
          </div>
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="team-side">
          {me && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="sec-head"><span>{s.comp.name} position</span></div>
              <div className="pos-big"><b>{me.cells.pos}</b><span>of {table.rows.length} teams</span></div>
              <table className="tbl">
                <thead><tr><th>#</th><th style={{ textAlign: "left" }}>Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
                <tbody>
                  {around.map((r) => (
                    <tr key={r.name} style={r.name === t.name ? { background: "var(--hover)", fontWeight: 700 } : null}>
                      <td>{r.cells.pos}</td>
                      <td style={{ textAlign: "left" }}>{r.name}</td>
                      <td>{r.cells.p ?? "-"}</td><td>{r.cells.gd ?? "-"}</td><td>{r.cells.pts ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link className="more" href={`/${sport}/competition/${s.comp.slug}`}>See full table ›</Link>
            </div>
          )}

          {next && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="sec-head"><span>{next.live ? "Live match" : "Next match"}</span></div>
              <div className="next-card">
                <div><Crest src={next.homeLogo} name={next.home} /> {next.home}</div>
                <b>{next.live ? `${next.hs ?? 0} - ${next.as ?? 0}` : "vs"}</b>
                <div><Crest src={next.awayLogo} name={next.away} /> {next.away}</div>
                <small className="muted">{next.live ? `LIVE ${next.minute || ""}'` : fmtFull(next.iso)}</small>
                <Link className="more" href={`/${sport}/match/${next.slug}`}>Match details</Link>
              </div>
            </div>
          )}

          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="sec-head"><span>Team info</span></div>
            <div className="info-rows">
              {t.country && <div><span>Country</span><b>{t.country}</b></div>}
              <div><span>Name</span><b>{t.name}</b></div>
              {s.comp && <div><span>Competition</span><b>{s.comp.name}</b></div>}
            </div>
          </div>

          {topScorers.length > 0 && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="sec-head"><span>Top scorers</span></div>
              {topScorers.map((r, i) => (
                <div className="h2h-row" key={r.name}>
                  <span className="muted">{i + 1}</span>
                  <Crest src={r.logo} name={r.name} size={22} round />
                  <Link className="h2h-name" href={`/${sport}/player/${r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`}>{r.name}</Link>
                  <b>{r.cells.goals ?? 0}</b>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
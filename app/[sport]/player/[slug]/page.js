import { notFound } from "next/navigation";
import Link from "next/link";
import { isSport } from "@/lib/sports";
import { fetchPlayer, fetchStandings, fetchTeam } from "@/lib/sportscore";
import { buildTeamStats } from "@/lib/teamStats";
import { slugify } from "@/lib/format";
import { show, splitPlayer, tableCols } from "@/lib/playerView";
import Crest from "@/components/Crest";
import MatchRow from "@/components/MatchRow";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { sport, slug } = await params;
  const p = isSport(sport) ? await fetchPlayer(sport, slug) : null;
  return p ? { title: `${p.name} – Player Profile & Stats`, description: `${p.name} player profile, statistics, recent results and upcoming matches.` } : {};
}

const find = (list, re) => list.find((x) => re.test(x.label))?.value;
const posGroups = { GK: "Goalkeepers", G: "Goalkeepers", D: "Defenders", M: "Midfielders", F: "Forwards", A: "Forwards" };

export default async function PlayerPage({ params, searchParams }) {
  const { sport, slug } = await params;
  const sp = await searchParams;
  if (!isSport(sport)) notFound();
  const p = await fetchPlayer(sport, slug);
  if (!p) notFound();

  const { profile, stats, tables } = splitPlayer(p.raw);
  const s = p.stats && typeof p.stats === "object" && !Array.isArray(p.stats) ? p.stats : {};

  // Player ki team ka data: next match, results, teammates, league table
  const teamName = show(s.team) || find(profile, /^(team|club|current team)/i) || null;
  const teamSlug = s.team_slug || (teamName ? slugify(teamName) : null);
  const team = teamSlug ? await fetchTeam(sport, teamSlug) : null;
  const ts = team ? buildTeamStats(team.name, team.matches) : null;
  const compName = show(s.competition) || ts?.comp?.name || null;

  const standings = ts?.comp ? await fetchStandings(sport, ts.comp.slug) : null;
  const table = (standings || []).find((tb) => tb.rows.some((r) => r.name === team?.name));
  const idx = table ? table.rows.findIndex((r) => r.name === team.name) : -1;
  const around = table ? table.rows.slice(Math.max(0, idx - 2), idx + 3) : [];

  const next = ts ? ts.live[0] || ts.upcoming[0] || null : null;
  const position = find(profile, /position/i);
  const nationality = find(profile, /nationality|country|nation/i);
  const age = find(profile, /^age$/i);
  const born = find(profile, /birth|born/i);
  const facts = [
    ["Position", position],
    ["Foot", find(profile, /foot/i)],
    ["Nationality", nationality],
    ["Born", born ? `${born}${age ? ` (${age})` : ""}` : age ? `${age} years` : null],
    ["Height", find(profile, /height/i)],
    ["Shirt", find(profile, /shirt|jersey|^number/i)],
    ["Market value", find(profile, /market|value/i)],
  ].filter(([, v]) => v);

  const goals = s.goals ?? find(stats, /^goals$/i);
  const matchesPlayed = s.matches ?? find(stats, /^matches$/i);
  const assists = s.assists ?? find(stats, /^assists$/i);

  const mates = (team?.squad || []).filter((x) => x?.name && x.name !== p.name);
  const mateGroups = mates.reduce((acc, x) => {
    const k = posGroups[String(x.position || "")[0]?.toUpperCase()] || "Players";
    (acc[k] ||= []).push(x);
    return acc;
  }, {});

  const about = [
    `${p.name} is ${position ? `a ${String(position).toLowerCase()}` : "a player"}${teamName ? ` who plays for ${teamName}` : ""}${nationality ? ` and represents ${nationality}` : ""}.`,
    goals != null && matchesPlayed != null
      ? `${compName ? `In ${compName}, ` : "This season, "}${p.name} has scored ${goals} ${Number(goals) === 1 ? "goal" : "goals"}${assists != null ? ` and provided ${assists} ${Number(assists) === 1 ? "assist" : "assists"}` : ""} in ${matchesPlayed} ${Number(matchesPlayed) === 1 ? "match" : "matches"}.`
      : null,
    next ? `Next up for ${team.name}: ${next.home} vs ${next.away} (${next.dayLabel}, ${next.time}).` : null,
  ].filter(Boolean);

  const faq = [
    teamName && [`Which team does ${p.name} play for?`, `${p.name} currently plays for ${teamName}${compName ? ` in ${compName}` : ""}.`],
    position && [`What position does ${p.name} play?`, `${p.name} plays as a ${String(position).toLowerCase()}.`],
    nationality && [`What is ${p.name}'s nationality?`, `${p.name} is from ${nationality}.`],
    goals != null && [`How many goals has ${p.name} scored?`, `${p.name} has scored ${goals} ${Number(goals) === 1 ? "goal" : "goals"}${matchesPlayed != null ? ` in ${matchesPlayed} matches` : ""}${compName ? ` in ${compName}` : ""}.`],
    assists != null && [`How many assists does ${p.name} have?`, `${p.name} has ${assists} ${Number(assists) === 1 ? "assist" : "assists"}${compName ? ` in ${compName}` : ""}.`],
    next && [`When is ${p.name}'s next match?`, `${team.name} play ${next.home === team.name ? next.away : next.home} on ${next.dayLabel} at ${next.time}.`],
  ].filter(Boolean);

  const nav = [
    ["overview", "Overview", true],
    ["next", "Next match", !!next],
    ["profile", "Profile", profile.length > 0],
    ["stats", "Statistics", stats.length > 0],
    ["results", "Recent results", !!ts?.results.length],
    ["fixtures", "Fixtures", !!ts?.upcoming.length],
    ...tables.map((t, i) => [`t${i}`, t.title, true]),
    ["standings", "League table", around.length > 0],
    ["mates", "Teammates", mates.length > 0],
    ["about", "About", true],
    ["faq", "FAQ", faq.length > 0],
  ].filter(([, , ok]) => ok);

  return (
    <>
      <p className="crumb">
        <Link href={`/${sport}`}>Home</Link> › {ts?.comp && <><Link href={`/${sport}/competition/${ts.comp.slug}`}>{ts.comp.name}</Link> › </>}
        {team && <><Link href={`/${sport}/team/${team.slug}`}>{team.name}</Link> › </>}
        {p.name}
      </p>

      {/* ---------- hero ---------- */}
      <section className="pl-hero panel" id="overview">
        <div className="pl-hero-main">
          <Crest src={p.logo} name={p.name} size={104} round />
          <div className="pl-hero-txt">
            <h1>{p.name}</h1>
            {teamName && (
              <p className="pl-sub">
                <Crest src={s.team_logo || team?.logo} name={teamName} size={20} round />
                {team ? <Link href={`/${sport}/team/${team.slug}`}>{teamName}</Link> : teamName}
                {compName && <span> · {compName}</span>}
              </p>
            )}
            {facts.length > 0 && (
              <dl className="pl-facts">
                {facts.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            )}
          </div>
        </div>
        {(matchesPlayed != null || goals != null || assists != null) && (
          <div className="pl-hero-stats">
            {[["Matches", matchesPlayed], ["Goals", goals], ["Assists", assists], ["Minutes", s.minutes]]
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <div key={k}><b>{v}</b><span>{k}</span></div>
              ))}
          </div>
        )}
      </section>

      <nav className="pl-nav" aria-label="Player sections">
        {nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <div className="layout">
        <div className="pl-main">
          {next && (
            <section className="panel pl-sec" id="next">
              <div className="sec-head sec-up"><span>{p.name}&apos;s next match</span></div>
              <MatchRow m={next} sport={sport} team={team.name} />
            </section>
          )}

          {profile.length > 0 && (
            <section className="panel pl-sec" id="profile">
              <div className="sec-head"><span>{p.name} profile</span></div>
              <dl className="kv">
                {profile.map((x) => (
                  <div key={x.label}><dt>{x.label}</dt><dd>{x.value}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {stats.length > 0 && (
            <section className="panel pl-sec" id="stats">
              <div className="sec-head"><span>Statistics</span><span className="cnt">{stats.length}</span></div>
              <div className="pl-tiles">
                {stats.map((x) => (
                  <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>
                ))}
              </div>
            </section>
          )}

          {ts?.results.length > 0 && (
            <section className="panel pl-sec" id="results">
              <div className="sec-head sec-fin"><span>{team.name} recent results</span><span className="cnt">{ts.results.length}</span></div>
              {ts.results.slice(0, 10).map((x) => <MatchRow key={x.m.slug + x.m.id} m={x.m} sport={sport} team={team.name} />)}
            </section>
          )}

          {ts?.upcoming.length > 0 && (
            <section className="panel pl-sec" id="fixtures">
              <div className="sec-head sec-up"><span>{team.name} upcoming fixtures</span><span className="cnt">{ts.upcoming.length}</span></div>
              {ts.upcoming.slice(0, 10).map((m) => <MatchRow key={m.slug + m.id} m={m} sport={sport} team={team.name} />)}
            </section>
          )}

          {/* API jo bhi lists deti hai (transfers, career, match log ...) wo yahan khud aa jati hain */}
          {tables.map((t, i) => {
            const cols = tableCols(t.rows);
            if (!cols.length) return null;
            return (
              <section className="panel pl-sec" id={`t${i}`} key={t.title + i}>
                <div className="sec-head"><span>{p.name} {t.title.toLowerCase()}</span><span className="cnt">{t.rows.length}</span></div>
                <div className="tbl-wrap" style={{ margin: 0 }}>
                  <table className="tbl pl-tbl">
                    <thead><tr>{cols.map((c) => <th key={c}>{c.replace(/_/g, " ")}</th>)}</tr></thead>
                    <tbody>
                      {t.rows.slice(0, 25).map((r, n) => (
                        <tr key={n}>{cols.map((c) => <td key={c}>{show(r[c]) ?? "–"}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {around.length > 0 && (
            <section className="panel pl-sec" id="standings">
              <div className="sec-head"><span>{ts.comp.name} table</span><Link href={`/${sport}/competition/${ts.comp.slug}`} className="cnt">Full table</Link></div>
              <table className="tbl">
                <thead><tr><th className="c-pos">#</th><th className="c-name">Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
                <tbody>
                  {around.map((r) => (
                    <tr key={r.name} style={r.name === team.name ? { background: "var(--hover)", fontWeight: 700 } : null}>
                      <td className="c-pos">{r.cells.pos}</td>
                      <td className="c-name"><Link href={`/${sport}/team/${slugify(r.name)}`} className="tbl-team"><Crest src={r.logo} name={r.name} size={20} round /><span>{r.name}</span></Link></td>
                      <td>{r.cells.p ?? "–"}</td><td>{r.cells.gd ?? "–"}</td><td className="c-pts">{r.cells.pts ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {mates.length > 0 && (
            <section className="panel pl-sec" id="mates">
              <div className="sec-head"><span>{p.name}&apos;s teammates</span><span className="cnt">{mates.length}</span></div>
              {Object.entries(mateGroups).map(([group, list]) => (
                <div key={group}>
                  <div className="lh"><b>{group}</b></div>
                  <div className="squad-grid">
                    {list.map((x, i) => (
                      <span key={i} className="squad-p">
                        <i>{x.number || x.name[0]}</i>
                        <Link href={`/${sport}/player/${x.slug || slugify(x.name)}`}>{x.name}</Link>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="panel pl-sec" id="about">
            <div className="sec-head"><span>About {p.name}</span></div>
            <div className="pl-text">{about.map((t, i) => <p key={i}>{t}</p>)}</div>
          </section>

          {faq.length > 0 && (
            <section className="panel pl-sec" id="faq">
              <div className="sec-head"><span>Frequently asked questions about {p.name}</span></div>
              <div className="faq">
                {faq.map(([q, a]) => (
                  <details key={q}><summary>{q}</summary><p>{a}</p></details>
                ))}
              </div>
            </section>
          )}

          {process.env.NODE_ENV !== "production" && sp.raw && (
            <section className="panel pl-sec">
              <div className="sec-head"><span>Raw API response (dev only)</span></div>
              <pre className="pl-raw">{JSON.stringify(p.raw, null, 2).slice(0, 8000)}</pre>
            </section>
          )}
        </div>

        <aside className="side">
          {team && (
            <div className="side-card">
              <h3>Current team</h3>
              <Link href={`/${sport}/team/${team.slug}`} className="side-item"><Crest src={team.logo} name={team.name} size={26} round /> {team.name}</Link>
              {ts?.comp && <Link href={`/${sport}/competition/${ts.comp.slug}`} className="side-item"><Crest src={ts.comp.logo} name={ts.comp.name} size={26} round /> {ts.comp.name}</Link>}
            </div>
          )}
          {ts && ts.played > 0 && (
            <div className="side-card">
              <h3>{team.name} form</h3>
              <div className="pl-form">
                {ts.form.map((x, i) => <span key={i} className={`f-${x.res}`}>{x.res}</span>)}
              </div>
              <p className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>{ts.wins}W {ts.draws}D {ts.losses}L · {ts.gf}-{ts.ga}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

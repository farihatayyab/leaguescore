import { notFound } from "next/navigation";
import Link from "next/link";
import { isSport } from "@/lib/sports";
import { fetchBracket, fetchStandings, fetchTopScorers } from "@/lib/sportscore";
import { getCompetitionFixtures } from "@/lib/data";
import { slugify, todayKey, shiftDay } from "@/lib/format";
import Tabs from "@/components/Tabs";
import DataTable from "@/components/DataTable";
import Bracket from "@/components/Bracket";
import Crest from "@/components/Crest";
import MatchRow from "@/components/MatchRow";

export const revalidate = 120;

const pretty = (s) => s.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const n = pretty(slug);
  return { title: `${n} – Fixtures, Results, Standings & Top Scorers`, description: `${n} live scores, fixtures, results, standings table, top scorers and assists.` };
}

const dayTitle = (key, today) =>
  key === today ? "Today" : key === shiftDay(today, -1) ? "Yesterday" : key === shiftDay(today, 1) ? "Tomorrow" :
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default async function CompetitionPage({ params }) {
  const { sport, slug } = await params;
  if (!isSport(sport) || !/^[a-z0-9-]+$/.test(slug)) notFound();

  // sab API calls ek saath (cache hoti hain)
  const [standings, scorers, assists, bracket, fixtureDays] = await Promise.all([
    fetchStandings(sport, slug),
    fetchTopScorers(sport, slug, "goals"),
    fetchTopScorers(sport, slug, "assists"),
    fetchBracket(sport, slug),
    getCompetitionFixtures(sport, slug),
  ]);

  const today = todayKey();
  const fixtureMatches = fixtureDays.flatMap((d) => d.matches);
  const first = fixtureMatches[0];
  const name = bracket?.competition || first?.competition || pretty(slug);
  const logo = bracket?.logo || first?.compLogo || "";

  const mainTable = (standings || []).find((t) => t.rows.length) || null;
  const leader = mainTable?.rows[0] || null;
  const teams = Array.from(
    new Map((standings || []).flatMap((t) => t.rows).filter((r) => r.name).map((r) => [r.name, r])).values()
  );
  const topScorer = (scorers || []).flatMap((t) => t.rows)[0] || null;
  const topAssist = (assists || []).flatMap((t) => t.rows)[0] || null;
  const hasBracket = bracket?.rounds?.some((r) => r.matchups?.length);

  const topList = (tables, key) => (tables || []).flatMap((t) => t.rows).slice(0, 8).map((r) => ({ ...r, val: r.cells[key] }));
  const sideScorers = topList(scorers, "goals");
  const sideAssists = topList(assists, "assists");

  const fixturesNode = fixtureDays.length ? (
    <>
      {fixtureDays.map((d) => (
        <section key={d.key} style={{ marginBottom: 14 }}>
          <div className={`sec-head ${d.key >= today ? "sec-up" : "sec-fin"}`}>
            <span>{dayTitle(d.key, today)}</span><span className="cnt">{d.matches.length}</span>
          </div>
          {d.matches.map((m) => <MatchRow key={m.slug + m.id} m={m} sport={sport} hideComp />)}
        </section>
      ))}
    </>
  ) : (
    <p className="empty">No fixtures or results for this competition between yesterday and the next two days.</p>
  );

  const teamsNode = teams.length ? (
    <div className="teams-grid">
      {teams.map((t) => (
        <Link key={t.name} href={`/${sport}/team/${slugify(t.name)}`} className="teams-item">
          <Crest src={t.logo} name={t.name} size={32} round />
          <span>{t.name}</span>
        </Link>
      ))}
    </div>
  ) : (
    <p className="empty">The list of teams is not available for this competition.</p>
  );

  const items = [
    { key: "fx", label: "Fixtures & Results", node: fixturesNode },
    { key: "st", label: "Standings", node: <DataTable tables={standings} sport={sport} empty="Standings are not available for this competition." /> },
    { key: "sc", label: "Top scorers", node: <DataTable tables={scorers} sport={sport} linkPlayers empty="Top scorers are not available for this competition." /> },
    { key: "as", label: "Assists", node: <DataTable tables={assists} sport={sport} linkPlayers empty="Assist leaders are not available for this competition." /> },
    { key: "tm", label: `Teams${teams.length ? ` (${teams.length})` : ""}`, node: teamsNode },
    ...(hasBracket ? [{ key: "br", label: "Bracket", node: <Bracket data={bracket} /> }] : []),
  ];

  const faq = [
    leader && [`Who is leading the ${name} table?`, `${leader.name} are top of the ${name} table${leader.cells.pts != null ? ` with ${leader.cells.pts} points` : ""}${leader.cells.p != null ? ` after ${leader.cells.p} matches` : ""}.`],
    topScorer && [`Who is the top scorer in ${name}?`, `${topScorer.name}${topScorer.team ? ` (${topScorer.team})` : ""} leads the scoring charts${topScorer.cells.goals != null ? ` with ${topScorer.cells.goals} goals` : ""}.`],
    topAssist && [`Who has the most assists in ${name}?`, `${topAssist.name}${topAssist.team ? ` (${topAssist.team})` : ""} leads the assists chart${topAssist.cells.assists != null ? ` with ${topAssist.cells.assists}` : ""}.`],
    teams.length > 0 && [`How many teams play in ${name}?`, `${teams.length} teams are listed in the ${name} standings.`],
    first && [`Where can I follow ${name} live scores?`, `${name} fixtures, live scores and results are updated automatically on this page.`],
  ].filter(Boolean);

  const Mini = ({ title, list, label }) =>
    list.length > 0 && (
      <div className="side-card">
        <h3>{title}</h3>
        {list.map((r, i) => (
          <Link key={i} href={`/${sport}/player/${slugify(r.name || "")}`} className="side-item">
            <b className="mini-n">{i + 1}</b>
            <Crest src={r.logo} name={r.name || "?"} size={24} round />
            <span className="mini-t">{r.name}{r.team && <small> · {r.team}</small>}</span>
            <b className="mini-v" title={label}>{r.val ?? "–"}</b>
          </Link>
        ))}
      </div>
    );

  return (
    <>
      <p className="crumb"><Link href={`/${sport}`}>Home</Link> › {name}</p>

      <section className="pl-hero panel">
        <div className="pl-hero-main">
          <Crest src={logo} name={name} size={84} round />
          <div className="pl-hero-txt">
            <h1>{name}</h1>
            <p className="pl-sub">Live scores, fixtures, results, standings and top players</p>
            <dl className="pl-facts">
              {teams.length > 0 && <div><dt>Teams</dt><dd>{teams.length}</dd></div>}
              {leader && <div><dt>Leader</dt><dd>{leader.name}</dd></div>}
              {topScorer && <div><dt>Top scorer</dt><dd>{topScorer.name}{topScorer.cells.goals != null && ` (${topScorer.cells.goals})`}</dd></div>}
              {topAssist && <div><dt>Most assists</dt><dd>{topAssist.name}{topAssist.cells.assists != null && ` (${topAssist.cells.assists})`}</dd></div>}
            </dl>
          </div>
        </div>
      </section>

      <div className="layout">
        <div className="pl-main">
          <Tabs items={items} />

          {faq.length > 0 && (
            <section className="panel pl-sec" style={{ marginTop: 16 }}>
              <div className="sec-head"><span>Frequently asked questions about {name}</span></div>
              <div className="faq">
                {faq.map(([q, a]) => (
                  <details key={q}><summary>{q}</summary><p>{a}</p></details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="side">
          <Mini title="Top scorers" list={sideScorers} label="Goals" />
          <Mini title="Top assists" list={sideAssists} label="Assists" />
          {mainTable && (
            <div className="side-card">
              <h3>Top of the table</h3>
              {mainTable.rows.slice(0, 5).map((r) => (
                <Link key={r.name} href={`/${sport}/team/${slugify(r.name)}`} className="side-item">
                  <b className="mini-n">{r.cells.pos}</b>
                  <Crest src={r.logo} name={r.name} size={24} round />
                  <span className="mini-t">{r.name}</span>
                  <b className="mini-v">{r.cells.pts ?? "–"}</b>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

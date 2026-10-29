import Link from "next/link";
import { featuredRank } from "@/lib/competitions";
import { slugify } from "@/lib/format";
import { fetchPlayer, fetchTopScorers } from "@/lib/sportscore";
import { TOP_COMPETITIONS, TOP_LEAGUES, TOP_PLAYERS } from "@/lib/sidebarData";
import Crest from "./Crest";
import WinPoll from "./WinPoll";
import { SportScoreBadge } from "./Footer";

// list ke har item ko aaj ke matches se jod deta hai (asli slug + logo mil jata hai)
function resolve(list, matches) {
  return list.map((c) => {
    const m = matches.find((x) => c.re.test(x.competition));
    return {
      label: c.label,
      slug: m?.compSlug || c.slug,
      logo: m?.compLogo || "",
      live: m ? matches.filter((x) => x.compSlug === m.compSlug && x.live).length : 0,
    };
  });
}

function CompCard({ title, items, sport }) {
  return (
    <div className="side-card">
      <h3>{title}</h3>
      {items.map((c) => (
        <Link className="side-item" key={c.slug} href={`/${sport}/competition/${c.slug}`}>
          <Crest src={c.logo} name={c.label} size={22} round />
          <span className="si-name">{c.label}</span>
          {c.live > 0 && <em className="si-live">{c.live} live</em>}
        </Link>
      ))}
    </div>
  );
}

export default async function Sidebar({ matches, sport, comp = "" }) {
  const live = matches.filter((m) => m.live);
  const upcoming = matches.filter((m) => m.state === "scheduled").sort((a, b) => a.iso.localeCompare(b.iso));
  const pick =
    [...live].sort((a, b) => featuredRank(a.competition) - featuredRank(b.competition))[0] ||
    upcoming[0] ||
    matches[0];

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi",
  });

  const topComps = resolve(TOP_COMPETITIONS, matches);
  const topLeagues = resolve(TOP_LEAGUES, matches);

  // Football ke liye extra sections (Player aur Top scorers API)
  let players = [];
  let scorers = [];
  if (sport === "football") {
    const [pl, sc] = await Promise.all([
      Promise.all(TOP_PLAYERS.map((n) => fetchPlayer("football", slugify(n)))),
      fetchTopScorers("football", topLeagues[0].slug),
    ]);
    players = TOP_PLAYERS.map((name, i) => ({ name, slug: slugify(name), logo: pl[i]?.logo || "" }));
    scorers = (sc?.[0]?.rows || []).slice(0, 5);
  }

  // aaj ke matches wali competitions (click par list filter hoti hai)
  const comps = Object.values(
    matches.reduce((acc, m) => {
      (acc[m.compSlug] ||= { slug: m.compSlug, name: m.competition, logo: m.compLogo, n: 0, live: 0 }).n++;
      if (m.live) acc[m.compSlug].live++;
      return acc;
    }, {})
  )
    .sort((a, b) => featuredRank(a.name) - featuredRank(b.name) || b.live - a.live || b.n - a.n)
    .slice(0, 14);

  return (
    <aside className="side">
      {pick && (
        <div className="live-now">
          <div className="ln-top">{pick.live ? <><i /> LIVE NOW</> : "FEATURED MATCH"}</div>
          <p className="ln-league">{pick.competition}</p>
          <div className="ln-teams">
            <div>
              <Crest src={pick.homeLogo} name={pick.home} size={44} />
              <b>{pick.home}</b>
            </div>
            <div className="ln-score">
              {pick.state === "scheduled" ? "vs" : `${pick.hs ?? 0} - ${pick.as ?? 0}`}
              <small>{pick.live ? "In play" : pick.time}</small>
            </div>
            <div>
              <Crest src={pick.awayLogo} name={pick.away} size={44} />
              <b>{pick.away}</b>
            </div>
          </div>
          <Link href={`/${pick.sport}/match/${pick.slug}`} className="ln-btn">Match details →</Link>
        </div>
      )}

      {pick && <WinPoll id={`${pick.sport}:${pick.slug}`} home={pick.home} away={pick.away} />}

      <div className="date-card">
        <h3>{dateLabel}</h3>
        <span className="muted">{matches.length} matches · </span>
        <b className="red">{live.length} live</b>
      </div>

      <CompCard title="Top Competitions" items={topComps} sport={sport} />
      <CompCard title="Top Leagues" items={topLeagues} sport={sport} />

      {players.length > 0 && (
        <div className="side-card">
          <h3>Top Players</h3>
          {players.map((p) => (
            <Link className="side-item" key={p.slug} href={`/${sport}/player/${p.slug}`}>
              <Crest src={p.logo} name={p.name} size={24} round />
              <span className="si-name">{p.name}</span>
            </Link>
          ))}
        </div>
      )}

      {scorers.length > 0 && (
        <div className="side-card">
          <h3>Top scorers · {topLeagues[0].label}</h3>
          {scorers.map((r, i) => (
            <Link className="side-item" key={i} href={`/${sport}/player/${slugify(r.name || "")}`}>
              <span className="si-rank">{i + 1}</span>
              <Crest src={r.logo} name={r.name || "?"} size={24} round />
              <span className="si-name">{r.name}</span>
              <b className="si-goals">{r.cells.goals ?? r.cells.pts ?? ""}</b>
            </Link>
          ))}
        </div>
      )}

      {comps.length > 0 && (
        <div className="side-card">
          <h3>Competitions today</h3>
          {comps.map((c) => (
            <Link className={c.slug === comp ? "side-item on" : "side-item"} key={c.slug} href={`/${sport}?comp=${c.slug}`}>
              <Crest src={c.logo} name={c.name} size={20} round />
              <span className="si-name">{c.name}</span>
              {c.live > 0 && <em className="si-live">{c.live} live</em>}
              <span className="si-n">{c.n}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="side-card attr">
        <h3>Data provider</h3>
        <p className="muted">Live scores and match data are provided by SportScore's free API.</p>
        <SportScoreBadge />
      </div>
    </aside>
  );
}
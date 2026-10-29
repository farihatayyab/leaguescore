import { fetchMatch, fetchMatches, fetchMatchesByDate, fetchStandings, fetchTeam } from "./sportscore";
import { slugify } from "./format";

export async function getMatches(sport = "football") {
  return (await fetchMatches(sport)) ?? [];
}

export async function getMatch(sport, slug) {
  return fetchMatch(sport, slug);
}

export async function getMatchesByDate(sport = "football", date = "") {
  return (await fetchMatchesByDate(sport, date)) ?? { matches: [], days: [] };
}

// Match page ka extra data: standings, H2H, league ke matches, positions
export async function getMatchExtras(sport, m) {
  const [standings, homeTeam, awayTeam, all] = await Promise.all([
    fetchStandings(sport, m.compSlug),
    fetchTeam(sport, slugify(m.home)),
    fetchTeam(sport, slugify(m.away)),
    fetchMatches(sport),
  ]);

  // teeno sources ke matches ek jagah, duplicates hata kar
  const seen = new Set();
  const pool = [...(homeTeam?.matches || []), ...(awayTeam?.matches || []), ...(all || [])].filter((x) => {
    const k = `${x.slug}-${x.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // standings: wo table rakho jisme ye dono teams hon
  const isMine = (n) => n === m.home || n === m.away;
  const tables = (standings || []).filter((t) => t.rows.length);
  const mine = tables.filter((t) => t.rows.some((r) => isMine(r.name)));
  const st = (mine.length ? mine : tables.slice(0, 1)).slice(0, 1);
  const rowOf = (name) => st[0]?.rows.find((r) => r.name === name) || null;

  // H2H
  const list = pool
    .filter(
      (x) =>
        x.state === "finished" &&
        x.slug !== m.slug &&
        x.hs != null &&
        x.as != null &&
        ((x.home === m.home && x.away === m.away) || (x.home === m.away && x.away === m.home))
    )
    .sort((a, b) => b.iso.localeCompare(a.iso));
  let homeWins = 0, awayWins = 0, draws = 0;
  for (const x of list) {
    const hg = x.home === m.home ? x.hs : x.as;
    const ag = x.home === m.home ? x.as : x.hs;
    if (hg > ag) homeWins++;
    else if (hg < ag) awayWins++;
    else draws++;
  }

  // More in the league: isi competition ke matches
  const sameComp = pool.filter((x) => x.compSlug === m.compSlug && x.slug !== m.slug);
  const recent = sameComp.filter((x) => x.state === "finished").sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 6);
  const upcoming = sameComp.filter((x) => x.state === "scheduled").sort((a, b) => a.iso.localeCompare(b.iso)).slice(0, 6);

  const hr = rowOf(m.home);
  const ar = rowOf(m.away);
  return {
    standings: st,
    h2h: { list, homeWins, awayWins, draws },
    recent,
    upcoming,
    homeRow: hr && { pos: hr.cells.pos, p: hr.cells.p, pts: hr.cells.pts },
    awayRow: ar && { pos: ar.cells.pos, p: ar.cells.p, pts: ar.cells.pts },
  };
}
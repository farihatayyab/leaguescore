// Team ke matches se form, record, H2H wagairah calculate karta hai
const byIsoDesc = (a, b) => b.iso.localeCompare(a.iso);
const byIsoAsc = (a, b) => a.iso.localeCompare(b.iso);

export function buildTeamStats(name, matches) {
  const rows = matches
    .filter((m) => m.state === "finished" && m.hs != null && m.as != null)
    .map((m) => {
      const home = m.home === name;
      const gf = home ? m.hs : m.as;
      const ga = home ? m.as : m.hs;
      return {
        m,
        home,
        gf,
        ga,
        res: gf > ga ? "W" : gf < ga ? "L" : "D",
        opp: home ? m.away : m.home,
        oppLogo: home ? m.awayLogo : m.homeLogo,
      };
    })
    .sort((a, b) => byIsoDesc(a.m, b.m));

  const count = (list, r) => list.filter((x) => x.res === r).length;
  const sum = (list, k) => list.reduce((s, x) => s + x[k], 0);
  const homeRows = rows.filter((x) => x.home);
  const awayRows = rows.filter((x) => !x.home);
  const rec = (l) => `${count(l, "W")}W ${count(l, "D")}D ${count(l, "L")}L`;

  const biggestWin = rows.filter((x) => x.res === "W").sort((a, b) => b.gf - b.ga - (a.gf - a.ga))[0] || null;
  const biggestLoss = rows.filter((x) => x.res === "L").sort((a, b) => b.ga - b.gf - (a.ga - a.gf))[0] || null;

  // H2H: har opponent ke against record
  const h2hMap = {};
  for (const x of rows) {
    const h = (h2hMap[x.opp] ||= { opp: x.opp, logo: x.oppLogo, w: 0, d: 0, l: 0, n: 0, last: x.m });
    h.n++;
    h[x.res.toLowerCase()]++;
  }
  const h2h = Object.values(h2hMap).sort((a, b) => b.n - a.n || byIsoDesc(a.last, b.last));

  // sab se zyada khele gaye competition ko "main" maante hain
  const compCount = {};
  for (const m of matches) compCount[m.compSlug] = (compCount[m.compSlug] || 0) + 1;
  const topSlug = Object.keys(compCount).sort((a, b) => compCount[b] - compCount[a])[0];
  const comp = matches.find((m) => m.compSlug === topSlug) || null;

  return {
    played: rows.length,
    wins: count(rows, "W"),
    draws: count(rows, "D"),
    losses: count(rows, "L"),
    gf: sum(rows, "gf"),
    ga: sum(rows, "ga"),
    cleanSheets: rows.filter((x) => x.ga === 0).length,
    failedToScore: rows.filter((x) => x.gf === 0).length,
    form: rows.slice(0, 5).reverse(), // purana -> naya
    homeRec: rec(homeRows),
    awayRec: rec(awayRows),
    biggestWin,
    biggestLoss,
    results: rows,
    live: matches.filter((m) => m.live),
    upcoming: matches.filter((m) => m.state === "scheduled").sort(byIsoAsc),
    h2h,
    comp: comp && { name: comp.competition, slug: comp.compSlug, logo: comp.compLogo },
  };
}
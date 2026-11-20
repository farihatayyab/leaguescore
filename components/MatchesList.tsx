"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLive } from "@/lib/useLive";
import { featuredRank } from "@/lib/competitions";
import FilterTabs from "./FilterTabs";
import Crest from "./Crest";
import Flag from "./Flag";
import { getMatchCountryInfo, matchesQuery } from "@/lib/countries";
import type { Match, MatchState, StatusFilter } from "@/types/match";

interface Props {
  initial: Match[]; // server se aaye is date ke matches (fixtures: max 200)
  sport: string;
  date: string;
  isToday: boolean; // sirf aaj ke din live polling chalti hai
  q?: string;
  comp?: string;
}

interface Group {
  slug: string;
  name: string;
  logo: string;
  label: string; // country ya region ("Brazil" / "Asia" / "")
  countryCode: string;
  countryFlag: string;
  items: Match[];
}

const SECTIONS: [MatchState, string, string][] = [
  ["live", "Live now", "sec-live"],
  ["scheduled", "Scheduled", "sec-up"],
  ["finished", "Finished", "sec-fin"],
  ["other", "Postponed / other", "sec-fin"],
];

// poore group ka ek hi round ho to header mein dikhao ("Round 15")
const roundOf = (g: Group) => {
  const r = (g.items[0]?.round || "").trim();
  if (!r || !g.items.every((m) => m.round === r)) return "";
  return /^\d+$/.test(r) ? `Round ${r}` : r; // "8" -> "Round 8", "Round 8" jaisa hai waisa
};

const FAV_KEY = "leaguescore:favs";
const favId = (m: Match) => `${m.sport}:${m.slug}`;

export default function MatchesList({ initial, sport, date, isToday, q = "", comp = "" }: Props) {
  const all = useLive(initial, { sport, date, poll: isToday });
  const [status, setStatus] = useState<StatusFilter>("all");
  const [shown, setShown] = useState(15);
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {}
  }, []);

  function toggleFav(m: Match) {
    const id = favId(m);
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {}
  }

  // search (?q=) aur competition (?comp=)
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // API kabhi kabhi ek hi match do baar bhejti hai -> duplicates hata do (warna React key error)
    const seen = new Set<string>();
    const unique = all.filter((m) => {
      const k = `${m.slug}-${m.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // team / competition / country / region (Japan, Algeria, Asia...) sab par search
    return unique.filter((m) => (!comp || m.compSlug === comp) && (!needle || matchesQuery(m, needle)));
  }, [all, q, comp]);

  // Status filter: client par, fetch kiye hue matches par hi
  const counts: Record<StatusFilter, number> = {
    all: matches.length,
    live: matches.filter((m) => m.state === "live").length,
    scheduled: matches.filter((m) => m.state === "scheduled").length,
    finished: matches.filter((m) => m.state === "finished").length,
    fav: matches.filter((m) => favs.includes(favId(m))).length,
  };

  const visible = status === "fav" ? matches.filter((m) => favs.includes(favId(m))) : matches;

  const sections = SECTIONS.filter(([k]) => status === "all" || status === "fav" || k === status)
    .map(([key, title, cls]) => {
      const list = visible
        .filter((m) => m.state === key)
        .sort((a, b) => (key === "finished" ? b.iso.localeCompare(a.iso) : a.iso.localeCompare(b.iso)));

      const groups = Object.values(
        list.reduce<Record<string, Group>>((acc, m) => {
          const info = getMatchCountryInfo(m);
          const key = `${m.compSlug}|${info.countryCode || info.label}`;
          (acc[key] ||= {
            slug: m.compSlug,
            name: m.competition,
            logo: m.compLogo,
            label: info.label,
            countryCode: info.countryCode,
            countryFlag: info.countryFlag,
            items: [],
          }).items.push(m);
          return acc;
        }, {})
      ).sort(
        (a, b) =>
          featuredRank(a.name) - featuredRank(b.name) ||
          b.items.filter((m) => m.live).length - a.items.filter((m) => m.live).length ||
          a.name.localeCompare(b.name)
      );
      return { key, title, cls, total: list.length, groups };
    })
    .filter((s) => s.total);

  const hasMore = sections.some((s) => s.groups.length > shown);

  return (
    <>
      <FilterTabs
        value={status}
        counts={counts}
        onChange={(next) => {
          setStatus(next);
          setShown(15);
        }}
      />

      {(q || comp) && (
        <p className="active-filter">
          Showing {q && <b>“{q}”</b>} {comp && <b>{matches[0]?.competition || comp}</b>}
          <Link href={`/${sport}${isToday ? "" : `?date=${date}`}`}>Clear</Link>
        </p>
      )}

      {!sections.length && (
        <p className="empty">
          {status === "fav"
            ? "Tap the ☆ next to a match to add it to your favorites."
            : all.length === 0
            ? "No matches found for this date."
            : "No matches in this tab."}
        </p>
      )}

      {sections.map((s) => (
        <section key={s.key}>
          <div className={`sec-head ${s.cls}`}>
            <span>{s.title}</span>
            <span className="cnt">{s.total}</span>
          </div>

          {s.groups.slice(0, shown).map((g) => (
            <div key={`${g.slug}|${g.countryCode || g.label}`}>
              <div className="lh">
                {g.countryFlag ? (
                  <Flag src={g.countryFlag} name={g.label} size={12} />
                ) : (
                  <Crest src={g.logo} name={g.name} size={20} round />
                )}
                <span className="lh-name">
                  <b>{g.name}</b>
                  {g.label && g.label.toLowerCase() !== g.name.toLowerCase() && <span className="lh-country"> · {g.label}</span>}
                  {roundOf(g) && <span className="lh-country"> {roundOf(g)}</span>}
                </span>
                {featuredRank(g.name) !== 999 && <span className="fav-flag">Top</span>}
              </div>

              {g.items.map((m) => {
                const isFav = favs.includes(favId(m));
                const note =
                  m.state === "scheduled" && /delay|postpon/i.test(m.statusText)
                    ? m.statusText
                    : m.day && m.day !== date
                    ? m.dayLabel // dusre din ka match ho to date likh do
                    : "";
                const noScore = m.state === "scheduled" || m.state === "other";
                return (
                  <div className="mrow" key={`${m.slug}-${m.id}`}>
                    <button
                      className={isFav ? "mstar on" : "mstar"}
                      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={isFav}
                      onClick={() => toggleFav(m)}
                    >
                      {isFav ? "★" : "☆"}
                    </button>
                    <Link href={`/${m.sport}/match/${m.slug}`} className="mlink">
                      <span className="tm">
                        {m.state === "live" ? (
                          <b className="live-badge"><i />LIVE{m.minute ? ` ${m.minute}'` : ""}</b>
                        ) : m.state === "finished" ? (
                          <b>FT</b>
                        ) : (
                          <span>{m.time}</span>
                        )}
                        {note && <small>{note}</small>}
                      </span>
                      <span className="t home">
                        <span className="tname">{m.home}</span>
                        <Crest src={m.homeLogo} name={m.home} />
                      </span>
                      <span className={noScore ? "sc vs" : m.live ? "sc livec" : "sc"}>
                        {noScore ? "vs" : `${m.hs ?? 0} - ${m.as ?? 0}`}
                      </span>
                      <span className="t">
                        <Crest src={m.awayLogo} name={m.away} />
                        <span className="tname">{m.away}</span>
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}

      {hasMore && (
        <button className="more" onClick={() => setShown(shown + 15)}>
          Show more competitions
        </button>
      )}
    </>
  );
}
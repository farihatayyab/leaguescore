import Link from "next/link";
import { SPORTS } from "@/lib/sports";
import { shiftDay, todayKey } from "@/lib/format";
import { INFO_LINKS, SITE, SOCIALS } from "@/lib/site";
import { TOP_COMPETITIONS, TOP_LEAGUES } from "@/lib/sidebarData";
import BackToTop from "./BackToTop";

export function SportScoreBadge({ className = "" }) {
  // SportScore API ki terms: visible dofollow link + anchor text "SportScore"
  return (
    <a
      href="https://sportscore.com/"
      rel="dofollow"
      title="Sports data by SportScore"
      className={`attr-badge ${className}`}
    >
      Powered by SportScore
    </a>
  );
}

const ICONS = {
  twitter: <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />,
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  telegram: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  youtube: (
    <>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </>
  ),
};

// Har sport ke columns: Live Scores / kal ke results / kal ke fixtures + kuch badi competitions
const EXTRA = {
  football: [{ href: "/news", label: "Football News" }],
  basketball: [
    { href: "/basketball/competition/nba", label: "NBA" },
    { href: "/basketball/competition/euroleague", label: "EuroLeague" },
  ],
  cricket: [
    { href: "/cricket/competition/indian-premier-league", label: "Indian Premier League" },
    { href: "/cricket/competition/pakistan-super-league", label: "Pakistan Super League" },
    { href: "/cricket/competition/big-bash-league", label: "Big Bash League" },
  ],
  tennis: [],
};

export default function Footer() {
  const today = todayKey();
  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-cols">
          {SPORTS.map((s) => (
            <nav key={s.key} aria-label={s.label}>
              <h4>{s.label}</h4>
              <ul>
                <li><Link href={`/${s.key}`}>Live Scores</Link></li>
                <li><Link href={`/${s.key}?date=${yesterday}`}>Yesterday&apos;s Results</Link></li>
                <li><Link href={`/${s.key}?date=${tomorrow}`}>Tomorrow&apos;s Fixtures</Link></li>
                {EXTRA[s.key].map((l) => (
                  <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="Top competitions">
            <h4>Top Competitions</h4>
            <ul>
              {TOP_COMPETITIONS.map((c) => (
                <li key={c.slug}><Link href={`/football/competition/${c.slug}`}>{c.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Top leagues">
            <h4>Top Leagues</h4>
            <ul>
              {TOP_LEAGUES.map((c) => (
                <li key={c.slug}><Link href={`/football/competition/${c.slug}`}>{c.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="foot-line" />

        <div className="foot-bottom">
          <div className="foot-about">
            <Link href="/" className="foot-logo" aria-label="LeagueScore home">
              <svg width="38" height="38" viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="9" fill="var(--brand)" />
                <path d="M18.5 4.5L8 18h6.2l-1.7 9.5L24 13.5h-6.3z" fill="var(--accent)" stroke="#114962" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <span className="foot-brand">League<em>Score</em></span>
            </Link>
            <p>
              Real-time scores, fixtures, lineups and standings for football, basketball, cricket and tennis, plus the
              latest sports news.
            </p>
            <SportScoreBadge />
          </div>

          <nav aria-label="Quick links">
            <h4>Quick Links</h4>
            <ul className="two">
              <li><Link href="/football">Live Scores</Link></li>
              <li><Link href="/news">News</Link></li>
              {SPORTS.map((s) => (
                <li key={s.key}><Link href={`/${s.key}`}>{s.label}</Link></li>
              ))}
              <li><Link href="/news/all">All News</Link></li>
            </ul>
          </nav>

          <nav aria-label="About">
            <h4>About</h4>
            <ul>
              {INFO_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          {SOCIALS.length > 0 && (
            <div>
              <h4>Join Our Community</h4>
              <div className="socials">
                {SOCIALS.map((s) => (
                  <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer me" aria-label={s.label} title={s.label}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {ICONS[s.key]}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="foot-line" />
        <p className="foot-copy">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved. Scores may be delayed by up to a minute.
        </p>
      </div>
      <BackToTop />
    </footer>
  );
}

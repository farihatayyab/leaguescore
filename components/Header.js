"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPORTS } from "@/lib/sports";
import ConnectButton from "./ConnectButton";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const path = usePathname() || "/";
  const first = path.split("/")[1];
  const isNews = first === "news";
  const active = SPORTS.some((s) => s.key === first) ? first : "football";

  return (
    <header className="head">
      <div className="wrap head-top">
        <Link href="/" className="brand" aria-label="LeagueScore home">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="var(--brand)" />
            <path d="M18.5 4.5L8 18h6.2l-1.7 9.5L24 13.5h-6.3z" fill="var(--accent)" stroke="#114962" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span>League<b>Score</b></span>
        </Link>

        <form className="search" action={isNews ? "/news" : `/${active}`} role="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            name="q"
            placeholder={isNews ? "Search news" : "Search teams or competitions"}
            aria-label="Search"
            maxLength={60}
          />
        </form>

        <div className="head-actions">
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>

      <nav className="wrap sports" aria-label="Sports">
        {SPORTS.map((s) => (
          <Link key={s.key} href={`/${s.key}`} className={!isNews && s.key === active ? "sport active" : "sport"}>
            {s.label}
          </Link>
        ))}
        <Link href="/news" className={isNews ? "sport active" : "sport"}>News</Link>
      </nav>
    </header>
  );
}
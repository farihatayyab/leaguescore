"use client";
import Link from "next/link";
import { useLive } from "@/lib/useLive";
import Crest from "./Crest";

export default function Ticker({ initial }) {
  const live = useLive(initial, { sport: "football", live: true })
    .filter((m) => m.live)
    .slice(0, 30);

  if (!live.length) return null;

  const items = [...live, ...live];
  const seconds = Math.max(live.length * 6, 30);

  return (
    <div className="ticker" aria-label="Live football scores">
      <span className="ticker-live"><i /> LIVE</span>
      <div className="ticker-track" style={{ animationDuration: `${seconds}s` }}>
        {items.map((m, i) => (
          <Link href={`/football/match/${m.slug}`} className="ticker-item" key={i}>
            <Crest src={m.homeLogo} name={m.home} size={16} />
            {m.home}
            <b>{m.hs ?? 0} - {m.as ?? 0}</b>
            {m.away}
            <Crest src={m.awayLogo} name={m.away} size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}

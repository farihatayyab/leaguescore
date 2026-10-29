import { notFound } from "next/navigation";
import Link from "next/link";
import { isSport } from "@/lib/sports";
import { fetchPlayer } from "@/lib/sportscore";
import Crest from "@/components/Crest";

const FIELDS = [
  ["matches", "Matches"], ["goals", "Goals"], ["assists", "Assists"], ["minutes", "Minutes"],
  ["shots", "Shots"], ["shots_on_target", "On target"], ["key_passes", "Key passes"],
  ["dribbles", "Dribbles"], ["tackles", "Tackles"], ["interceptions", "Interceptions"],
  ["yellow_cards", "Yellow cards"], ["red_cards", "Red cards"],
];

export async function generateMetadata({ params }) {
  const { sport, slug } = await params;
  const p = isSport(sport) ? await fetchPlayer(sport, slug) : null;
  return p ? { title: `${p.name} – Player stats` } : {};
}

export default async function PlayerPage({ params }) {
  const { sport, slug } = await params;
  if (!isSport(sport)) notFound();
  const p = await fetchPlayer(sport, slug);
  if (!p) notFound();
  const s = p.stats || {};

  return (
    <>
      <p className="crumb"><Link href={`/${sport}`}>Home</Link> › {p.name}</p>
      <div className="team-head">
        <Crest src={p.logo} name={p.name} size={64} round />
        <div>
          <h1>{p.name}</h1>
          {s.team && (
            <p className="muted pl-team"><Crest src={s.team_logo} name={s.team} size={18} round /> {s.team}{s.competition && ` · ${s.competition}`}</p>
          )}
        </div>
      </div>
      <div className="stat-grid">
        {FIELDS.filter(([k]) => s[k] !== undefined && s[k] !== null).map(([k, label]) => (
          <div key={k} className="panel"><b>{s[k]}</b><span>{label}</span></div>
        ))}
        {!p.stats && <p className="empty">No statistics available for this player.</p>}
      </div>
    </>
  );
}

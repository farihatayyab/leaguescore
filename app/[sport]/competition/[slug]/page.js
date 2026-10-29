import { notFound } from "next/navigation";
import Link from "next/link";
import { isSport } from "@/lib/sports";
import { fetchBracket, fetchStandings, fetchTopScorers } from "@/lib/sportscore";
import Tabs from "@/components/Tabs";
import DataTable from "@/components/DataTable";
import Bracket from "@/components/Bracket";
import Crest from "@/components/Crest";

const pretty = (s) => s.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `${pretty(slug)} – Standings, Top Scorers & Bracket` };
}

export default async function CompetitionPage({ params }) {
  const { sport, slug } = await params;
  if (!isSport(sport) || !/^[a-z0-9-]+$/.test(slug)) notFound();

  // teeno API calls ek saath (cache 30 min)
  const [standings, scorers, assists, bracket] = await Promise.all([
    fetchStandings(sport, slug),
    fetchTopScorers(sport, slug, "goals"),
    fetchTopScorers(sport, slug, "assists"),
    fetchBracket(sport, slug),
  ]);

  const name = bracket?.competition || pretty(slug);

  return (
    <>
      <p className="crumb">
        <Link href={`/${sport}`}>Home</Link> › {name}
      </p>
      <div className="team-head">
        <Crest src={bracket?.logo} name={name} size={56} round />
        <h1>{name}</h1>
      </div>
      <Tabs
        items={[
          { key: "st", label: "Standings", node: <DataTable tables={standings} sport={sport} empty="Standings are not available for this competition." /> },
          { key: "sc", label: "Top scorers", node: <DataTable tables={scorers} sport={sport} linkPlayers empty="Top scorers are not available for this competition." /> },
          { key: "as", label: "Assists", node: <DataTable tables={assists} sport={sport} linkPlayers empty="Assist leaders are not available for this competition." /> },
          { key: "br", label: "Bracket", node: <Bracket data={bracket} /> },
        ]}
      />
    </>
  );
}

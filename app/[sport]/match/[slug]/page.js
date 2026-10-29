import { notFound } from "next/navigation";
import { getMatch, getMatchExtras } from "@/lib/data";
import { isSport } from "@/lib/sports";
import MatchView from "@/components/MatchView";

export async function generateMetadata({ params }) {
  const { sport, slug } = await params;
  const m = isSport(sport) ? await getMatch(sport, slug) : null;
  return m ? { title: `${m.home} vs ${m.away} – Live score, lineups & stats` } : {};
}

export default async function MatchPage({ params }) {
  const { sport, slug } = await params;
  if (!isSport(sport)) notFound();

  const m = await getMatch(sport, slug);
  if (!m) notFound();

  const extras = await getMatchExtras(sport, m);
  return <MatchView initial={m} sport={sport} slug={slug} extras={extras} />;
}
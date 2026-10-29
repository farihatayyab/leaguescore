import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchesByDate } from "@/lib/data";
import { SPORTS, isSport } from "@/lib/sports";
import { resolveDate, todayKey } from "@/lib/format";
import MatchesList from "@/components/MatchesList";
import DateTabs from "@/components/DateTabs";
import Sidebar from "@/components/Sidebar";
import type { Match } from "@/types/match";

type Props = {
  params: Promise<{ sport: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport } = await params;
  const s = SPORTS.find((x) => x.key === sport);
  return s ? { title: `${s.label} Live Scores, Fixtures & Results` } : {};
}

export default async function SportPage({ params, searchParams }: Props) {
  const { sport } = await params;
  if (!isSport(sport)) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const comp = typeof sp.comp === "string" && /^[a-z0-9-]+$/.test(sp.comp) ? sp.comp : "";

  const today = todayKey();
  let date = resolveDate(typeof sp.date === "string" ? sp.date : "");

  const label = SPORTS.find((x) => x.key === sport)!.label;
  // Ek hi API list (60s cache); din ke hisaab se alag karte hain
  let { matches, days } = await getMatchesByDate(sport, date);

  // Date nahi di aur aaj ka koi match nahi: sab se qareeb wale din ka data dikhao
  if (!sp.date && matches.length === 0 && days.length) {
    const near = [...days].sort((a, b) => Math.abs(+new Date(a.key) - +new Date(today)) - Math.abs(+new Date(b.key) - +new Date(today)))[0];
    date = near.key;
    ({ matches } = await getMatchesByDate(sport, date));
  }

  const liveCount = matches.filter((m) => m.state === "live").length;
  const upCount = matches.filter((m) => m.state === "scheduled").length;
  const doneCount = matches.filter((m) => m.state === "finished").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumb">Home › {label}</p>
          <h1>{label} Live Scores, Fixtures &amp; Results</h1>
        </div>
        <div className="stats">
          <div><b>{matches.length}</b><span>Matches</span></div>
          <div className="s-live"><b>{liveCount}</b><span>Live</span></div>
          <div><b>{upCount}</b><span>Scheduled</span></div>
          <div><b>{doneCount}</b><span>Finished</span></div>
        </div>
      </div>

      <div className="layout">
        <div className="panel">
          <DateTabs sport={sport} date={date} today={today} days={days} q={q} comp={comp} />
          <MatchesList
            key={`${sport}-${date}-${q}-${comp}`}
            initial={matches}
            sport={sport}
            date={date}
            isToday={date === today}
            q={q}
            comp={comp}
          />
        </div>
        <Sidebar matches={matches} sport={sport} comp={comp} />
      </div>
    </>
  );
}
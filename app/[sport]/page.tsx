import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchesByDate } from "@/lib/data";
import { SPORTS, isSport } from "@/lib/sports";
import { resolveDate, todayKey } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
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
  const { t } = await getT();
  return s ? { title: t("page.title", { sport: t(`sport.${s.key}`) }) } : {};
}

export default async function SportPage({ params, searchParams }: Props) {
  const { sport } = await params;
  if (!isSport(sport)) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const comp = typeof sp.comp === "string" && /^[a-z0-9-]+$/.test(sp.comp) ? sp.comp : "";

  const today = todayKey();
  let date = resolveDate(typeof sp.date === "string" ? sp.date : "");

  const { t } = await getT();
  const label = t(`sport.${sport}`);
  // /api/v1/fixtures/ se us date ke matches (max 200 per request, server-side cache); fail ho to widget feed
  let { matches, days, truncated } = await getMatchesByDate(sport, date);

  // (Widget fallback mode) Date nahi di aur aaj ka koi match nahi: sab se qareeb wale din ka data dikhao
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
          <p className="crumb">{t("home")} › {label}</p>
          <h1>{t("page.title", { sport: label })}</h1>
        </div>
        <div className="stats">
          <div><b>{matches.length}</b><span>{t("page.matches")}</span></div>
          <div className="s-live"><b>{liveCount}</b><span>{t("f.live")}</span></div>
          <div><b>{upCount}</b><span>{t("f.scheduled")}</span></div>
          <div><b>{doneCount}</b><span>{t("f.finished")}</span></div>
        </div>
      </div>

      <div className="layout">
        <div className="panel">
          <DateTabs sport={sport} date={date} today={today} count={matches.length} days={days} q={q} comp={comp} />
          {truncated && (
            <p className="active-filter">{t("page.truncated")}</p>
          )}
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
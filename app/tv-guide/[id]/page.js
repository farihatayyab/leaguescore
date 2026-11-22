import Link from "next/link";
import { notFound } from "next/navigation";
import { getChannelDay, todayKeyTz } from "@/lib/tvguide";
import { Logo, Pager } from "@/components/TvGuide";
import FavButton from "@/components/TvFav";
import { cookies } from "next/headers";
import { parseFavs, PROG_PER_PAGE } from "@/lib/tvguide";
import { fmtTime, shiftDay } from "@/lib/format";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const d = await getChannelDay(id, todayKeyTz(), 1);
  return { title: d ? `${d.channel.name} – TV Guide` : "TV Guide" };
}

const dayLabel = (key, t, intl) => {
  const today = todayKeyTz();
  if (key === today) return t("date.today");
  if (key === shiftDay(today, 1)) return t("date.tomorrow");
  return new Date(`${key}T12:00:00Z`).toLocaleDateString(intl, { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
};

export default async function ChannelPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { t, intl } = await getT();
  if (!/^\d+$/.test(id)) notFound();
  const d = await getChannelDay(id, String(sp.day || todayKeyTz()), parseInt(sp.page) || 0);
  if (!d) notFound();
  const isFav = parseFavs((await cookies()).get("tv_favs")?.value).includes(d.channel.id);

  return (
    <>
      <p className="nw-meta" style={{ marginBottom: 10 }}><Link href="/tv-guide">{t("tv.allCh")}</Link></p>
      <div className="tv-chead">
        <Logo src={d.channel.icon} name={d.channel.name} size={64} />
        <div>
          <h1>{d.channel.name} <FavButton id={d.channel.id} initial={isFav} name={d.channel.name} size={24} /></h1>
          <p className="muted">{d.total === 1 ? t("tv.progCount1", { day: dayLabel(d.day, t, intl) }) : t("tv.progCount", { n: d.total, day: dayLabel(d.day, t, intl) })}</p>
        </div>
      </div>

      <nav className="nw-sub tv-days" aria-label={t("tv.days")}>
        {d.days.map((k) => (
          <Link key={k} href={`/tv-guide/${d.channel.id}?day=${k}`} className={k === d.day ? "on" : ""}>{dayLabel(k, t, intl)}</Link>
        ))}
      </nav>

      <section className="nw-block">
        {d.items.map((p, i) => (
          <div key={i} className={`tv-row${p.live ? " live" : ""}${p.past ? " past" : ""}`}>
            <div className="tv-row-t">
              <b>{fmtTime(p.start)}</b>
              <small>{fmtTime(p.stop)}</small>
            </div>
            <div className="tv-row-b">
              <h3>
                {p.title}
                {p.live && <span className="tv-tag"><i /> {t("tv.liveNow")}</span>}
              </h3>
              {p.subtitle && <p className="tv-sub">{p.subtitle}</p>}
              {p.description && <p className="tv-desc">{p.description}</p>}
              {p.category && <span className="nw-chip">{p.category}</span>}
            </div>
          </div>
        ))}
        {!d.items.length && <p className="empty">{t("tv.noProg")}</p>}
      </section>

      <Pager base={`/tv-guide/${d.channel.id}`} params={{ day: d.day }} page={d.page} pages={d.pages} total={d.total} perPage={PROG_PER_PAGE} keepFirst />
    </>
  );
}

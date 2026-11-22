import Link from "next/link";
import { cookies } from "next/headers";
import { getGrid, parseFavs, todayKeyTz, PER_PAGE } from "@/lib/tvguide";
import { Logo, Pager } from "@/components/TvGuide";
import FavButton from "@/components/TvFav";
import TimeBar from "@/components/TvTimeBar";
import { fmtTime, fmtDay, TZ } from "@/lib/format";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "TV Guide", description: "What’s on TV now and next — channel listings with logos and favourites." };

const href = (p) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) u.set(k, String(v));
  const s = u.toString();
  return `/tv-guide${s ? `?${s}` : ""}`;
};

const COLS = ["tv.onNow", "tv.next", "tv.later"];

export default async function TvGuidePage({ searchParams }) {
  const sp = await searchParams;
  const { t } = await getT();
  const q = String(sp.q || "").trim().slice(0, 60);
  const cat = sp.cat === "favorites" ? "favorites" : "all";
  const at = parseInt(sp.at) || 0;
  const favs = parseFavs((await cookies()).get("tv_favs")?.value);

  const g = await getGrid({ page: parseInt(sp.page) || 1, q, cat, at, favs });
  const atNow = g.slots.some((s) => s.now);
  const ref = (atNow ? g.now : g.start) * 1000; // moment the "On now" column refers to
  const keep = { q, cat: cat === "all" ? "" : cat, at: at ? g.start : "" };
  const selOff = g.start - g.dayStarts[g.selDay];
  const label = (i) => (i === 0 && !atNow ? t("tv.at", { time: fmtTime(new Date(g.start * 1000).toISOString()) }) : t(COLS[i]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("tv.title")}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {q ? t("tv.matching", { q }) : t("tv.whatsOn")} · {g.total === 1 ? t("tv.count1") : t("tv.count", { n: g.total.toLocaleString("en-US") })}
            {g.updated && <> · {t("tv.updated", { when: `${fmtDay(g.updated)}, ${fmtTime(g.updated)}` })}</>}
          </p>
        </div>
        <form className="tv-search" action="/tv-guide" role="search">
          {cat !== "all" && <input type="hidden" name="cat" value={cat} />}
          <input name="q" defaultValue={q} placeholder={t("tv.searchPh")} maxLength={60} aria-label={t("tv.searchChannels")} />
          <button type="submit">{t("tv.search")}</button>
          {q && <Link href={href({ cat: keep.cat })} className="tv-clear">{t("tv.clear")}</Link>}
        </form>
      </div>

      <div className="tg-toolbar">
        <nav className="tg-tabs" aria-label={t("tv.view")}>
          <Link href={href({ q, at: keep.at })} className={cat === "all" ? "on" : ""}>{t("tv.all")}</Link>
          <Link href={href({ q, cat: "favorites", at: keep.at })} className={cat === "favorites" ? "on" : ""}>{t("tv.fav")}{favs.length ? ` (${favs.length})` : ""}</Link>
        </nav>
        <div className="tg-tools">
          <TimeBar days={g.days} dayStarts={g.dayStarts} times={g.times} selDay={g.selDay} selOff={selOff} today={todayKeyTz()} tz={TZ} params={{ q, cat: keep.cat }} />
          {!atNow && <Link href={href({ q, cat: keep.cat })} className="tg-now-btn">{t("tv.now")}</Link>}
        </div>
      </div>

      {!g.items.length ? (
        <p className="empty big">
          {cat === "favorites" && !q
            ? t("tv.noFav")
            : q
            ? t("tv.noCh")
            : g.range
            ? t("tv.noRange", { from: `${fmtDay(g.range.from)}, ${fmtTime(g.range.from)}`, to: `${fmtDay(g.range.to)}, ${fmtTime(g.range.to)}` })
            : t("tv.noData")}
        </p>
      ) : (
        <>
          <div className="tg" role="table" aria-label={t("tv.listings")}>
            <div className="tg-row tg-head" role="row">
              <div role="columnheader">{t("tv.channel")}</div>
              {COLS.map((_, i) => <div key={i} role="columnheader" className={i === 0 && atNow ? "now" : ""}>{label(i)}</div>)}
            </div>

            {g.items.map((c) => {
              const list = c.programmes.slice(0, 3);
              return (
                <div className="tg-row" key={c.id} role="row">
                  <div className="tg-ch" role="rowheader">
                    <Link href={`/tv-guide/${c.id}`}>
                      <Logo src={c.icon} name={c.name} />
                      <b title={c.name}>{c.name}</b>
                    </Link>
                    <FavButton id={c.id} initial={c.fav} name={c.name} />
                  </div>
                  {COLS.map((_, i) => {
                    const p = list[i];
                    if (!p) return <div key={i} className="tg-p empty" data-label={label(i)} role="cell">—</div>;
                    const s = Date.parse(p.start);
                    const e = Date.parse(p.stop);
                    const airing = i === 0 && s <= ref && e > ref;
                    return (
                      <Link key={i} href={`/tv-guide/${c.id}`} className="tg-p" data-label={label(i)} role="cell">
                        <b title={p.title}>{p.title}</b>
                        <small>{fmtTime(p.start)} – {fmtTime(p.stop)}</small>
                        {airing && <div className="tg-bar"><i style={{ width: `${Math.min(100, Math.max(0, ((ref - s) / (e - s)) * 100))}%` }} /></div>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <Pager base="/tv-guide" params={keep} page={g.page} pages={g.pages} total={g.total} perPage={PER_PAGE} />
        </>
      )}
    </>
  );
}
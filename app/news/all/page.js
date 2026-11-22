import Link from "next/link";
import { getAllNewsPage } from "@/lib/news";
import { NewsSubNav, NewsList, MostRead } from "@/components/NewsBlocks";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "All News" };

// Admin ne jo bhi news aur category add ki hai, sab yahan ek jagah dikhti hai
export default async function AllNewsPage({ searchParams }) {
  const { n } = await searchParams;
  const limit = Math.min(Math.max(parseInt(n) || 25, 25), 200);
  const d = await getAllNewsPage(limit);
  const { t } = await getT();

  return (
    <>
      <NewsSubNav cats={d.cats} />
      <div className="nw-layout">
        <div className="nw-main">
          <section className="nw-block">
            <div className="nw-bh"><span>{t("na.categories", { n: d.cats.length })}</span></div>
            <div className="nw-cats">
              {d.cats.map((c) => (
                <Link key={c.id} href={`/news/category/${c.slug}`} className="nw-catpill">
                  {c.name} <em>{c.n}</em>
                </Link>
              ))}
              {!d.cats.length && <p className="empty">{t("na.noCats")}</p>}
            </div>
          </section>

          {!d.items.length && <p className="empty">{t("n.noneYet")}</p>}
          <NewsList
            title={t("na.title", { n: d.total })}
            items={d.items}
            moreHref={d.hasMore ? `/news/all?n=${limit + 25}` : null}
          />
        </div>
        <MostRead items={d.mostRead} />
      </div>
    </>
  );
}

import { getHome, searchNews } from "@/lib/news";
import { NewsSubNav, FeatureBlock, NewsList, MostRead } from "@/components/NewsBlocks";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "News" };

export default async function NewsPage({ searchParams }) {
  const { q = "" } = await searchParams;
  const { t } = await getT();
  const h = await getHome();

  if (q.trim()) {
    const found = await searchNews(q.trim());
    return (
      <>
        <NewsSubNav cats={h.cats} />
        <div className="nw-layout">
          <div className="nw-main">
            <NewsList title={t("n.results", { q, n: found.length })} items={found} />
            {!found.length && <p className="empty">{t("n.none")}</p>}
          </div>
          <MostRead items={h.mostRead} />
        </div>
      </>
    );
  }

  const empty = !h.top.length;
  const first = h.byCat.slice(0, 2);
  const rest = h.byCat.slice(2);
  const block = ({ cat, items }) => (
    <FeatureBlock
      key={cat.id}
      title={cat.name}
      href={`/news/category/${cat.slug}`}
      more={t("n.moreCat", { cat: cat.name })}
      items={items}
    />
  );

  return (
    <>
      <NewsSubNav cats={h.cats} />
      {empty ? (
        <p className="empty">{t("n.noneYet")}</p>
      ) : (
        <div className="nw-layout">
          <div className="nw-main">
            <FeatureBlock title={t("n.top")} items={h.top} />
            {first.map(block)}
            <NewsList title={t("n.moreNews")} items={h.more} moreHref="/news/all" />
            <FeatureBlock title={t("n.editors")} items={h.editors} />
            {rest.map(block)}
          </div>
          <MostRead items={h.mostRead} />
        </div>
      )}
    </>
  );
}
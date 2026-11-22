import { notFound } from "next/navigation";
import { getCategoryPage } from "@/lib/news";
import { NewsSubNav, HeroBlock, NewsList, MostRead } from "@/components/NewsBlocks";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const d = await getCategoryPage(slug, 1);
  return d ? { title: `${d.cat.name} News` } : {};
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const { n } = await searchParams;
  const limit = Math.min(Math.max(parseInt(n) || 25, 25), 200);

  const d = await getCategoryPage(slug, limit);
  if (!d) notFound();
  const { t } = await getT();

  return (
    <>
      <NewsSubNav cats={d.cats} active={slug} />
      <div className="nw-layout">
        <div className="nw-main">
          {!d.hero && <p className="empty">{t("na.noCat", { cat: d.cat.name })}</p>}
          <HeroBlock title={d.cat.name} item={d.hero} />
          <NewsList
            title={t("n.moreCat", { cat: d.cat.name })}
            items={d.rest}
            moreHref={d.hasMore ? `/news/category/${slug}?n=${limit + 25}` : null}
          />
        </div>
        <MostRead items={d.mostRead} />
      </div>
    </>
  );
}
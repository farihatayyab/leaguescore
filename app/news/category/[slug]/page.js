import { notFound } from "next/navigation";
import { getCategoryPage } from "@/lib/news";
import { NewsSubNav, HeroBlock, NewsList, MostRead } from "@/components/NewsBlocks";

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

  return (
    <>
      <NewsSubNav cats={d.cats} active={slug} />
      <div className="nw-layout">
        <div className="nw-main">
          {!d.hero && <p className="empty">No {d.cat.name} news yet.</p>}
          <HeroBlock title={d.cat.name} item={d.hero} />
          <NewsList
            title={`More ${d.cat.name} News`}
            items={d.rest}
            moreHref={d.hasMore ? `/news/category/${slug}?n=${limit + 25}` : null}
          />
        </div>
        <MostRead items={d.mostRead} />
      </div>
    </>
  );
}
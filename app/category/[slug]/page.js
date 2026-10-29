import { notFound } from "next/navigation";
import { getCategoryPage } from "@/lib/news";
import { NewsSubNav, FeatureBlock, NewsList, MostRead } from "@/components/NewsBlocks";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const d = await getCategoryPage(slug);
  return d ? { title: `${d.cat.name} News` } : {};
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const d = await getCategoryPage(slug);
  if (!d) notFound();

  return (
    <>
      <NewsSubNav cats={d.cats} active={slug} />
      <div className="nw-layout">
        <div className="nw-main">
          {d.items.length === 0 && <p className="empty">No {d.cat.name} news yet.</p>}
          <FeatureBlock title={`${d.cat.name} News`} items={d.items.slice(0, 4)} />
          <NewsList title="More" items={d.items.slice(4)} />
        </div>
        <MostRead items={d.mostRead} />
      </div>
    </>
  );
}
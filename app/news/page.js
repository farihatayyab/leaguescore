import { getHome, searchNews } from "@/lib/news";
import { NewsSubNav, FeatureBlock, NewsList, MostRead } from "@/components/NewsBlocks";

export const dynamic = "force-dynamic";
export const metadata = { title: "News" };

export default async function NewsPage({ searchParams }) {
  const { q = "" } = await searchParams;
  const h = await getHome();

  if (q.trim()) {
    const found = await searchNews(q.trim());
    return (
      <>
        <NewsSubNav cats={h.cats} />
        <div className="nw-layout">
          <div className="nw-main">
            <NewsList title={`Search results for “${q}” (${found.length})`} items={found} />
            {!found.length && <p className="empty">No news found.</p>}
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
      more={`More ${cat.name} News`}
      items={items}
    />
  );

  return (
    <>
      <NewsSubNav cats={h.cats} />
      {empty ? (
        <p className="empty">No news yet. Add your first article from /admin.</p>
      ) : (
        <div className="nw-layout">
          <div className="nw-main">
            <FeatureBlock title="Top News" items={h.top} />
            {first.map(block)}
            <NewsList title="More News" items={h.more} />
            <FeatureBlock title="Editors’ Picks" items={h.editors} />
            {rest.map(block)}
          </div>
          <MostRead items={h.mostRead} />
        </div>
      )}
    </>
  );
}
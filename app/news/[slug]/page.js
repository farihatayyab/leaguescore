import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle, bumpViews, getCategories, getMostRead, timeAgo } from "@/lib/news";
import { NewsSubNav, MostRead } from "@/components/NewsBlocks";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  return a ? { title: a.title, description: a.summary || undefined } : {};
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  await bumpViews(a.id);
  const [cats, mostRead] = await Promise.all([getCategories(), getMostRead(5)]);
  const paras = (a.body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <NewsSubNav cats={cats} active={a.cat_slug || ""} />
      <div className="nw-layout">
        <article className="nw-block nw-art">
          <p className="crumb">
            <Link href="/news">News</Link>
            {a.cat_name && <> › <Link href={`/news/category/${a.cat_slug}`}>{a.cat_name}</Link></>}
          </p>
          <h1>{a.title}</h1>
          <p className="nw-meta">{timeAgo(a.created_at)}</p>
          {a.summary && <p className="lead">{a.summary}</p>}
          {a.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cover" src={a.image_url} alt={a.title} />
          )}
          {paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
        <MostRead items={mostRead} />
      </div>
    </>
  );
}
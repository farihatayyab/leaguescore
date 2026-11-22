import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle, bumpViews, getCategories, getMostRead, timeAgo } from "@/lib/news";
import { NewsSubNav, MostRead } from "@/components/NewsBlocks";
import { getT } from "@/lib/i18n-server";
import { renderNewsBody } from "@/lib/htmlText";

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
  const { t } = await getT();
  const [cats, mostRead] = await Promise.all([getCategories(), getMostRead(5)]);
  const bodyHtml = renderNewsBody(a.body); // sanitized: headings/boxes render hote hain, script/XSS nahi

  return (
    <>
      <NewsSubNav cats={cats} active={a.cat_slug || ""} />
      <div className="nw-layout">
        <article className="nw-block nw-art">
          <p className="crumb">
            <Link href="/news">{t("nav.news")}</Link>
            {a.cat_name && <> › <Link href={`/news/category/${a.cat_slug}`}>{a.cat_name}</Link></>}
          </p>
          <h1>{a.title}</h1>
          <p className="nw-meta">{timeAgo(a.created_at)}</p>
          {a.summary && <p className="lead">{a.summary}</p>}
          {a.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cover" src={a.image_url} alt={a.title} />
          )}
          <div className="nw-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </article>
        <MostRead items={mostRead} />
      </div>
    </>
  );
}
import Link from "next/link";
import { timeAgo } from "@/lib/news";

export { default as NewsSubNav } from "./NewsSubNav";

export function NewsImg({ src, title }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={title} loading="lazy" /> : <div className="nw-ph">{(title || "?")[0]}</div>;
}

// Category page ka upar wala bada article (image left, bada title right)
export function HeroBlock({ title, item }) {
  if (!item) return null;
  return (
    <section className="nw-block">
      <div className="nw-bh"><span>{title}</span></div>
      <Link href={`/news/${item.slug}`} className="nw-hero nw-hero2">
        <NewsImg src={item.image_url} title={item.title} />
        <div>
          <h2>{item.title}</h2>
          <p className="nw-meta">{timeAgo(item.created_at)}</p>
        </div>
      </Link>
    </section>
  );
}

// 1 bada article + neeche 3 cards (news home page ke sections)
export function FeatureBlock({ title, href, more, items }) {
  if (!items?.length) return null;
  const [first, ...rest] = items;
  return (
    <section className="nw-block">
      <div className="nw-bh">
        <span>{title}</span>
        {href && <Link href={href}>{more}</Link>}
      </div>
      <Link href={`/news/${first.slug}`} className="nw-hero">
        <NewsImg src={first.image_url} title={first.title} />
        <div>
          <h2>{first.title}</h2>
          {first.summary && <p className="muted" style={{ marginTop: 8 }}>{first.summary}</p>}
          <p className="nw-meta">
            {first.cat_name && <span className="nw-chip">{first.cat_name}</span>}
            {timeAgo(first.created_at)}
          </p>
        </div>
      </Link>
      {rest.length > 0 && (
        <div className="nw-grid">
          {rest.slice(0, 3).map((a) => (
            <Link key={a.id} href={`/news/${a.slug}`} className="nw-card">
              <NewsImg src={a.image_url} title={a.title} />
              <h3>{a.title}</h3>
              <p className="nw-meta">{timeAgo(a.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// List (image left, title, time) + optional "Show more"
export function NewsList({ title, items, moreHref }) {
  if (!items?.length) return null;
  return (
    <section className="nw-block">
      {title && <div className="nw-bh"><span>{title}</span></div>}
      {items.map((a) => (
        <Link key={a.id} href={`/news/${a.slug}`} className="nw-row">
          <NewsImg src={a.image_url} title={a.title} />
          <div>
            <h3>{a.title}</h3>
            <p className="nw-meta">
              {a.cat_name && <span className="nw-chip">{a.cat_name}</span>}
              {timeAgo(a.created_at)}
            </p>
          </div>
        </Link>
      ))}
      {moreHref && (
        <div className="nw-showmore">
          <Link href={moreHref} scroll={false}>Show more ⌄</Link>
        </div>
      )}
    </section>
  );
}

export function MostRead({ items }) {
  if (!items?.length) return null;
  return (
    <aside className="nw-block">
      <div className="nw-bh"><span>Most read on LeagueScore News</span></div>
      {items.map((a) => (
        <Link key={a.id} href={`/news/${a.slug}`} className="nw-mr">
          <NewsImg src={a.image_url} title={a.title} />
          <b>{a.title}</b>
        </Link>
      ))}
    </aside>
  );
}
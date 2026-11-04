import Link from "next/link";
import { INFO_LINKS } from "@/lib/site";

// About / Contact / Privacy / Terms / Cookies / Feedback sab isi layout mein
export default function InfoPage({ title, subtitle, current, children }) {
  return (
    <article className="info panel">
      <div className="info-head">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="info-body">
        {children}
        <nav className="info-links" aria-label="More information">
          {INFO_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={l.href === current ? "on" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </article>
  );
}

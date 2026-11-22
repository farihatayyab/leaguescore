import Link from "next/link";
import { INFO_LINKS } from "@/lib/site";
import { getT } from "@/lib/i18n-server";

// About / Contact / Privacy / Terms / Cookies / Feedback sab isi layout mein
export default async function InfoPage({ title, subtitle, current, children }) {
  const { t } = await getT();
  return (
    <article className="info panel">
      <div className="info-head">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="info-body">
        {children}
        <nav className="info-links" aria-label={t("info.more")}>
          {INFO_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={l.href === current ? "on" : ""}>
              {t(`info.${l.key}`)}
            </Link>
          ))}
        </nav>
      </div>
    </article>
  );
}

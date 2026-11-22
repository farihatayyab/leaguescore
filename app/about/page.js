import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { SITE } from "@/lib/site";
import { getT } from "@/lib/i18n-server";

export const metadata = {
  title: "About Us",
  description: "LeagueScore brings live scores, fixtures, results and sports news for football, basketball, cricket and tennis.",
};

export default async function About() {
  const { t } = await getT();
  const site = { site: SITE.name };
  return (
    <InfoPage title={t("ab.title")} subtitle={t("ab.sub", site)} current="/about">
      <h2>{t("ab.h1", site)}</h2>
      <p>{t("ab.p1", site)}</p>

      <div className="info-cards">
        <div className="info-card"><b>{t("ab.c1t")}</b><span>{t("ab.c1")}</span></div>
        <div className="info-card"><b>{t("ab.c2t")}</b><span>{t("ab.c2")}</span></div>
        <div className="info-card"><b>{t("ab.c3t")}</b><span>{t("ab.c3")}</span></div>
        <div className="info-card"><b>{t("ab.c4t")}</b><span>{t("ab.c4")}</span></div>
      </div>

      <h2>{t("ab.h2")}</h2>
      <p>
        {t("ab.p2a")} <a href="https://sportscore.com/" rel="noopener">SportScore</a>. {t("ab.p2b")}{" "}
        <Link href="/feedback">{t("ab.tellUs")}</Link>.
      </p>

      <h2>{t("ab.h3")}</h2>
      <ul>
        <li>{t("ab.f1")}</li>
        <li>{t("ab.f2")}</li>
        <li>{t("ab.f3")}</li>
        <li>{t("ab.f4")}</li>
        <li>{t("ab.f5")}</li>
      </ul>

      <h2>{t("ab.h4")}</h2>
      <p>{t("ab.p4", site)}</p>

      <h2>{t("ab.h5")}</h2>
      <p>
        {t("ab.p5a")} <Link href="/contact">{t("ab.contactPage")}</Link>, {t("ab.p5b")}{" "}
        <Link href="/feedback">{t("ab.feedbackPage")}</Link>.
      </p>
    </InfoPage>
  );
}

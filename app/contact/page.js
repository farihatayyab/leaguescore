import InfoPage from "@/components/InfoPage";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";
import { getT } from "@/lib/i18n-server";

export const metadata = { title: "Contact", description: `Contact the ${SITE.name} team.` };

export default async function Contact() {
  const { t } = await getT();
  return (
    <InfoPage title={t("info.contact")} subtitle={t("ct.sub")} current="/contact">
      <p>
        {t("ct.p1")}
        {SITE.email && (
          <>
            {" "}{t("ct.email")} <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </>
        )}
      </p>
      <p>{t("ct.p2")}</p>
      <ContactForm kind="contact" />
    </InfoPage>
  );
}

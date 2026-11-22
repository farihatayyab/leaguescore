import InfoPage from "@/components/InfoPage";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";
import { getT } from "@/lib/i18n-server";

export const metadata = { title: "Feedback", description: `Share your feedback about ${SITE.name}.` };

export default async function Feedback() {
  const { t } = await getT();
  return (
    <InfoPage title={t("info.feedback")} subtitle={t("fb.sub")} current="/feedback">
      <p>{t("fb.p1")}</p>
      <ContactForm kind="feedback" />
    </InfoPage>
  );
}

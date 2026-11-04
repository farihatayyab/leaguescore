import InfoPage from "@/components/InfoPage";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata = { title: "Feedback", description: `Share your feedback about ${SITE.name}.` };

export default function Feedback() {
  return (
    <InfoPage title="Feedback" subtitle="Help us make LeagueScore better" current="/feedback">
      <p>
        Found a wrong score, a bug, or have an idea for a new feature? Tell us below. Please mention the sport, the
        match or the page you were on, so we can look into it quickly. Your email is optional, but we can only reply
        if you add it.
      </p>
      <ContactForm kind="feedback" />
    </InfoPage>
  );
}

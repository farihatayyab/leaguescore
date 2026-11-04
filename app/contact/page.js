import InfoPage from "@/components/InfoPage";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact", description: `Contact the ${SITE.name} team.` };

export default function Contact() {
  return (
    <InfoPage title="Contact" subtitle="We usually reply within a few working days" current="/contact">
      <p>
        Have a question, a business enquiry or a problem with your account? Send us a message using the form below.
        {SITE.email && (
          <>
            {" "}You can also email us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </>
        )}
      </p>
      <p>For wrong scores, bugs or feature ideas, the Feedback page is the quickest way to reach us.</p>
      <ContactForm kind="contact" />
    </InfoPage>
  );
}

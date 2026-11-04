import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy", description: `How ${SITE.name} collects and uses your information.` };

export default function Privacy() {
  return (
    <InfoPage title="Privacy Policy" subtitle={`Last updated: ${SITE.legalUpdated}`} current="/privacy">
      <p>
        This policy explains what information {SITE.name} (&quot;we&quot;, &quot;us&quot;) collects when you use this
        website, why we collect it and what choices you have. By using the site you agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <b>Account details.</b> If you create an account we store your name, email address and a securely hashed
          password, and whether you want to receive our newsletter.
        </li>
        <li>
          <b>Messages you send.</b> When you use the Contact or Feedback form we store your name, email (if given),
          message and the IP address it was sent from, to answer you and to prevent spam.
        </li>
        <li>
          <b>Technical data.</b> Like most websites, our servers may record your IP address, browser type and the pages
          requested in standard server logs, for security and to keep the site running.
        </li>
        <li>
          <b>Data stored in your browser.</b> Your favorite matches and your chosen light/dark theme are saved in your
          own browser. They are not sent to us. See our <Link href="/cookies">Cookie Policy</Link>.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the website and your account, and keep you logged in.</li>
        <li>To reply to your messages and improve the site based on your feedback.</li>
        <li>To protect the site from spam, abuse and security problems.</li>
        <li>To send you our newsletter, only if you opted in. You can opt out at any time.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. Live scores and team or competition logos are provided by{" "}
        <a href="https://sportscore.com/" rel="noopener">SportScore</a>. Logos may be loaded directly from their
        servers, so your browser may contact them when a page with logos is shown. We may also disclose information if
        the law requires it, or to protect our rights and users.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account details while your account exists, and messages for as long as needed to deal with them. You
        can ask us to delete your account or messages at any time.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can ask to see, correct or delete the personal information we hold about you, or withdraw your newsletter
        consent, by contacting us through the <Link href="/contact">Contact page</Link>. You can also clear your
        browser&apos;s stored data at any time.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are stored hashed and sessions use a secure, HTTP-only cookie. No website can be completely secure,
        so please use a strong password that you do not use elsewhere.
      </p>

      <h2>Children</h2>
      <p>This website is not directed at children under 13, and we do not knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The date at the top shows when it was last changed. Continuing to
        use the site after a change means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Reach us on the <Link href="/contact">Contact page</Link>
        {SITE.email && (
          <>
            {" "}or at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </>
        )}
        .
      </p>
    </InfoPage>
  );
}

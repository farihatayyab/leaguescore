import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Terms of Use", description: `The rules for using ${SITE.name}.` };

export default function Terms() {
  return (
    <InfoPage title="Terms of Use" subtitle={`Last updated: ${SITE.legalUpdated}`} current="/terms">
      <p>
        Welcome to {SITE.name}. By accessing or using this website you agree to these Terms of Use. If you do not
        agree, please do not use the site.
      </p>

      <h2>Use of the website</h2>
      <p>You may use {SITE.name} for your own personal, non-commercial use. You agree not to:</p>
      <ul>
        <li>copy, scrape or resell our content or data at scale, or use bots or automated tools to overload the site;</li>
        <li>try to break, probe or gain unauthorised access to the site, other accounts or our systems;</li>
        <li>upload or send anything unlawful, abusive, misleading or harmful through our forms;</li>
        <li>use the site in a way that breaks any applicable law.</li>
      </ul>

      <h2>Accounts</h2>
      <p>
        If you create an account you are responsible for keeping your password safe and for activity under your
        account. Give us accurate information. We may suspend or remove accounts that break these terms.
      </p>

      <h2>Scores, data and accuracy</h2>
      <p>
        Scores, fixtures, statistics and other sports data are provided by third parties and are shown for general
        information only. They may be delayed, incomplete or wrong. We do not guarantee accuracy or availability, and
        you should not rely on them for any decision that carries financial or other risk, including betting.
      </p>

      <h2>Content and intellectual property</h2>
      <p>
        The design of this website and the articles written by our team belong to {SITE.name}. Team, competition and
        player names and logos belong to their respective owners and are used for identification only. Match data is
        supplied by <a href="https://sportscore.com/" rel="noopener">SportScore</a>.
      </p>

      <h2>Feedback you send us</h2>
      <p>
        If you send us feedback or ideas, you allow us to use them to improve the site without owing you anything in
        return.
      </p>

      <h2>Third-party links</h2>
      <p>
        The site may link to other websites. We do not control them and are not responsible for their content or
        privacy practices.
      </p>

      <h2>Disclaimer and limit of liability</h2>
      <p>
        The website is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind. To the
        fullest extent permitted by law, {SITE.name} is not liable for any loss or damage arising from your use of, or
        inability to use, the website or from reliance on any information shown on it.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may change the site or these terms at any time. The date at the top shows the latest version, and continuing
        to use the site means you accept the changes. We may restrict or end access to the site if these terms are
        broken.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Use the <Link href="/contact">Contact page</Link>. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link>.
      </p>
    </InfoPage>
  );
}

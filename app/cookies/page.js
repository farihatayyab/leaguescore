import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Cookie Policy", description: `How ${SITE.name} uses cookies and browser storage.` };

export default function Cookies() {
  return (
    <InfoPage title="Cookie Policy" subtitle={`Last updated: ${SITE.legalUpdated}`} current="/cookies">
      <p>
        This page explains the cookies and similar browser storage that {SITE.name} uses. We keep it to what the site
        needs to work.
      </p>

      <h2>What we store in your browser</h2>
      <ul>
        <li>
          <b>session</b> (cookie): set only when you log in. It keeps you signed in for up to 7 days. It is HTTP-only,
          so scripts on the page cannot read it, and it is removed when you log out.
        </li>
        <li>
          <b>leaguescore-theme</b> (local storage): remembers whether you prefer the light or dark theme.
        </li>
        <li>
          <b>leaguescore:favs</b> (local storage): remembers the matches you starred as favorites. It stays on your
          device.
        </li>
      </ul>

      <h2>Advertising and tracking</h2>
      <p>
        At the moment we do not use advertising or cross-site tracking cookies. If this changes, we will update this
        page and, where required, ask for your consent first.
      </p>

      <h2>Third-party content</h2>
      <p>
        Team and competition logos may be loaded from our data provider,{" "}
        <a href="https://sportscore.com/" rel="noopener">SportScore</a>. Loading an image means your browser contacts
        their server, which can see standard request details such as your IP address.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can delete or block cookies and clear site data in your browser settings. If you block the session cookie
        you will not be able to stay logged in, and clearing local storage resets your theme and favorites.
      </p>

      <h2>More information</h2>
      <p>
        See our <Link href="/privacy">Privacy Policy</Link> for how we handle personal information, or{" "}
        <Link href="/contact">contact us</Link> with any questions.
      </p>
    </InfoPage>
  );
}

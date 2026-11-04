import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "About Us",
  description: "LeagueScore brings live scores, fixtures, results and sports news for football, basketball, cricket and tennis.",
};

export default function About() {
  return (
    <InfoPage title="About Us" subtitle={`Who we are and what ${SITE.name} does`} current="/about">
      <h2>What is {SITE.name}?</h2>
      <p>
        {SITE.name} is a fast, easy-to-read sports website. We show live scores, today&apos;s fixtures and past results,
        along with lineups, match timelines, standings, top scorers and team pages, so you can follow the games you
        care about in one place.
      </p>

      <div className="info-cards">
        <div className="info-card"><b>Four sports</b><span>Football, basketball, cricket and tennis.</span></div>
        <div className="info-card"><b>Live updates</b><span>Scores refresh automatically while matches are being played.</span></div>
        <div className="info-card"><b>Any date</b><span>Browse yesterday&apos;s results, today&apos;s games and upcoming fixtures.</span></div>
        <div className="info-card"><b>Sports news</b><span>Articles and stories published by our own editors.</span></div>
      </div>

      <h2>Where does the data come from?</h2>
      <p>
        Match data is provided by <a href="https://sportscore.com/" rel="noopener">SportScore</a>. Scores can be
        delayed by up to a minute and, as with any live data feed, may occasionally contain mistakes. If you notice a
        wrong score, please <Link href="/feedback">tell us</Link>.
      </p>

      <h2>Features for you</h2>
      <ul>
        <li>Star matches to build your own favorites list.</li>
        <li>Switch between light and dark theme.</li>
        <li>Create a free account with the Connect button.</li>
        <li>Search for teams and competitions.</li>
      </ul>

      <h2>What we are not</h2>
      <p>
        {SITE.name} is an information website. We do not take bets and we do not offer betting or gambling services.
      </p>

      <h2>Get in touch</h2>
      <p>
        Questions, ideas or partnership requests? Visit our <Link href="/contact">Contact page</Link>, or share your
        thoughts on the <Link href="/feedback">Feedback page</Link>.
      </p>
    </InfoPage>
  );
}

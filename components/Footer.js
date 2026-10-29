export function SportScoreBadge({ className = "" }) {
  // SportScore API ki terms: visible dofollow link + anchor text "SportScore"
  return (
    <a
      href="https://sportscore.com/"
      rel="dofollow"
      title="Sports data by SportScore"
      className={`attr-badge ${className}`}
    >
      Powered by SportScore
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-row">
        <div>
          <b className="foot-brand">League<em>Score</em></b>
          <p>Live scores, fixtures and results for football, basketball, cricket and tennis.</p>
        </div>
        <div className="foot-right">
          <SportScoreBadge />
          <small>© {new Date().getFullYear()} LeagueScore. Scores may be delayed by up to a minute.</small>
        </div>
      </div>
    </footer>
  );
}

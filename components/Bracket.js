import Crest from "./Crest";

export default function Bracket({ data }) {
  if (!data || !data.rounds.length || !data.rounds.some((r) => r.matchups?.length)) {
    return <p className="empty">No knockout bracket is available for this competition.</p>;
  }
  return (
    <>
      {data.rounds.map((round, n) => (
        <div key={n} className="rnd">
          <h4 className="tbl-title">{round.name}</h4>
          <div className="rnd-grid">
            {(round.matchups || []).map((m, i) => {
              const hw = m.home_score > m.away_score;
              const aw = m.away_score > m.home_score;
              return (
                <div className="tie" key={i}>
                  <div className={hw ? "tie-row win" : "tie-row"}>
                    <Crest src={m.home_logo} name={m.home} size={20} round />
                    <span>{m.home}</span>
                    <b>{m.home_score ?? "–"}</b>
                  </div>
                  <div className={aw ? "tie-row win" : "tie-row"}>
                    <Crest src={m.away_logo} name={m.away} size={20} round />
                    <span>{m.away}</span>
                    <b>{m.away_score ?? "–"}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

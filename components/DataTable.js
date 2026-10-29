import Link from "next/link";
import Crest from "./Crest";
import { slugify } from "@/lib/format";

// Standings / Top scorers dono ke liye
export default function DataTable({ tables, sport, empty = "No data available for this competition right now.", linkPlayers = false }) {
  if (!tables || !tables.length || !tables.some((t) => t.rows.length)) {
    return <p className="empty">{empty}</p>;
  }
  return (
    <>
      {tables.map((t, n) => (
        <div key={n} className="tbl-wrap">
          {t.title && <h4 className="tbl-title">{t.title}</h4>}
          <table className="tbl">
            <thead>
              <tr>
                {t.cols.filter((c) => c.key === "pos").map((c) => (
                  <th key={c.key} className="c-pos">{c.label}</th>
                ))}
                <th className="c-name">{linkPlayers ? "Player" : "Team"}</th>
                {t.cols.filter((c) => c.key !== "pos").map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) => (
                <tr key={i}>
                  {t.cols.filter((c) => c.key === "pos").map((c) => (
                    <td key={c.key} className="c-pos">{r.cells[c.key] ?? "–"}</td>
                  ))}
                  <td className="c-name">
                    <Link href={`/${sport}/${linkPlayers ? "player" : "team"}/${slugify(r.name || "")}`} className="tbl-team">
                      <Crest src={r.logo} name={r.name || "?"} size={22} round />
                      <span>{r.name}{r.team && <small> · {r.team}</small>}</span>
                    </Link>
                  </td>
                  {t.cols.filter((c) => c.key !== "pos").map((c) => (
                    <td key={c.key} className={c.key === "pts" ? "c-pts" : ""}>{r.cells[c.key] ?? "–"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

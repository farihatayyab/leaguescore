import Link from "next/link";
import Crest from "./Crest";
import { getT } from "@/lib/i18n-server";

// Team / player / competition pages ki match row
export default async function MatchRow({ m, sport, team, hideComp = false }) {
  const { t } = await getT();
  const showScore = m.state === "finished" || m.live;
  return (
    <Link href={`/${sport}/match/${m.slug}`} className={`mrow mlink2${hideComp ? " nocomp" : ""}`}>
      <span className="tm">
        {m.live ? <b className="live-badge"><i />{t("live")}{m.minute ? ` ${m.minute}'` : ""}</b> : <span>{m.dayLabel}</span>}
        <small>{m.state === "finished" ? t("ft") : m.time}</small>
      </span>
      <span className="t home">
        <span className="tname" style={m.home === team ? { fontWeight: 700 } : null}>{m.home}</span>
        <Crest src={m.homeLogo} name={m.home} />
      </span>
      <span className={m.live ? "sc livec" : showScore ? "sc" : "sc vs"}>{showScore ? `${m.hs ?? 0} - ${m.as ?? 0}` : t("vs")}</span>
      <span className="t">
        <Crest src={m.awayLogo} name={m.away} />
        <span className="tname" style={m.away === team ? { fontWeight: 700 } : null}>{m.away}</span>
      </span>
      {!hideComp && <span className="comp-note">{m.competition}</span>}
    </Link>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useT } from "./LanguageProvider";

// "Who will win?" - sirf aap ka apna pick, browser mein save hota hai
export default function WinPoll({ id, home, away }) {
  const t = useT();
  const [pick, setPick] = useState("");
  const key = `leaguescore:poll:${id}`;

  useEffect(() => {
    try {
      setPick(localStorage.getItem(key) || "");
    } catch {}
  }, [key]);

  function choose(v) {
    setPick(v);
    try {
      localStorage.setItem(key, v);
    } catch {}
  }

  const opts = [["1", t("poll.home"), home], ["X", t("poll.draw"), "Draw"], ["2", t("poll.away"), away]];
  return (
    <div className="side-card poll">
      <h3>{t("poll.title")}</h3>
      <div className="poll-teams"><span>{home}</span><span>{t("vs")}</span><span>{away}</span></div>
      <div className="poll-btns">
        {opts.map(([v, label]) => (
          <button key={v} className={pick === v ? "on" : ""} onClick={() => choose(v)} aria-pressed={pick === v}>
            <b>{v}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
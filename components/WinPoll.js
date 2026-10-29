"use client";
import { useEffect, useState } from "react";

// "Who will win?" - sirf aap ka apna pick, browser mein save hota hai
export default function WinPoll({ id, home, away }) {
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

  const opts = [["1", "Home", home], ["X", "Draw", "Draw"], ["2", "Away", away]];
  return (
    <div className="side-card poll">
      <h3>Who will win?</h3>
      <div className="poll-teams"><span>{home}</span><span>vs</span><span>{away}</span></div>
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
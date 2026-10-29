"use client";
import { useEffect, useState } from "react";
import type { Match } from "@/types/match";

interface Options {
  sport?: string;
  date?: string; // di ho to usi din ke matches poll hote hain
  live?: boolean;
  poll?: boolean;
  every?: number;
}

export function useLive(
  initial: Match[],
  { sport = "football", date = "", live = false, poll = true, every = 30000 }: Options = {}
): Match[] {
  const [matches, setMatches] = useState<Match[]>(initial);

  useEffect(() => {
    if (!poll) return;
    const params = new URLSearchParams({ sport });
    if (date) params.set("date", date);
    if (live) params.set("live", "1");
    const url = `/api/live?${params}`;

    const load = () => {
      if (document.hidden) return; // tab chhupa ho to calls mat karo
      fetch(url)
        .then((r) => r.json())
        .then((d) => Array.isArray(d.matches) && setMatches(d.matches))
        .catch(() => {});
    };

    const t = setInterval(load, every);
    return () => clearInterval(t);
  }, [sport, date, live, poll, every]);

  return matches;
}

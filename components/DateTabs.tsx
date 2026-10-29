"use client";
import Link from "next/link";
import { shiftDay } from "@/lib/format";

interface Props {
  sport: string;
  date: string; // abhi selected din
  today: string; // server ka "aaj"
  days: { key: string; count: number }[]; // jin dino ka data maujood hai
  q?: string;
  comp?: string;
}

const pretty = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

// SportScore API date nahi leti, isliye sirf wahi din dikhte hain jin ke matches asal mein maujood hain
export default function DateTabs({ sport, date, today, days, q = "", comp = "" }: Props) {
  const href = (day: string) => {
    const p = new URLSearchParams();
    if (day !== today) p.set("date", day); // aaj ke liye saaf URL
    if (q) p.set("q", q);
    if (comp) p.set("comp", comp);
    const qs = p.toString();
    return `/${sport}${qs ? `?${qs}` : ""}`;
  };

  const label = (key: string) =>
    key === today
      ? "Today"
      : key === shiftDay(today, -1)
      ? "Yesterday"
      : key === shiftDay(today, 1)
      ? "Tomorrow"
      : pretty(key);

  // Aaj hamesha, baqi wo din jin mein data hai, aur selected din
  const keys = Array.from(new Set([today, date, ...days.map((d) => d.key)])).sort();
  const countOf = (k: string) => days.find((d) => d.key === k)?.count ?? 0;

  return (
    <div className="datebar" role="tablist" aria-label="Select date">
      {keys.map((k) => (
        <Link
          key={k}
          href={href(k)}
          prefetch={false}
          role="tab"
          aria-selected={k === date}
          className={k === date ? "dtab on" : "dtab"}
        >
          {label(k)} <span>{countOf(k)}</span>
        </Link>
      ))}
    </div>
  );
}
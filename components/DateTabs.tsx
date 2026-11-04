"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_FUTURE_DAYS, MAX_PAST_DAYS, shiftDay } from "@/lib/format";

interface Props {
  sport: string;
  date: string; // abhi selected din
  today: string; // server ka "aaj"
  count: number; // selected din ke matches
  days?: { key: string; count: number }[]; // sirf widget fallback mein bharta hai
  q?: string;
  comp?: string;
}

const pretty = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

// Fixtures endpoint har date ke liye data deta hai: -3 se +3 din ke tabs, aur date picker se purani/aane wali date
// (pichle MAX_PAST_DAYS aur agle MAX_FUTURE_DAYS din tak).
export default function DateTabs({ sport, date, today, count, days = [], q = "", comp = "" }: Props) {
  const router = useRouter();

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

  const quick = [-3, -2, -1, 0, 1, 2, 3].map((n) => shiftDay(today, n));
  const keys = Array.from(new Set([...quick, date])).sort();
  const countOf = (k: string) => (k === date ? count : days.find((d) => d.key === k)?.count);

  return (
    <div className="datebar" role="tablist" aria-label="Select date">
      {keys.map((k) => {
        const c = countOf(k);
        return (
          <Link
            key={k}
            href={href(k)}
            prefetch={false}
            role="tab"
            aria-selected={k === date}
            className={k === date ? "dtab on" : "dtab"}
          >
            {label(k)} {c !== undefined && <span>{c}</span>}
          </Link>
        );
      })}
      <input
        type="date"
        className="dpick"
        aria-label="Pick a date"
        value={date}
        min={shiftDay(today, -MAX_PAST_DAYS)}
        max={shiftDay(today, MAX_FUTURE_DAYS)}
        onChange={(e) => e.target.value && router.push(href(e.target.value))}
      />
    </div>
  );
}

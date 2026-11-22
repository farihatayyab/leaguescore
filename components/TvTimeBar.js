"use client";
import { useRouter } from "next/navigation";
import { useI18n } from "./LanguageProvider";

const dayLabel = (key, today, tr, intl) => {
  const d = new Date(`${key}T12:00:00Z`);
  const t = new Date(`${today}T12:00:00Z`);
  const diff = Math.round((d - t) / 864e5);
  if (diff === 0) return tr("date.today");
  if (diff === 1) return tr("date.tomorrow");
  return d.toLocaleDateString(intl, { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
};
const fmt = (iso, tz) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz });

// "Today ▾  3:00 PM ▾" pickers. Navigates by setting ?at=<unix seconds>.
export default function TimeBar({ days, dayStarts, times, selDay, selOff, today, tz, params }) {
  const router = useRouter();
  const { t, intl } = useI18n();
  const go = (day, off) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    u.set("at", String(dayStarts[day] + off));
    router.push(`/tv-guide?${u.toString()}`);
  };
  return (
    <div className="tvg-pick">
      <label>
        <span>{t("tv.day")}</span>
        <select value={selDay} onChange={(e) => go(e.target.value, selOff)} aria-label={t("tv.day")}>
          {days.map((d) => <option key={d} value={d}>{dayLabel(d, today, t, intl)}</option>)}
        </select>
      </label>
      <label>
        <span>{t("tv.time")}</span>
        <select value={selOff} onChange={(e) => go(selDay, Number(e.target.value))} aria-label={t("tv.startTime")}>
          {times.map((x) => <option key={x.off} value={x.off}>{fmt(x.iso, tz)}</option>)}
        </select>
      </label>
    </div>
  );
}
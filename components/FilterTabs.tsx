"use client";
import type { StatusFilter } from "@/types/match";
import { useT } from "./LanguageProvider";

export const STATUS_TABS: [StatusFilter, string][] = [
  ["all", "f.all"],
  ["live", "f.live"],
  ["scheduled", "f.scheduled"],
  ["finished", "f.finished"],
  ["fav", "f.fav"],
];

interface Props {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (next: StatusFilter) => void;
}

// Sirf UI: kaun sa tab active hai aur har tab mein kitne matches hain
export default function FilterTabs({ value, counts, onChange }: Props) {
  const t = useT();
  return (
    <div className="filters" role="tablist" aria-label={t("f.aria")}>
      {STATUS_TABS.map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          className={value === key ? "fbtn on" : "fbtn"}
          onClick={() => onChange(key)}
        >
          {key === "live" && <i className="dot" />}
          {t(label)} <span>{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}

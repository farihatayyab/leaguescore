"use client";
import type { StatusFilter } from "@/types/match";

export const STATUS_TABS: [StatusFilter, string][] = [
  ["all", "All"],
  ["live", "Live"],
  ["scheduled", "Scheduled"],
  ["finished", "Finished"],
  ["fav", "★ Favorites"],
];

interface Props {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (next: StatusFilter) => void;
}

// Sirf UI: kaun sa tab active hai aur har tab mein kitne matches hain
export default function FilterTabs({ value, counts, onChange }: Props) {
  return (
    <div className="filters" role="tablist" aria-label="Filter matches by status">
      {STATUS_TABS.map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          className={value === key ? "fbtn on" : "fbtn"}
          onClick={() => onChange(key)}
        >
          {key === "live" && <i className="dot" />}
          {label} <span>{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}

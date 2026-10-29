"use client";
import { useState } from "react";

// items: [{ key, label, node }]  (node server se aata hai)
export default function Tabs({ items }) {
  const [k, setK] = useState(items[0].key);
  const cur = items.find((i) => i.key === k) || items[0];
  return (
    <>
      <div className="tabs" role="tablist">
        {items.map((i) => (
          <button key={i.key} role="tab" aria-selected={i.key === k} className={i.key === k ? "tab on" : "tab"} onClick={() => setK(i.key)}>
            {i.label}
          </button>
        ))}
      </div>
      <div className="panel pad">{cur.node}</div>
    </>
  );
}

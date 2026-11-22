"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./LanguageProvider";

// Favourites are stored in a cookie so the server can show them first / filter by them.
const KEY = "tv_favs";
const read = () => {
  const m = document.cookie.split("; ").find((x) => x.startsWith(KEY + "="));
  return m ? decodeURIComponent(m.split("=")[1]).split(",").map(Number).filter(Boolean) : [];
};
const write = (ids) => {
  document.cookie = `${KEY}=${encodeURIComponent(ids.join(","))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
};

export default function FavButton({ id, initial = false, name = "channel", size = 20 }) {
  const router = useRouter();
  const t = useT();
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  useEffect(() => setOn(initial), [initial]);

  function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    const cur = read();
    write(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 200));
    setOn(!on);
    start(() => router.refresh());
  }

  return (
    <button
      type="button"
      className={`tv-fav${on ? " on" : ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={`${on ? t("tv.removeFav") : t("tv.addFav")}: ${name}`}
      title={on ? t("tv.removeFav") : t("tv.addFav")}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

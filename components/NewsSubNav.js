"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAX = 7; // itni categories seedhi dikhengi, baqi "More" me

export default function NewsSubNav({ cats, active = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = cats.slice(0, MAX);
  const extra = cats.slice(MAX);
  const extraActive = extra.some((c) => c.slug === active);

  return (
    <nav className="nw-sub" aria-label="News categories">
      <Link href="/news" className={!active ? "on" : ""}>All</Link>
      {shown.map((c) => (
        <Link key={c.id} href={`/news/category/${c.slug}`} className={active === c.slug ? "on" : ""}>
          {c.name}
        </Link>
      ))}
      {extra.length > 0 && (
        <div className="nw-more" ref={ref}>
          <button type="button" className={extraActive || open ? "on" : ""} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            More ▾
          </button>
          {open && (
            <div className="nw-menu">
              {extra.map((c) => (
                <Link key={c.id} href={`/news/category/${c.slug}`} className={active === c.slug ? "on" : ""}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
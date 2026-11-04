"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Kisi bhi link / search par click karte hi upar progress bar chalti hai, page badalte hi poori ho jati hai
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState("idle"); // idle | loading | done
  const timer = useRef(null);
  const safety = useRef(null);

  const start = () => {
    clearTimeout(timer.current);
    clearTimeout(safety.current);
    setState("loading");
    safety.current = setTimeout(() => setState("idle"), 15000); // agar kabhi page na khule to bar atki na rahe
  };

  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = (e) => {
      if (!e.defaultPrevented) start();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  // page (ya ?date= waghera) badal gaya: bar poori karke chhupa do
  useEffect(() => {
    clearTimeout(safety.current);
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 350);
    return () => clearTimeout(timer.current);
  }, [pathname, search]);

  return <div className={`navbar ${state}`} role="progressbar" aria-hidden={state === "idle"} />;
}
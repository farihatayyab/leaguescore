"use client";
import { useEffect, useRef, useState } from "react";
import { LANGS } from "@/lib/i18n";
import { useI18n } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { locale, t, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.title")}
        title={t("lang.title")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t("lang.title")}>
          {LANGS.map((l) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                className={l.code === locale ? "on" : ""}
                lang={l.code}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
              >
                <span>{l.label}</span>
                {l.code === locale && <b aria-hidden="true">✓</b>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, isLang, langInfo, makeT } from "@/lib/i18n";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap";

function ensureFont(code) {
  if (!["ur", "ar", "hi"].includes(code)) return;
  if (document.querySelector(`link[href="${FONT_URL}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = FONT_URL;
  document.head.appendChild(l);
}

const Ctx = createContext({ locale: "en", t: makeT("en"), intl: "en-GB", setLocale: () => {} });

export function LanguageProvider({ locale: initial, children }) {
  const router = useRouter();
  const [locale, setLoc] = useState(initial);

  useEffect(() => setLoc(initial), [initial]);

  const setLocale = useCallback(
    (code) => {
      if (!isLang(code)) return;
      document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      const info = langInfo(code);
      document.documentElement.lang = code;
      document.documentElement.dir = info.dir;
      ensureFont(code);
      setLoc(code);
      router.refresh(); // server components naye language mein dobara render hote hain
    },
    [router]
  );

  const value = useMemo(
    () => ({ locale, t: makeT(locale), intl: langInfo(locale).intl, setLocale }),
    [locale, setLocale]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;

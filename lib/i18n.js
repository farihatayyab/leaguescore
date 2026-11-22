// Pure (server + client dono import kar sakte hain)
import { TABLE } from "./translations";

export const LANGS = [
  { code: "en", label: "English", dir: "ltr", intl: "en-GB" },
  { code: "ur", label: "اردو", dir: "rtl", intl: "ur-PK" },
  { code: "hi", label: "हिन्दी", dir: "ltr", intl: "hi-IN" },
  { code: "ar", label: "العربية", dir: "rtl", intl: "ar-u-nu-latn" },
  { code: "es", label: "Español", dir: "ltr", intl: "es-ES" },
  { code: "fr", label: "Français", dir: "ltr", intl: "fr-FR" },
];

export const DEFAULT_LANG = "en";
export const LANG_COOKIE = "leaguescore-lang";

export const isLang = (c) => LANGS.some((l) => l.code === c);
export const langInfo = (c) => LANGS.find((l) => l.code === c) || LANGS[0];

// TABLE: { "key": [en, ur, hi, ar, es, fr] }  ->  DICT[code][key]
const DICT = Object.fromEntries(
  LANGS.map((l, i) => [l.code, Object.fromEntries(Object.entries(TABLE).map(([k, v]) => [k, v[i] || v[0]]))])
);

// translate("en", "list.round", { n: 5 })  ->  "Round 5"
export function translate(locale, key, vars) {
  const s = (DICT[locale] && DICT[locale][key]) || DICT.en[key] || key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : s;
}

export const makeT = (locale) => (key, vars) => translate(locale, key, vars);

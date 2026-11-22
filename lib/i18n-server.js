import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, langInfo, makeT } from "./i18n";

// Server components mein: const { t, locale, intl } = await getT();
export async function getLocale() {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(c) ? c : DEFAULT_LANG;
}

export async function getT() {
  const locale = await getLocale();
  return { t: makeT(locale), locale, intl: langInfo(locale).intl, dir: langInfo(locale).dir };
}

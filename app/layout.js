import "./globals.css";
import Ticker from "@/components/Ticker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getMatches } from "@/lib/data";
import { Suspense } from "react";
import NavProgress from "@/components/NavProgress";
import { HideOnAdmin, MainShell } from "@/components/SiteChrome";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getLocale } from "@/lib/i18n-server";
import { langInfo } from "@/lib/i18n";
export const metadata = {
  title: { default: "LeagueScore – Live scores, fixtures & results", template: "%s | LeagueScore" },
  description: "Live football, basketball, cricket and tennis scores, fixtures, lineups and match timelines.",
};

export const viewport = { themeColor: "#0b2f40" };

// Page load se pehle theme laga deta hai taake flash na ho
const themeScript = `try{var t=localStorage.getItem('leaguescore-theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default async function RootLayout({ children }) {
  const matches = await getMatches("football");
  const locale = await getLocale();
  const { dir } = langInfo(locale);
  return (
    <html lang={locale} dir={dir} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Urdu / Arabic / Hindi ke liye achhe fonts */}
        {locale !== "en" && locale !== "es" && locale !== "fr" && (
          // eslint-disable-next-line @next/next/no-page-custom-font
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"
          />
        )}
      </head>
      <body>
        <LanguageProvider locale={locale}>
         <Suspense fallback={null}>
    <NavProgress />
  </Suspense>
        <HideOnAdmin>
    <Header />
    <Ticker initial={matches.filter((m) => m.live)} />
  </HideOnAdmin>
  <MainShell>{children}</MainShell>
  <HideOnAdmin>
    <Footer />
  </HideOnAdmin>
        </LanguageProvider>
      </body>
    </html>
  );
}

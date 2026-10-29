import "./globals.css";
import Ticker from "@/components/Ticker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getMatches } from "@/lib/data";
import { HideOnAdmin, MainShell } from "@/components/SiteChrome";
export const metadata = {
  title: { default: "LeagueScore – Live scores, fixtures & results", template: "%s | LeagueScore" },
  description: "Live football, basketball, cricket and tennis scores, fixtures, lineups and match timelines.",
};

export const viewport = { themeColor: "#0b2f40" };

// Page load se pehle theme laga deta hai taake flash na ho
const themeScript = `try{var t=localStorage.getItem('leaguescore-theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default async function RootLayout({ children }) {
  const matches = await getMatches("football");
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <HideOnAdmin>
    <Header />
    <Ticker initial={matches.filter((m) => m.live)} />
  </HideOnAdmin>
  <MainShell>{children}</MainShell>
  <HideOnAdmin>
    <Footer />
  </HideOnAdmin>
      </body>
    </html>
  );
}

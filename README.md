# LeagueScore

Live scores website (Next.js + MySQL login). Data: **SportScore free API** (key nahi chahiye).

1. `npm install` (TypeScript devDependencies bhi install hongi)
2. XAMPP mein MySQL start karo
3. phpMyAdmin (http://localhost/phpmyadmin) mein database `leaguescore` banao
   (ya `schema.sql` ko Import karo). `users` table khud ban jati hai.
4. `.env.example` ko copy karke `.env` banao, DB values aur `AUTH_SECRET` bharo
   (purani `SPORTS_API_KEY` / `SPORTS_API_BASE` lines ab use nahi hoti, hata sakte ho)
5. `npm run dev` -> http://localhost:3000

## SportScore API
- Free: ~10,000 requests / 24h / IP. Is project mein server-side cache (60s), duplicate-request
  rokne wala lock aur `SPORTSCORE_DAILY_LIMIT` (default 9000) laga hai, isliye limit par pohanchna mushkil hai.
- Shart: har page par **"Powered by SportScore"** ka dofollow link dikhna chahiye (`components/Footer.js`).
  Isay hata'o mat.
- Pages: `/[sport]`, `/[sport]/match/[slug]`, `/[sport]/team/[slug]`, `/[sport]/player/[slug]`, `/[sport]/competition/[slug]` (standings, top scorers, assists, bracket)
- Sports: football, basketball, cricket, tennis (`/football`, `/basketball`, ...).

## Folder guide
- `lib/sportscore.js` - API calls, cache, daily limit guard, data mapping
- `app/[sport]/page.js` - match list, `app/[sport]/match/[slug]/page.js` - match detail
- `components/` - Header, LiveList, Sidebar, MatchView, Footer
- `app/globals.css` - poora theme (teal / navy / yellow colors upar `:root` mein)

## Date + status filters (v0.6)
- `app/[sport]/page.tsx` - server component, `?date=YYYY-MM-DD` se us din ke matches fetch karta hai
- `components/DateTabs.tsx` - Yesterday / Today / Tomorrow + date picker (+-14 din)
- `components/FilterTabs.tsx` - All / Live / Scheduled / Finished / Favorites
- `components/MatchesList.tsx` - 50 matches par client-side status filter + favorites
- `lib/sportscore.js` -> `fetchMatchesByDate()`; fetch `next: { revalidate: 60 }` ke sath

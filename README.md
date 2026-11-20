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
- `components/DateTabs.tsx` - -3..+3 din ke tabs + date picker (pichle 60 / agle 14 din)
- `components/FilterTabs.tsx` - All / Live / Scheduled / Finished / Favorites
- `components/MatchesList.tsx` - 50 matches par client-side status filter + favorites
- `lib/sportscore.js` -> `fetchMatchesByDate()`

## News + Admin (v0.7)
- `/admin` -> sidebar: Dashboard, All news, Add news, Categories / Subnavbar
- Category add karo (`/admin/categories` ya Add news form ke andar) -> news site ke subnavbar me foran aa jati hai
- `/news` home, `/news/category/[slug]`, `/news/all` (sab news + sab categories ek page par)
- `app/admin/layout.js` admin sidebar layout hai (pehle galat folder me tha)

## SportScore Fixtures API (guide ke mutabiq)
- `fetchMatchesByDate()` ab `/api/v1/fixtures/?sport=&date=&limit=200` use karta hai (pehle widget feed tha jo date ignore karta aur 50 par ruk jata tha).
- Karachi (UTC+5) ka ek din UTC ke 2 din mein bantta hai, isliye `D-1` aur `D` dono fetch hote hain aur `Asia/Karachi` din ke matches rakhe jate hain.
- Cache: aaj 60s, aane wale din 10 min, kal 5 min, usse purane din 6 ghante. Same sport/date ka response sab visitors ke liye reuse hota hai, browser seedha SportScore ko call nahi karta (`/api/live` server se guzarta hai).
- Fixtures ka format docs mein verify nahi tha, isliye parser tolerant hai (array / `fixtures` / `matches` / `data`). Agar fixtures endpoint fail ho ya format samajh na aaye to khud purane widget feed par wapas aa jata hai (console mein warning aati hai).
- Agar kisi din 200 se zyada fixtures hon to page par "list may be incomplete" note aata hai. Docs se pagination parameter confirm karke `.env` mein `SPORTSCORE_PAGE_PARAM` / `SPORTSCORE_PAGE_MODE` set karo.
- Status mapping (live / scheduled / finished / other) ab 1H, 2H, HT, FT, AET, PEN, NS, pending, postponed waghera sambhalti hai.
- `/api/tracker?sport=&slug=` live tracker (`/api/widget/tracker/`) ka server-side cached proxy hai. Abhi UI mein nahi lagaya, kyunke uska format docs mein nahi.
- Pehli baar chalane par terminal mein check karo: `curl "https://sportscore.com/api/v1/fixtures/?sport=football&date=$(date +%F)&limit=3"`

## Footer + info pages (v0.9)
- `components/Footer.js` - 6 columns (4 sports, Top Competitions, Top Leagues), About/Quick links, social icons, back-to-top. "Powered by SportScore" link yahin hai, hatana mat.
- Pages: `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/feedback` (`components/InfoPage.js` layout)
- Contact aur Feedback forms `/api/contact` par jate hain aur MySQL table `contact_messages` mein save hote hain (khud ban jati hai). Spam ke liye honeypot + 5 messages/ghanta/IP.
- Admin: `/admin/messages` - messages padho, Reply (mailto), read/unread, delete.
- Footer ke naam/email/social links `lib/site.js` aur `.env` (`SITE_EMAIL`, `SOCIAL_*`) se aate hain.
- Legal pages ka text general template hai; live karne se pehle apne hisaab se (aur zaroorat ho to kisi qanooni mahir se) check kar lo. Date `lib/site.js` mein `legalUpdated`.

## API attribution + Embed widget (v1.0)
- Har `/api/live`, `/api/match`, `/api/tracker` response mein `attribution: { brandName, url, required: true }` aata hai (errors mein bhi). Code: `lib/attribution.js`, wrapper `lib/apiGuard.js` (`withApiGuard`).
- Embed: `public/embed.js`
  ```html
  <div data-leaguescore-widget data-sport="football" data-live="1" data-api-key="ls_live_..."></div>
  <script src="https://YOUR-SITE/embed.js" async></script>
  ```
  Widget closed Shadow DOM mein "Powered by LeagueScore" badge render karta hai. Data fetch/render se pehle aur har 1.5s (+ DOM change par) check hota hai ke badge DOM mein hai, `display/visibility/opacity/clip-path` theek hain, size/position theek hai aur link/text badla nahi. Fail hone par data hat jata hai, "attribution requirement" message aata hai aur `/api/embed/violation` ko report jati hai. Badge wapas theek ho to widget khud recover ho jata hai.
- Key banana: `node --env-file=.env scripts/create-api-key.mjs "Owner" owner@email.com "example.com,*.example.org"` (raw key sirf ek baar dikhti hai, DB mein hash save hota hai).
- Logging: `api_request_logs` (key prefix, endpoint, `Origin`, `Referer`, caller_host, IP, user-agent, flags, blocked), `attribution_violations`. Tables khud ban jati hain (ya `schema.sql`).
- `API_KEY_MODE=log` (default): sirf log. `API_KEY_MODE=enforce`: third-party calls ko valid key + allowed domain chahiye (apni site ke frontend ki calls exempt). Pehle `log` mein chalao, logs dekho, phir `enforce` karo.
- Useful queries:
  ```sql
  SELECT caller_host, key_prefix, COUNT(*) n FROM api_request_logs WHERE flags <> '' GROUP BY 1,2 ORDER BY n DESC;
  SELECT caller_host, reason, COUNT(*) n, MAX(created_at) last FROM attribution_violations GROUP BY 1,2 ORDER BY n DESC;
  UPDATE api_keys SET status='suspended' WHERE key_prefix='ls_live_ab12';
  ```
- Limitation: client-side check sirf casual hide/delete rokta hai; script ki apni copy edit karne wale ko nahi. Asli control server-side hai (key suspend/revoke, domain allow-list, logs).
- Upstream: SportScore data ki terms ke mutabiq widget mein "Data by SportScore" link bhi hai; third-party ko data dene se pehle unki terms check karo.

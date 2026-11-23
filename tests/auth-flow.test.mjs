// Chalane ka tareeqa:  npm run test:auth   (Node 22+). MySQL / SMTP ki zaroorat nahi: fake DB + fake mailer use hota hai.
import { register } from "node:module";
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

register("./loader.mjs", import.meta.url);
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret";
process.env.NEXT_PUBLIC_APP_URL = "https://leaguescore.test";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_USER = "mailer@example.com";
process.env.SMTP_PASSWORD = "app-password";
process.env.RESET_TOKEN_TTL_MINUTES = "30";
process.env.NODE_ENV = "test";

const { fake } = await import("./stubs/clock.mjs");
const login = await import("@/app/api/auth/login/route.js");
const signup = await import("@/app/api/auth/signup/route.js");
const forgot = await import("@/app/api/auth/forgot-password/route.js");
const reset = await import("@/app/api/auth/reset-password/route.js");
const me = await import("@/app/api/auth/me/route.js");
const { getAdmin } = await import("@/lib/admin.js");
const { isResetTokenValid } = await import("@/lib/passwordReset.js");
const { middleware } = await import("@/middleware.js");

const db = globalThis.__db;
const jar = globalThis.__jar;
const mails = globalThis.__mails;
let ipN = 0;
const mk = (body, ip) => ({ json: async () => body, headers: new Headers({ "x-forwarded-for": ip || `10.0.0.${++ipN}` }) });
const call = async (mod, body, ip) => { const r = await mod.POST(mk(body, ip)); return { status: r.status, body: await r.json() }; };
const resetLimits = () => globalThis.rlHits?.clear(); // in-memory rate limiter saaf
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokenFromMail = (m) => /reset-password\?token=([a-f0-9]{64})/.exec(m.text)[1];
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

const GOOD = "Sup3rSecret1";
const USER = { name: "Ali Khan", email: "ali@example.com", password: GOOD };

test("signup: validation + hashed password + role always 'user'", async () => {
  assert.equal((await call(signup, { ...USER, password: "short1" })).status, 400);
  assert.equal((await call(signup, { ...USER, password: "onlyletters" })).status, 400);
  assert.equal((await call(signup, { ...USER, password: "12345678" })).status, 400);
  assert.equal((await call(signup, { ...USER, email: "not-an-email" })).status, 400);
  assert.equal((await call(signup, { ...USER, name: " " })).status, 400);

  const r = await call(signup, { ...USER, email: "  ALI@Example.com ", role: "admin" }); // role body se ignore hona chahiye
  assert.equal(r.status, 200);
  assert.equal(r.body.user.role, "user");
  assert.equal(r.body.redirect, "/dashboard");
  const row = db.users.find((u) => u.email === "ali@example.com");
  assert.equal(row.role, "user");
  assert.notEqual(row.password, GOOD);
  assert.ok(row.password.startsWith("$fake$"));
  assert.equal((await call(signup, USER)).status, 409);
});

test("login: user -> /dashboard, admin (DB role) -> /admin, wrong creds rejected", async () => {
  jar.clear();
  const bad = await call(login, { email: USER.email, password: "WrongPass1" });
  const unknown = await call(login, { email: "nobody@example.com", password: "WrongPass1" });
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.body, unknown.body); // same message, email registered hai ya nahi pata na chale

  const u = await call(login, USER);
  assert.equal(u.status, 200);
  assert.equal(u.body.user.role, "user");
  assert.equal(u.body.redirect, "/dashboard");
  assert.equal(await getAdmin(), null, "normal user admin nahi hona chahiye");

  db.users.find((x) => x.email === USER.email).role = "admin"; // DB mein role badla, token wahi
  assert.equal((await getAdmin())?.email, USER.email, "role DB se aata hai, token se nahi");
  assert.equal((await (await me.GET()).json()).user.role, "admin");
  const a = await call(login, USER);
  assert.equal(a.body.redirect, "/admin");

  db.users.find((x) => x.email === USER.email).role = "user"; // demote: usi session par foran asar
  assert.equal(await getAdmin(), null);
});

test("middleware: /admin, /api/admin, /dashboard login ke baghair band + CSRF", async () => {
  const mkReq = (path, { cookie, method = "GET", headers = {} } = {}) => ({
    method,
    headers: new Headers({ host: "x.test", ...headers }),
    cookies: { get: (n) => (n === "session" && cookie ? { value: cookie } : undefined) },
    nextUrl: { pathname: path, search: "", clone() { return { pathname: path, search: "", get href() { return `https://x.test${this.pathname}${this.search}`; } }; } },
  });
  assert.equal((await middleware(mkReq("/api/admin/articles"))).status, 401);
  const page = await middleware(mkReq("/admin"));
  assert.equal(page.status, 307);
  assert.equal(page.headers.get("location"), "https://x.test/login");
  assert.equal((await middleware(mkReq("/dashboard", { cookie: "garbage.token.value" }))).status, 307);
  await call(login, USER);
  const ok = await middleware(mkReq("/admin", { cookie: jar.get("session") }));
  assert.equal(ok.headers.get("x-middleware-next"), "1");

  // CSRF
  const evil = { method: "POST", headers: { origin: "https://evil.test" } };
  assert.equal((await middleware(mkReq("/api/auth/login", evil))).status, 403);
  assert.equal((await middleware(mkReq("/api/admin/articles", { ...evil, cookie: jar.get("session") }))).status, 403);
  assert.equal((await middleware(mkReq("/api/auth/login", { method: "POST", headers: { "sec-fetch-site": "cross-site" } }))).status, 403);
  const good = await middleware(mkReq("/api/auth/login", { method: "POST", headers: { origin: "https://x.test" } }));
  assert.equal(good.headers.get("x-middleware-next"), "1", "same-origin POST allowed, login ke baghair bhi");
  assert.equal((await middleware(mkReq("/api/auth/me"))).headers.get("x-middleware-next"), "1");
});

test("forgot password: same response for known/unknown email, mail only to the real user", async () => {
  mails.length = 0;
  const known = await call(forgot, { email: USER.email });
  const unknown = await call(forgot, { email: "ghost@example.com" });
  assert.equal(known.status, 200);
  assert.deepEqual(known.body, unknown.body);
  assert.equal((await call(forgot, { email: "bad" })).status, 400);
  await sleep(50); // mail background mein jati hai

  assert.equal(mails.length, 1);
  const m = mails[0];
  assert.equal(m.to, USER.email);
  assert.equal(m.from, '"LeagueScore" <mailer@example.com>');
  assert.match(m.html, /Reset Password/);
  const token = tokenFromMail(m);
  assert.ok(m.html.includes(`https://leaguescore.test/reset-password?token=${token}`));
  // DB mein raw token nahi, sirf hash
  assert.ok(db.resets.every((r) => r.token_hash !== token));
  assert.ok(db.resets.some((r) => r.token_hash === sha(token)));
  assert.ok(await isResetTokenValid(token));
});

test("reset password: validation, success, one-time use, old password dead", async () => {
  mails.length = 0;
  await call(forgot, { email: USER.email });
  await sleep(50);
  const token = tokenFromMail(mails.at(-1));

  assert.equal((await call(reset, { token, password: "weak", confirmPassword: "weak" })).status, 400);
  const mismatch = await call(reset, { token, password: "NewPassw0rd", confirmPassword: "NewPassw0rd2" });
  assert.equal(mismatch.status, 400);
  assert.match(mismatch.body.error, /match/i);
  assert.equal((await call(reset, { token: "a".repeat(64), password: "NewPassw0rd", confirmPassword: "NewPassw0rd" })).status, 400);
  assert.ok(await isResetTokenValid(token), "galat attempts se token use nahi hona chahiye");

  await call(login, USER); // purana session (reset se pehle)
  assert.ok((await getAdmin()) === null && (await (await me.GET()).json()).user);
  fake.offset += 10_000;

  const ok = await call(reset, { token, password: "NewPassw0rd", confirmPassword: "NewPassw0rd" });
  assert.equal(ok.status, 200);
  assert.match(ok.body.message, /success/i);
  assert.equal(jar.has("session"), false, "reset ke baad session hat jata hai");

  assert.equal((await call(reset, { token, password: "Another1Pass", confirmPassword: "Another1Pass" })).status, 400, "token dobara use nahi");
  assert.equal((await call(login, USER)).status, 401, "purana password band");
  const nl = await call(login, { email: USER.email, password: "NewPassw0rd" });
  assert.equal(nl.status, 200, "naye password se login");
  assert.notEqual(db.users.find((u) => u.email === USER.email).password, "NewPassw0rd");
  await sleep(50);
  assert.ok(mails.some((m) => /password was changed/i.test(m.subject)), "confirmation mail");
});

test("old sessions die after password reset", async () => {
  resetLimits();
  USER.password = "NewPassw0rd";
  fake.offset += 5_000;
  await call(login, USER);
  const stale = jar.get("session");
  mails.length = 0;
  await call(forgot, { email: USER.email });
  await sleep(50);
  const token = tokenFromMail(mails.at(-1));
  fake.offset += 20_000;
  assert.equal((await call(reset, { token, password: "ThirdPassw0rd", confirmPassword: "ThirdPassw0rd" })).status, 200);
  jar.set("session", stale); // attacker ke paas purana cookie
  assert.equal((await (await me.GET()).json()).user, null);
  USER.password = "ThirdPassw0rd";
});

test("token expires, and a newer token invalidates the older one", async () => {
  resetLimits();
  mails.length = 0;
  await call(forgot, { email: USER.email });
  await sleep(50);
  const t1 = tokenFromMail(mails.at(-1));
  fake.offset += 29 * 60_000;
  assert.ok(await isResetTokenValid(t1), "29 minute par abhi valid");
  fake.offset += 2 * 60_000;
  assert.equal(await isResetTokenValid(t1), false, "31 minute par expire");
  assert.equal((await call(reset, { token: t1, password: "Expired1Pass", confirmPassword: "Expired1Pass" })).status, 400);

  mails.length = 0;
  await call(forgot, { email: USER.email });
  await sleep(50);
  const t2 = tokenFromMail(mails.at(-1));
  await call(forgot, { email: USER.email });
  await sleep(50);
  const t3 = tokenFromMail(mails.at(-1));
  assert.equal(await isResetTokenValid(t2), false, "naye token ke baad purana band");
  assert.ok(await isResetTokenValid(t3));
});

test("two simultaneous resets with the same token: only one wins", async () => {
  resetLimits();
  mails.length = 0;
  await call(forgot, { email: USER.email });
  await sleep(50);
  const token = tokenFromMail(mails.at(-1));
  const [a, b] = await Promise.all([
    call(reset, { token, password: "RaceWinner1A", confirmPassword: "RaceWinner1A" }),
    call(reset, { token, password: "RaceWinner1B", confirmPassword: "RaceWinner1B" }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
});

test("forgot-password per-email rate limit stays silent (no extra mails, same response)", async () => {
  mails.length = 0;
  const email = "spam@example.com";
  await call(signup, { name: "Spam Target", email, password: GOOD });
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await call(forgot, { email }));
  await sleep(80);
  assert.ok(results.every((r) => r.status === 200 && r.body.message === results[0].body.message));
  assert.equal(mails.filter((m) => m.to === email).length, 3);
});

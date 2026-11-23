import crypto from "node:crypto";
import { fake } from "./clock.mjs";
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const sig = (data, key) => crypto.createHmac("sha256", Buffer.from(key)).update(data).digest("base64url");

export class SignJWT {
  constructor(p) { this.p = { ...p }; this.h = {}; }
  setProtectedHeader(h) { this.h = h; return this; }
  setIssuedAt() { this.p.iat = Math.floor(fake.now() / 1000); return this; }
  setExpirationTime(s) { this.p.exp = Math.floor(fake.now() / 1000) + (parseInt(s) || 1) * 86400; return this; }
  async sign(key) { const d = `${b64(this.h)}.${b64(this.p)}`; return `${d}.${sig(d, key)}`; }
}
export async function jwtVerify(token, key) {
  const [h, p, s] = String(token).split(".");
  if (!s || sig(`${h}.${p}`, key) !== s) throw new Error("bad signature");
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  if (payload.exp && payload.exp < Math.floor(fake.now() / 1000)) throw new Error("expired");
  return { payload };
}

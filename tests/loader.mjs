// Test ke liye module resolver: "@/" alias aur bahar ke packages (mysql2, jose, next, nodemailer, bcryptjs) ke fake versions
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const stubs = {
  bcryptjs: "bcryptjs.mjs",
  jose: "jose.mjs",
  "next/server": "next-server.mjs",
  "next/headers": "next-headers.mjs",
  "mysql2/promise": "mysql2.mjs",
  nodemailer: "nodemailer.mjs",
};
const isFile = (f) => fs.existsSync(f) && fs.statSync(f).isFile();
const withExt = (base) => ["", ".js", ".mjs"].map((e) => base + e).find(isFile);

export async function resolve(spec, ctx, next) {
  if (stubs[spec]) return { url: pathToFileURL(path.join(here, "stubs", stubs[spec])).href, shortCircuit: true };
  if (spec.startsWith("@/")) {
    const f = withExt(path.join(root, spec.slice(2)));
    if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
  }
  if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:") && !path.extname(spec)) {
    const f = withExt(path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec));
    if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
  }
  return next(spec, ctx);
}

import crypto from "node:crypto";
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString("hex");
const api = {
  hashSync: (pw) => { const s = crypto.randomBytes(8).toString("hex"); return `$fake$${s}$${hash(pw, s)}`; },
  hash: async (pw) => api.hashSync(pw),
  compare: async (pw, h) => { const [, , s, x] = String(h).split("$"); return !!s && hash(pw, s) === x; },
};
export default api;

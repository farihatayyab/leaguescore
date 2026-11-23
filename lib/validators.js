// Server aur client dono isi se validate karte hain
export const normalizeEmail = (v) => String(v ?? "").trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  if (!email || email.length > 190 || !EMAIL_RE.test(email)) return "Please enter a valid email address.";
  return null;
}

export function validateName(name) {
  const n = String(name ?? "").trim();
  if (n.length < 2) return "Please enter your name (at least 2 characters).";
  if (n.length > 100) return "Name is too long (max 100 characters).";
  return null;
}

// bcrypt sirf pehle 72 bytes use karta hai, isliye upar ki hadd 72 bytes
export function validatePassword(pw) {
  if (typeof pw !== "string" || !pw) return "Please enter a password.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (Buffer.byteLength(pw, "utf8") > 72) return "Password is too long (max 72 characters).";
  if (!/[A-Za-z]/.test(pw)) return "Password must contain at least one letter.";
  if (!/\d/.test(pw)) return "Password must contain at least one number.";
  return null;
}

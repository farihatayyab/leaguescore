import { getCurrentUser } from "./auth";

// Admin wahi hai jiska role database mein "admin" ho (email .env mein hardcode nahi)
export async function getAdmin() {
  const u = await getCurrentUser();
  return u && u.role === "admin" ? u : null;
}

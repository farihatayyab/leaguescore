import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const key = () => {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set in .env");
  return new TextEncoder().encode(process.env.AUTH_SECRET);
};

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
  (await cookies()).set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

// { uid, iat } ya null
export async function getSession() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: payload.uid, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

export async function getUserId() {
  return (await getSession())?.uid ?? null;
}

export async function destroySession() {
  (await cookies()).delete("session");
}

import { cookies } from "next/headers";
import { redis, KEYS } from "./redis";
import { findAccount, type Account } from "./accounts";

const COOKIE = "dk_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 Tage

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomUUID();
  await redis().set(KEYS.session(token), userId, { ex: SESSION_TTL });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await redis().del(KEYS.session(token));
  jar.delete(COOKIE);
}

// Gibt das aktuell angemeldete Konto zurück (oder null).
export async function currentUser(): Promise<Account | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const userId = await redis().get<string>(KEYS.session(token));
  if (!userId) return null;
  return findAccount(userId) ?? null;
}

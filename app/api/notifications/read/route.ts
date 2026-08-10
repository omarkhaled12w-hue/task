import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { redis, KEYS } from "@/lib/redis";
import type { Notification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const key = KEYS.notif(user.id);
  const raw = (await redis().lrange<any>(key, 0, 19)) || [];
  const list: Notification[] = raw.map((v) => (typeof v === "string" ? JSON.parse(v) : v));
  if (list.length) {
    const updated = list.map((n) => ({ ...n, read: true }));
    await redis().del(key);
    if (updated.length) await redis().rpush(key, ...updated.map((n) => JSON.stringify(n)));
  }
  return NextResponse.json({ ok: true });
}

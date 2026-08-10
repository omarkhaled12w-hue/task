import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { redis, KEYS } from "@/lib/redis";
import type { Notification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const raw = (await redis().lrange<any>(KEYS.notif(user.id), 0, 19)) || [];
  const list: Notification[] = raw.map((v) => (typeof v === "string" ? JSON.parse(v) : v));
  const unread = list.filter((n) => !n.read).length;
  return NextResponse.json({ notifications: list, unread });
}

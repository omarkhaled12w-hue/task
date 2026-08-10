import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { redis, KEYS } from "@/lib/redis";
import type { Task } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadTask(id: string): Promise<Task | null> {
  const raw = await redis().hget<any>(KEYS.tasks, id);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await ctx.params;
  const task = await loadTask(id);
  if (!task) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Agent darf nur eigene Aufgaben ändern.
  if (user.role !== "manager" && task.agentId !== user.id)
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  if (typeof body?.done === "boolean") task.done = body.done;
  if (typeof body?.text === "string" && body.text.trim()) task.text = body.text.trim();
  if (["hoch", "mittel", "niedrig"].includes(body?.prio)) task.prio = body.prio;
  if (typeof body?.due === "string") task.due = body.due;

  await redis().hset(KEYS.tasks, { [id]: JSON.stringify(task) });
  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await ctx.params;
  const task = await loadTask(id);
  if (!task) return NextResponse.json({ ok: true });

  // Manager darf alles löschen; Agent nur eigene.
  if (user.role !== "manager" && task.agentId !== user.id)
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  await redis().hdel(KEYS.tasks, id);
  return NextResponse.json({ ok: true });
}

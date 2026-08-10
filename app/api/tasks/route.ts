import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { redis, KEYS } from "@/lib/redis";
import { findAccount } from "@/lib/accounts";
import { pushNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface Task {
  id: number;
  agentId: string;
  text: string;
  prio: "hoch" | "mittel" | "niedrig";
  due: string;
  done: boolean;
  createdBy: string;
  createdAt: number;
}

async function ensureSeed() {
  const seeded = await redis().get(KEYS.seeded);
  if (seeded) return;
  const today = new Date();
  const iso = (d: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + d);
    return x.toISOString().slice(0, 10);
  };
  const demo: Task[] = [
    { id: 1, agentId: "a1", text: "Herrn Weber zurückrufen", prio: "hoch", due: iso(0), done: false, createdBy: "m1", createdAt: Date.now() },
    { id: 2, agentId: "a1", text: "Unterlagen an Frau Klein senden", prio: "mittel", due: iso(1), done: false, createdBy: "m1", createdAt: Date.now() },
    { id: 4, agentId: "a2", text: "5 neue Leads durchgehen", prio: "mittel", due: iso(0), done: false, createdBy: "m1", createdAt: Date.now() },
    { id: 6, agentId: "a3", text: "Reservierung bestätigen", prio: "hoch", due: iso(-1), done: false, createdBy: "m1", createdAt: Date.now() },
  ];
  const map: Record<string, string> = {};
  for (const t of demo) map[String(t.id)] = JSON.stringify(t);
  await redis().hset(KEYS.tasks, map);
  await redis().set(KEYS.taskSeq, 100);
  await redis().set(KEYS.seeded, 1);
}

async function allTasks(): Promise<Task[]> {
  const raw = (await redis().hgetall<Record<string, any>>(KEYS.tasks)) || {};
  const list = Object.values(raw).map((v) => (typeof v === "string" ? JSON.parse(v) : v)) as Task[];
  return list.sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  await ensureSeed();
  let list = await allTasks();
  if (user.role !== "manager") list = list.filter((t) => t.agentId === user.id);
  return NextResponse.json({ tasks: list });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Titel fehlt" }, { status: 400 });
  const prio = ["hoch", "mittel", "niedrig"].includes(body?.prio) ? body.prio : "mittel";
  const due = typeof body?.due === "string" ? body.due : "";

  // ---- Server-seitige Rechteprüfung ----
  // Manager darf einem beliebigen Agent zuweisen; Agent nur sich selbst.
  let agentId = user.id;
  if (user.role === "manager") {
    const target = findAccount(String(body?.agentId ?? ""));
    if (!target || target.role !== "agent")
      return NextResponse.json({ error: "Ungültiger Agent" }, { status: 400 });
    agentId = target.id;
  }

  const id = await redis().incr(KEYS.taskSeq);
  const task: Task = { id, agentId, text, prio, due, done: false, createdBy: user.id, createdAt: Date.now() };
  await redis().hset(KEYS.tasks, { [String(id)]: JSON.stringify(task) });

  // ---- Benachrichtigungen (auf Deutsch) ----
  if (user.id === agentId) {
    // Agent hat sich selbst eine Aufgabe erstellt.
    await pushNotification(user.id, `Aufgabe erstellt: „${text}"`);
  } else {
    const agentName = findAccount(agentId)?.name ?? "Agent";
    await pushNotification(user.id, `Aufgabe für ${agentName} erstellt: „${text}"`);
    await pushNotification(agentId, `Neue Aufgabe zugewiesen: „${text}"`);
  }

  return NextResponse.json({ task });
}

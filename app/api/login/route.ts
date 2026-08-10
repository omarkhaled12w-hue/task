import { NextResponse } from "next/server";
import { findByUsername, publicAccount } from "@/lib/accounts";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const { username, password } = body ?? {};
  const acc = findByUsername(String(username ?? ""));
  if (!acc || acc.password !== String(password ?? "")) {
    return NextResponse.json({ error: "Falscher Benutzername oder Passwort" }, { status: 401 });
  }
  await createSession(acc.id);
  return NextResponse.json({ user: publicAccount(acc) });
}

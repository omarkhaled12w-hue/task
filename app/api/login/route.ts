import { NextResponse } from "next/server";
import { findAccount, publicAccount } from "@/lib/accounts";
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
  const { accountId, password } = body ?? {};
  const acc = findAccount(String(accountId ?? ""));
  if (!acc || acc.password !== String(password ?? "")) {
    return NextResponse.json({ error: "Falsches Konto oder Passwort" }, { status: 401 });
  }
  await createSession(acc.id);
  return NextResponse.json({ user: publicAccount(acc) });
}

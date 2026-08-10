import { NextResponse } from "next/server";
import { ACCOUNTS, publicAccount } from "@/lib/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nur Namen/Rollen für die Login-Auswahl (keine Passwörter).
export async function GET() {
  return NextResponse.json({ accounts: ACCOUNTS.map(publicAccount) });
}

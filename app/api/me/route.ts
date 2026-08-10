import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { publicAccount, agentsOnly } from "@/lib/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  // Manager bekommt die Agentenliste mit (zum Zuweisen).
  const agents = user.role === "manager" ? agentsOnly() : [];
  return NextResponse.json({ user: publicAccount(user), agents });
}

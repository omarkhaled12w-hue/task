// =====================================================================
// Team-Konten. HIER die echten Namen und Passwörter eintragen.
// role: "manager" (kann zuweisen + alles sehen) oder "agent".
// Für echten Betrieb: starke, einzigartige Passwörter setzen.
// =====================================================================
export type Role = "manager" | "agent";

export interface Account {
  id: string;
  name: string;
  role: Role;
  password: string;
}

export const ACCOUNTS: Account[] = [
  { id: "m1", name: "Frau Demir", role: "manager", password: "manager2026" },
  { id: "a1", name: "Lukas M.", role: "agent", password: "lukas2026" },
  { id: "a2", name: "Sophie K.", role: "agent", password: "sophie2026" },
  { id: "a3", name: "David R.", role: "agent", password: "david2026" },
  { id: "a4", name: "Nadia B.", role: "agent", password: "nadia2026" },
];

export type PublicAccount = Omit<Account, "password">;

export function publicAccount(a: Account): PublicAccount {
  const { password, ...rest } = a;
  return rest;
}

export function findAccount(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

export function agentsOnly(): PublicAccount[] {
  return ACCOUNTS.filter((a) => a.role === "agent").map(publicAccount);
}

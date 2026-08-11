// =====================================================================
// Team-Konten. HIER die echten Namen, Benutzernamen und Passwörter eintragen.
// role: "manager" (kann zuweisen + alles sehen) oder "agent".
// username: wird beim Login eingegeben (klein geschrieben, ohne Leerzeichen).
// Für echten Betrieb: starke, einzigartige Passwörter setzen.
// =====================================================================
export type Role = "manager" | "agent";

export interface Account {
  id: string;
  name: string;
  username: string;
  role: Role;
  password: string;
}

export const ACCOUNTS: Account[] = [
  { id: "m1", name: "Petra", username: "petra", role: "manager", password: "petra12" },
  { id: "a1", name: "verenea.", username: "lukas", role: "agent", password: "00" },
  { id: "a2", name: "Sophie K.", username: "sophie", role: "agent", password: "sophie2026" },
  { id: "a3", name: "David R.", username: "david", role: "agent", password: "david2026" },
  { id: "a4", name: "Nadia B.", username: "nadia", role: "agent", password: "nadia2026" },
];

export type PublicAccount = Omit<Account, "password">;

export function publicAccount(a: Account): PublicAccount {
  const { password, ...rest } = a;
  return rest;
}

export function findAccount(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

export function findByUsername(username: string): Account | undefined {
  const u = username.trim().toLowerCase();
  return ACCOUNTS.find((a) => a.username.toLowerCase() === u);
}

export function agentsOnly(): PublicAccount[] {
  return ACCOUNTS.filter((a) => a.role === "agent").map(publicAccount);
}

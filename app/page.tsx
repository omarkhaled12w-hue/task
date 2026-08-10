"use client";
import { useEffect, useState, useCallback } from "react";

type Role = "manager" | "agent";
interface Account { id: string; name: string; role: Role }
interface Notif { id: string; text: string; time: number; read: boolean }
interface Task {
  id: number; agentId: string; text: string;
  prio: "hoch" | "mittel" | "niedrig"; due: string; done: boolean;
  createdBy: string; createdAt: number;
}

const PL: Record<string, string> = { hoch: "Hoch", mittel: "Mittel", niedrig: "Niedrig" };
const ini = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const todayISO = () => new Date().toISOString().slice(0, 10);
const isOver = (t: Task) => !t.done && !!t.due && t.due < todayISO();
const fmt = (i: string) =>
  i ? new Date(i + "T00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) : "";
const timeAgo = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return Math.floor(s / 60) + " Min.";
  if (s < 86400) return Math.floor(s / 3600) + " Std.";
  return Math.floor(s / 86400) + " Tg.";
};

export default function Page() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<Account | null>(null);
  const [agents, setAgents] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"overview" | "tasks" | "mine">("overview");
  const [filter, setFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  // Benachrichtigungen (Glocke)
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  // login form
  const [loginUser, setLoginUser] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // modal
  const [modal, setModal] = useState(false);
  const [mAgent, setMAgent] = useState("");
  const [mText, setMText] = useState("");
  const [mDue, setMDue] = useState("");
  const [mPrio, setMPrio] = useState("mittel");

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const loadTasks = useCallback(async () => {
    const r = await fetch("/api/tasks", { cache: "no-store" });
    if (r.ok) setTasks((await r.json()).tasks);
  }, []);

  const loadNotifs = useCallback(async () => {
    const r = await fetch("/api/notifications", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setNotifs(d.notifications);
      setUnread(d.unread);
    }
  }, []);

  const boot = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setUser(d.user);
      setAgents(d.agents || []);
      setView(d.user.role === "manager" ? "overview" : "mine");
      await loadTasks();
      await loadNotifs();
    }
    setBooting(false);
  }, [loadTasks, loadNotifs]);

  useEffect(() => { boot(); }, [boot]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(loadNotifs, 12000);
    return () => clearInterval(t);
  }, [user, loadNotifs]);

  async function openBell() {
    setBellOpen((v) => !v);
    if (unread > 0) {
      await fetch("/api/notifications/read", { method: "POST" });
      setUnread(0);
    }
  }

  async function doLogin() {
    setLoginErr(""); setLoggingIn(true);
    const r = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUser, password: loginPw }),
    });
    setLoggingIn(false);
    if (r.ok) { setLoginPw(""); await boot(); }
    else setLoginErr((await r.json()).error || "Anmeldung fehlgeschlagen");
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setUser(null); setTasks([]); setNotifs([]); setUnread(0); setBellOpen(false);
    await boot();
  }

  async function toggle(id: number) {
    const t = tasks.find((x) => x.id === id); if (!t) return;
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    });
    loadTasks();
  }
  async function del(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  function openAdd() {
    setMText(""); setMDue(""); setMPrio("mittel");
    if (user?.role === "manager" && agents[0]) setMAgent(agents[0].id);
    setModal(true);
  }
  async function saveTask() {
    if (!mText.trim()) { flash("Bitte Titel eingeben"); return; }
    const body: any = { text: mText, prio: mPrio, due: mDue };
    if (user?.role === "manager") body.agentId = mAgent;
    const r = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setModal(false); loadTasks(); loadNotifs();
      flash(user?.role === "manager" ? "Aufgabe erstellt" : "Aufgabe hinzugefügt");
    } else flash((await r.json()).error || "Fehler");
  }

  function toggleTheme() {
    const d = document.body.getAttribute("data-theme") === "dark";
    document.body.setAttribute("data-theme", d ? "light" : "dark");
  }

  const nameOf = (id: string) =>
    agents.find((a) => a.id === id)?.name || (user?.id === id ? user.name : id);

  if (booting) return <div className="center">Wird geladen …</div>;

  // ---------------- LOGIN ----------------
  if (!user) {
    return (
      <div className="login">
        <div className="login-card">
          <div className="logo">D</div>
          <h1>Dentakay Aufgaben</h1>
          <div className="sub">Bitte anmelden, um fortzufahren</div>
          <div className="fld">
            <label>Benutzername</label>
            <input value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
              placeholder="z. B. lukas" autoFocus autoCapitalize="off" />
          </div>
          <div className="fld">
            <label>Passwort</label>
            <input type="password" value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder="••••••" />
          </div>
          <button className="login-btn" onClick={doLogin} disabled={loggingIn}>
            {loggingIn ? "Anmelden …" : "Anmelden"}
          </button>
          {loginErr && <p className="err">{loginErr}</p>}
        </div>
      </div>
    );
  }

  // ---------------- APP ----------------
  const navItems = user.role === "manager"
    ? [{ v: "overview", ic: "◧", l: "Übersicht" }, { v: "tasks", ic: "☑", l: "Alle Aufgaben" }]
    : [{ v: "mine", ic: "☑", l: "Meine Aufgaben" }];

  const titles: Record<string, [string, string]> = {
    overview: ["Übersicht", "Team-Aufgaben auf einen Blick"],
    tasks: ["Alle Aufgaben", "Aufgaben zuweisen und verfolgen"],
    mine: ["Meine Aufgaben", "Deine offenen und erledigten Aufgaben"],
  };

  const StatCards = ({ list }: { list: Task[] }) => {
    const open = list.filter((t) => !t.done).length;
    const done = list.filter((t) => t.done).length;
    const heute = list.filter((t) => !t.done && t.due === todayISO()).length;
    const ov = list.filter(isOver).length;
    return (
      <div className="stats">
        <div className="stat"><div className="n">{open}</div><div className="l">Offen</div></div>
        <div className="stat"><div className="n">{heute}</div><div className="l">Heute fällig</div></div>
        <div className="stat r"><div className="n">{ov}</div><div className="l">Überfällig</div></div>
        <div className="stat g"><div className="n">{done}</div><div className="l">Erledigt</div></div>
      </div>
    );
  };

  const TaskRow = ({ t, showWho, showDel }: { t: Task; showWho: boolean; showDel: boolean }) => (
    <div className={"task" + (t.done ? " done" : "")}>
      <div className={"cbx" + (t.done ? " checked" : "")} onClick={() => toggle(t.id)} />
      <div className="body">
        <div className="t">{t.text}</div>
        <div className="meta">
          <span className={"pill " + t.prio}>{PL[t.prio]}</span>
          {t.due && <span className={"pill due" + (isOver(t) ? " over" : "")}>{isOver(t) ? "Überfällig · " : ""}{fmt(t.due)}</span>}
          {showWho && <span className="pill who">{nameOf(t.agentId)}</span>}
          {showWho && t.createdBy === t.agentId && <span className="pill self">selbst erstellt</span>}
        </div>
      </div>
      {showDel && <button className="del" onClick={() => del(t.id)}>×</button>}
    </div>
  );

  let content: React.ReactNode = null;
  if (view === "overview") {
    const next = tasks.filter((t) => !t.done).slice(0, 6);
    content = (
      <>
        <StatCards list={tasks} />
        <div className="sec">
          <div className="sec-h"><h3>Team</h3></div>
          {agents.map((a) => {
            const l = tasks.filter((t) => t.agentId === a.id);
            const d = l.filter((t) => t.done).length;
            const pct = l.length ? Math.round((d / l.length) * 100) : 0;
            const ov = l.filter(isOver).length;
            return (
              <div className="team-row" key={a.id}>
                <div className="av2">{ini(a.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">{a.name}</div>
                  <div className="prog"><i style={{ width: pct + "%" }} /></div>
                </div>
                <div className="cnt">
                  {l.filter((t) => !t.done).length} offen
                  {ov > 0 && <> · <span style={{ color: "var(--red)" }}>{ov} überfällig</span></>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="sec">
          <div className="sec-h"><h3>Nächste Aufgaben</h3></div>
          {next.length ? next.map((t) => <TaskRow key={t.id} t={t} showWho showDel={false} />)
            : <div className="empty">Alles erledigt 🎉</div>}
        </div>
      </>
    );
  } else if (view === "tasks") {
    const list = filter ? tasks.filter((t) => t.agentId === filter) : tasks;
    const open = list.filter((t) => !t.done);
    const done = list.filter((t) => t.done);
    content = (
      <div className="sec">
        <div className="sec-h">
          <h3>Aufgaben</h3>
          <div className="chips">
            <span className={"chip" + (!filter ? " active" : "")} onClick={() => setFilter(null)}>Alle</span>
            {agents.map((a) => (
              <span key={a.id} className={"chip" + (filter === a.id ? " active" : "")} onClick={() => setFilter(a.id)}>{a.name}</span>
            ))}
          </div>
        </div>
        {list.length ? [...open, ...done].map((t) => <TaskRow key={t.id} t={t} showWho showDel />)
          : <div className="empty">Keine Aufgaben</div>}
      </div>
    );
  } else {
    const list = tasks;
    const open = list.filter((t) => !t.done);
    const done = list.filter((t) => t.done);
    content = (
      <>
        <StatCards list={list} />
        <div className="sec">
          <div className="sec-h"><h3>Aufgaben</h3></div>
          {list.length ? [...open, ...done].map((t) => <TaskRow key={t.id} t={t} showWho={false} showDel={false} />)
            : <div className="empty">Aktuell keine Aufgaben 🎉</div>}
        </div>
      </>
    );
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="lg">D</div>
          <div><b>Dentakay</b><span>Aufgaben</span></div>
        </div>
        <nav className="nav">
          {navItems.map((i) => (
            <a key={i.v} className={view === i.v ? "active" : ""}
              onClick={() => { setView(i.v as any); setFilter(null); }}>
              <span className="ic">{i.ic}</span>{i.l}
            </a>
          ))}
        </nav>
        <div className="spacer" />
        <div className="foot">
          <div className="theme-tgl" onClick={toggleTheme}><span>Design wechseln</span><span>🌓</span></div>
          <div className="userbox">
            <div className="av">{ini(user.name)}</div>
            <div><div className="nm">{user.name}</div><div className="rl">{user.role === "manager" ? "Managerin" : "Agent"}</div></div>
          </div>
          <button className="logout" onClick={logout}>Abmelden</button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>
            <h2>{titles[view][0]}</h2>
            <div className="subt">{titles[view][1]}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <button className="bellbtn" onClick={openBell} aria-label="Benachrichtigungen">
              🔔
              {unread > 0 && <span className="bell-badge">{unread}</span>}
            </button>
            {bellOpen && (
              <div className="bell-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="bell-head">Benachrichtigungen</div>
                {notifs.length ? notifs.map((n) => (
                  <div key={n.id} className="bell-item">
                    <div className="bt">{n.text}</div>
                    <div className="ba">{timeAgo(n.time)}</div>
                  </div>
                )) : <div className="bell-empty">Keine Benachrichtigungen</div>}
              </div>
            )}
            <button className="addbtn" onClick={openAdd}>+ Neue Aufgabe</button>
          </div>
        </div>
        <div className="content" onClick={() => bellOpen && setBellOpen(false)}>{content}</div>
      </div>

      {modal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h4>Neue Aufgabe</h4>
            <p className="msub">{user.role === "manager" ? "Aufgabe an einen Agent zuweisen" : "Neue eigene Aufgabe"}</p>
            {user.role === "manager" && (
              <div className="fld" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Agent</label>
                <select value={mAgent} onChange={(e) => setMAgent(e.target.value)}>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="fld" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Aufgabe</label>
              <input autoFocus value={mText} onChange={(e) => setMText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTask()} placeholder="z. B. Herrn Weber zurückrufen" />
            </div>
            <div className="fld grow">
              <div>
                <label style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Fällig am</label>
                <input type="date" value={mDue} onChange={(e) => setMDue(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Priorität</label>
                <select value={mPrio} onChange={(e) => setMPrio(e.target.value)}>
                  <option value="hoch">Hoch</option>
                  <option value="mittel">Mittel</option>
                  <option value="niedrig">Niedrig</option>
                </select>
              </div>
            </div>
            <div className="row">
              <button className="cancel" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="ok" onClick={saveTask}>{user.role === "manager" ? "Zuweisen" : "Hinzufügen"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

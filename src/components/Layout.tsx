import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type React from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, BookOpen, CalendarDays, CheckCircle2, Clock3, Command,
  Flame, Gauge, History, LayoutDashboard, Medal, Menu, Pause, Play,
  Plus, Search, Settings, ShieldAlert, Target, Timer, X, Zap, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatTimerClock, timerLabel, useActiveTimer } from "./ActiveTimerProvider";
import { useAppStore } from "../store/AppStore";
import { currentStreak, todayStats } from "../utils/stats";
import { StudyToast, toastEventName } from "../utils/toast";
import { CountUp } from "./CountUp";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { useAmbientSound } from "../hooks/useAmbientSound";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/coach", label: "Coach", icon: ShieldAlert },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/history", label: "History", icon: History },
  { to: "/badges", label: "Badges", icon: Medal },
  { to: "/stats", label: "Stats", icon: Gauge },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Layout() {
  const { state, storageError } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTimer = useActiveTimer();
  const today = todayStats(state);
  const streak = currentStreak(state);
  const [now, setNow] = useState(new Date());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const earnedIds = state.badges.filter((b) => b.dateEarned).map((b) => b.id);
  const previousEarned = useRef<string[]>(earnedIds);
  const previousSessionCount = useRef(state.sessions.length);
  const previousDoneCount = useRef(state.tasks.filter((t) => t.status === "done").length);
  const [toasts, setToasts] = useState<Required<StudyToast>[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => { try { return localStorage.getItem("studytrack.sidebar") === "collapsed"; } catch { return false; } });
  const paletteRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useDialogFocus(paletteRef, paletteOpen);
  useDialogFocus(sidebarRef, mobileMenuOpen);
  useEffect(() => { mainRef.current?.scrollTo(0, 0); setMobileMenuOpen(false); }, [location.pathname]);
  const [isScrolled, setIsScrolled] = useState(false);

  useAmbientSound();


  const pushToast = useCallback((toast: StudyToast) => {
    const id = toast.id ?? crypto.randomUUID();
    setToasts((items) => [...items, { id, message: toast.message, tone: toast.tone ?? "info" }].slice(-4));
    window.setTimeout(() => setToasts((items) => items.filter((i) => i.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 20000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((c) => !c);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate("/tasks?new=1");
      }
      if (event.key === "Escape") { setPaletteOpen(false); setMobileMenuOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => { setActiveCommandIndex(0); }, [commandQuery, paletteOpen]);

  const commands = useMemo(() => {
    const routeCommands = nav.map((item) => ({
      id: `route-${item.to}`,
      label: `Open ${item.label}`,
      detail: "Navigate",
      icon: item.icon,
      action: () => navigate(item.to),
    }));
    const timerCommand = {
      id: "timer-toggle",
      label: activeTimer.running ? "Pause active timer" : activeTimer.startedAt ? "Resume timer" : "Start focus timer",
      detail: activeTimer.startedAt ? `${timerLabel(activeTimer.type)} · ${formatTimerClock(activeTimer.remaining)}` : "Begin the current focus plan",
      icon: activeTimer.running ? Pause : Play,
      action: activeTimer.running ? activeTimer.pause : activeTimer.start,
    };
    const quickCommands = [
      timerCommand,
      { id: "new-task", label: "Create a new task", detail: "Quick capture", icon: Plus, action: () => navigate("/tasks?new=1") },
      { id: "today-calendar", label: "Open today's calendar", detail: "Plan today", icon: CalendarDays, action: () => navigate("/calendar") },
      { id: "today-journal", label: "Write today's journal", detail: "Reflect", icon: BookOpen, action: () => navigate("/journal") },
    ];
    const taskCommands = state.tasks.filter((t) => t.status !== "done").slice(0, 10).map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      detail: `Focus task · ${task.category} · ${task.priority}`,
      icon: Target,
      action: () => {
        activeTimer.setSelectedTask(task.id);
        activeTimer.setSelectedCategory(task.category);
        navigate("/timer");
      },
    }));
    return [...quickCommands, ...routeCommands, ...taskCommands];
  }, [activeTimer, navigate, state.tasks]);

  const filteredCommands = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.detail}`.toLowerCase().includes(q));
  }, [commandQuery, commands]);

  const runCommand = (cmd: (typeof commands)[number] | undefined) => {
    if (!cmd) return;
    setPaletteOpen(false);
    setCommandQuery("");
    cmd.action();
  };

  useEffect(() => {
    const newEarned = earnedIds.find((id) => !previousEarned.current.includes(id));
    if (newEarned) {
      const badge = state.badges.find((b) => b.id === newEarned);
      pushToast({ message: badge ? `🏆 ${badge.name} unlocked!` : "Badge unlocked!", tone: "success" });
    }
    previousEarned.current = earnedIds;
  }, [earnedIds.join("|"), pushToast, state.badges]);

  useEffect(() => {
    if (state.sessions.length > previousSessionCount.current) {
      const latest = state.sessions[0];
      pushToast({ message: latest?.completed ? "✅ Session completed!" : "Session logged", tone: latest?.interrupted ? "warning" : "success" });
    }
    previousSessionCount.current = state.sessions.length;
  }, [pushToast, state.sessions]);

  useEffect(() => {
    const doneCount = state.tasks.filter((t) => t.status === "done").length;
    if (doneCount > previousDoneCount.current) pushToast({ message: "✅ Task completed!", tone: "success" });
    previousDoneCount.current = doneCount;
  }, [pushToast, state.tasks]);

  useEffect(() => {
    const onToast = (e: Event) => pushToast((e as CustomEvent<StudyToast>).detail);
    window.addEventListener(toastEventName, onToast);
    return () => window.removeEventListener(toastEventName, onToast);
  }, [pushToast]);

  useEffect(() => {
    try { localStorage.setItem("studytrack.sidebar", sidebarCollapsed ? "collapsed" : "expanded"); } catch { /* The workspace banner reports unavailable storage. */ }
  }, [sidebarCollapsed]);

  // Apply accent color
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", state.settings.accentColor);
  }, [state.settings.accentColor]);

  const routeKey = location.pathname === "/" ? "dashboard" : location.pathname.slice(1);

  return (
    <div className={`app-shell`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}
      <aside ref={sidebarRef} aria-label="Workspace navigation" className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><BookOpen size={18} /></div>
          <div>
            <strong>StudyTrack</strong>
            <span>Make time for what matters</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.to}>
              {[0, 4, 10].includes(index) && <div className="nav-section-label">{index === 0 ? "Workspace" : index === 4 ? "Insights & reflection" : "Preferences"}</div>}
              <NavLink
                key={item.to}
                title={item.label}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                aria-label={item.label}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.to === "/tasks" && state.tasks.some(t => t.status !== "done") && <span className="nav-count">{state.tasks.filter(t => t.status !== "done").length}</span>}
              </NavLink>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-focus">
          <div><span>Today's focus</span><strong>{today.minutesToday} / {state.settings.dailyGoalMinutes}m</strong></div>
          <div className="bar"><span style={{ width: `${Math.min(100, today.minutesToday / Math.max(1, state.settings.dailyGoalMinutes) * 100)}%` }} /></div>
          <p>{today.goalMet ? "Daily goal complete. Well done." : "Make a little progress every day."}</p>
        </div>
        <div className="sidebar-profile">
          <span className="profile-avatar">{(state.settings.profileName || "Student").slice(0, 2).toUpperCase()}</span>
          <div><strong>{state.settings.profileName || "Student"}</strong><small>Personal workspace</small></div>
          <button aria-label="Profile settings" onClick={() => navigate("/settings")}><Settings size={16} /></button>
        </div>
        <button className="sidebar-collapse-btn ghost" onClick={() => setSidebarCollapsed(c => !c)} aria-label="Toggle Sidebar">
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <main ref={mainRef} id="main-content" tabIndex={-1} className="main-panel" onScroll={(e) => setIsScrolled((e.target as HTMLElement).scrollTop > 20)}>
        <div className={`global-topbar ${isScrolled ? "scrolled" : ""}`}>
          <div className="workspace-breadcrumb">
            <button className="hamburger-btn ghost" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}><Menu size={19} /></button>
            <span className="workspace-label">My workspace</span><ChevronRight size={13} />
            <strong>{nav.find(item => item.to === location.pathname)?.label || "Dashboard"}</strong>
          </div>
          <div className="topbar-actions">
            {activeTimer.startedAt && <button className="topbar-session" onClick={() => navigate("/timer")}><Clock3 size={13} /><span>{activeTimer.running ? timerLabel(activeTimer.type) : "Paused"}</span><b>{formatTimerClock(activeTimer.remaining)}</b></button>}
            <button className="topbar-command-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"><div><Search size={14} /><span>Search anything</span></div><kbd>⌘ K</kbd></button>
            <span className="topbar-date">{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
        </div>
        {storageError && <div className="storage-warning" role="alert"><ShieldAlert size={18} /><span>Your browser could not save changes. Export a backup before closing this tab.</span><button onClick={() => navigate("/settings")}>Open backups</button></div>}
        <div key={routeKey} className={`route-frame route-${routeKey}`}>
          <Suspense fallback={<div className="route-loading" role="status"><span />Loading your study space…</div>}><Outlet /></Suspense>
        </div>
      </main>

      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <div className={`app-toast ${toast.tone}`} key={toast.id} role="status">
              <strong>{toast.message}</strong>
              <button className="toast-close ghost" onClick={() => setToasts((items) => items.filter((i) => i.id !== toast.id))} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {paletteOpen && (
        <div className="command-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}>
          <section ref={paletteRef} className="command-palette" role="dialog" aria-modal="true" aria-labelledby="cmd-title">
            <div className="command-search-row">
              <Search size={18} />
              <input
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActiveCommandIndex((i) => Math.min(filteredCommands.length - 1, i + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActiveCommandIndex((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter") runCommand(filteredCommands[activeCommandIndex]);
                }}
                placeholder="Search pages, actions, tasks…"
                aria-label="Search commands"
              />
              <button className="ghost icon-only" onClick={() => setPaletteOpen(false)} aria-label="Close"><X size={17} /></button>
            </div>
            <div className="command-palette-head">
              <strong id="cmd-title">Command Center</strong>
              <span><Command size={12} /> arrows · Enter to run</span>
            </div>
            <div className="command-results" role="listbox">
              {filteredCommands.length === 0
                ? <div className="command-empty">No matching command</div>
                : filteredCommands.map((cmd, index) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        className={`command-result ${index === activeCommandIndex ? "active" : ""}`}
                        ref={el => { if (index === activeCommandIndex) el?.scrollIntoView({ block: "nearest" }); }}
                        onMouseEnter={() => setActiveCommandIndex(index)}
                        onClick={() => runCommand(cmd)}
                        role="option"
                        aria-selected={index === activeCommandIndex}
                      >
                        <i><Icon size={16} /></i>
                        <span><strong>{cmd.label}</strong><small>{cmd.detail}</small></span>
                        <kbd>↵</kbd>
                      </button>
                    );
                  })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><BookOpen size={21} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}

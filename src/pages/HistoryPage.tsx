import { confirmAction } from "../utils/confirm";
import { useEffect, useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import { Download, Search, Trash2, StickyNote, Clock3, CheckCircle2, AlertTriangle, Gauge, Target, X, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "../components/Layout";
import { CountUp } from "../components/CountUp";
import { useAppStore } from "../store/AppStore";
import { dateKey, exportCsv, minutes } from "../utils/stats";
import { showToast } from "../utils/toast";

export function HistoryPage() {
  const { state, dispatch } = useAppStore();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [range, setRange] = useState<"all" | "7" | "30" | "90">("30");
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 18;
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const sessions = useMemo(() => state.sessions.filter((session) => {
    const task = state.tasks.find((t) => t.id === session.taskId);
    const haystack = `${session.category} ${session.type} ${task?.title ?? ""} ${session.notes ?? ""}`.toLowerCase();
    const cutoff = range === "all" ? null : Date.now() - Number(range) * 86400000;
    const inRange = cutoff === null || new Date(session.startTime).getTime() >= cutoff;
    return haystack.includes(query.toLowerCase()) && (type === "all" || session.type === type) && inRange;
  }).sort((a, b) => b.startTime.localeCompare(a.startTime)), [state.sessions, state.tasks, query, range, type]);

  useEffect(() => setPage(1), [query, range, type]);
  useEffect(() => {
    if (!editing) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [editing]);

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  useEffect(() => setPage(p => Math.min(p, totalPages)), [totalPages]);
  const pagedSessions = sessions.slice((page - 1) * pageSize, page * pageSize);
  const grouped = pagedSessions.reduce<Record<string, typeof sessions>>((map, session) => {
    const key = dateKey(session.startTime);
    map[key] = [...(map[key] ?? []), session];
    return map;
  }, {});

  const downloadCsv = () => {
    const blob = new Blob([exportCsv(sessions)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "studytrack-sessions.csv"; link.click();
    URL.revokeObjectURL(url);
    showToast("Session history exported", "success");
  };

  const clean = sessions.filter((s) => s.completed && !s.interrupted).length;
  const interrupted = sessions.filter((s) => s.interrupted || !s.completed).length;
  const focusSessions = sessions.filter(s => s.type === "focus");
  const average = focusSessions.length ? Math.round(minutes(focusSessions) / focusSessions.length) : 0;
  const completionRate = sessions.length ? Math.round((clean / sessions.length) * 100) : 0;
  const maxSessionDuration = sessions.reduce((max, s) => Math.max(max, s.actualDuration), 1);

  const toggleDay = (day: string) => {
    setCollapsedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <div className="history-page page-transition">
      <header className="command-page-header">
        <div>
          <h1>Session history</h1>
          <p>Your focus sessions, notes, and progress in one place.</p>
        </div>
        <button className="primary" onClick={downloadCsv}><Download size={15} /> Export CSV</button>
      </header>

      <section className="history-stat-grid">
        <article className="glass-card stat-card">
          <Clock3 size={24} className="icon-glow text-accent" />
          <div><strong><CountUp value={minutes(sessions)} />m</strong><span className="text-muted">focus time</span></div>
        </article>
        <article className="glass-card stat-card">
          <CheckCircle2 size={24} className="icon-glow text-good" />
          <div><strong><CountUp value={clean} /></strong><span className="text-muted">clean sessions</span></div>
        </article>
        <article className="glass-card stat-card">
          <AlertTriangle size={24} className="icon-glow text-warn" />
          <div><strong><CountUp value={interrupted} /></strong><span className="text-muted">interrupted</span></div>
        </article>
        <article className="glass-card stat-card">
          <StickyNote size={24} className="icon-glow text-accent-3" />
          <div><strong><CountUp value={sessions.filter((s) => s.notes).length} /></strong><span className="text-muted">with notes</span></div>
        </article>
        <article className="glass-card stat-card">
          <Target size={24} className="icon-glow text-accent-2" />
          <div><strong><CountUp value={average} />m</strong><span className="text-muted">average focus block</span></div>
        </article>
        <article className="glass-card stat-card">
          <Gauge size={24} className="icon-glow text-accent-4" />
          <div><strong><CountUp value={completionRate} />%</strong><span className="text-muted">clean completion</span></div>
        </article>
      </section>

      <div className="history-toolbar">
        <div className="search glass-card glass-pill">
          <Search size={18} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history…" />
        </div>
        <div className="history-type-tabs glass-card glass-pill">
          {["all", "focus", "break", "longBreak"].map((item) => (
            <button key={item} className={type === item ? "active" : ""} onClick={() => setType(item as any)}>
              {item === "longBreak" ? "Long break" : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="history-range-tabs glass-card glass-pill" aria-label="History date range">
          {(["7", "30", "90", "all"] as const).map((item) => (
            <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>
              {item === "all" ? "All time" : `${item}D`}
            </button>
          ))}
        </div>
      </div>

      {!sessions.length && <EmptyState title="No sessions yet" body="Start a focus timer and your history will appear here." />}

      {Object.entries(grouped).map(([day, items]) => {
        const isCollapsed = collapsedDays[day];
        const dayTotal = minutes(items);
        return (
          <section className="section-band history-day-group glass-card" key={day}>
            <h2 className="premium-accordion-header" onClick={() => toggleDay(day)} role="button" tabIndex={0} aria-expanded={!isCollapsed} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDay(day); } }}>
              <span>
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="accent-pill">{dayTotal} min total</span>
            </h2>
            
            {!isCollapsed && (
              <div className="history-list">
                {items.map((session) => {
                  const task = state.tasks.find((t) => t.id === session.taskId);
                  const isClean = session.completed && !session.interrupted;
                  return (
                    <article className={`history-row ${isClean ? "clean" : "messy"}`} key={session.id}>
                      <div className="history-main">
                        <div>
                          <strong className="text-muted">{new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                          <span>{task?.title ?? session.category}</span>
                        </div>
                        <small className="text-muted">{session.category} · {session.type}</small>
                      </div>
                      
                      <div className="history-duration">
                        <span>{session.actualDuration}/{session.plannedDuration} min</span>
                        <div className="duration-track">
                          <div className={`duration-fill ${isClean ? 'good' : 'warn'}`} style={{ width: `${(session.actualDuration / maxSessionDuration) * 100}%` }} />
                        </div>
                      </div>
                      
                      <span className={`status-pill ${isClean ? 'good' : 'warn'}`}>
                        {isClean ? "clean" : "interrupted"}
                      </span>
                      
                      <div className="history-actions">
                        <button className="ghost" onClick={() => { setEditing(session.id); setNotes(session.notes ?? ""); }} aria-label="Edit session notes">
                          <StickyNote size={14} /> <span>Notes</span>
                        </button>
                        <button
                          className="ghost icon-only danger-text"
                          onClick={async () => {
                            if (await confirmAction("Delete this session entry?")) {
                              dispatch({ type: "delete-session", id: session.id });
                              showToast("Session deleted", "warning");
                            }
                          }}
                          aria-label="Delete session"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {sessions.length > pageSize && (
        <div className="pagination">
          <button className="glass-card" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="glass-card" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      )}

      {editing && (
        <Portal><div className="modal">
          <div className="modal-panel history-notes-modal" role="dialog" aria-modal="true" aria-labelledby="session-notes-title">
            <div className="modal-title">
              <h2 id="session-notes-title">Session notes</h2>
              <button className="ghost icon-only" onClick={() => setEditing(null)} aria-label="Close"><X size={17} /></button>
            </div>
            <textarea autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this session…" />
            <button className="primary" onClick={() => { dispatch({ type: "update-session-notes", id: editing, notes }); setEditing(null); }}>Save notes</button>
          </div>
        </div></Portal>
      )}
    </div>
  );
}

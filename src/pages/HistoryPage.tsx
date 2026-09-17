import { shiftDate } from "../utils/planning";
import { Link } from "react-router-dom";
import { Select } from "../components/Select";
import { defaultHistoryFilters, filterHistory, groupHistoryDays, historyDateError, sessionTypeLabels, type HistoryFilters } from "../utils/history";
import { ManualSessionDialog } from "../components/ManualSessionDialog";
import { confirmAction } from "../utils/confirm";
import { useEffect, useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import { Download, Plus, Search, Trash2, StickyNote, Clock3, CheckCircle2, AlertTriangle, Gauge, Target, X, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "../components/Layout";
import { CountUp } from "../components/CountUp";
import { useAppStore } from "../store/AppStore";
import { dateKey, exportCsv, minutes } from "../utils/stats";
import { showToast } from "../utils/toast";

export function HistoryPage() {
  const { state, dispatch } = useAppStore();
  const [logging, setLogging] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>(defaultHistoryFilters);
  const { query, type, range } = filters;
  const updateFilters = (patch: Partial<HistoryFilters>) => { setFilters(current => ({ ...current, ...patch })); setPage(1); };
  const changeRange = (range: HistoryFilters['range']) => updateFilters({
    range,
    ...(range === 'custom' ? { from: filters.from || shiftDate(dateKey(new Date()), -29), to: filters.to || dateKey(new Date()) } : {}),
  });
  const clearFilters = () => { setFilters({ ...defaultHistoryFilters, range: 'all' }); setPage(1); };
  const dateError = historyDateError(filters);
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 18;
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const tasksById = useMemo(() => new Map(state.tasks.map(task => [task.id, task])), [state.tasks]);
  const sessions = useMemo(() => filterHistory(state.sessions, tasksById, filters), [state.sessions, tasksById, filters]);
  const categories = useMemo(() => [...new Set(state.sessions.map(session => session.category))].sort(), [state.sessions]);
  const dayTotals = useMemo(() => groupHistoryDays(sessions), [sessions]);
  const editingSession = state.sessions.find(session => session.id === editing);

  useEffect(() => {
    if (!editing) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [editing]);

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  useEffect(() => setPage(p => Math.min(p, totalPages)), [totalPages]);
  const currentPage = Math.min(page, totalPages);
  const pagedSessions = sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const grouped = groupHistoryDays(pagedSessions);

  const downloadCsv = () => {
    const blob = new Blob([exportCsv(sessions, state.tasks)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `trackme-sessions-${dateKey(new Date())}.csv`; link.click();
    URL.revokeObjectURL(url);
    showToast("Session history exported", "success");
  };

  const clean = sessions.filter((s) => s.completed && !s.interrupted).length;
  const interrupted = sessions.filter((s) => s.interrupted || !s.completed).length;
  const focusSessions = sessions.filter(s => s.type === "focus");
  const average = focusSessions.length ? Math.round(minutes(focusSessions) / focusSessions.length) : 0;
  const completionRate = sessions.length ? Math.round((clean / sessions.length) * 100) : 0;


  const toggleDay = (day: string) => {
    setCollapsedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <div className="history-page page-transition">
      {logging && <ManualSessionDialog onClose={() => setLogging(false)}/>}
      <header className="command-page-header">
        <div>
          <h1>Session history</h1>
          <p>Your focus sessions, notes, and progress in one place.</p>
        </div>
        <div className="header-actions"><button onClick={downloadCsv} disabled={!sessions.length || !!dateError} title="Export all sessions matching the current filters"><Download size={15} /> Export CSV</button><button className="primary" onClick={() => setLogging(true)}><Plus size={16}/> Log study</button></div>
      </header>

      <section className="history-stat-grid">
        <article className="glass-card stat-card">
          <Clock3 size={24} className="icon-glow text-accent" />
          <div><strong><CountUp value={minutes(sessions)} />m</strong><span className="text-muted">focus time</span></div>
        </article>
        <article className="glass-card stat-card">
          <CheckCircle2 size={24} className="icon-glow text-good" />
          <div><strong><CountUp value={clean} /></strong><span className="text-muted">completed sessions</span></div>
        </article>
        <article className="glass-card stat-card">
          <AlertTriangle size={24} className="icon-glow text-warn" />
          <div><strong><CountUp value={interrupted} /></strong><span className="text-muted">unfinished sessions</span></div>
        </article>
        <article className="glass-card stat-card">
          <StickyNote size={24} className="icon-glow text-accent-3" />
          <div><strong><CountUp value={sessions.filter((s) => s.notes?.trim()).length} /></strong><span className="text-muted">with notes</span></div>
        </article>
        <article className="glass-card stat-card">
          <Target size={24} className="icon-glow text-accent-2" />
          <div><strong><CountUp value={average} />m</strong><span className="text-muted">average focus block</span></div>
        </article>
        <article className="glass-card stat-card">
          <Gauge size={24} className="icon-glow text-accent-4" />
          <div><strong><CountUp value={completionRate} />%</strong><span className="text-muted">completion rate</span></div>
        </article>
      </section>

      <div className="history-toolbar">
        <div className="search glass-card glass-pill">
          <Search size={18} className="text-muted" />
          <input value={query} onChange={(e) => updateFilters({query: e.target.value})} aria-label="Search history" placeholder="Search tasks, subjects, or notes…" />
        </div>
        <div className="history-type-tabs glass-card glass-pill">
          {(["all", "focus", "break", "longBreak"] as const).map((item) => (
            <button key={item} className={type === item ? "active" : ""} aria-pressed={type === item} onClick={() => updateFilters({type:item})}>
              {item === "all" ? "All" : sessionTypeLabels[item]}
            </button>
          ))}
        </div>
        <div className="history-range-tabs glass-card glass-pill" aria-label="History date range">
          {(["today", "7", "30", "90", "all", "custom"] as const).map((item) => (
            <button key={item} className={range === item ? "active" : ""} aria-pressed={range === item} onClick={() => changeRange(item)}>
              {item === "all" ? "All time" : item === "today" ? "Today" : item === "custom" ? "Custom" : `${item}D`}
            </button>
          ))}
        </div>
      </div>

      <section className="history-refine" aria-label="Refine session history">
        {range === 'custom' && <div className="history-custom-dates"><label>From<input aria-label="History start date" type="date" value={filters.from} onChange={e => updateFilters({from:e.target.value})}/></label><label>Through<input aria-label="History end date" type="date" value={filters.to} onChange={e => updateFilters({to:e.target.value})}/></label>{dateError && <p role="alert">{dateError}</p>}</div>}
        <div className="history-filter-grid">
          <label>Subject<Select aria-label="History subject" value={filters.category} onChange={e => updateFilters({category:e.target.value})}><option value="all">All subjects</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</Select></label>
          <label>Outcome<Select aria-label="History outcome" value={filters.outcome} onChange={e => updateFilters({outcome:e.target.value as HistoryFilters['outcome']})}><option value="all">All outcomes</option><option value="completed">Completed</option><option value="unfinished">Unfinished</option></Select></label>
          <label>Recorded with<Select aria-label="History source" value={filters.source} onChange={e => updateFilters({source:e.target.value as HistoryFilters['source']})}><option value="all">Timer &amp; manual</option><option value="timer">Timer</option><option value="manual">Manual log</option></Select></label>
          <label>Order<Select aria-label="History order" value={filters.sort} onChange={e => updateFilters({sort:e.target.value as HistoryFilters['sort']})}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></Select></label>
        </div>
        <div className="history-results"><label className="check-row"><input type="checkbox" checked={filters.notesOnly} onChange={e => updateFilters({notesOnly:e.target.checked})}/> With notes only</label><button className="text-action" onClick={clearFilters}>Clear filters</button><span role="status">{sessions.length} of {state.sessions.length} sessions · summaries and export match these filters</span></div>
      </section>

      {!sessions.length && <EmptyState title={state.sessions.length ? "No matching sessions" : "Your history starts here"} body={state.sessions.length ? "Try another date range, subject, or search." : "Start a focus timer or log a study session to record your progress."} action={state.sessions.length ? <button onClick={clearFilters}>Show all history</button> : <button onClick={() => setLogging(true)}>Log your first session</button>} />}

      {Object.entries(grouped).map(([day, group]) => {
        const items = group.sessions;
        const isCollapsed = collapsedDays[day];
        const dayTotal = dayTotals[day].focusMinutes;
        return (
          <section className="section-band history-day-group glass-card" key={day}>
            <h2 className="premium-accordion-header" onClick={() => toggleDay(day)} role="button" tabIndex={0} aria-expanded={!isCollapsed} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDay(day); } }}>
              <span>
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="history-day-summary">{items.length < dayTotals[day].sessions.length ? `${items.length} of ` : ""}{dayTotals[day].sessions.length} sessions <span className="accent-pill">{dayTotal} min focus</span></span>
            </h2>
            
            {!isCollapsed && (
              <div className="history-list">
                {items.map((session) => {
                  const task = tasksById.get(session.taskId ?? "");
                  const isClean = session.completed && !session.interrupted;
                  return (
                    <article className={`history-row ${isClean ? "clean" : "messy"}`} key={session.id}>
                      <div className="history-main">
                        <div>
                          <strong className="text-muted">{new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                          <span>{task ? <Link className="history-task-link" to={`/tasks?task=${encodeURIComponent(task.id)}`}>{task.title}</Link> : session.category}</span>
                        </div>
                        <small className="text-muted">{session.category} · {sessionTypeLabels[session.type]}{session.source === 'manual' ? ' · Manual log' : ''}{session.taskId && !task ? ' · Task no longer available' : ''}</small>
                        {session.notes?.trim() && <p className="history-note-preview">{session.notes}</p>}
                      </div>
                      
                      <div className="history-duration">
                        <span>{session.actualDuration} min <small>/ {session.plannedDuration} planned</small></span>
                        <div className="duration-track">
                          <div className={`duration-fill ${isClean ? 'good' : 'warn'}`} style={{ width: `${Math.min(100, (session.actualDuration / Math.max(1,session.plannedDuration)) * 100)}%` }} />
                        </div>
                      </div>
                      
                      <span className={`status-pill ${isClean ? 'good' : 'warn'}`}>
                        {isClean ? "Completed" : "Unfinished"}
                      </span>
                      
                      <div className="history-actions">
                        <button className="ghost" onClick={() => { setEditing(session.id); setNotes(session.notes ?? ""); }} aria-label="Edit session notes">
                          <StickyNote size={14} /> <span>Notes</span>
                        </button>
                        <button
                          className="ghost icon-only danger-text"
                          onClick={async () => {
                            if (await confirmAction("Delete this session entry? Its study time and any credited Pomodoro will be removed.")) {
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
          <button className="glass-card" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button className="glass-card" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      )}

      {editingSession && (
        <Portal><div className="modal">
          <div className="modal-panel history-notes-modal" role="dialog" aria-modal="true" aria-labelledby="session-notes-title">
            <div className="modal-title">
              <h2 id="session-notes-title">Session notes</h2>
              <button className="ghost icon-only" onClick={() => setEditing(null)} aria-label="Close"><X size={17} /></button>
            </div>
            <div className="history-session-context"><strong>{tasksById.get(editingSession.taskId ?? '')?.title ?? editingSession.category}</strong><span>{new Date(editingSession.startTime).toLocaleString()} — {new Date(editingSession.endTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><span>{sessionTypeLabels[editingSession.type]} · {editingSession.actualDuration} min studied / {editingSession.plannedDuration} min planned · {editingSession.source === 'manual' ? 'Manual log' : 'Timer'}</span></div>
            <textarea aria-label="Session notes" autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this session…" />
            <button className="primary" onClick={() => { dispatch({ type: "update-session-notes", id: editingSession.id, notes }); setEditing(null); }}>Save notes</button>
          </div>
        </div></Portal>
      )}
    </div>
  );
}

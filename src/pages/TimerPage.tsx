import { useEffect, useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import type React from "react";
import { Bell, CheckCircle2, Clock3, FastForward, Flame, Minus, Pause, Play, Plus, RotateCcw, Search, Target, TimerReset, Volume2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/Layout";
import { CountUp } from "../components/CountUp";
import { ProgressRing } from "../components/ProgressRing";
import { formatTimerClock, TimerMode, useActiveTimer } from "../components/ActiveTimerProvider";
import { useAppStore } from "../store/AppStore";
import { SessionType, StudySession } from "../types";
import { currentStreak, dateKey, dayMinutesMap, todayStats } from "../utils/stats";

const labelFor: Record<SessionType, string> = { focus: "Focus", break: "Short Break", longBreak: "Long Break" };

const timerModes: Record<TimerMode, { label: string; minutes: number; detail: string }> = {
  sprint: { label: "Sprint", minutes: 15, detail: "Quick push" },
  focus: { label: "Focus", minutes: 32, detail: "Your default" },
  deepFocus: { label: "Deep Focus", minutes: 50, detail: "Long block" },
  custom: { label: "Custom", minutes: 25, detail: "Your call" },
};

const defaultCategories = ["DSA Algorithm", "System Design", "General Practice", "Project Work", "Revision", "Mock Interview"];

export function TimerPage() {
  const { state } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    type, mode, customMinutes, plannedMinutes: activePlannedMinutes, remaining, running, startedAt,
    selectedTask, selectedCategory,
    setType, setMode, setCustomMinutes, setPlannedMinutes, setSelectedTask, setSelectedCategory,
    start, pause, reset, finishSession,
  } = useActiveTimer();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("studytrack.customTimerCategories") ?? "[]") as string[]; }
    catch { return []; }
  });
  const [newCategory, setNewCategory] = useState("");
  const today = todayStats(state);
  const categories = useMemo(
    () => Array.from(new Set([...defaultCategories, ...customCategories, ...state.tasks.map((t) => t.category), ...state.sessions.map((s) => s.category)].filter(Boolean))),
    [customCategories, state.tasks, state.sessions],
  );
  const selectedTaskData = state.tasks.find((t) => t.id === selectedTask);
  const taskMatches = state.tasks.filter((t) => t.status !== "done" && `${t.title} ${t.category} ${t.priority}`.toLowerCase().includes(taskQuery.toLowerCase()));

  useEffect(() => { localStorage.setItem("studytrack.customTimerCategories", JSON.stringify(customCategories)); }, [customCategories]);

  useEffect(() => {
    if (!taskModalOpen) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setTaskModalOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [taskModalOpen]);

  const plannedMinutes = useMemo(() => {
    if (type === "break") return state.settings.shortBreakDuration;
    if (type === "longBreak") return state.settings.longBreakDuration;
    if (mode === "sprint") return timerModes.sprint.minutes;
    if (mode === "deepFocus") return timerModes.deepFocus.minutes;
    if (mode === "custom") return Math.max(1, customMinutes);
    return state.settings.focusDuration;
  }, [customMinutes, mode, state.settings, state.sessions, type]);

  useEffect(() => { setPlannedMinutes(plannedMinutes); }, [plannedMinutes, setPlannedMinutes]);

  useEffect(() => {
    const taskId = (location.state as { focusTaskId?: string } | null)?.focusTaskId;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || running) return;
    setSelectedTask(task.id);
    setSelectedCategory(task.category);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, running, setSelectedCategory, setSelectedTask, state.tasks]);

  const minutesText = formatTimerClock(remaining);
  const displayedPlannedMinutes = running || activePlannedMinutes !== plannedMinutes ? activePlannedMinutes : plannedMinutes;
  const progress = 1 - remaining / Math.max(1, displayedPlannedMinutes * 60);
  const clampedProgress = Math.max(0, Math.min(1, progress));

  const addCategory = () => {
    if (!newCategory.trim()) return;
    const category = newCategory.trim();
    setCustomCategories((items) => Array.from(new Set([...items, category])));
    setSelectedCategory(category);
    setNewCategory("");
  };

  const heat = yearHeatmap(state.sessions);
  const bestSession = state.sessions.filter((s) => s.type === "focus").sort((a, b) => b.actualDuration - a.actualDuration)[0];

  return (
    <div className="timer-page page-transition">
      <PageHeader
        eyebrow="Workspace"
        title="Focus timer"
        description="Give one thing your full attention. The rest can wait."
        action={
          <div className="timer-header-cluster">
            <span><Flame size={14} /><b>{currentStreak(state)}</b><small> streak</small></span>
            <span><CheckCircle2 size={14} /><b>{today.sessionsToday}</b><small> sessions</small></span>
            <span><Clock3 size={14} /><b><CountUp value={today.minutesToday} /></b><small> min today</small></span>
          </div>
        }
      />

      <section className="timer-grid">
        {/* Timer Stage */}
        <div className={`timer-stage timer-${type} ${running ? "running" : ""}`}>
          <div className="timer-stage-top">
            <div className="segmented">
              {(["focus", "break", "longBreak"] as SessionType[]).map((item) => (
                <button key={item} className={type === item ? "selected" : ""} disabled={running} onClick={() => setType(item)}>
                  {labelFor[item]}
                </button>
              ))}
            </div>
            <div className="timer-mini-meta">
              <span><Target size={13} /> {selectedCategory}</span>
              <span><TimerReset size={13} /> {timerModes[mode].label}</span>
            </div>
          </div>

          <div className="timer-body">
            <ProgressRing
              progress={clampedProgress}
              size={260}
              strokeWidth={8}
              colorFrom="var(--accent)"
              colorTo="var(--accent)"
              glow={false}
              breathing={false}
              particles={false}
              animated
            >
              <div className={`timer-core orbital-timer-text ${running ? "timer-active" : ""}`}>
                <span className="text-accent">{labelFor[type]}</span>
                <strong className="mono timer-clock-display">{minutesText}</strong>
                <small className="text-muted">{displayedPlannedMinutes} min planned</small>
              </div>
            </ProgressRing>

            <div className="timer-controls">
              <button className="icon-button btn-rotate-hover" onClick={reset} title="Reset" aria-label="Reset timer"><RotateCcw size={20} /></button>
              <button className="icon-button primary btn-ripple" onClick={running ? pause : start} title={running ? "Pause" : "Start"} aria-label={running ? "Pause timer" : "Start timer"}>
                {running ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button className="icon-button warning btn-rotate-hover" onClick={() => finishSession(false)} title="Skip" aria-label="Skip session"><FastForward size={20} /></button>
            </div>
          </div>

          <div className="timer-bottom-note">
            <strong>Your session stays with you.</strong>
            <span>Open your notes or explore another page. Your timer keeps running.</span>
          </div>
        </div>

        {/* Setup Panel */}
        <aside className="panel timer-setup">
          <h2>Plan this block</h2>
          <div className="mode-grid">
            {(Object.keys(timerModes) as TimerMode[]).map((item) => (
              <button key={item} className={`mode-card glass-card ${mode === item ? "selected" : ""}`} disabled={running || type !== "focus"} onClick={() => setMode(item)} >
                <span className="mono">{timerModes[item].label}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{item === "focus" ? `${state.settings.focusDuration} min` : `${item === "custom" ? customMinutes : timerModes[item].minutes} min`}</span>
                <small>{timerModes[item].detail}</small>
              </button>
            ))}
          </div>
          {mode === "custom" && (
            <div className="custom-time-control">
              <label>Custom minutes</label>
              <div>
                <button className="icon-button small" disabled={running} onClick={() => setCustomMinutes((v) => Math.max(1, v - 5))} aria-label="Decrease"><Minus size={14} /></button>
                <input type="number" min={1} max={180} value={customMinutes} disabled={running} onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value) || 1))} />
                <button className="icon-button small" disabled={running} onClick={() => setCustomMinutes((v) => Math.min(180, v + 5))} aria-label="Increase"><Plus size={14} /></button>
              </div>
            </div>
          )}
          <div className="setup-group">
            <label>Attach task</label>
            <button className="task-attach-trigger" disabled={Boolean(startedAt)} onClick={() => setTaskModalOpen(true)}>
              <span>{selectedTaskData?.title ?? "Free study block"}</span>
              <small>{selectedTaskData ? `${selectedTaskData.category} · ${selectedTaskData.priority}` : "No linked task selected"}</small>
            </button>
          </div>
          <div className="setup-group">
            <label>Category</label>
            <div className="category-chip-grid">
              {categories.map((cat) => (
                <button key={cat} className={`category-chip ${selectedCategory === cat ? "selected glow-accent" : ""}`} disabled={Boolean(startedAt)} onClick={() => setSelectedCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="category-add">
            <input value={newCategory} disabled={running} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="Add category…" />
            <button className="icon-button small" onClick={addCategory} disabled={running || !newCategory.trim()} aria-label="Add category"><Plus size={15} /></button>
          </div>
          <div className="info-list">
            <div><Bell size={14} /> Notifications {state.settings.notificationsEnabled ? "on" : "off"}</div>
            <div><Volume2 size={14} /> Chime {state.settings.soundEnabled ? "on" : "off"}</div>
          </div>
          <p className="callout">Your default duration follows Settings. Choose a shorter sprint or a longer block whenever you need it.</p>
        </aside>
      </section>

      {/* Task Picker Modal */}
      {taskModalOpen && (
        <Portal><div className="modal">
          <div className="modal-panel task-pick-modal" role="dialog" aria-modal="true" aria-labelledby="task-picker-title">
            <div className="modal-title">
              <h2 id="task-picker-title">Attach task</h2>
              <button className="ghost icon-only" onClick={() => setTaskModalOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="search"><Search size={15} /><input autoFocus value={taskQuery} onChange={(e) => setTaskQuery(e.target.value)} placeholder="Search active tasks…" /></div>
            <div className="task-pick-list">
              <button className={`task-pick-row ${selectedTask === "" ? "selected" : ""}`} onClick={() => { setSelectedTask(""); setTaskModalOpen(false); }}>
                <CheckCircle2 size={17} />
                <div><strong>Free study block</strong><span>No linked task</span></div>
              </button>
              {taskMatches.map((task) => (
                <button key={task.id} className={`task-pick-row ${selectedTask === task.id ? "selected" : ""}`} onClick={() => { setSelectedTask(task.id); setSelectedCategory(task.category); setTaskModalOpen(false); }}>
                  <Target size={17} />
                  <div><strong>{task.title}</strong><span>{task.category} · {task.priority}{task.dueDate ? ` · due ${task.dueDate}` : ""}</span></div>
                </button>
              ))}
            </div>
          </div>
        </div></Portal>
      )}

      {/* Year Heatmap */}
      <section className="section-band">
        <h2>Your year in focus <span>Every session adds up</span></h2>
        <div className="heatmap-shell">
          <div className="month-labels">{heat.months.map((m) => <span key={m.label} style={{ gridColumn: `${m.column + 1} / span 4` }}>{m.label}</span>)}</div>
          <div className="heatmap-with-days">
            <div className="day-labels"><span>Mon</span><span>Wed</span><span>Fri</span></div>
            <div className="heatmap">
              {heat.cells.map((cell) => (
                <span
                  key={cell.fullDate}
                  data-tooltip={`${cell.fullDate} · ${cell.minutes}m`}
                  className={`heatmap-cell heat-${Math.min(4, Math.ceil(cell.minutes / 30))}`}
                  style={{ gridColumn: cell.week + 1, gridRow: cell.day + 1 }}
                />
              ))}
            </div>
          </div>
          <div className="heatmap-footer">
            <div className="heat-legend"><span>Less</span><i /><i /><i /><i /><span>More</span></div>
            <div>
              <span>Best session</span>
              <strong>{bestSession ? `${bestSession.actualDuration} min` : "No sessions yet"}</strong>
            </div>
            <p>{bestSession ? `${new Date(bestSession.startTime).toLocaleDateString()} · ${bestSession.category} · planned ${bestSession.plannedDuration}m` : "Complete a focus block and your strongest session will appear here."}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function yearHeatmap(sessions: StudySession[]) {
  const map = dayMinutesMap(sessions);
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 364);
  const first = new Date(start);
  first.setDate(start.getDate() - start.getDay());
  const cells = [];
  const months: { label: string; column: number }[] = [];
  let lastMonth = "";
  for (let i = 0; i < 371; i += 1) {
    const current = new Date(first);
    current.setDate(first.getDate() + i);
    const fullDate = dateKey(current);
    const week = Math.floor(i / 7);
    const month = current.toLocaleString(undefined, { month: "short" });
    if (current.getDate() <= 7 && month !== lastMonth) { months.push({ label: month, column: week }); lastMonth = month; }
    cells.push({ fullDate, week, day: current.getDay(), minutes: map[fullDate] ?? 0 });
  }
  return { cells, months };
}

import { CategorySelect } from "../components/CategorySelect";
import { StudyHeatmap } from "../components/StudyHeatmap";
import { taskPomodoroMinutes } from "../utils/pomodoro";
import { showToast } from "../utils/toast";
import { FocusRoom } from "../components/FocusRoom";
import { useEffect, useState } from "react";
import { Portal } from "../components/Portal";
import type React from "react";
import { Bell, CheckCircle2, Clock3, FastForward, Flame, Minus, Pause, Play, Plus, RotateCcw, Search, Target, TimerReset, Volume2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/Layout";
import { CountUp } from "../components/CountUp";
import { ProgressRing } from "../components/ProgressRing";
import { formatTimerClock, TimerMode, useActiveTimer } from "../components/ActiveTimerProvider";
import { useAppStore } from "../store/AppStore";
import { SessionType } from "../types";
import { currentStreak, todayStats } from "../utils/stats";

const labelFor: Record<SessionType, string> = { focus: "Focus", break: "Short Break", longBreak: "Long Break" };

const timerModes: Record<TimerMode, { label: string; minutes: number; detail: string }> = {
  sprint: { label: "Sprint", minutes: 15, detail: "Quick push" },
  focus: { label: "Focus", minutes: 32, detail: "Your default" },
  deepFocus: { label: "Deep Focus", minutes: 50, detail: "Long block" },
  custom: { label: "Custom", minutes: 25, detail: "Your call" },
};


export function TimerPage() {
  const { state } = useAppStore();
  const [focusRoom, setFocusRoom] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    type, mode, customMinutes, plannedMinutes: activePlannedMinutes, remaining, running, startedAt,
    selectedTask, selectedCategory,
    setType, setMode, setCustomMinutes, setSelectedTask, setSelectedCategory,
    start, pause, reset, finishSession,
  } = useActiveTimer();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const today = todayStats(state);
  const selectedTaskData = state.tasks.find((t) => t.id === selectedTask);
  const taskMatches = state.tasks.filter((t) => t.status !== "done" && `${t.title} ${t.category} ${t.priority}`.toLowerCase().includes(taskQuery.toLowerCase()));



  useEffect(() => {
    if (!taskModalOpen) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setTaskModalOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [taskModalOpen]);

  useEffect(() => {
    const taskId = (location.state as { focusTaskId?: string } | null)?.focusTaskId;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (startedAt && selectedTask !== task.id) {
      showToast('Finish or reset your current block before switching tasks.', 'info');
    } else if (!startedAt) {
      setType('focus');
      setSelectedTask(task.id);
      setSelectedCategory(task.category);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, startedAt, selectedTask, setType, setSelectedCategory, setSelectedTask, state.tasks]);

  const minutesText = formatTimerClock(remaining);
  const displayedPlannedMinutes = activePlannedMinutes;
  const progress = 1 - remaining / Math.max(1, displayedPlannedMinutes * 60);
  const clampedProgress = Math.max(0, Math.min(1, progress));


  return (
    <div className="timer-page page-transition">
      {focusRoom && <FocusRoom onClose={()=>setFocusRoom(false)}/>}
      <PageHeader
        eyebrow="Workspace"
        title="Focus timer"
        description="Give one thing your full attention. The rest can wait."
        action={
          <div className="timer-header-cluster"><button onClick={()=>setFocusRoom(true)}><Target size={16}/> Focus mode</button>
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
          {selectedTaskData ? <div className="task-timer-plan"><span className="overview-eyebrow">TASK POMODORO PLAN</span><strong>{taskPomodoroMinutes(selectedTaskData,state.settings.focusDuration)}<small> min per block</small></strong><p>{selectedTaskData.actualPomodoros} of {selectedTaskData.estimatedPomodoros} Pomodoros completed</p><div className="bar"><span style={{width:`${Math.min(100,selectedTaskData.actualPomodoros/selectedTaskData.estimatedPomodoros*100)}%`}}/></div><small>The task completes automatically after its final block.</small></div> : <><div className="mode-grid">
            {(Object.keys(timerModes) as TimerMode[]).map((item) => (
              <button key={item} className={`mode-card glass-card ${mode === item ? "selected" : ""}`} disabled={Boolean(startedAt) || type !== "focus"} onClick={() => setMode(item)} >
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
          </>}
          <div className="setup-group">
            <label>Attach task</label>
            <button className="task-attach-trigger" disabled={Boolean(startedAt)} onClick={() => setTaskModalOpen(true)}>
              <span>{selectedTaskData?.title ?? "Free study block"}</span>
              <small>{selectedTaskData ? `${selectedTaskData.category} · ${selectedTaskData.priority}` : "No linked task selected"}</small>
            </button>
          </div>
          <div className="setup-group">
            <label>Category<CategorySelect value={selectedCategory} onChange={setSelectedCategory} disabled={Boolean(startedAt)}/></label>
          </div>
          <div className="info-list">
            <div><Bell size={14} /> Notifications {state.settings.notificationsEnabled ? "on" : "off"}</div>
            <div><Volume2 size={14} /> Chime {state.settings.soundEnabled ? "on" : "off"}</div>
          </div>
          <p className="callout">{selectedTaskData ? "This task sets your focus duration. Break lengths still follow Settings. Finish or reset a started block before changing tasks." : "Your default duration follows Settings. Attach a task to use its own Pomodoro duration."}</p>
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
                  <div><strong>{task.title}</strong><span>{task.category} · {task.estimatedPomodoros} × {taskPomodoroMinutes(task,state.settings.focusDuration)} min{task.dueDate ? ` · due ${task.dueDate}` : ""}</span></div>
                </button>
              ))}
            </div>
          </div>
        </div></Portal>
      )}

      <StudyHeatmap sessions={state.sessions} dailyGoal={state.settings.dailyGoalMinutes}/>

    </div>
  );
}

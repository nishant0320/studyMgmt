import { sessionMinutes } from "../utils/pomodoro";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { SessionType, StudySession } from "../types";
import { dateKey } from "../utils/stats";

export type TimerMode = "sprint" | "focus" | "deepFocus" | "custom";

type ActiveTimerState = {
  version: 1;
  scratchNotes: string;
  type: SessionType;
  mode: TimerMode;
  customMinutes: number;
  plannedMinutes: number;
  remaining: number;
  running: boolean;
  startedAt: string | null;
  endsAt: string | null;
  selectedTask: string;
  selectedCategory: string;
};

type ActiveTimerContextValue = ActiveTimerState & {
  timerStorageError: boolean;
  setScratchNotes: (notes: string) => void;
  setType: (type: SessionType) => void;
  setMode: (mode: TimerMode) => void;
  setCustomMinutes: (minutes: number | ((value: number) => number)) => void;
  setSelectedTask: (taskId: string) => void;
  setSelectedCategory: (category: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  finishSession: (completed: boolean) => void;
};

const STORAGE_KEY = "studytrack.activeTimer.v1";
const labelFor: Record<SessionType, string> = { focus: "Focus", break: "Short Break", longBreak: "Long Break" };
const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

function initialTimer(focusDuration: number): ActiveTimerState {
  const fallback: ActiveTimerState = {
    version: 1,
    scratchNotes: "",
    type: "focus",
    mode: "focus",
    customMinutes: 25,
    plannedMinutes: focusDuration,
    remaining: focusDuration * 60,
    running: false,
    startedAt: null,
    endsAt: null,
    selectedTask: "",
    selectedCategory: "General Practice",
  };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<ActiveTimerState> | null;
    if (!stored || stored.version !== 1) return fallback;
    const restored = { ...fallback, ...stored, scratchNotes: typeof stored.scratchNotes === "string" ? stored.scratchNotes : "" };
    if (!["focus", "break", "longBreak"].includes(restored.type) || !["sprint", "focus", "deepFocus", "custom"].includes(restored.mode)
      || !Number.isFinite(restored.plannedMinutes) || restored.plannedMinutes < 1 || restored.plannedMinutes > 180
      || !Number.isFinite(restored.remaining) || restored.remaining < 0 || restored.remaining > restored.plannedMinutes * 60
      || typeof restored.selectedTask !== "string" || typeof restored.selectedCategory !== "string"
      || !Number.isFinite(restored.customMinutes) || restored.customMinutes < 1 || restored.customMinutes > 180
      || (restored.startedAt !== null && (typeof restored.startedAt !== "string" || !Number.isFinite(Date.parse(restored.startedAt))))
      || (restored.running && !restored.startedAt)
      || typeof restored.running !== "boolean" || (restored.running && (!restored.endsAt || !Number.isFinite(Date.parse(restored.endsAt))))) return fallback;
    if (restored.running && restored.endsAt) {
      restored.remaining = Math.max(0, Math.ceil((new Date(restored.endsAt).getTime() - Date.now()) / 1000));
    }
    return restored;
  } catch {
    return fallback;
  }
}

export function ActiveTimerProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useAppStore();
  const [timer, setTimer] = useState<ActiveTimerState>(() => initialTimer(state.settings.focusDuration));
  const [timerStorageError,setTimerStorageError] = useState(false);
  const timerRef = useRef(timer);
  const finishingRef = useRef(false);
  const persistedTimer = useRef("");

  const commit = useCallback((next: ActiveTimerState | ((current: ActiveTimerState) => ActiveTimerState)) => {
    setTimer((current) => {
      const value = typeof next === "function" ? next(current) : next;
      timerRef.current = value;
      return value;
    });
  }, []);

  useEffect(() => {
    timerRef.current = timer;
    try { const serialized = JSON.stringify({ ...timer, remaining: timer.running ? timer.plannedMinutes * 60 : timer.remaining }); if (serialized !== persistedTimer.current) {localStorage.setItem(STORAGE_KEY, serialized); persistedTimer.current = serialized;} setTimerStorageError(false); } catch { setTimerStorageError(true); }
  }, [timer]);

  useEffect(() => {
    if (timer.running || timer.startedAt) return;
    const task = state.tasks.find(task=>task.id===timer.selectedTask);
    const plannedMinutes = sessionMinutes(timer.type,timer.mode,timer.customMinutes,state.settings,task);
    if (plannedMinutes !== timer.plannedMinutes) commit({ ...timer, plannedMinutes, remaining: plannedMinutes * 60 });
  }, [commit, state.settings, state.tasks, timer]);

  const playChime = useCallback(() => {
    if (!state.settings.soundEnabled) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.16);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    oscillator.onended = () => { void context.close(); };
  }, [state.settings.soundEnabled]);

  const notify = useCallback((completed: boolean, current: ActiveTimerState) => {
    if (!state.settings.notificationsEnabled || !("Notification" in window)) return;
    const show = () => new Notification(completed ? "TrackMe session complete" : "TrackMe session stopped", {
      body: `${labelFor[current.type]} logged for ${completed ? current.plannedMinutes : Math.max(1, Math.round((current.plannedMinutes * 60 - current.remaining) / 60))} minutes.`,
    });
    if (Notification.permission === "granted") show();
    if (Notification.permission === "default") void Notification.requestPermission().then((permission) => permission === "granted" && show());
  }, [state.settings.notificationsEnabled]);

  const finishSession = useCallback((completed: boolean) => {
    const current = timerRef.current;
    const liveRemaining = current.running && current.endsAt ? Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 1000)) : current.remaining;
    const elapsed = Math.max(0, current.plannedMinutes * 60 - liveRemaining);
    if (finishingRef.current || (!current.startedAt && elapsed === 0)) return;
    finishingRef.current = true;

    const task = state.tasks.find((item) => item.id === current.selectedTask);
    const actualDuration = completed ? current.plannedMinutes : Math.round(elapsed / 60);
    const session: StudySession = {
      source: "timer",
      id: `session-${current.type}-${current.startedAt ?? new Date().toISOString()}`,
      taskId: current.selectedTask || undefined,
      startTime: current.startedAt ?? new Date().toISOString(),
      endTime: completed && current.endsAt ? current.endsAt : new Date().toISOString(),
      plannedDuration: current.plannedMinutes,
      actualDuration,
      type: current.type,
      completed,
      interrupted: !completed,
      category: current.selectedCategory || task?.category || "General Practice",
      notes: [current.scratchNotes.trim(), completed ? "" : "Stopped before completion."].filter(Boolean).join("\n\n"),
    };
    dispatch({ type: "add-session", session });

    const today = dateKey(new Date());
    const completedFocusCount = state.sessions.filter((item) => item.type === "focus" && item.completed && dateKey(item.startTime) === today).length
      + (current.type === "focus" && completed ? 1 : 0);
    const nextType: SessionType = current.type === "focus" && completed
      ? (completedFocusCount % Math.max(1, state.settings.sessionsBeforeLongBreak) === 0 ? "longBreak" : "break")
      : "focus";
    const taskFinished = task && (task.status === 'done' || (current.type === 'focus' && completed && task.actualPomodoros + 1 >= task.estimatedPomodoros));
    const nextTask = taskFinished ? undefined : task;
    const nextMinutes = sessionMinutes(nextType, 'focus', current.customMinutes, state.settings, nextTask);
    // After the task's last block, leave the break ready and let the user choose the next step.
    const autoStart = completed && state.settings.autoStartNextSession && !taskFinished;
    const nextStartedAt = autoStart ? new Date().toISOString() : null;
    const nextState: ActiveTimerState = {
      ...current,
      scratchNotes: "",
      type: nextType,
      selectedTask: taskFinished ? "" : current.selectedTask,
      mode: "focus",
      plannedMinutes: nextMinutes,
      remaining: nextMinutes * 60,
      running: autoStart,
      startedAt: nextStartedAt,
      endsAt: autoStart ? new Date(Date.now() + nextMinutes * 60 * 1000).toISOString() : null,
    };
    timerRef.current = nextState;
    setTimer(nextState);
    playChime();
    notify(completed, current);
    window.setTimeout(() => { finishingRef.current = false; }, 0);
  }, [dispatch, notify, playChime, state.sessions, state.settings, state.tasks]);

  useEffect(() => {
    if (!timer.running || !timer.endsAt) return;
    const tick = () => {
      const current = timerRef.current;
      if (!current.running || !current.endsAt) return;
      const remaining = Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 1000));
      if (remaining === 0) {
        timerRef.current = { ...current, remaining: 0 };
        finishSession(true);
        return;
      }
      if (remaining !== current.remaining) commit({ ...current, remaining });
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [commit, finishSession, timer.endsAt, timer.running]);

  useEffect(() => {
    const originalTitle = "TrackMe";
    if (timer.running) {
      const minutes = String(Math.floor(timer.remaining / 60)).padStart(2, "0");
      const seconds = String(timer.remaining % 60).padStart(2, "0");
      document.title = `${minutes}:${seconds} - ${labelFor[timer.type]}`;
    } else {
      document.title = originalTitle;
    }
    return () => { document.title = originalTitle; };
  }, [timer.remaining, timer.running, timer.type]);

  const setScratchNotes = useCallback((scratchNotes: string) => commit(current => ({...current, scratchNotes})), [commit]);
  const setType = useCallback((type: SessionType) => commit((current) => current.running ? current : { ...current, type, startedAt: null, endsAt: null }), [commit]);
  const setMode = useCallback((mode: TimerMode) => commit((current) => current.running ? current : { ...current, mode, startedAt: null, endsAt: null }), [commit]);
  const setCustomMinutes = useCallback((value: number | ((current: number) => number)) => commit((current) => {
    if (current.running) return current;
    const customMinutes = Math.max(1, Math.min(180, typeof value === "function" ? value(current.customMinutes) : value));
    return { ...current, customMinutes, startedAt: null, endsAt: null };
  }), [commit]);
  const setSelectedTask = useCallback((selectedTask: string) => commit((current) => {
    if (current.startedAt) return current;
    const task = state.tasks.find(task=>task.id===selectedTask);
    const plannedMinutes = sessionMinutes('focus', 'focus', current.customMinutes, state.settings, task);
    return { ...current, selectedTask: task?.id ?? '', selectedCategory: task?.category ?? current.selectedCategory, type: 'focus', mode: 'focus', plannedMinutes, remaining: plannedMinutes * 60 };
  }), [commit, state.tasks, state.settings]);
  const setSelectedCategory = useCallback((selectedCategory: string) => commit((current) => current.startedAt ? current : ({ ...current, selectedCategory })), [commit]);
  const start = useCallback(() => commit((current) => {
    if (current.running) return current;
    const task = state.tasks.find(task=>task.id===current.selectedTask);
    const plannedMinutes = current.startedAt ? current.plannedMinutes : sessionMinutes(current.type,current.mode,current.customMinutes,state.settings,task);
    const remaining = current.startedAt && current.remaining > 0 ? current.remaining : plannedMinutes * 60;
    return {
      ...current,
      plannedMinutes,
      remaining,
      running: true,
      startedAt: current.startedAt ?? new Date().toISOString(),
      endsAt: new Date(Date.now() + remaining * 1000).toISOString(),
    };
  }), [commit, state.settings, state.tasks]);
  const pause = useCallback(() => commit((current) => {
    if (!current.running) return current;
    const remaining = current.endsAt ? Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 1000)) : current.remaining;
    return { ...current, remaining, running: false, endsAt: null };
  }), [commit]);
  const reset = useCallback(() => commit((current) => ({
    ...current,
    remaining: current.plannedMinutes * 60,
    running: false,
    startedAt: null,
    endsAt: null,
  })), [commit]);

  const value = useMemo<ActiveTimerContextValue>(() => ({
    ...timer,
    timerStorageError,
    setScratchNotes,
    setType,
    setMode,
    setCustomMinutes,
    setSelectedTask,
    setSelectedCategory,
    start,
    pause,
    reset,
    finishSession,
  }), [timerStorageError, setScratchNotes, finishSession, pause, reset, setCustomMinutes, setMode, setSelectedCategory, setSelectedTask, setType, start, timer]);

  return <ActiveTimerContext.Provider value={value}>{children}</ActiveTimerContext.Provider>;
}

export function useActiveTimer() {
  const context = useContext(ActiveTimerContext);
  if (!context) throw new Error("useActiveTimer must be used inside ActiveTimerProvider");
  return context;
}

export function timerLabel(type: SessionType) {
  return labelFor[type];
}

export function formatTimerClock(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

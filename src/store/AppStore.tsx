import { creditPomodoro, removePomodoroCredit } from "../utils/pomodoro";
import React, { createContext, useContext, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { AppState, Badge, CalendarEvent, JournalEntry, Settings, StudySession, Subtask, Task } from "../types";
import { defaultSettings, makeEmptyState, makeInitialState, starterBadges } from "./demoData";
import { isValidBackup } from "../utils/backup";
import { computeEarnedBadges } from "../utils/stats";

export type Action =
  | { type: "schedule-tasks"; ids: string[]; date?: string }
  | { type: "reorder-plan"; date: string; ids: string[] }
  | { type: "update-categories"; categories: string[] }
  | { type: "add-session"; session: StudySession }
  | { type: "update-session-notes"; id: string; notes: string }
  | { type: "delete-session"; id: string }
  | { type: "add-task"; task: Task }
  | { type: "update-task"; task: Task }
  | { type: "delete-task"; id: string }
  | { type: "bulk-delete-tasks"; ids: string[] }
  | { type: "bulk-move-tasks"; ids: string[]; status: Task["status"] }
  | { type: "move-task"; id: string; status: Task["status"] }
  | { type: "reschedule-task"; id: string; dueDate: string }
  | { type: "toggle-subtask"; taskId: string; subtaskId: string }
  | { type: "add-subtask"; taskId: string; subtask: Subtask }
  | { type: "delete-subtask"; taskId: string; subtaskId: string }
  | { type: "upsert-journal"; entry: JournalEntry }
  | { type: "delete-journal"; date: string }
  | { type: "add-event"; event: CalendarEvent }
  | { type: "update-event"; event: CalendarEvent }
  | { type: "delete-event"; id: string }
  | { type: "update-settings"; settings: Partial<Settings> }
  | { type: "load-demo" }
  | { type: "clear-data" }
  | { type: "clear-sessions" }
  | { type: "clear-tasks" }
  | { type: "import-data"; state: AppState };

const STORAGE_KEYS = {
  sessions: "studytrack.sessions",
  tasks: "studytrack.tasks",
  journalEntries: "studytrack.journal",
  badges: "studytrack.badges",
  settings: "studytrack.settings",
  events: "studytrack.events",
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const migrateBadges = (badges: Badge[]): Badge[] => {
  const earnedById = new Map((badges ?? []).map((badge) => [badge.id, badge.dateEarned]));
  const existingById = new Map((badges ?? []).filter((badge) => typeof badge.criteria !== "string").map((badge) => [badge.id, badge]));
  return starterBadges.map((badge) => ({ ...(existingById.get(badge.id) ?? badge), dateEarned: earnedById.get(badge.id) ?? badge.dateEarned }));
};

const migrateSettings = (settings: Partial<Settings>): Settings => {
  const merged = { ...defaultSettings, ...settings };
  if (["rgb(91, 61, 240)", "#9333ea", "#41d6a4"].includes(merged.accentColor.toLowerCase())) merged.accentColor = defaultSettings.accentColor;
  if (merged.pomodoroPreset === "classic" && (merged.focusDuration !== 25 || merged.shortBreakDuration !== 5 || merged.longBreakDuration !== 15)) merged.pomodoroPreset = "custom";
  return merged;
};

export const hydrate = (): AppState => {
  const snapshot = read<unknown>("studytrack.workspace.v1", null);
  if (isValidBackup(snapshot)) return { ...snapshot, customCategories: snapshot.customCategories ?? read<string[]>("studytrack.customTimerCategories", []), settings: migrateSettings(snapshot.settings), badges: migrateBadges(snapshot.badges) };
  const seeded = read("studytrack.initialized", false);
  if (!seeded) {
    return makeEmptyState();
  }
  const legacy = {
    customCategories: read<string[]>("studytrack.customTimerCategories", []),
    sessions: read(STORAGE_KEYS.sessions, []),
    tasks: read(STORAGE_KEYS.tasks, []),
    journalEntries: read(STORAGE_KEYS.journalEntries, []),
    badges: migrateBadges(read(STORAGE_KEYS.badges, starterBadges as Badge[])),
    settings: migrateSettings(read(STORAGE_KEYS.settings, {})),
    events: read(STORAGE_KEYS.events, []),
  };
  if (!isValidBackup(legacy)) throw new Error("Stored workspace could not be read. Download your data from the recovery screen before restoring a backup.");
  return legacy;
};

const normalizeBadges = (state: AppState): AppState => ({
  ...state,
  badges: computeEarnedBadges({ ...state, badges: migrateBadges(state.badges.length ? state.badges : starterBadges) }),
});

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "update-categories":
      return { ...state, customCategories: Array.from(new Set(action.categories.map(c => c.trim()).filter(Boolean))) };
    case "schedule-tasks": {
      const existing = state.tasks.filter(task => task.plannedDate === action.date && !action.ids.includes(task.id));
      const order = Math.max(-1, ...existing.map(task => task.planOrder ?? 0)) + 1;
      return { ...state, tasks: state.tasks.map(task => action.ids.includes(task.id) ? { ...task, plannedDate: action.date, planOrder: action.date ? order + action.ids.indexOf(task.id) : undefined } : task) };
    }
    case "reorder-plan": {
      const ids = Array.from(new Set(action.ids)).filter(id => state.tasks.some(t => t.id === id && t.plannedDate === action.date));
      return { ...state, tasks: state.tasks.map(task => ids.includes(task.id) ? { ...task, planOrder: ids.indexOf(task.id) } : task) };
    }
    case "add-session": {
      if (state.sessions.some(session => session.id === action.session.id)) return state;
      const sessions = [action.session, ...state.sessions];
      const tasks = action.session.taskId
        ? state.tasks.map((task) =>
            task.id === action.session.taskId
              ? (action.session.type === "focus" && action.session.completed && !action.session.interrupted ? creditPomodoro(task, action.session.endTime) : task)
              : task,
          )
        : state.tasks;
      return normalizeBadges({ ...state, sessions, tasks });
    }
    case "update-session-notes":
      return { ...state, sessions: state.sessions.map((session) => (session.id === action.id ? { ...session, notes: action.notes } : session)) };
    case "delete-session": {
      const removed = state.sessions.find(session => session.id === action.id);
      const tasks = removed?.type === "focus" && removed.completed && !removed.interrupted
        ? state.tasks.map(task => task.id === removed.taskId ? removePomodoroCredit(task) : task)
        : state.tasks;
      return normalizeBadges({ ...state, tasks, sessions: state.sessions.filter((session) => session.id !== action.id) });
    }
    case "add-task":
      return normalizeBadges({ ...state, tasks: [{ ...action.task, completedByPomodoros: action.task.status === "done" ? action.task.completedByPomodoros : undefined, completedAt: action.task.status === "done" ? action.task.completedAt || new Date().toISOString() : undefined }, ...state.tasks] });
    case "update-task":
      return normalizeBadges({
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.task.id) return task;
          // A timer may finish while its task editor is open. Never replace live credit with the older draft.
          const finishedWhileEditing = task.completedByPomodoros && task.actualPomodoros > action.task.actualPomodoros;
          const status = finishedWhileEditing ? task.status : action.task.status;
          return { ...action.task, actualPomodoros: task.actualPomodoros, status,
            completedByPomodoros: status === 'done' ? task.completedByPomodoros : undefined,
            completedAt: status === 'done' ? task.completedAt || action.task.completedAt || new Date().toISOString() : undefined };
        }),
      });
    case "delete-task":
      return normalizeBadges({ ...state, tasks: state.tasks.filter((task) => task.id !== action.id) });
    case "bulk-delete-tasks":
      return normalizeBadges({ ...state, tasks: state.tasks.filter((task) => !action.ids.includes(task.id)) });
    case "bulk-move-tasks":
      return normalizeBadges({
        ...state,
        tasks: state.tasks.map((task) =>
          action.ids.includes(task.id)
            ? { ...task, status: action.status, completedByPomodoros: undefined, completedAt: action.status === "done" ? new Date().toISOString() : undefined }
            : task,
        ),
      });
    case "move-task":
      return normalizeBadges({
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? { ...task, status: action.status, completedByPomodoros: undefined, completedAt: action.status === "done" ? new Date().toISOString() : undefined }
            : task,
        ),
      });
    case "reschedule-task":
      return { ...state, tasks: state.tasks.map((task) => (task.id === action.id ? { ...task, dueDate: action.dueDate } : task)) };
    case "toggle-subtask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId
            ? { ...task, subtasks: task.subtasks.map((subtask) => (subtask.id === action.subtaskId ? { ...subtask, done: !subtask.done } : subtask)) }
            : task,
        ),
      };
    case "add-subtask":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.taskId ? { ...task, subtasks: [...task.subtasks, action.subtask] } : task)),
      };
    case "delete-subtask":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.taskId ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== action.subtaskId) } : task)),
      };
    case "upsert-journal": {
      const journalEntries = [action.entry, ...state.journalEntries.filter((entry) => entry.date !== action.entry.date)].sort((a, b) => b.date.localeCompare(a.date));
      return normalizeBadges({ ...state, journalEntries });
    }
    case "delete-journal":
      return normalizeBadges({ ...state, journalEntries: state.journalEntries.filter((entry) => entry.date !== action.date) });
    case "add-event":
      return { ...state, events: [action.event, ...state.events] };
    case "update-event":
      return { ...state, events: state.events.map((event) => (event.id === action.event.id ? action.event : event)) };
    case "delete-event":
      return { ...state, events: state.events.filter((event) => event.id !== action.id) };
    case "update-settings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "load-demo":
      return normalizeBadges(makeInitialState());
    case "clear-data":
      return normalizeBadges({ sessions: [], tasks: [], journalEntries: [], badges: starterBadges, settings: { ...defaultSettings, demoDataEnabled: false }, events: [] });
    case "clear-sessions":
      return normalizeBadges({ ...state, sessions: [], tasks: state.tasks.map(task => removePomodoroCredit(task, 0)) });
    case "clear-tasks":
      return normalizeBadges({ ...state, tasks: [] });
    case "import-data":
      return normalizeBadges({ ...action.state, badges: migrateBadges(action.state.badges ?? starterBadges), settings: migrateSettings(action.state.settings ?? {}) });
    default:
      return state;
  }
};

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  storageError: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => normalizeBadges(hydrate()));

  const [storageError, setStorageError] = useState(false);
  const saved = useRef<Record<string, string>>({});
  useLayoutEffect(() => {
    try {
    const entries = {
      "studytrack.workspace.v1": JSON.stringify(state),
      ...Object.fromEntries(Object.entries(STORAGE_KEYS).map(([section, key]) => [key, JSON.stringify(state[section as keyof typeof STORAGE_KEYS])])),
      "studytrack.customTimerCategories": JSON.stringify(state.customCategories ?? []),
      "studytrack.initialized": "true",
    };
    for (const [key, value] of Object.entries(entries)) {
      if (saved.current[key] !== value) { localStorage.setItem(key, value); saved.current[key] = value; }
    }
    setStorageError(false);
    } catch { setStorageError(true); }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, storageError }), [state, storageError]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used inside AppProvider");
  return context;
};

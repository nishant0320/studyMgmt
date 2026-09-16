import React, { createContext, useContext, useLayoutEffect, useMemo, useReducer, useState } from "react";
import { AppState, Badge, CalendarEvent, JournalEntry, Settings, StudySession, Subtask, Task } from "../types";
import { defaultSettings, makeEmptyState, makeInitialState, starterBadges } from "./demoData";
import { isValidBackup } from "../utils/backup";
import { computeEarnedBadges } from "../utils/stats";

type Action =
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

const hydrate = (): AppState => {
  const snapshot = read<unknown>("studytrack.workspace.v1", null);
  if (isValidBackup(snapshot)) return { ...snapshot, settings: migrateSettings(snapshot.settings), badges: migrateBadges(snapshot.badges) };
  const seeded = read("studytrack.initialized", false);
  if (!seeded) {
    return makeEmptyState();
  }
  return {
    sessions: read(STORAGE_KEYS.sessions, []),
    tasks: read(STORAGE_KEYS.tasks, []),
    journalEntries: read(STORAGE_KEYS.journalEntries, []),
    badges: migrateBadges(read(STORAGE_KEYS.badges, starterBadges as Badge[])),
    settings: migrateSettings(read(STORAGE_KEYS.settings, {})),
    events: read(STORAGE_KEYS.events, []),
  };
};

const normalizeBadges = (state: AppState): AppState => ({
  ...state,
  badges: computeEarnedBadges({ ...state, badges: migrateBadges(state.badges.length ? state.badges : starterBadges) }),
});

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "add-session": {
      if (state.sessions.some(session => session.id === action.session.id)) return state;
      const sessions = [action.session, ...state.sessions];
      const tasks = action.session.taskId
        ? state.tasks.map((task) =>
            task.id === action.session.taskId
              ? { ...task, actualPomodoros: task.actualPomodoros + (action.session.type === "focus" && action.session.completed && !action.session.interrupted ? 1 : 0) }
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
        ? state.tasks.map(task => task.id === removed.taskId ? { ...task, actualPomodoros: Math.max(0, task.actualPomodoros - 1) } : task)
        : state.tasks;
      return normalizeBadges({ ...state, tasks, sessions: state.sessions.filter((session) => session.id !== action.id) });
    }
    case "add-task":
      return normalizeBadges({ ...state, tasks: [{ ...action.task, completedAt: action.task.status === "done" ? action.task.completedAt || new Date().toISOString() : undefined }, ...state.tasks] });
    case "update-task":
      return normalizeBadges({
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.task.id ? { ...action.task, completedAt: action.task.status === "done" ? action.task.completedAt || new Date().toISOString() : undefined } : task)),
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
            ? { ...task, status: action.status, completedAt: action.status === "done" ? new Date().toISOString() : undefined }
            : task,
        ),
      });
    case "move-task":
      return normalizeBadges({
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? { ...task, status: action.status, completedAt: action.status === "done" ? new Date().toISOString() : undefined }
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
      return normalizeBadges({ ...state, sessions: [], tasks: state.tasks.map(task => ({ ...task, actualPomodoros: 0 })) });
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
  useLayoutEffect(() => {
    try {
    localStorage.setItem("studytrack.workspace.v1", JSON.stringify(state));
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(state.sessions));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.journalEntries, JSON.stringify(state.journalEntries));
    localStorage.setItem(STORAGE_KEYS.badges, JSON.stringify(state.badges));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(state.events));
    localStorage.setItem("studytrack.initialized", "true");
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

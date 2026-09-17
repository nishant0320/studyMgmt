import type { AppState } from "../types";
import { defaultSettings } from "../store/demoData";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const date = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const timestamp = (value: unknown) => text(value) && !Number.isNaN(Date.parse(value));
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
const choice = (value: unknown, values: string[]) => text(value) && values.includes(value);
const list = (value: unknown, check: (item: RecordValue) => boolean) => Array.isArray(value) && value.every(item => record(item) && check(item));
const uniqueIds = (value: unknown) => Array.isArray(value) && value.every(item => record(item) && text(item.id) && item.id.length > 0) && new Set(value.map(item => item.id)).size === value.length;

/** Reject malformed records before they can replace a working workspace. */
export function isValidBackup(value: unknown): value is AppState {
  if (!record(value) || !record(value.settings)) return false;
  if (value.customCategories !== undefined && (!Array.isArray(value.customCategories) || !value.customCategories.every(text))) return false;
  const settings = value.settings;
  for (const [key, fallback] of Object.entries(defaultSettings)) {
    if (settings[key] !== undefined && (typeof settings[key] !== typeof fallback || (typeof fallback === "number" && !number(settings[key])))) return false;
  }
  const limits: Record<string, [number, number]> = {
    focusDuration: [1, 180], shortBreakDuration: [1, 180], longBreakDuration: [1, 180], sessionsBeforeLongBreak: [1, 12],
    dailyGoalMinutes: [1, 1440], weeklyGoalMinutes: [1, 10080], adversarialWakeHour: [0, 23], adversarialSleepHour: [1, 24], adversarialProductivityRatio: [1, 100], adversarialDailyPlanMinutes: [1, 1440],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (settings[key] !== undefined && (!number(settings[key]) || settings[key] < min || settings[key] > max)) return false;
  }
  if (settings.focusSoundType !== undefined && !choice(settings.focusSoundType, ["silence", "rain", "lofi", "whitenoise", "forest"])) return false;
  if (settings.pomodoroPreset !== undefined && !choice(settings.pomodoroPreset, ["classic", "52-17", "90-20", "custom"])) return false;
  if (settings.accentColor !== undefined && (!text(settings.accentColor) || !/^(#[\da-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(settings.accentColor))) return false;
  return uniqueIds(value.tasks) && list(value.tasks, t =>
    optional(t.pomodoroMinutes, value => number(value) && Number.isInteger(value) && value >= 1 && value <= 180) && optional(t.completedByPomodoros, value => typeof value === "boolean") && optional(t.plannedDate, date) && optional(t.planOrder, number) && text(t.title) && text(t.description) && text(t.category) && choice(t.status, ["todo", "in-progress", "done"]) && choice(t.priority, ["low", "medium", "high"]) &&
    (t.dueDate === "" || date(t.dueDate)) && timestamp(t.createdAt) && optional(t.completedAt, timestamp) && number(t.estimatedPomodoros) && t.estimatedPomodoros >= 1 && number(t.actualPomodoros) &&
    uniqueIds(t.subtasks) && list(t.subtasks, sub => text(sub.title) && typeof sub.done === "boolean")) &&
    uniqueIds(value.sessions) && list(value.sessions, s =>
      optional(s.source, source => choice(source, ["timer", "manual"])) && timestamp(s.startTime) && timestamp(s.endTime) && Date.parse(s.endTime as string) >= Date.parse(s.startTime as string) && number(s.plannedDuration) && s.plannedDuration > 0 && number(s.actualDuration) &&
      choice(s.type, ["focus", "break", "longBreak"]) && typeof s.completed === "boolean" && typeof s.interrupted === "boolean" && text(s.category) && optional(s.taskId, text) && optional(s.notes, text)) &&
    list(value.journalEntries, j => date(j.date) && [j.summary, j.whatWentWell, j.whatDidnt, j.tomorrowPlan].every(text) &&
      number(j.moodRating) && j.moodRating >= 1 && j.moodRating <= 5 && number(j.focusRating) && j.focusRating >= 1 && j.focusRating <= 5 &&
      optional(j.goals, goals => uniqueIds(goals) && list(goals, g => text(g.text) && typeof g.completed === "boolean"))) &&
    uniqueIds(value.events) && list(value.events, e => text(e.title) && date(e.date) && text(e.category) && text(e.color) && optional(e.notes, text) &&
      optional(e.startTime, t => text(t) && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) && optional(e.endTime, t => text(t) && /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) &&
    list(value.badges, b => text(b.id) && (b.dateEarned === null || timestamp(b.dateEarned)));
}

import { taskPomodoroMinutes } from "./pomodoro";
import type { Task, StudySession } from '../types';

export function plannedTasks(tasks: Task[], date: string) {
  return tasks.filter(task => task.plannedDate === date).sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0) || a.createdAt.localeCompare(b.createdAt));
}
export function remainingMinutes(tasks: Task[], blockMinutes: number) {
  return tasks.filter(task => task.status !== 'done').reduce((total, task) => total + Math.max(0, task.estimatedPomodoros - task.actualPomodoros) * taskPomodoroMinutes(task, blockMinutes), 0);
}
export function shiftDate(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
}

export function validateManualSession(start: string, duration: number, sessions: StudySession[], now = Date.now()): string | null {
  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return 'Choose a valid study date and start time.';
  if (!Number.isInteger(duration) || duration < 1 || duration > 720) return 'Enter a whole number of minutes between 1 and 720.';
  const endMs = startMs + duration * 60000;
  if (endMs > now) return 'This block ends in the future. Log it after you finish studying.';
  if (sessions.some(session => session.actualDuration > 0 && startMs < Date.parse(session.endTime) && endMs > Date.parse(session.startTime))) return 'This time overlaps an existing session. Choose the time you actually studied.';
  return null;
}

export type TaskDateScope = 'day' | 'all' | 'unscheduled';
export function isPlanDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
}
export function tasksForDate(tasks: Task[], date: string, scope: TaskDateScope) {
  return tasks.filter(task => scope === 'all' || (scope === 'unscheduled' ? !task.plannedDate : task.plannedDate === date));
}

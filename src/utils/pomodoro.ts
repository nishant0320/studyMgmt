import type { Settings, Task, SessionType } from '../types';

/** Legacy tasks follow the workspace default until a duration is saved on the task. */
export function taskPomodoroMinutes(task: Task, fallback: number): number {
  return task.pomodoroMinutes ?? fallback;
}
export function sessionMinutes(type: SessionType, mode: string, custom: number, settings: Settings, task?: Task): number {
  if (type === 'break') return settings.shortBreakDuration;
  if (type === 'longBreak') return settings.longBreakDuration;
  if (task) return taskPomodoroMinutes(task, settings.focusDuration);
  if (mode === 'sprint') return 15;
  if (mode === 'deepFocus') return 50;
  if (mode === 'custom') return custom;
  return settings.focusDuration;
}

/** Credit only completed focus blocks; keep manual completion separate from automatic completion. */
export function creditPomodoro(task: Task, completedAt: string): Task {
  const actualPomodoros = task.actualPomodoros + 1;
  if (task.status !== 'done' && actualPomodoros >= task.estimatedPomodoros) {
    return { ...task, actualPomodoros, status: 'done', completedAt, completedByPomodoros: true };
  }
  return { ...task, actualPomodoros };
}
export function removePomodoroCredit(task: Task, actualPomodoros = Math.max(0, task.actualPomodoros - 1)): Task {
  if (task.completedByPomodoros && actualPomodoros < task.estimatedPomodoros) {
    return { ...task, actualPomodoros, status: actualPomodoros ? 'in-progress' : 'todo', completedAt: undefined, completedByPomodoros: undefined };
  }
  return { ...task, actualPomodoros };
}

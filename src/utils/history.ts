import type { StudySession, Task } from '../types';
import { dateKey } from './stats';
import { isPlanDate, shiftDate } from './planning';

export type HistoryFilters = {
  query: string;
  type: 'all' | StudySession['type'];
  range: 'all' | 'today' | '7' | '30' | '90' | 'custom';
  from: string;
  to: string;
  category: string;
  outcome: 'all' | 'completed' | 'unfinished';
  source: 'all' | 'timer' | 'manual';
  notesOnly: boolean;
  sort: 'newest' | 'oldest';
};
export const defaultHistoryFilters: HistoryFilters = {
  query: '', type: 'all', range: '30', from: '', to: '', category: 'all',
  outcome: 'all', source: 'all', notesOnly: false, sort: 'newest',
};
export const sessionTypeLabels = { focus: 'Focus', break: 'Short break', longBreak: 'Long break' };

export function historyDateError(filters: HistoryFilters) {
  if (filters.range !== 'custom') return '';
  if (!isPlanDate(filters.from) || !isPlanDate(filters.to)) return 'Choose a start and end date.';
  return filters.from > filters.to ? 'Start date must be on or before the end date.' : '';
}

export function filterHistory(sessions: StudySession[], tasks: Map<string, Task>, filters: HistoryFilters, today = dateKey(new Date())) {
  if (historyDateError(filters)) return [];
  const from = filters.range === 'all' ? '' : filters.range === 'custom' ? filters.from : shiftDate(today, filters.range === 'today' ? 0 : 1 - Number(filters.range));
  const to = filters.range === 'custom' ? filters.to : filters.range === 'all' ? '' : today;
  const query = filters.query.trim().toLowerCase();
  return sessions.filter(session => {
    const day = dateKey(session.startTime);
    const completed = session.completed && !session.interrupted;
    const task = tasks.get(session.taskId ?? '');
    const searchable = `${session.category} ${sessionTypeLabels[session.type]} ${task?.title ?? ''} ${session.notes ?? ''}`.toLowerCase();
    return (!from || day >= from) && (!to || day <= to)
      && searchable.includes(query)
      && (filters.type === 'all' || session.type === filters.type)
      && (filters.category === 'all' || session.category === filters.category)
      && (filters.outcome === 'all' || (filters.outcome === 'completed' ? completed : !completed))
      && (filters.source === 'all' || (session.source ?? 'timer') === filters.source)
      && (!filters.notesOnly || !!session.notes?.trim());
  }).sort((a, b) => (Date.parse(a.startTime) - Date.parse(b.startTime)) * (filters.sort === 'oldest' ? 1 : -1));
}

export function groupHistoryDays(sessions: StudySession[]) {
  const days: Record<string, { sessions: StudySession[]; focusMinutes: number }> = {};
  for (const session of sessions) {
    const day = dateKey(session.startTime);
    const group = days[day] ??= { sessions: [], focusMinutes: 0 };
    group.sessions.push(session);
    if (session.type === 'focus') group.focusMinutes += session.actualDuration;
  }
  return days;
}

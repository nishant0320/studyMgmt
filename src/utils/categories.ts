import type { AppState } from '../types';

export const defaultCategories = ['General', 'DSA Algorithm', 'System Design', 'General Practice', 'Project Work', 'Revision', 'Mock Interview'];
export const categoryKey = (category: string) => category.trim().toLowerCase();

/** A shared catalog, preserving an editor's current spelling without rewriting records. */
export function availableCategories(state: Pick<AppState, 'customCategories' | 'tasks' | 'events' | 'sessions'>, selected = '') {
  const names = new Map<string, string>();
  for (const value of [selected, ...defaultCategories, ...(state.customCategories ?? []), ...state.tasks.map(task => task.category), ...state.events.map(event => event.category), ...state.sessions.map(session => session.category)]) {
    const name = value.trim();
    if (name && !names.has(categoryKey(name))) names.set(categoryKey(name), name);
  }
  return [...names.values()].sort((a, b) => categoryKey(a) === categoryKey(b) ? 0 : categoryKey(a) === 'general' ? -1 : categoryKey(b) === 'general' ? 1 : a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Settings shows the same catalog as pickers, with provenance and record counts. */
export function categoryCatalog(state: Pick<AppState, 'customCategories' | 'tasks' | 'events' | 'sessions'>) {
  const catalog = new Map(availableCategories(state).map(name => [categoryKey(name), {
    name, builtIn: defaultCategories.some(category => categoryKey(category) === categoryKey(name)),
    custom: (state.customCategories ?? []).some(category => categoryKey(category) === categoryKey(name)),
    tasks: 0, events: 0, sessions: 0,
  }]));
  for (const source of ['tasks', 'events', 'sessions'] as const) {
    for (const record of state[source]) { const category = catalog.get(categoryKey(record.category)); if (category) category[source]++; }
  }
  return [...catalog.values()];
}

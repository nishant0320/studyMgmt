import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const load = async file => {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: 'esm', platform: 'node' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};
const { defaultHistoryFilters, filterHistory, groupHistoryDays, historyDateError } = await load('src/utils/history.ts');
const { exportCsv } = await load('src/utils/stats.ts');
const session = (id, startTime, extra = {}) => ({ id, startTime, endTime: startTime, type: 'focus', category: 'Physics', completed: true, interrupted: false, plannedDuration: 25, actualDuration: 25, ...extra });
const today = '2026-09-17';
const filter = (sessions, patch = {}, tasks = new Map()) => filterHistory(sessions, tasks, { ...defaultHistoryFilters, ...patch }, today);

test('history presets include whole local days, exclude tomorrow, and custom ranges include both dates', () => {
  const sessions = [
    session('outside', '2026-09-10T18:29:59Z'), // Sep 10, 23:59:59 IST
    session('first', '2026-09-10T18:30:00Z'), // Sep 11, 00:00 IST
    session('today', '2026-09-16T18:30:00Z'),
    session('last', '2026-09-17T18:29:59Z'),
    session('tomorrow', '2026-09-17T18:30:00Z'),
  ];
  assert.deepEqual(filter(sessions, { range: '7' }).map(s => s.id), ['last', 'today', 'first']);
  assert.deepEqual(filter(sessions, { range: 'today' }).map(s => s.id), ['last', 'today']);
  assert.deepEqual(filter(sessions, { range: 'custom', from: today, to: today }).map(s => s.id), ['last', 'today']);
  assert.equal(filter(sessions, { range: 'all' }).length, 5);
  assert.equal(filter(sessions, { range: 'custom', from: '2026-09-18', to: today }).length, 0);
  assert.match(historyDateError({ ...defaultHistoryFilters, range: 'custom', from: '2026-02-31', to: today }), /Choose/);
});
test('history combines subject, outcome, source, notes, and task search; legacy sessions count as timer records', () => {
  const sessions = [
    session('legacy', '2026-09-17T10:00:00Z', { taskId: 'task', notes: 'Review energy' }),
    session('manual', '2026-09-17T11:00:00Z', { source: 'manual', notes: 'Practice' }),
    session('unfinished', '2026-09-17T12:00:00Z', { completed: false, notes: '   ', category: 'Math' }),
    session('break', '2026-09-17T13:00:00Z', { type: 'longBreak' }),
  ];
  assert.deepEqual(filter(sessions, { source: 'timer', notesOnly: true }).map(s => s.id), ['legacy']);
  assert.deepEqual(filter(sessions, { source: 'manual', outcome: 'completed', category: 'Physics' }).map(s => s.id), ['manual']);
  assert.deepEqual(filter(sessions, { outcome: 'unfinished', category: 'Math' }).map(s => s.id), ['unfinished']);
  assert.deepEqual(filter(sessions, { query: '  ENERGY ' }).map(s => s.id), ['legacy']);
  assert.deepEqual(filter(sessions, { query: 'Mechanics' }, new Map([['task', { title: 'Mechanics revision' }]])).map(s => s.id), ['legacy']);
  assert.deepEqual(filter(sessions, { query: 'long break' }).map(s => s.id), ['break']);
  assert.equal(filter(sessions, { source: 'manual', type: 'longBreak' }).length, 0);
});
test('history sorts timestamps by instant across offsets, does not mutate data, and keeps complete day totals', () => {
  const sessions = [session('later', '2026-09-17T10:00:00Z'), session('earlier', '2026-09-17T12:00:00+05:30')];
  assert.deepEqual(filter(sessions, { sort: 'oldest' }).map(s => s.id), ['earlier', 'later']);
  assert.deepEqual(sessions.map(s => s.id), ['later', 'earlier']);
  const many = Array.from({ length: 25 }, (_, i) => session(String(i), '2026-09-17T10:00:00Z'));
  const groups = groupHistoryDays([...many, session('break', '2026-09-17T11:00:00Z', { type: 'break', actualDuration: 5 })]);
  assert.equal(groups[today].sessions.length, 26);
  assert.equal(groups[today].focusMinutes, 625);
  assert.equal(groupHistoryDays(many.slice(0, 18))[today].sessions.length, 18);
});
test('session exports include linked task names and preserve CSV quoting', () => {
  const csv = exportCsv([session('id', '2026-09-17T10:00:00Z', { taskId: 't', notes: 'Read, then "review"' })], [{ id: 't', title: 'Physics, chapter "2"' }]);
  assert.match(csv, /source,notes,task\n/);
  assert.match(csv, /"Read, then ""review""","Physics, chapter ""2"""/);
});

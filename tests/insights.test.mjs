import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const load = async path => { const r = await build({ entryPoints:[path], bundle:true, write:false, format:'esm', platform:'node' }); return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`); };
const { buildDashboard } = await load('src/utils/analytics.ts');
const { bestHour, hourDistribution, categoryDistribution } = await load('src/utils/stats.ts');
const { buildAdversarialDashboard } = await load('src/utils/coach.ts');
const { makeEmptyState } = await load('src/store/demoData.ts');
const now = new Date('2026-09-17T12:00:00Z');
const session = (id, startTime, actualDuration = 60, extra = {}) => ({id,startTime,endTime:startTime,type:'focus',category:'Physics',actualDuration,plannedDuration:actualDuration,completed:true,interrupted:false,...extra});

test('analytics uses inclusive local periods, excludes future and breaks, and compares the previous equal period', () => {
 const data = buildDashboard([
  session('previous','2026-09-10T18:29:59Z',30),
  session('first','2026-09-10T18:30:00Z',60),
  session('today','2026-09-17T08:00:00Z',60),
  session('future','2026-09-17T13:00:00Z',900),
  session('break','2026-09-17T09:00:00Z',400,{type:'break'}),
 ], '7d', 60, now);
 assert.equal(data.totalMinutes,120); assert.equal(data.previousMinutes,30); assert.equal(data.delta,300);
 assert.equal(data.goalHits,2); assert.equal(data.goalHitRate,29); assert.equal(data.activeDays,2);
 assert.equal(data.totalSessions,2); assert.equal(data.trendData.length,7);
 assert.equal(data.trendData.reduce((n,d)=>n+d.minutes,0),data.totalMinutes);
});
test('analytics shows every recorded subject with no default categories or minimum sample gate', () => {
 const sessions = Array.from({length:14},(_,i)=>session(String(i),'2026-09-17T08:00:00Z',i+1,{category:'Subject '+i}));
 const data = buildDashboard(sessions,'7d',60,now);
 assert.equal(data.categoryData.length,14); assert.equal(data.strongestCategory.subject,'Subject 13');
 assert.equal(data.categoryData.reduce((n,c)=>n+c.minutes,0),data.totalMinutes);
 const one = buildDashboard([sessions[0]],'7d',60,now);
 assert.equal(one.categoryData.length,1); assert.equal(one.totalMinutes,1);
 const empty = buildDashboard([],'7d',60,now);
 assert.equal(empty.categoryData.length,0); assert.equal(empty.strongestHour,undefined); assert.equal(empty.goalHitRate,0);
});
test('start-hour and subject statistics exclude breaks and retain actual unfinished focus time', () => {
 const sessions = [session('focus','2026-09-17T08:00:00Z',20,{completed:false,interrupted:true}),session('break','2026-09-17T09:00:00Z',500,{type:'break',category:'Break'})];
 assert.deepEqual(hourDistribution(sessions),[{hour:'13:00',minutes:20}]);
 assert.equal(bestHour(sessions),'13:00'); assert.equal(bestHour([sessions[1]]),'No data');
 assert.deepEqual(categoryDistribution(sessions),[{name:'Physics',value:20}]);
});
test('coach weekly figures use the calendar week consistently, not the trailing seven days', () => {
 const state = makeEmptyState(); state.settings.weeklyGoalMinutes=600;
 state.sessions = [session('old-saturday','2026-09-12T08:00:00Z',300),session('sunday','2026-09-13T08:00:00Z',60),session('today','2026-09-17T08:00:00Z',60)];
 const data = buildAdversarialDashboard(state,now);
 assert.equal(data.thisWeekMinutes,120); assert.equal(data.weeklyPercent,20); assert.equal(data.weeklyProgress,20); assert.equal(data.timeDebt,480);
 assert.equal(data.weeklyData[3].actual,120); assert.equal(data.weeklyData[2].actual,300);
 assert(data.worstDays.every(day=>day.actual>0 && day.date<'2026-09-17'));
});

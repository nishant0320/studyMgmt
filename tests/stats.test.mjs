import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({entryPoints:['src/utils/stats.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const { dateKey, currentStreak, todayStats, weeklySeries } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const session = (date, minutes = 90) => ({id:date.toISOString(),startTime:date.toISOString(),endTime:date.toISOString(),type:'focus',actualDuration:minutes,plannedDuration:minutes,completed:true,interrupted:false,category:'Study'});
const state = sessions => ({sessions,settings:{dailyGoalMinutes:90},tasks:[],badges:[],journalEntries:[],events:[]});
test('date keys follow the local calendar across UTC midnight',()=>{
  assert.equal(dateKey(new Date(2026,8,8,0,15)), '2026-09-08');
  assert.equal(dateKey('2026-09-08'), '2026-09-08');
});
test('today counts a focus session immediately after local midnight',()=>{
  const now=new Date(); now.setHours(0,15,0,0);
  assert.equal(todayStats(state([session(now,25)])).minutesToday,25);
});
test('yesterday’s streak remains available while today is unfinished',()=>{
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  assert.equal(currentStreak(state([session(yesterday)])),1);
  assert.equal(currentStreak(state([session(yesterday),session(new Date())])),2);
  yesterday.setDate(yesterday.getDate()-1);
  assert.equal(currentStreak(state([session(yesterday)])),0);
});
test('weekly ranges exclude the next day at midnight',()=>{
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(0,0,0,0);
  assert.equal(weeklySeries(state([session(tomorrow)]),1)[0].minutes,0);
});

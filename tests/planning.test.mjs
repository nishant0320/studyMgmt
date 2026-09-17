import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const load=async file=>{const result=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node'});return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);};
const {reducer}=await load('src/store/AppStore.tsx');
const {makeEmptyState}=await load('src/store/demoData.ts');
const {isValidBackup}=await load('src/utils/backup.ts');
const {plannedTasks,remainingMinutes,shiftDate,validateManualSession,tasksForDate,isPlanDate}=await load('src/utils/planning.ts');
const {saveCheckpoint,readCheckpoints}=await load('src/utils/checkpoints.ts');
const task=(id,extra={})=>({id,title:id,description:'',status:'todo',priority:'medium',dueDate:'2026-10-01',createdAt:'2026-09-01T12:00:00Z',category:'Math',estimatedPomodoros:3,actualPomodoros:1,subtasks:[],...extra});
const base=()=>({...makeEmptyState(),tasks:[task('a'),task('b'),task('c')]});
test('scheduling and carry-forward retain deadlines, progress and stable queue order',()=>{
 let state=reducer(base(),{type:'schedule-tasks',ids:['b','a'],date:'2026-09-17'});
 assert.deepEqual(plannedTasks(state.tasks,'2026-09-17').map(t=>t.id),['b','a']);
 state=reducer(state,{type:'reorder-plan',date:'2026-09-17',ids:['a','b']});
 assert.deepEqual(plannedTasks(state.tasks,'2026-09-17').map(t=>t.id),['a','b']);
 state=reducer(state,{type:'schedule-tasks',ids:['a'],date:'2026-09-18'});
 assert.equal(state.tasks[0].dueDate,'2026-10-01');assert.equal(state.tasks[0].actualPomodoros,1);
 state=reducer(state,{type:'schedule-tasks',ids:['a']});assert.equal(state.tasks[0].plannedDate,undefined);
});
test('plan estimates ignore completed tasks and never become negative',()=>{
 assert.equal(remainingMinutes([task('a'),task('b',{status:'done'}),task('c',{actualPomodoros:5})],25),50);
 assert.equal(shiftDate('2026-12-31',1),'2027-01-01');assert.equal(shiftDate('2024-03-01',-1),'2024-02-29');
});
test('manual logs reject future time, invalid durations and overlap but allow adjacent sessions',()=>{
 const now=Date.parse('2026-09-17T14:00:00Z');
 const sessions=[{startTime:'2026-09-17T10:00:00Z',endTime:'2026-09-17T10:30:00Z',actualDuration:30}];
 assert.match(validateManualSession('2026-09-17T13:50:00Z',25,sessions,now),/future/);
 assert.match(validateManualSession('2026-09-17T10:10:00Z',25,sessions,now),/overlaps/);
 assert.match(validateManualSession('2026-09-17T09:50:00Z',25,sessions,now),/overlaps/);
 assert.equal(validateManualSession('2026-09-17T10:30:00Z',25,sessions,now),null);
 for(const n of [0,-1,NaN,1.5,721]) assert.match(validateManualSession('2026-09-17T09:00:00Z',n,sessions,now),/whole number/);
});
test('new plan fields and custom categories survive export, while old backups stay valid',()=>{
 const state={...base(),customCategories:['Biology'],tasks:[task('a',{plannedDate:'2026-09-17',planOrder:0})]};
 assert(isValidBackup(JSON.parse(JSON.stringify(state))));assert(isValidBackup(base()));
 assert.equal(isValidBackup({...state,customCategories:[42]}),false);
 assert.equal(isValidBackup({...state,tasks:[task('a',{plannedDate:'2026-02-31'})]}),false);
 assert.deepEqual(reducer(state,{type:'update-categories',categories:[' Biology ','Biology','','Chemistry']}).customCategories,['Biology','Chemistry']);
});
test('recovery retains three independent snapshots and reports storage failure',()=>{
 const data=new Map();const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 for(let i=0;i<4;i++) saveCheckpoint({...base(),customCategories:[String(i)]},'Point '+i,storage);
 const points=readCheckpoints(storage);assert.equal(points.length,3);assert.equal(points[0].reason,'Point 3');assert.equal(points[2].reason,'Point 1');
 const restored=reducer(base(),{type:'import-data',state:points[2].state});assert.deepEqual(restored.customCategories,['1']);
 assert.throws(()=>saveCheckpoint(base(),'Full',{getItem:()=>null,setItem:()=>{throw new Error('quota');}}),/quota/);
});

test('day-wise task views use plan dates, include completed tasks, and keep unscheduled work separate',()=>{
 const tasks=[task('today',{plannedDate:'2026-09-17',dueDate:'2026-10-01'}),task('done',{plannedDate:'2026-09-17',status:'done'}),task('tomorrow',{plannedDate:'2026-09-18',dueDate:'2026-09-17'}),task('unplanned')];
 assert.deepEqual(tasksForDate(tasks,'2026-09-17','day').map(t=>t.id),['today','done']);
 assert.deepEqual(tasksForDate(tasks,'2026-09-18','day').map(t=>t.id),['tomorrow']);
 assert.deepEqual(tasksForDate(tasks,'2026-09-17','unscheduled').map(t=>t.id),['unplanned']);
 assert.equal(tasksForDate(tasks,'2026-09-17','all').length,4);
 assert.equal(isPlanDate('2026-02-31'),false);assert.equal(isPlanDate('bad'),false);assert.equal(isPlanDate('2024-02-29'),true);
});

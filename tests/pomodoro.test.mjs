import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const load=async file=>{const result=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node'});return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);};
const {reducer}=await load('src/store/AppStore.tsx');
const {makeEmptyState}=await load('src/store/demoData.ts');
const {isValidBackup}=await load('src/utils/backup.ts');
const {taskPomodoroMinutes,sessionMinutes}=await load('src/utils/pomodoro.ts');
const {remainingMinutes}=await load('src/utils/planning.ts');
const {buildStudyHeatmap,heatLevel}=await load('src/utils/heatmap.ts');
const task={id:'task',title:'Read',description:'',status:'todo',priority:'medium',dueDate:'',createdAt:'2026-09-01T12:00:00Z',category:'Math',estimatedPomodoros:2,actualPomodoros:0,pomodoroMinutes:40,subtasks:[]};
const block={id:'one',taskId:'task',startTime:'2026-09-17T10:00:00Z',endTime:'2026-09-17T10:40:00Z',type:'focus',completed:true,interrupted:false,plannedDuration:40,actualDuration:40,category:'Math'};
test('task durations override focus modes but never the configured break duration',()=>{
 const settings=makeEmptyState().settings;
 assert.equal(sessionMinutes('focus','sprint',12,settings,task),40);
 assert.equal(sessionMinutes('focus','custom',12,settings,task),40);
 assert.equal(sessionMinutes('break','focus',12,settings,task),settings.shortBreakDuration);
 assert.equal(sessionMinutes('longBreak','focus',12,settings,task),settings.longBreakDuration);
 assert.equal(sessionMinutes('focus','custom',12,settings),12);
 assert.equal(taskPomodoroMinutes({...task,pomodoroMinutes:undefined},25),25);
 assert.equal(remainingMinutes([task,{...task,id:'other',pomodoroMinutes:15,actualPomodoros:1}],25),95);
});
test('only full focus completions advance a task, and its final block completes it once',()=>{
 let state={...makeEmptyState(),tasks:[task]};
 state=reducer(state,{type:'add-session',session:{...block,id:'skip',completed:false,interrupted:true}});
 state=reducer(state,{type:'add-session',session:{...block,id:'break',type:'break'}});
 assert.equal(state.tasks[0].actualPomodoros,0);assert.equal(state.tasks[0].status,'todo');
 state=reducer(state,{type:'add-session',session:block});assert.equal(state.tasks[0].actualPomodoros,1);assert.equal(state.tasks[0].status,'todo');
 state=reducer(state,{type:'add-session',session:{...block,id:'two'}});assert.equal(state.tasks[0].status,'done');assert.equal(state.tasks[0].actualPomodoros,2);assert.equal(state.tasks[0].completedAt,block.endTime);
 state=reducer(state,{type:'add-session',session:{...block,id:'two'}});assert.equal(state.tasks[0].actualPomodoros,2);
 state=reducer(state,{type:'delete-session',id:'two'});assert.equal(state.tasks[0].status,'in-progress');assert.equal(state.tasks[0].completedAt,undefined);
});
test('clearing sessions reverses automatic completion while preserving manual completion',()=>{
 let state={...makeEmptyState(),tasks:[task,{...task,id:'manual',status:'done'}]};
 state=reducer(state,{type:'add-session',session:block});state=reducer(state,{type:'add-session',session:{...block,id:'two'}});
 state=reducer(state,{type:'clear-sessions'});assert.equal(state.tasks[0].status,'todo');assert.equal(state.tasks[1].status,'done');
});
test('task durations survive backups and invalid durations are rejected',()=>{
 const base={...makeEmptyState(),tasks:[task]};assert(isValidBackup(JSON.parse(JSON.stringify(base))));
 for(const value of [0,-1,181,1.5,'40',null]) assert.equal(isValidBackup({...base,tasks:[{...task,pomodoroMinutes:value}]}),false);
 assert(isValidBackup({...base,tasks:[{...task,pomodoroMinutes:undefined}]}));
});
test('heatmap covers exactly 365 local dates through today and uses a consistent goal scale',()=>{
 for(const now of [new Date('2026-09-17T12:00:00'),new Date('2024-02-29T12:00:00')]) {
  const heat=buildStudyHeatmap([block,{...block,id:'break',type:'break'}],now);
  assert.equal(heat.cells.filter(cell=>cell.inRange).length,365);
  assert.equal(heat.cells.at(-1).date,heat.today);
  assert.equal(new Set(heat.months.map(month=>month.key)).size,heat.months.length);
 }
 const heat=buildStudyHeatmap([block,{...block,id:'break',type:'break'}],new Date('2026-09-17T20:00:00'));
 assert.equal(heat.cells.at(-1).minutes,40);assert.equal(heat.cells.at(-1).blocks,1);
 assert.deepEqual([0,1,25,26,50,51,75,76,100,150].map(minutes=>heatLevel(minutes,100)),[0,1,1,2,2,3,3,4,4,4]);
});

test('saving an older task draft cannot undo live Pomodoro credit or automatic completion',()=>{
 let state={...makeEmptyState(),tasks:[task]};
 state=reducer(state,{type:'add-session',session:block});state=reducer(state,{type:'add-session',session:{...block,id:'two'}});
 state=reducer(state,{type:'update-task',task:{...task,title:'Updated title'}});
 assert.equal(state.tasks[0].actualPomodoros,2);assert.equal(state.tasks[0].status,'done');assert.equal(state.tasks[0].title,'Updated title');
});

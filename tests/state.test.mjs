import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const load = async file => {
 const result = await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node'});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};
const { reducer } = await load('src/store/AppStore.tsx');
const { makeInitialState } = await load('src/store/demoData.ts');
const { isValidBackup } = await load('src/utils/backup.ts');
const base = () => ({...makeInitialState(),tasks:[],sessions:[],journalEntries:[],events:[]});
const task = {id:'task',title:'Read chapter',description:'',status:'todo',priority:'medium',dueDate:'',createdAt:new Date().toISOString(),estimatedPomodoros:2,actualPomodoros:0,category:'Reading',subtasks:[]};
const session = {id:'session',taskId:'task',startTime:new Date().toISOString(),endTime:new Date().toISOString(),type:'focus',completed:true,interrupted:false,plannedDuration:25,actualDuration:25,category:'Reading'};
test('only completed, uninterrupted focus sessions credit a task',()=>{
 let state=reducer(base(),{type:'add-task',task});
 state=reducer(state,{type:'add-session',session:{...session,completed:false,interrupted:true}});
 assert.equal(state.tasks[0].actualPomodoros,0);
 state=reducer(state,{type:'add-session',session:{...session,id:'complete'}});
 assert.equal(state.tasks[0].actualPomodoros,1);
 state=reducer(state,{type:'delete-session',id:'complete'});
 assert.equal(state.tasks[0].actualPomodoros,0);
});
test('duplicate sessions are ignored and completed task dates track status',()=>{
 let state=reducer(base(),{type:'add-task',task});
 state=reducer(state,{type:'add-session',session});state=reducer(state,{type:'add-session',session});
 assert.equal(state.sessions.length,1);assert.equal(state.tasks[0].actualPomodoros,1);
 state=reducer(state,{type:'update-task',task:{...state.tasks[0],status:'done'}});assert(state.tasks[0].completedAt);
 state=reducer(state,{type:'move-task',id:'task',status:'todo'});assert.equal(state.tasks[0].completedAt,undefined);
});
test('a valid workspace round-trips through backup validation',()=>{
 assert(isValidBackup(JSON.parse(JSON.stringify(makeInitialState()))));
 assert(isValidBackup(base()));
});
test('malformed imports are rejected before replacing workspace data',()=>{
 for(const bad of [{...base(),tasks:[{}]},{...base(),sessions:[{}]},{...base(),settings:{focusDuration:0}},{...base(),events:[{id:'event',title:'Meeting',date:'2026-02-31',category:'Study',color:'#fff'}]},{...base(),tasks:[task,task]}]) assert.equal(isValidBackup(bad),false);
});

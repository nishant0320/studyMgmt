import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
const base=process.env.TRACKME_URL || process.env.STUDYTRACK_URL || 'http://127.0.0.1:4173';
const output=process.env.STUDYTRACK_SCREENSHOTS || '/tmp/studytrack-final';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Kolkata',reducedMotion:'reduce'});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{errors.push('Native dialog: '+dialog.message());dialog.dismiss();});
const go=async route=>{await page.goto(base+'/'+route);await page.locator('.route-frame').waitFor();};
const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.workspace.v1')));
const approve=()=>page.getByRole('alertdialog').locator('.confirm-submit').click();
const choose=async(name,option)=>{await page.getByRole('combobox',{name,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();};
const check=async(name,run)=>{await run();console.log('PASS',name);};
try {
 await go('plan');
 const dates=await page.evaluate(()=>{const format=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const today=new Date(),yesterday=new Date(),tomorrow=new Date();yesterday.setDate(today.getDate()-1);tomorrow.setDate(today.getDate()+1);return {today:format(today),yesterday:format(yesterday),tomorrow:format(tomorrow)};});
 await page.evaluate(dates=>{
  const state=JSON.parse(localStorage.getItem('studytrack.workspace.v1'));
  state.tasks=Array.from({length:14},(_,i)=>({id:'task-'+(i+1),title:'Study chapter '+(i+1),description:'Read, recall, and solve practice questions.',status:'todo',priority:i%2?'medium':'high',dueDate:dates.tomorrow,createdAt:new Date().toISOString(),category:i%2?'Chemistry':'Mathematics',estimatedPomodoros:2,actualPomodoros:0,subtasks:[]}));
  state.settings={...state.settings,soundEnabled:false,notificationsEnabled:false};
  state.events=[{id:'event',title:'Review practice answers',date:dates.today,category:'Revision',color:'#a7c993',startTime:'17:00',endTime:'18:00'}];
  localStorage.setItem('studytrack.workspace.v1',JSON.stringify(state));
 },dates);await go('plan');
 await check('daily queue supports adding, ordering, completion, carry-forward, and unchanged deadlines',async()=>{
  await page.getByRole('button',{name:'Add to plan',exact:true}).click();
  await page.getByRole('button',{name:'Add Study chapter 1 to plan',exact:true}).click();
  await page.getByRole('button',{name:'Add Study chapter 2 to plan',exact:true}).click();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'Move Study chapter 2 up',exact:true}).click();
  assert.match(await page.locator('.plan-task').first().innerText(),/Study chapter 2/);
  await page.screenshot({path:output+'/plan-desktop.png'});
  await page.getByRole('button',{name:'Complete Study chapter 2',exact:true}).click();
  await page.getByRole('button',{name:'Move unfinished tasks to the next day',exact:true}).click();
  assert.equal((await data()).tasks.find(t=>t.id==='task-1').plannedDate,dates.tomorrow);
  assert.equal((await data()).tasks.find(t=>t.id==='task-1').dueDate,dates.tomorrow);
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  assert.equal(await page.locator('.plan-task').count(),1);
  await page.reload();await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  assert.equal(await page.locator('.plan-task').count(),1);
  await page.getByRole('button',{name:'Next plan day',exact:true}).click();
  await page.getByRole('button',{name:'Bring 1 forward',exact:true}).click();
  assert.notEqual((await data()).tasks.find(t=>t.id==='task-1').plannedDate,dates.tomorrow);
  assert.equal((await data()).tasks.find(t=>t.id==='task-1').dueDate,dates.tomorrow);
 });
 await check('task list preference, deadline filters and deep links work',async()=>{
  await go('tasks?scope=all');await page.getByRole('button',{name:'List',exact:true}).click();
  assert.equal(await page.locator('.compact-task-row').count(),14);
  await page.reload();await page.locator('.task-list-view').waitFor();
  await choose('Deadline filter','No deadline');assert.equal(await page.locator('.compact-task-row').count(),0);
  await choose('Deadline filter','Any deadline');
  await page.screenshot({path:output+'/task-list-desktop.png'});
  await go('tasks?task=task-1');await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByLabel('Task title',{exact:true}).inputValue(),'Study chapter 1');
  assert((await page.getByLabel('Study plan date',{exact:false}).inputValue()).length>0);
  await page.keyboard.press('Escape');
 });
 await check('command search finds tasks beyond the first ten',async()=>{
  await page.getByRole('button',{name:'Open command palette',exact:true}).click();
  await page.getByRole('textbox',{name:'Search commands',exact:true}).fill('Study chapter 14');
  await page.keyboard.press('Enter');await page.waitForURL('**/timer');await page.locator('.task-attach-trigger').filter({hasText:'Study chapter 14'}).waitFor();
 });
 await check('manual study logs link tasks and reject overlaps and future blocks',async()=>{
  await go('history');await page.getByRole('button',{name:'Log study',exact:true}).click();
  await page.getByLabel('Study date',{exact:true}).fill(dates.yesterday);await page.getByLabel('Start time',{exact:true}).fill('10:00');await page.getByLabel('Minutes studied',{exact:true}).fill('30');
  await choose('Link a task','Study chapter 1');await page.getByLabel('Study notes',{exact:true}).fill('Worked through practice problems without the timer.');
  await page.screenshot({path:output+'/manual-session.png'});
  await page.getByRole('button',{name:'Save study block',exact:true}).click();
  assert.equal((await data()).sessions[0].source,'manual');assert.equal((await data()).tasks[0].actualPomodoros,1);
  await page.getByRole('button',{name:'Log study',exact:true}).click();await page.getByLabel('Study date',{exact:true}).fill(dates.yesterday);await page.getByLabel('Start time',{exact:true}).fill('10:10');
  await page.getByRole('button',{name:'Save study block',exact:true}).click();assert.match(await page.getByRole('alert').innerText(),/overlaps/);
  await page.getByLabel('Study date',{exact:true}).fill(dates.today);await page.getByLabel('Start time',{exact:true}).fill('23:59');
  await page.getByRole('button',{name:'Save study block',exact:true}).click();assert.match(await page.getByRole('alert').innerText(),/future/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await data()).sessions.length,1);
 });
 await check('focus mode preserves notes, avoids per-tick writes, and attaches notes once on completion',async()=>{
  await go('timer');await page.getByRole('button',{name:'Focus mode',exact:true}).click();
  await page.getByLabel('Park a thought',{exact:false}).fill('Revisit the proof after this block.');
  await page.screenshot({path:output+'/focus-room-desktop.png'});
  await page.evaluate(()=>{window.timerWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='studytrack.activeTimer.v1')window.timerWrites++;return original.call(this,k,v);};});
  await page.getByRole('button',{name:'Begin focus',exact:true}).click();await page.waitForTimeout(2200);
  assert((await page.evaluate(()=>window.timerWrites))<=2,'timer does not persist every tick');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.focus-room').count(),0);
  await page.reload();await page.getByRole('button',{name:'Pause timer',exact:true}).waitFor();await page.getByRole('button',{name:'Focus mode',exact:true}).click();
  assert.equal(await page.getByLabel('Park a thought',{exact:false}).inputValue(),'Revisit the proof after this block.');
  await page.getByRole('button',{name:'Pause focus',exact:true}).click();await page.keyboard.press('Escape');
  await page.evaluate(()=>{const timer=JSON.parse(localStorage.getItem('studytrack.activeTimer.v1'));localStorage.setItem('studytrack.activeTimer.v1',JSON.stringify({...timer,running:true,plannedMinutes:1,remaining:1,startedAt:new Date(Date.now()-61000).toISOString(),endsAt:new Date(Date.now()-1000).toISOString()}));});
  await page.reload();await page.waitForTimeout(600);
  assert.equal((await data()).sessions.length,2);assert.equal((await data()).sessions[0].notes,'Revisit the proof after this block.');
  await page.reload();await page.waitForTimeout(300);assert.equal((await data()).sessions.length,2);
 });
 await check('custom categories export, checkpoints restore data, and cancelled restores are safe',async()=>{
  await go('settings');await page.getByLabel('New category',{exact:true}).fill('Botany');await page.getByRole('button',{name:'Add category',exact:true}).click();
  assert.deepEqual((await data()).customCategories,['Botany']);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();const file=await (await download).path();assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).customCategories,['Botany']);
  await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
  await page.getByRole('button',{name:'Clear Tasks Only',exact:true}).click();await approve();assert.equal((await data()).tasks.length,0);
  const checkpoint=page.locator('.checkpoint-list article').filter({hasText:'Before clearing tasks'});
  await checkpoint.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await data()).tasks.length,0);
  await checkpoint.getByRole('button',{name:'Restore',exact:true}).click();await approve();assert.equal((await data()).tasks.length,14);
  await page.reload();assert.deepEqual((await data()).customCategories,['Botany']);
  await page.locator('.recovery-points').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/recovery-desktop.png'});
 });
 await check('failed recovery writes prevent destructive changes',async()=>{
  await go('settings');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='studytrack.checkpoints.v1')throw new DOMException('Storage full','QuotaExceededError');return original.call(this,key,value);};});
  const before=(await data()).tasks.length;
  await page.getByRole('button',{name:'Clear Tasks Only',exact:true}).click();await approve();
  assert.equal((await data()).tasks.length,before);
  await page.getByText('Could not save a recovery point.',{exact:false}).waitFor();
  await page.reload();
 });
 await check('new workflows remain usable on mobile',async()=>{
  await page.setViewportSize({width:390,height:1000});
  for(const route of ['plan','tasks','history','settings']){await go(route);assert.equal(await page.locator('.main-panel').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:`${output}/${route}-mobile.png`});}
  await go('plan');await page.getByRole('button',{name:'Next plan day',exact:true}).click();await page.getByRole('button',{name:'Next plan day',exact:true}).click();await page.screenshot({path:output+'/plan-populated-mobile.png'});
  await go('history');await page.getByRole('button',{name:'Log study',exact:true}).click();await page.screenshot({path:output+'/manual-mobile.png'});await page.keyboard.press('Escape');
  await go('timer');await page.getByRole('button',{name:'Focus mode',exact:true}).click();await page.screenshot({path:output+'/focus-mobile.png'});await page.keyboard.press('Escape');
 });
 assert.deepEqual(errors,[]);console.log('PASS no browser errors or native dialogs');
} catch(error){await page.screenshot({path:output+'/failure.png'});console.error(error);process.exitCode=1;} finally{await browser.close();}

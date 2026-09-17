import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
const base=process.env.TRACKME_URL || process.env.STUDYTRACK_URL || 'http://127.0.0.1:4174';
const out=process.env.STUDYTRACK_SCREENSHOTS || '/tmp/studytrack-pomodoro';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Kolkata',hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{errors.push('Native dialog: '+d.message());d.dismiss();});
const go=async route=>{await page.goto(base+'/'+route);await page.locator('.route-frame').waitFor();};
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.workspace.v1')));
const clock=async value=>{await page.waitForFunction(value=>document.querySelector('.timer-clock-display')?.textContent===value,value);};
const check=async(name,fn)=>{await fn();console.log('PASS',name);};
const expire=async()=>{
 await page.evaluate(()=>{const key='studytrack.activeTimer.v1',timer=JSON.parse(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify({...timer,running:true,remaining:1,startedAt:new Date(Date.now()-timer.plannedMinutes*60000-1000).toISOString(),endsAt:new Date(Date.now()-500).toISOString()}));});
 await page.reload();await page.waitForTimeout(600);
};
try {
 await go('tasks');
 await page.evaluate(()=>{const key='studytrack.workspace.v1',s=JSON.parse(localStorage.getItem(key));s.settings={...s.settings,autoStartNextSession:true,soundEnabled:false,notificationsEnabled:false};localStorage.setItem(key,JSON.stringify(s));});await go('tasks');
 await check('new and edited tasks save their Pomodoro count, duration, and total estimate',async()=>{
  for(const [name,count,duration] of [['Read biology',2,40],['Practice algebra',3,15]]) {
   await page.getByRole('button',{name:'New Task',exact:true}).click();await page.getByLabel('Task title',{exact:true}).fill(name);await page.getByLabel('Estimated Pomodoros',{exact:true}).fill(String(count));await page.getByLabel('Minutes per Pomodoro',{exact:true}).fill(String(duration));
   assert.match(await page.locator('.pomodoro-plan-summary').innerText(),new RegExp(`${count*duration} min`));
   await page.getByRole('button',{name:'Create task',exact:true}).click();
  }
  await page.getByRole('button',{name:'Practice algebra',exact:true}).click();await page.getByLabel('Minutes per Pomodoro',{exact:true}).fill('20');await page.getByRole('button',{name:'Save task',exact:true}).click();
  const tasks=(await state()).tasks;assert.equal(tasks.find(t=>t.title==='Read biology').pomodoroMinutes,40);assert.equal(tasks.find(t=>t.title==='Practice algebra').pomodoroMinutes,20);
  await page.reload();await page.getByRole('button',{name:'Read biology',exact:true}).click();await page.screenshot({path:out+'/task-duration-editor.png'});await page.getByRole('button',{name:'Focus on task',exact:true}).click();await page.waitForURL('**/timer');await clock('40:00');
 });
 await check('task picker sets the correct duration and task settings survive pause and reload',async()=>{
  await page.locator('.task-attach-trigger').click();await page.getByRole('button',{name:/Practice algebra.*3 × 20 min/}).click();await clock('20:00');
  await page.locator('.task-attach-trigger').click();await page.getByRole('button',{name:/Read biology.*2 × 40 min/}).click();await clock('40:00');
  await page.screenshot({path:out+'/task-timer-plan.png'});
  await page.getByRole('button',{name:'Start timer',exact:true}).click();await page.waitForTimeout(1100);await page.getByRole('button',{name:'Pause timer',exact:true}).click();
  const remaining=await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')).remaining);
  await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')).remaining),remaining);
  await page.getByRole('button',{name:'Reset timer',exact:true}).click();await clock('40:00');
 });
 await check('focus-break-focus cycle retains task duration and the final block completes and detaches the task',async()=>{
  await page.getByRole('button',{name:'Start timer',exact:true}).click();await expire();
  let task=(await state()).tasks.find(t=>t.title==='Read biology');assert.equal(task.actualPomodoros,1);assert.notEqual(task.status,'done');
  let timer=await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')));assert.equal(timer.type,'break');assert.equal(timer.plannedMinutes,5);assert.equal(timer.running,true);
  await expire();timer=await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')));assert.equal(timer.type,'focus');assert.equal(timer.plannedMinutes,40);assert.equal(timer.running,true);
  await expire();task=(await state()).tasks.find(t=>t.title==='Read biology');assert.equal(task.actualPomodoros,2);assert.equal(task.status,'done');assert(task.completedAt);
  timer=await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')));assert.equal(timer.selectedTask,'');assert.equal(timer.running,false);
  await page.reload();assert.equal((await state()).tasks.find(t=>t.title==='Read biology').actualPomodoros,2);
  await go('tasks');assert.match(await page.locator('.column-done').innerText(),/Read biology/);
 });
 await check('dashboard sections have real separation at desktop and mobile widths',async()=>{
  for(const width of [1440,1100,390]) {
   await page.setViewportSize({width,height:1000});await go('');
   const gap=await page.evaluate(()=>{const banner=document.querySelector('.dashboard-plan-link').getBoundingClientRect();const grid=document.querySelector('.overview-columns').getBoundingClientRect();return grid.top-banner.bottom;});assert(gap>=16,`dashboard gap ${gap} at ${width}`);
   assert.equal(await page.locator('.main-panel').evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:`${out}/dashboard-${width}.png`});
  }
 });
 await check('heatmap legend matches cells and hover, keyboard and tap details remain visible',async()=>{
  await page.setViewportSize({width:1440,height:1000});await go('timer');
  await page.evaluate(()=>{const k='studytrack.workspace.v1',s=JSON.parse(localStorage.getItem(k));for(let i=0;i<30;i++){const date=new Date();date.setDate(date.getDate()-i);date.setHours(9,0,0,0);const duration=[0,15,30,60,90][i%5];if(duration)s.sessions.push({id:'heat-'+i,startTime:date.toISOString(),endTime:new Date(date.getTime()+duration*60000).toISOString(),type:'focus',category:'Review',plannedDuration:duration,actualDuration:duration,completed:true,interrupted:false});}localStorage.setItem(k,JSON.stringify(s));});await go('timer');
  await page.locator('.study-heatmap').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.study-heatmap-cell').count(),365);
  for(const level of [0,1,2,3,4]) {
   const legend=await page.locator(`.study-heatmap-legend [data-level="${level}"]`).evaluate(e=>getComputedStyle(e).backgroundColor);
   const cells=page.locator(`.study-heatmap-cell[data-level="${level}"]`);assert(await cells.count()>0);assert.equal(await cells.first().evaluate(e=>getComputedStyle(e).backgroundColor),legend);
  }
  const latest=page.locator('.study-heatmap-cell').last();await latest.hover();await page.getByRole('tooltip').waitFor();assert.match(await page.getByRole('tooltip').innerText(),/80 min|1h 20m/);await page.screenshot({path:out+'/heatmap-desktop.png'});
  await latest.focus();await page.keyboard.press('ArrowLeft');await page.getByRole('tooltip').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0);
  await page.setViewportSize({width:390,height:1000});await go('timer');await page.locator('.study-heatmap').scrollIntoViewIfNeeded();await page.locator('.study-heatmap-cell').last().tap();await page.getByRole('tooltip').waitFor();
  const box=await page.getByRole('tooltip').boundingBox();assert(box.x>=0 && box.x+box.width<=390);assert(box.y>=0 && box.y+box.height<=1000);assert.equal(await page.locator('.main-panel').evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await page.screenshot({path:out+'/heatmap-mobile.png'});
 });
 assert.deepEqual(errors,[]);console.log('PASS no browser errors or native dialogs');
} catch(error){await page.screenshot({path:out+'/failure.png'});console.error(error);process.exitCode=1;} finally{await browser.close();}

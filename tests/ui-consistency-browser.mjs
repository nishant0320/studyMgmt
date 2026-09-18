import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
const base=process.env.TRACKME_URL || 'http://127.0.0.1:4174';
const out='/tmp/trackme-ui-consistency';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1050},timezoneId:'Asia/Kolkata',hasTouch:true,reducedMotion:'reduce'});
page.setDefaultTimeout(10000);await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{errors.push(d.message());d.dismiss();});
const go=async route=>{await page.goto(base+'/'+route);await page.locator('.route-frame').waitFor();};
const bounds=async locator=>{const box=await locator.boundingBox();const size=page.viewportSize();assert(box && box.width>100 && box.height>20);assert(box.x>=0 && box.y>=0 && box.x+box.width<=size.width+1 && box.y+box.height<=size.height+1,JSON.stringify(box));};
try {
 await go('');
 await page.evaluate(()=>{const key='studytrack.workspace.v1',state=JSON.parse(localStorage.getItem(key));state.settings.dailyGoalMinutes=100;
  state.sessions=Array.from({length:5},(_,i)=>({id:'heat-'+i,type:'focus',category:'Math',startTime:`2026-09-${17-i}T07:00:00Z`,endTime:`2026-09-${17-i}T09:00:00Z`,actualDuration:i*25,plannedDuration:100,completed:true,interrupted:false}));
  state.tasks=[{id:'planned',title:'Today by plan',description:'',category:'Math',status:'todo',priority:'medium',dueDate:'2026-09-20',plannedDate:'2026-09-17',createdAt:'2026-09-16T10:00:00Z',estimatedPomodoros:2,actualPomodoros:0,subtasks:[]},{id:'deadline',title:'Deadline only',description:'',category:'Math',status:'todo',priority:'medium',dueDate:'2026-09-17',plannedDate:'2026-09-18',createdAt:'2026-09-16T10:00:00Z',estimatedPomodoros:2,actualPomodoros:0,subtasks:[]}];localStorage.setItem(key,JSON.stringify(state));});
 const summaries=[];
 for(const route of ['', 'timer']) {
  await go(route);const heat=page.locator('.study-heatmap');await heat.scrollIntoViewIfNeeded();assert.equal(await heat.locator('button[data-date]').count(),route ? 365 : 84);
  const colors=[];
  for(let level=0;level<5;level++) {const cell=heat.locator(`[data-date="2026-09-${17-level}"]`);assert.equal(await cell.getAttribute('data-level'),String(level));assert.equal(await cell.getAttribute('title'),null);const color=await cell.evaluate(el=>getComputedStyle(el).backgroundColor);assert.equal(color,await heat.locator(`.study-heatmap-legend [data-level="${level}"]`).evaluate(el=>getComputedStyle(el).backgroundColor));colors.push(color);}
  const cell=heat.locator('[data-date="2026-09-16"]');await cell.hover();await page.getByRole('tooltip').waitFor();const text=await page.getByRole('tooltip').innerText();assert.match(text,/25 min of focus/);assert.match(text,/1 block · 25%/);await bounds(page.getByRole('tooltip'));summaries.push({text,colors});await page.screenshot({path:`${out}/${route || 'dashboard'}-heatmap.png`});
  await cell.focus();await page.keyboard.press('ArrowUp');assert.match(await page.getByRole('tooltip').innerText(),/50 min/);await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0);
 }
 assert.deepEqual(summaries[0],summaries[1]);
 await go('');await page.getByRole('button',{name:'Today',exact:true}).click();assert.equal(await page.locator('.plan-task').count(),1);assert.match(await page.locator('.plan-task').innerText(),/Today by plan/);await page.locator('.plan-task').click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByLabel('Task title',{exact:true}).inputValue(),'Today by plan');await page.keyboard.press('Escape');
 console.log('PASS identical Dashboard/Timer heatmap details and five-level colors, date navigation, daily-plan filter, task links');
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:844});
  for(const route of ['tasks','calendar','history','settings','analytics']) {
   await go(route);const controls=page.locator('button[role="combobox"]:enabled');const count=await controls.count();
   for(let i=0;i<count;i++) {await controls.nth(i).click();await page.getByRole('listbox').waitFor();await bounds(page.locator('.select-options'));await page.keyboard.press('Escape');assert.equal(await page.getByRole('listbox').count(),0);}
  }
  await go('calendar');await page.getByRole('button',{name:'New event',exact:true}).click();await page.getByRole('combobox',{name:'Category',exact:true}).click();await bounds(page.locator('.select-options'));await page.screenshot({path:`${out}/event-category-${width}.png`});await page.keyboard.press('Shift+Tab');assert.equal(await page.getByRole('listbox').count(),0);assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Escape');
  await go('settings#settings-categories');await page.locator('#settings-categories').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/settings-categories-${width}.png`});
  await go('');await page.locator('.study-heatmap').scrollIntoViewIfNeeded();await page.locator('.study-heatmap [data-date="2026-09-16"]').tap();await page.getByRole('tooltip').waitFor();await bounds(page.getByRole('tooltip'));await page.screenshot({path:`${out}/dashboard-touch-${width}.png`});
  assert.equal(await page.locator('.main-panel').evaluate(el=>el.scrollWidth>el.clientWidth),false);
 }
 await page.setViewportSize({width:390,height:560});await go('tasks');await page.getByRole('button',{name:'New Task',exact:true}).click();await page.getByRole('combobox',{name:'Category',exact:true}).click();await page.getByRole('combobox',{name:'Search categories',exact:true}).fill('An unusually long category name for advanced mathematics and exam preparation');await bounds(page.locator('.select-options'));await page.getByRole('option',{name:/Create/}).click();await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS shared dropdowns across pages, mobile and short-viewport positioning, wrapped labels, modal Shift+Tab, heatmap touch, and no browser errors');
} catch(error){await page.screenshot({path:out+'/failure.png'});console.error(error);process.exitCode=1;}finally{await browser.close();}

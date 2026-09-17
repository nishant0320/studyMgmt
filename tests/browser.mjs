import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.TRACKME_URL || process.env.STUDYTRACK_URL || 'http://127.0.0.1:5174';
const output = process.env.STUDYTRACK_SCREENSHOTS || '/tmp/studytrack-verification';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => { errors.push('Unexpected native dialog: ' + dialog.message()); dialog.dismiss(); });
const go = async route => { await page.goto(base + '/' + route); await page.locator('.route-frame').waitFor(); await page.waitForTimeout(200); };
const data = key => page.evaluate(key => JSON.parse(localStorage.getItem('studytrack.' + key)), key);
const select = async (name, option) => { await page.getByRole('combobox', {name, exact:true}).click(); await page.getByRole('option', {name:option, exact:true}).click(); };
const approve = async () => { await page.getByRole('alertdialog').locator('.confirm-submit').click(); };
const check = async (name, run) => { await run(); console.log('PASS', name); };
try {
 await go('settings');
 await page.getByRole('button', {name:'Load demo data', exact:true}).click(); await approve();
 const demo = await page.evaluate(() => Object.fromEntries(['sessions','tasks','journal','badges','settings','events'].map(k=>[k,JSON.parse(localStorage.getItem('studytrack.'+k))])));
 await page.evaluate(()=>{
  for(const key of ['sessions','tasks','journal','events']) localStorage.setItem('studytrack.'+key,'[]');
  localStorage.setItem('studytrack.badges',JSON.stringify(JSON.parse(localStorage.getItem('studytrack.badges')).map(b=>({...b,dateEarned:null}))));
  localStorage.setItem('studytrack.settings',JSON.stringify({...JSON.parse(localStorage.getItem('studytrack.settings')),soundEnabled:false,focusSoundEnabled:false,notificationsEnabled:false,accentColor:'#a7c993'}));
  localStorage.removeItem('studytrack.activeTimer.v1');
  localStorage.removeItem('studytrack.workspace.v1');
 });
 await go('tasks');
 await page.screenshot({path:output+'/tasks-empty.png'});
 await check('empty board has a visible primary action and three useful empty columns', async()=>{
  assert.equal(await page.locator('.column-empty').count(),3);
  assert(await page.getByRole('button',{name:'New Task',exact:true}).isVisible());
 });
 await check('create three tasks, including one without a deadline; all cards remain visible',async()=>{
  for(let i=1;i<=3;i++){
   await page.getByRole('button',{name:'New Task',exact:true}).click();
   await page.getByRole('dialog').getByLabel('Task title',{exact:true}).fill('Study test '+i);
   if(i===1) await page.getByRole('dialog').getByLabel('Due date',{exact:true}).fill('');
   await page.getByRole('button',{name:'Create task',exact:true}).click();
  }
  assert.equal(await page.locator('.column-todo .task-card').count(),3);
  assert.equal(await page.locator('.task-alert-grid article').first().locator('strong').textContent(),'0');
 });
 await check('task editor saves status and subtasks; modal traps focus and restores its trigger',async()=>{
  const trigger=page.getByRole('button',{name:'Study test 1',exact:true});await trigger.click();
  await page.getByRole('combobox',{name:'Status',exact:true}).click();
  await page.screenshot({path:output+'/task-dropdown.png'});
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await page.getByPlaceholder('Add subtask',{exact:true}).fill('Read chapter one');
  await page.getByRole('button',{name:'Add subtask',exact:true}).click();
  await page.getByRole('button',{name:'Save task',exact:true}).focus();
  await page.keyboard.press('Tab');
  assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  assert.equal(await page.locator('.column-in-progress .task-card').count(),1);
  assert((await data('tasks')).some(t=>t.title==='Study test 1'&&t.subtasks.length===1));
  await trigger.click();
  await page.getByPlaceholder('Add subtask',{exact:true}).fill('Do not save this');
  await page.getByRole('button',{name:'Add subtask',exact:true}).click();
  await page.keyboard.press('Escape');
  assert.equal((await data('tasks')).find(t=>t.title==='Study test 1').subtasks.length,1);
 });
 await check('search, priority filter and task deletion work',async()=>{
  await page.getByRole('textbox',{name:'Search tasks',exact:true}).fill('Study test 3');
  assert.equal(await page.locator('.task-card').count(),1);
  await page.getByRole('button',{name:'Delete task Study test 3',exact:true}).click();
  await page.screenshot({path:output+'/delete-confirmation.png'});
  await page.getByRole('alertdialog').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.locator('.task-card').count(),1);
  await page.getByRole('button',{name:'Delete task Study test 3',exact:true}).click();await approve();
  assert.equal(await page.locator('.task-card').count(),0);
  await page.getByRole('textbox',{name:'Search tasks',exact:true}).fill('');
  await select('All priorities','High');
  assert.equal(await page.locator('.task-card').count(),0);
  await select('All priorities','All priorities');
 });
 await check('task focus handoff, start, pause, route navigation and reload preserve the timer',async()=>{
  await page.getByRole('button',{name:'Study test 1',exact:true}).click();
  await page.getByRole('button',{name:'Focus on task',exact:true}).click();await page.waitForURL('**/timer');
  await page.locator('.task-attach-trigger').filter({hasText:'Study test 1'}).waitFor();
  await page.getByRole('button',{name:'Start timer',exact:true}).click();await page.waitForTimeout(1100);
  await page.getByRole('button',{name:'Pause timer',exact:true}).click();
  const remaining=(await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')))).remaining;
  await go('tasks');await go('timer');
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')))).remaining,remaining);
  await page.getByRole('button',{name:'Start timer',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'Pause timer',exact:true}).waitFor();
  await page.getByRole('button',{name:'Reset timer',exact:true}).click();
  await page.getByRole('button',{name:'Start timer',exact:true}).waitFor();
 });
 await check('restored elapsed timer completes once, credits the task and offers a break',async()=>{
  await page.evaluate(()=>{
   const key='studytrack.activeTimer.v1';const timer=JSON.parse(localStorage.getItem(key));
   localStorage.setItem(key,JSON.stringify({...timer,plannedMinutes:1,remaining:1,running:true,startedAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()-1000).toISOString()}));
  });
  await page.reload();await page.waitForTimeout(900);
  assert.equal((await data('sessions')).length,1);
  assert.equal((await data('tasks')).find(t=>t.title==='Study test 1').actualPomodoros,1);
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.activeTimer.v1')))).type,'break');
  await page.reload();await page.waitForTimeout(400);assert.equal((await data('sessions')).length,1);
 });
 await check('calendar creates, validates, edits and deletes an event',async()=>{
  await go('calendar');await page.getByRole('button',{name:'New event',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Title',{exact:true}).fill('Study group');
  await page.getByLabel('Start time',{exact:true}).fill('10:00');await page.getByLabel('End time',{exact:true}).fill('09:00');
  await page.getByRole('button',{name:'Save Event',exact:true}).click();
  assert(await page.getByRole('dialog').isVisible());assert.equal((await data('events')).length,0);
  await page.getByLabel('End time',{exact:true}).fill('11:00');await page.getByRole('button',{name:'Save Event',exact:true}).click();
  assert.equal((await data('events')).length,1);
  await page.getByRole('button',{name:'Edit event Study group',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Title',{exact:true}).fill('Study group updated');
  await page.getByRole('button',{name:'Save Event',exact:true}).click();
  await page.getByRole('button',{name:'Delete event Study group updated',exact:true}).click();await approve();assert.equal((await data('events')).length,0);
  await page.getByRole('button',{name:'Week',exact:true}).click();assert.equal(await page.locator('.calendar-day').count(),7);
 });
 await check('journal autosaves reflections and goals and retains edits on navigation',async()=>{
  await go('journal');
  await page.getByLabel('What did you accomplish today?',{exact:true}).fill('Read a chapter and reviewed my notes.');
  await page.getByPlaceholder('Add a goal...',{exact:true}).fill('Practice tomorrow');await page.getByRole('button',{name:'Add goal',exact:true}).click();
  await page.waitForTimeout(900);assert((await data('journal')).some(j=>j.summary.includes('Read a chapter')&&j.goals.length===1));
  await page.getByRole('button',{name:'Focus rating 5 of 5',exact:true}).click();
  await page.getByRole('navigation').getByRole('link',{name:'Tasks',exact:true}).click();
  await go('journal');assert((await data('journal')).some(j=>j.focusRating===5));
 });
 await check('history notes, export and keyboard accordion work',async()=>{
  await go('history');await page.getByRole('button',{name:'Edit session notes',exact:true}).first().click();
  await page.getByPlaceholder('Add notes about this session…',{exact:true}).fill('Reviewed with care');
  await page.getByRole('button',{name:'Save notes',exact:true}).click();assert.equal((await data('sessions'))[0].notes,'Reviewed with care');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();assert.match((await download).suggestedFilename(),/csv$/);
  await page.locator('.premium-accordion-header').first().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.history-row').count(),0);
 });
 await check('settings preset and profile persist; malformed imports do not replace data',async()=>{
  await go('settings');await page.getByLabel('Display Name',{exact:true}).fill('Alex');
  await select('Pomodoro Preset','52-17 Rule');
  assert.equal((await data('settings')).focusDuration,52);
  const before=(await data('tasks')).length;
  await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({sessions:[{}],tasks:[],journalEntries:[],badges:[],events:[],settings:{}}))});
  await page.waitForTimeout(250);assert.equal((await data('tasks')).length,before);
  await go('timer');await page.locator('.task-attach-trigger').click();await page.getByRole('dialog').getByRole('button',{name:/Free study block/}).click();assert.match(await page.locator('.timer-clock-display').textContent(),/52:00/);
 });
 await check('coach settings validate and persist',async()=>{
  await go('coach');await page.getByRole('button',{name:'Tune',exact:true}).click();
  await page.getByLabel('Today planned minutes',{exact:true}).fill('75');await page.getByRole('button',{name:'Save settings',exact:true}).click();
  assert.equal((await data('settings')).adversarialDailyPlanMinutes,75);
 });
 await check('custom dropdown supports Escape without closing its parent dialog',async()=>{
  await go('calendar');await page.getByRole('button',{name:'New event',exact:true}).click();
  await page.getByRole('combobox',{name:'Category',exact:true}).click();await page.keyboard.press('Escape');
  assert(await page.getByRole('dialog').isVisible());assert.equal(await page.getByRole('listbox').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 });
 await check('command palette searches and navigates with keyboard',async()=>{
  await page.getByRole('button',{name:'Open command palette',exact:true}).click();
  await page.getByRole('textbox',{name:'Search commands',exact:true}).fill('Open Calendar');await page.keyboard.press('Enter');await page.waitForURL('**/calendar');
 });
 // Use deterministic demo records for visual checks; this is an isolated browser context.
 await page.evaluate(demo=>{for(const [k,v]of Object.entries(demo))localStorage.setItem('studytrack.'+k,JSON.stringify(v));localStorage.removeItem('studytrack.activeTimer.v1');localStorage.removeItem('studytrack.workspace.v1');},demo);
 for(const mode of ['populated','empty']){
  if(mode==='empty')await page.evaluate(()=>{localStorage.removeItem('studytrack.workspace.v1');for(const key of ['sessions','tasks','journal','events'])localStorage.setItem('studytrack.'+key,'[]');localStorage.setItem('studytrack.badges',JSON.stringify(JSON.parse(localStorage.getItem('studytrack.badges')).map(b=>({...b,dateEarned:null}))));});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const route of ['','plan','tasks','timer','calendar','history','analytics','coach','journal','badges','stats','settings']){
    await go(route);
    assert.equal(await page.locator('h1').count(),1,`${route} has one page heading`);
    assert.equal(await page.locator('.main-panel').evaluate(el=>el.scrollWidth>el.clientWidth),false,`${route} overflows at ${width}`);
    await page.screenshot({path:`${output}/${mode}-${route||'dashboard'}-${width}.png`});
   }
   console.log('PASS',`${mode}: all 12 routes at ${width}px`);
  }
 }
 await check('mobile drawer, collapse preference and navigation work',async()=>{
  await page.evaluate(()=>localStorage.setItem('studytrack.sidebar','collapsed'));await go('tasks');
  assert(await page.getByRole('button',{name:'New Task',exact:true}).isVisible());
  await page.getByRole('button',{name:'Toggle menu',exact:true}).click();
  await page.getByRole('navigation').getByRole('link',{name:'Calendar',exact:true}).click();await page.waitForURL('**/calendar');
  assert.equal(await page.locator('.sidebar.mobile-open').count(),0);
 });
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
} catch(error){await page.screenshot({path:output+'/failure.png'});console.error(error);process.exitCode=1;}finally{await browser.close();}

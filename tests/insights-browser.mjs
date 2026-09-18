import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const base = process.env.TRACKME_URL || process.env.STUDYTRACK_URL || 'http://127.0.0.1:4174';
const output = '/tmp/trackme-insights'; fs.mkdirSync(output,{recursive:true});
const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome', headless:true, args:['--no-sandbox'] });
const page = await browser.newPage({viewport:{width:1440,height:1050},timezoneId:'Asia/Kolkata',reducedMotion:'reduce'});
await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));
page.setDefaultTimeout(10000);
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const go=async route=>{await page.goto(base+'/'+route);await page.locator('.route-frame').waitFor();};
const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('studytrack.workspace.v1')));
const metric=label=>page.locator('.analytics-kpi-card').filter({has:page.locator('span',{hasText:new RegExp('^'+label+'$')})});
try {
 await go('coach'); assert.equal(await page.locator('.grade-ring-content strong').innerText(),'—');
 assert.equal(await page.getByText('Estimated time value',{exact:true}).count(),0);
 const seed=await data();
 seed.tasks=[{id:'next',title:'Review orbital mechanics',description:'',status:'todo',priority:'medium',dueDate:'2026-09-20',plannedDate:'2026-09-17',createdAt:'2026-09-17T07:00:00Z',estimatedPomodoros:3,pomodoroMinutes:40,actualPomodoros:1,category:'Physics',subtasks:[]}];
 seed.sessions=[{id:'only',startTime:'2026-09-17T07:00:00Z',endTime:'2026-09-17T08:00:00Z',actualDuration:60,plannedDuration:60,type:'focus',category:'Orbital mechanics',completed:true,interrupted:false},{id:'break',startTime:'2026-09-17T08:00:00Z',endTime:'2026-09-17T10:00:00Z',actualDuration:120,plannedDuration:120,type:'break',category:'Breaks',completed:true,interrupted:false}];
 seed.settings.dailyGoalMinutes=60;seed.customCategories=['Physics'];
 await page.evaluate(seed=>localStorage.setItem('studytrack.workspace.v1',JSON.stringify(seed)),seed);
 await go('analytics');
 assert.equal(await page.locator('.analytics-subject-row').count(),1);
 assert.match(await page.locator('.analytics-subject-list').innerText(),/Orbital mechanics/);
 assert.equal(await page.locator('.analytics-chart-box .recharts-responsive-container').count(),2);
 assert.match(await metric('Goal Hit Rate').innerText(),/14%/);
 assert.match(await metric('Total Sessions').innerText(),/1/);
 let pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export range',exact:true}).click();
 let download=await pending;const rows=fs.readFileSync(await download.path(),'utf8').trim().split('\n');
 assert.equal(rows.length,8);assert.match(rows.at(-1),/2026-09-17,60,60,true/);
 await page.getByRole('button',{name:'30D',exact:true}).click();assert.match(await metric('Goal Hit Rate').innerText(),/3%/);
 await page.screenshot({path:output+'/analytics-desktop.png'});
 await go('stats');assert.match(await page.locator('.metric-card').filter({hasText:'Favorite subject'}).innerText(),/Orbital mechanics/);
 assert.doesNotMatch(await page.locator('.metric-card').filter({hasText:'Best hour'}).innerText(),/13:00/);
 pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export image',exact:true}).click();download=await pending;
 assert.match(fs.readFileSync(await download.path(),'utf8'),/TRACKME SNAPSHOT/);
 console.log('PASS one-session analytics, real subject totals, calendar-day goal rates, CSV and Stats focus-only snapshot');

 await go('coach');assert.match(await page.locator('.coach-next-step').innerText(),/Review orbital mechanics/);assert.match(await page.locator('.coach-next-step').innerText(),/80 min remaining/);
 await page.getByRole('button',{name:'Focus on next task',exact:true}).click();await page.waitForURL('**/timer');
 await page.waitForFunction(()=>document.querySelector('.timer-clock-display')?.textContent?.includes('40:00'));
 await go('coach');await page.getByRole('button',{name:'Tune',exact:true}).click();
 const original=await page.getByLabel('Today planned minutes',{exact:true}).inputValue();
 await page.getByLabel('Today planned minutes',{exact:true}).fill('123');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Tune',exact:true}).click();assert.equal(await page.getByLabel('Today planned minutes',{exact:true}).inputValue(),original);await page.keyboard.press('Escape');
 await page.screenshot({path:output+'/coach-desktop.png'});
 console.log('PASS Coach daily-plan suggestion, per-task timer handoff, and discarded preferences stay discarded');

 await go('settings');await page.getByRole('navigation',{name:'Settings sections'}).getByRole('link',{name:'Goals & appearance',exact:true}).click();
 await page.waitForURL('**/settings#settings-goals');
 await page.waitForFunction(()=>document.activeElement?.id==='settings-goals');
 await page.getByLabel('Daily goal (min)',{exact:true}).fill('120');assert.match(await page.locator('.settings-goal-preview').innerText(),/5 blocks/);
 await page.getByLabel('Display Name',{exact:true}).focus();const before=await page.locator('.sidebar').getAttribute('class');
 await page.keyboard.press('Control+b');assert.equal(await page.locator('.sidebar').getAttribute('class'),before);
 await page.getByRole('heading',{name:'Make it yours',exact:true}).click();await page.keyboard.press('Control+b');
 await page.waitForFunction(()=>document.querySelector('.sidebar')?.classList.contains('collapsed'));
 await page.keyboard.press('Control+b');await page.waitForFunction(()=>!document.querySelector('.sidebar')?.classList.contains('collapsed'));
 await page.getByRole('button',{name:'Delete category',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual((await data()).customCategories,['Physics']);
 await page.getByRole('button',{name:'Delete category',exact:true}).click();await page.getByRole('alertdialog').locator('.confirm-submit').click();assert.deepEqual((await data()).customCategories,[]);assert.equal((await data()).tasks[0].category,'Physics');
 await go('settings#settings-data');await page.waitForFunction(()=>document.activeElement?.id==='settings-data');
 const position=await page.locator('#settings-data').boundingBox();assert(position.y>=50 && position.y<150);
 console.log('PASS Settings anchors, goal context, protected typing shortcuts, category confirmation, and direct backup link');

 await page.setViewportSize({width:390,height:1000});
 for(const route of ['analytics','coach','stats','settings']) {await go(route);assert.equal(await page.locator('.main-panel').evaluate(el=>el.scrollWidth>el.clientWidth),false,route+' overflow');await page.screenshot({path:`${output}/${route}-mobile.png`});}
 await page.getByRole('button',{name:'Toggle menu',exact:true}).click();await page.getByRole('button',{name:'Close navigation',exact:true}).click();assert.equal(await page.locator('.sidebar').evaluate(el=>el.classList.contains('mobile-open')),false);
 await page.getByRole('heading',{name:'Make it yours',exact:true}).click();await page.keyboard.press('Control+b');await page.waitForFunction(()=>document.querySelector('.sidebar')?.classList.contains('mobile-open'));await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS mobile pages, navigation dismissal and shortcut, and no browser errors');
} catch(error) {await page.screenshot({path:output+'/failure.png'});console.error(error);process.exitCode=1;} finally {await browser.close();}

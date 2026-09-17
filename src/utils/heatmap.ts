import type { StudySession } from '../types';
import { dateKey } from './stats';

export function heatLevel(minutes: number, goal: number): number {
  return minutes <= 0 ? 0 : Math.min(4, Math.ceil(minutes / Math.max(1,goal) * 4));
}
export function buildStudyHeatmap(sessions: StudySession[], now = new Date()) {
  const end = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const start = new Date(end);start.setDate(start.getDate()-364);
  const first = new Date(start);first.setDate(first.getDate()-first.getDay());
  const totals = new Map<string,{minutes:number;blocks:number}>();
  for (const session of sessions) {
    if (session.type !== 'focus' || session.actualDuration <= 0) continue;
    const key = dateKey(session.startTime);const day=totals.get(key) ?? {minutes:0,blocks:0};
    totals.set(key,{minutes:day.minutes+session.actualDuration,blocks:day.blocks+1});
  }
  const cells: { date:string; week:number; day:number; minutes:number; blocks:number; inRange:boolean }[]=[];
  const months: {key:string;label:string;column:number}[]=[];
  for (let offset=0;offset<371;offset++) {
    const current=new Date(first);current.setDate(first.getDate()+offset);
    if (current>end) break;
    const date=dateKey(current);const week=Math.floor(offset/7);
    // Label each month once, with a unique year/month key across the rolling year.
    if (current.getDate()===1 || offset===0) months.push({key:date.slice(0,7),label:current.toLocaleDateString(undefined,{month:'short'}),column:week});
    cells.push({date,week,day:current.getDay(),...(totals.get(date) ?? {minutes:0,blocks:0}),inRange:current>=start});
  }
  const visible=cells.filter(cell=>cell.inRange);
  return {cells,months,weeks:Math.ceil(cells.length/7),today:dateKey(end),total:visible.reduce((sum,day)=>sum+day.minutes,0),activeDays:visible.filter(day=>day.minutes>0).length};
}

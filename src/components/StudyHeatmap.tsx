import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Clock3 } from 'lucide-react';
import type { StudySession } from '../types';
import { buildStudyHeatmap, heatLevel } from '../utils/heatmap';
import { dateKey } from '../utils/stats';

type Detail = { index:number; left:number; top:number };
export function StudyHeatmap({ sessions, dailyGoal }: {sessions:StudySession[];dailyGoal:number}) {
  const today=dateKey(new Date());
  const heat=useMemo(()=>buildStudyHeatmap(sessions),[sessions,today]);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [focused,setFocused]=useState(heat.cells.length-1);
  const scroller=useRef<HTMLDivElement>(null);
  const root=useRef<HTMLElement>(null);
  const buttons=useRef<(HTMLButtonElement|null)[]>([]);
  const tooltipId=useId();
  useEffect(()=>{const element=scroller.current;if(element)element.scrollLeft=element.scrollWidth;},[heat.today]);
  useEffect(()=>{
    const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setDetail(null);};
    const resize=()=>setDetail(null);
    const scroll=(event:Event)=>{if(event.target!==scroller.current)setDetail(null);};
    window.addEventListener('pointerdown',dismiss);window.addEventListener('resize',resize);window.addEventListener('scroll',scroll,true);
    return()=>{window.removeEventListener('pointerdown',dismiss);window.removeEventListener('resize',resize);window.removeEventListener('scroll',scroll,true);};
  },[]);
  const show=(index:number,button:HTMLButtonElement)=>{
    const rect=button.getBoundingClientRect();
    setDetail({index,left:Math.max(12,Math.min(window.innerWidth-252,rect.left+rect.width/2-120)),top:rect.top>=145?rect.top-136:rect.bottom+12});
  };
  const cell=detail ? heat.cells[detail.index] : undefined;
  const duration=(value:number)=>value>=60?`${Math.floor(value/60)}h ${value%60}m`:`${value} min`;
  return <section ref={root} className="study-heatmap panel" aria-labelledby={`${tooltipId}-heading`} onKeyDown={event=>{if(event.key==='Escape')setDetail(null);}}>
    <div className="study-heatmap-heading"><div><h2 id={`${tooltipId}-heading`}>Your year in focus</h2><p>Small steps, seen over time.</p></div><div className="study-heatmap-totals"><span><Clock3 size={15}/><strong>{duration(heat.total)}</strong> studied</span><span><CalendarDays size={15}/><strong>{heat.activeDays}</strong> active days</span></div></div>
    <div className="study-heatmap-scroll" ref={scroller} onScroll={()=>{const index=buttons.current.findIndex(button=>button===document.activeElement);const button=buttons.current[index];if(button)show(index,button);else setDetail(null);}}>
      <div className="study-heatmap-chart" style={{'--heat-weeks':heat.weeks} as CSSProperties}>
        <div className="study-heatmap-months" aria-hidden="true">{heat.months.filter((month,index)=>index===0 || month.column-heat.months[index-1].column>1).map(month=><span key={month.key} style={{gridColumn:month.column+1}}>{month.label}</span>)}</div>
        <div className="study-heatmap-body"><div className="study-heatmap-weekdays" aria-hidden="true"><span style={{gridRow:2}}>Mon</span><span style={{gridRow:4}}>Wed</span><span style={{gridRow:6}}>Fri</span></div><div className="study-heatmap-grid" role="group" aria-label="Daily focus history. Use arrow keys to explore dates.">
          {heat.cells.map((day,index)=>day.inRange?<button key={day.date} ref={button=>{buttons.current[index]=button;}} className={`study-heatmap-cell ${day.date===heat.today?'is-today':''}`} data-level={heatLevel(day.minutes,dailyGoal)} data-date={day.date} tabIndex={focused===index?0:-1} aria-label={`${new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}: ${day.minutes} focus minutes, ${day.blocks} study blocks`} aria-describedby={detail?.index===index?tooltipId:undefined} style={{gridColumn:day.week+1,gridRow:day.day+1}}
            onPointerEnter={event=>{if(event.pointerType==='mouse')show(index,event.currentTarget);}} onPointerLeave={event=>{if(event.pointerType==='mouse' && document.activeElement!==event.currentTarget)setDetail(null);}}
            onFocus={event=>{setFocused(index);show(index,event.currentTarget);}} onBlur={()=>setDetail(null)} onClick={event=>show(index,event.currentTarget)} onKeyDown={event=>{
              const offset:Record<string,number>={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1};
              let next=event.key==='Home'?heat.cells.findIndex(day=>day.inRange):event.key==='End'?heat.cells.length-1:index+(offset[event.key]??0);
              if(next===index)return;event.preventDefault();next=Math.min(heat.cells.length-1,Math.max(heat.cells.findIndex(day=>day.inRange),next));
              buttons.current[next]?.focus();
            }}/>:<span key={day.date} style={{gridColumn:day.week+1,gridRow:day.day+1}}/>)}
        </div></div>
      </div>
    </div>
    <footer className="study-heatmap-footer"><p>Color shows progress toward your {dailyGoal} min daily goal.</p><div className="study-heatmap-legend" aria-label="Focus intensity: no study, up to 25%, 50%, 75%, and 100% or more of the daily goal"><span>Less</span>{[0,1,2,3,4].map(level=><i key={level} data-level={level} aria-hidden="true"/>)}<span>More</span></div><small>Hover, tap, or use arrow keys to explore a day.</small></footer>
    {detail && cell && createPortal(<div className="study-heatmap-tooltip" role="tooltip" id={tooltipId} style={{left:detail.left,top:detail.top}}><strong>{new Date(`${cell.date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}{cell.date===heat.today?' · Today':''}</strong><span>{cell.minutes ? `${duration(cell.minutes)} of focus`:'No study logged'}</span><p>{cell.blocks} {cell.blocks===1?'block':'blocks'} · {Math.round(cell.minutes/Math.max(1,dailyGoal)*100)}% of daily goal</p></div>,document.body)}
  </section>;
}

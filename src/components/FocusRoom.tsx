import { useEffect } from 'react';
import { ArrowLeft, Pause, Play, Moon, Target } from 'lucide-react';
import { Portal } from './Portal';
import { formatTimerClock, timerLabel, useActiveTimer } from './ActiveTimerProvider';
import { useAppStore } from '../store/AppStore';

export function FocusRoom({ onClose }: { onClose: () => void }) {
  const timer = useActiveTimer();
  const {state} = useAppStore();
  const activity = timer.type === 'focus' ? 'focus' : 'break';
  const task = state.tasks.find(task=>task.id===timer.selectedTask);
  // Space only controls the timer when the user is not writing a note.
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key !== ' ' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target=event.target as HTMLElement;
      if(target.closest('textarea,input,button,[contenteditable="true"]'))return;
      event.preventDefault();timer.running ? timer.pause() : timer.start();
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[timer.running,timer.pause,timer.start]);
  const progress=Math.min(100,Math.max(0,(1-timer.remaining/(timer.plannedMinutes*60))*100));
  return <Portal><section className="focus-room" role="dialog" aria-modal="true" aria-labelledby="focus-room-title" tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
    <header><button className="ghost" onClick={onClose}><ArrowLeft size={17}/> Back to workspace</button><span>ONE BLOCK AT A TIME</span><div className="focus-room-status">{timer.running?(activity === 'focus' ? 'In focus' : 'On a break'):timer.startedAt?'Paused':'Ready when you are'}</div></header>
    <div className="focus-room-body"><div className="focus-room-symbol">{timer.type==='focus'?<Target size={28}/>:<Moon size={28}/>}</div><p className="overview-eyebrow">{timerLabel(timer.type)}</p><h2 id="focus-room-title">{timer.type==='focus'?(task?.title || 'A little time for your next step'):'Let your mind take a breath'}</h2><p className="muted-copy">{timer.selectedCategory}</p><div className="focus-room-clock" role="timer" aria-label={`${formatTimerClock(timer.remaining)} remaining`}>{formatTimerClock(timer.remaining)}</div><div className="focus-room-progress"><span style={{width:`${progress}%`}}/></div><button className="primary focus-room-toggle" onClick={timer.running?timer.pause:timer.start}>{timer.running?<Pause size={19}/>:<Play size={19}/>} {`${timer.running?'Pause':timer.startedAt?'Resume':'Begin'} ${activity}`}</button><p className="focus-room-hint">Escape returns to your workspace. Your timer stays with you.</p>
    <label className="focus-room-notes">Park a thought<textarea value={timer.scratchNotes} maxLength={10000} rows={3} placeholder="An idea, a question, something to revisit…" onChange={e=>timer.setScratchNotes(e.target.value)}/><small>Saved with this block when you finish. You can find it in History.</small></label></div>
  </section></Portal>;
}

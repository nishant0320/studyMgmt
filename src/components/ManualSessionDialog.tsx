import { useState } from 'react';
import { Clock3, X } from 'lucide-react';
import { Portal } from './Portal';
import { Select } from './Select';
import { useAppStore } from '../store/AppStore';
import { useActiveTimer } from './ActiveTimerProvider';
import { dateKey } from '../utils/stats';
import { validateManualSession } from '../utils/planning';

export function ManualSessionDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppStore();
  const timer = useActiveTimer();
  const now = new Date();
  const initial = new Date(now.getTime() - 25 * 60000);
  const [date, setDate] = useState(dateKey(initial));
  const [time, setTime] = useState(`${String(initial.getHours()).padStart(2,'0')}:${String(initial.getMinutes()).padStart(2,'0')}`);
  const [duration, setDuration] = useState('25');
  const [category, setCategory] = useState('General');
  const [taskId, setTaskId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const start = `${date}T${time}:00`;
    const blockMinutes = Number(duration);
    const validation = validateManualSession(start,blockMinutes,state.sessions);
    if (validation) {setError(validation);return;}
    if (!category.trim()) {setError('Add a subject or category for this study block.');return;}
    const endMs = Date.parse(start) + blockMinutes * 60000;
    if (timer.startedAt && endMs > Date.parse(timer.startedAt)) {setError('This overlaps your current timer block. Finish or reset that timer first.');return;}
    dispatch({type:'add-session',session:{id:crypto.randomUUID(),source:'manual',startTime:new Date(start).toISOString(),endTime:new Date(endMs).toISOString(),plannedDuration:blockMinutes,actualDuration:blockMinutes,type:'focus',completed:true,interrupted:false,category:category.trim(),taskId:taskId || undefined,notes:notes.trim()}});
    onClose();
  };
  return <Portal><div className="modal" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}><form className="modal-panel manual-session-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-session-title" onSubmit={save}>
    <div className="modal-title"><div><h2 id="manual-session-title">Log a study block</h2><p>Studied away from the timer? Give that time its place.</p></div><button type="button" className="ghost icon-only" aria-label="Close study log" onClick={onClose}><X size={18}/></button></div>
    <div className="two-col"><label>Study date<input autoFocus required type="date" max={dateKey(now)} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Start time<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>
    <label>Minutes studied<input required type="number" min="1" max="720" step="1" value={duration} onChange={e=>setDuration(e.target.value)}/></label>
    <label>Link a task<Select aria-label="Link a task" value={taskId} onChange={e=>{setTaskId(e.target.value);const task=state.tasks.find(t=>t.id===e.target.value);if(task)setCategory(task.category);}}><option value="">No linked task</option>{state.tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</Select></label>
    <label>Subject or category<input required maxLength={100} value={category} onChange={e=>setCategory(e.target.value)}/></label>
    <label>Study notes<textarea rows={3} maxLength={10000} placeholder="What did you work on?" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
    <p className="form-help"><Clock3 size={16}/> Counts as one completed focus block. It will be marked “Manual” in your history.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save study block</button></div>
  </form></div></Portal>;
}

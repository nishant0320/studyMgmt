import { useState } from 'react';
import { Download, History, Plus, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { useActiveTimer } from './ActiveTimerProvider';
import { type Checkpoint, readCheckpoints, saveCheckpoint, downloadBackup } from '../utils/checkpoints';
import { confirmAction } from '../utils/confirm';
import { showToast } from '../utils/toast';

export function RecoveryPoints() {
  const {state,dispatch} = useAppStore();
  const timer = useActiveTimer();
  const [points,setPoints] = useState(readCheckpoints);
  const [error,setError] = useState('');
  const create = () => {
    try {setPoints(saveCheckpoint(state,'Saved by you'));setError('');showToast('Recovery point saved','success');}
    catch {setError('There is not enough browser storage for a recovery point. Export a JSON backup instead.');}
  };
  const restore = async (point: Checkpoint) => {
    if (!await confirmAction(`Restore “${point.reason}” from ${new Date(point.createdAt).toLocaleString()}? This replaces your current workspace.`,{title:'Restore this recovery point?',confirmLabel:'Restore workspace',note:'Your current workspace will be saved as a recovery point before restoring.'})) return;
    try {setPoints(saveCheckpoint(state,'Before restoring a recovery point'));setError('');}
    catch {setError('Could not preserve your current workspace. Export a backup before trying again.');return;}
    timer.reset();timer.setScratchNotes('');
    dispatch({type:'import-data',state:point.state});showToast('Workspace restored','success');
  };
  return <section className="panel recovery-points"><div className="section-heading"><div><h2><History size={18}/> Recovery points</h2><p>Your three most recent local snapshots.</p></div><button onClick={create}><Plus size={16}/> Save checkpoint</button></div><p className="muted-copy">Imports, resets and bulk clears save a checkpoint first. These copies live in this browser too; keep an exported backup for lasting protection.</p>{error && <p role="alert" className="form-error">{error}</p>}
    <div className="checkpoint-list">{points.length ? points.map(point=><article key={point.id}><div><strong>{point.reason}</strong><time>{new Date(point.createdAt).toLocaleString()}</time><span>{point.state.tasks.length} tasks · {point.state.sessions.length} sessions · {point.state.journalEntries.length} journal entries</span></div><div className="checkpoint-actions"><button className="ghost icon-only" aria-label={`Export ${point.reason}`} onClick={()=>downloadBackup(point.state,`trackme-checkpoint-${point.createdAt.slice(0,10)}.json`)}><Download size={16}/></button><button onClick={()=>restore(point)}><RotateCcw size={15}/> Restore</button></div></article>) : <p className="muted-copy">No recovery points yet. Save one before a big change.</p>}</div>
  </section>;
}

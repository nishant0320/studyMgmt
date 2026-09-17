import type { AppState } from '../types';
import { isValidBackup } from './backup';
export type Checkpoint = { id: string; createdAt: string; reason: string; state: AppState };
export const checkpointKey = 'studytrack.checkpoints.v1';
export function readCheckpoints(storage: Pick<Storage,'getItem'> = localStorage): Checkpoint[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(checkpointKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is Checkpoint => item && typeof item.id === 'string' && typeof item.reason === 'string' && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)) && isValidBackup(item.state)).slice(0,3) : [];
  } catch { return []; }
}
export function saveCheckpoint(state: AppState, reason: string, storage: Pick<Storage,'getItem'|'setItem'> = localStorage): Checkpoint[] {
  const checkpoint: Checkpoint = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason, state };
  const next = [checkpoint,...readCheckpoints(storage)].slice(0,3);
  storage.setItem(checkpointKey,JSON.stringify(next));
  return next;
}
export function downloadBackup(state: AppState, filename = `trackme-backup-${new Date().toISOString().slice(0,10)}.json`) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
  const link = document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}

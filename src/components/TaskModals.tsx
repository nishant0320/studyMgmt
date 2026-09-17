import { useEffect, useState } from "react";
import { Plus, Play, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Portal } from "./Portal";
import { Select } from "./Select";
import { useAppStore } from "../store/AppStore";
import type { Priority, Task, TaskStatus } from "../types";
import { dateKey, minutes } from "../utils/stats";
import { taskPomodoroMinutes } from "../utils/pomodoro";

const today = () => dateKey(new Date());

function useTaskDialogDismiss(onClose: () => void) {
  useEffect(() => {
    // Focus can move to the body when adding a subtask disables its button.
    // Select handles Escape itself and stops propagation while its menu is open.
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [onClose]);
}

export function NewTaskModal({ status, onClose, plannedDate }: { status: TaskStatus; onClose: () => void; plannedDate?: string }) {
  useTaskDialogDismiss(onClose);
  const { state, dispatch } = useAppStore();
  const [task, setTask] = useState<Task>({
    id: crypto.randomUUID(),
    title: "",
    description: "",
    status,
    priority: "medium",
    dueDate: plannedDate ?? today(),
    plannedDate,
    createdAt: new Date().toISOString(),
    estimatedPomodoros: 2,
    pomodoroMinutes: state.settings.focusDuration,
    actualPomodoros: 0,
    category: "General",
    subtasks: [],
  });

  const save = () => {
    if (!task.title.trim()) return;
    dispatch({ type: "add-task", task: { ...task, title: task.title.trim(), category: task.category.trim() || "General" } });
    onClose();
  };

  return (
    <Portal><div className="modal">
      <div className="modal-panel task-detail" role="dialog" aria-modal="true" aria-labelledby="new-task-title">
        <div className="modal-title"><h2 id="new-task-title">New task</h2><button className="ghost" onClick={onClose} aria-label="Close new task modal" title="Close new task modal"><X size={18} /></button></div>
        <label>Task title<input autoFocus value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} placeholder="What would you like to work on?" /></label>
        <label>Description<textarea value={task.description} onChange={(event) => setTask({ ...task, description: event.target.value })} placeholder="Add details or a helpful link (optional)" /></label>
        <div className="two-col">
          <label>Priority<Select aria-label="Priority" value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value as Priority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></label>
          <label>Due date<input type="date" value={task.dueDate} onChange={(event) => setTask({ ...task, dueDate: event.target.value })} /></label>
        </div>
        <div className="two-col">
          <label>Category<input value={task.category} onChange={(event) => setTask({ ...task, category: event.target.value })} /></label>
          <label>Estimated Pomodoros<input type="number" min={1} value={task.estimatedPomodoros} onChange={(event) => setTask({ ...task, estimatedPomodoros: Math.max(1, Math.round(Number(event.target.value) || 1)) })} /></label>
        </div>
        <label>Minutes per Pomodoro<input aria-label="Minutes per Pomodoro" type="number" min={1} max={180} step={1} value={task.pomodoroMinutes} onChange={e=>setTask({...task,pomodoroMinutes:Math.min(180,Math.max(1,Math.round(Number(e.target.value)||1)))})}/></label>
        <p className="pomodoro-plan-summary">{task.estimatedPomodoros} Pomodoros × {task.pomodoroMinutes} min = <strong>{task.estimatedPomodoros * (task.pomodoroMinutes ?? state.settings.focusDuration)} min</strong> of focus. Completing all blocks marks this task done.</p>
        <label>Study plan date<input type="date" value={task.plannedDate ?? ''} onChange={e=>setTask({...task,plannedDate:e.target.value || undefined})}/><small className="muted-copy">When you intend to study; separate from the deadline.</small></label>
        <button className="primary" onClick={save} disabled={!task.title.trim()}>Create task</button>
      </div>
    </div></Portal>
  );
}

export function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  useTaskDialogDismiss(onClose);
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [local, setLocal] = useState(task);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const linkedSessions = state.sessions.filter((session) => session.taskId === task.id);
  const timeSpent = minutes(linkedSessions);

  const save = () => {
    dispatch({ type: "update-task", task: { ...local, title: local.title.trim(), category: local.category.trim() || "General", completedAt: local.status === "done" ? local.completedAt || new Date().toISOString() : undefined } });
    onClose();
  };

  const addSubtask = () => {
    if (!subtaskTitle.trim()) return;
    const subtask = { id: crypto.randomUUID(), title: subtaskTitle.trim(), done: false };
    setLocal({ ...local, subtasks: [...local.subtasks, subtask] });
    setSubtaskTitle("");
  };

  const focusTask = () => {
    if (!local.title.trim()) return;
    dispatch({ type: "update-task", task: { ...local, title: local.title.trim(), category: local.category.trim() || "General", completedAt: local.status === "done" ? local.completedAt || new Date().toISOString() : undefined } });
    navigate("/timer", { state: { focusTaskId: task.id } });
  };

  return (
    <Portal><div className="modal">
      <div className="modal-panel task-detail" role="dialog" aria-modal="true" aria-labelledby="task-detail-title">
        <div className="modal-title"><h2 id="task-detail-title">Task detail</h2><button className="ghost" onClick={onClose} aria-label="Close task detail" title="Close task detail"><X size={18} /></button></div>
        <label>Task title<input autoFocus value={local.title} onChange={(event) => setLocal({ ...local, title: event.target.value })} /></label>
        <label>Description<textarea value={local.description} onChange={(event) => setLocal({ ...local, description: event.target.value })} placeholder="Full description" /></label>
        <label>Status<Select aria-label="Status" value={local.status} onChange={event => setLocal({ ...local, status: event.target.value as TaskStatus })}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></Select></label>
        <div className="two-col">
          <label>Due date <input type="date" value={local.dueDate} onChange={(event) => setLocal({ ...local, dueDate: event.target.value })} /></label>
          <label>Priority <Select aria-label="Priority" value={local.priority} onChange={(event) => setLocal({ ...local, priority: event.target.value as Priority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></label>
        </div>
        <div className="two-col">
          <label>Category <input value={local.category} onChange={(event) => setLocal({ ...local, category: event.target.value })} /></label>
          <label>Estimated Pomodoros <input type="number" min={1} value={local.estimatedPomodoros} onChange={(event) => setLocal({ ...local, estimatedPomodoros: Math.max(1, Math.round(Number(event.target.value) || 1)) })} /></label>
        </div>
        <label>Minutes per Pomodoro<input aria-label="Minutes per Pomodoro" type="number" min={1} max={180} step={1} value={taskPomodoroMinutes(local,state.settings.focusDuration)} onChange={e=>setLocal({...local,pomodoroMinutes:Math.min(180,Math.max(1,Math.round(Number(e.target.value)||1)))})}/></label>
        <p className="pomodoro-plan-summary">{local.estimatedPomodoros} Pomodoros × {taskPomodoroMinutes(local,state.settings.focusDuration)} min = <strong>{local.estimatedPomodoros * taskPomodoroMinutes(local,state.settings.focusDuration)} min</strong> of focus. Completed blocks count toward automatic completion.</p>
        <div className="detail-stats">
          <span>{timeSpent} min linked</span>
          <span>{linkedSessions.length} sessions</span>
          <span>{Math.round((timeSpent / Math.max(1, local.estimatedPomodoros * taskPomodoroMinutes(local, state.settings.focusDuration))) * 100)}% of estimate</span>
        </div>
        <section>
          <h3>Subtasks</h3>
          <div className="quick-add">
            <input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add subtask" />
            <button className="icon-button small" onClick={addSubtask} disabled={!subtaskTitle.trim()} aria-label="Add subtask"><Plus size={16} /></button>
          </div>
          {local.subtasks.map((subtask) => (
            <label className="check-row" key={subtask.id}>
              <input type="checkbox" checked={subtask.done} onChange={() => {
                const subtasks = local.subtasks.map((item) => item.id === subtask.id ? { ...item, done: !item.done } : item);
                setLocal({ ...local, subtasks });
              }} />
              {subtask.title}
	              <button className="ghost icon-only danger-text" aria-label={`Delete subtask ${subtask.title}`} title="Delete subtask" onClick={() => {
	                setLocal({ ...local, subtasks: local.subtasks.filter((item) => item.id !== subtask.id) });
	              }}><Trash2 size={14} /></button>
            </label>
          ))}
        </section>
        <section>
          <h3>Linked sessions</h3>
          {linkedSessions.slice(0, 6).map((session) => <p className="list-item" key={session.id}>{new Date(session.startTime).toLocaleString()}<span>{session.actualDuration} min</span></p>)}
        </section>
        <label>Study plan date<input type="date" value={local.plannedDate ?? ''} onChange={e=>setLocal({...local,plannedDate:e.target.value || undefined})}/><small className="muted-copy">Changing the plan does not change the deadline.</small></label>
        <div className="task-detail-actions">
          <button className="primary" onClick={focusTask} disabled={!local.title.trim()}><Play size={16} /> Focus on task</button>
          <button onClick={save} disabled={!local.title.trim()}>Save task</button>
        </div>
      </div>
    </div></Portal>
  );
}

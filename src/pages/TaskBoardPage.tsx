import { Select } from "../components/Select";
import { confirmAction } from "../utils/confirm";
import { useEffect, useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import { AlertTriangle, CalendarClock, CheckCircle2, CheckSquare, ChevronDown, Flame, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/Layout";
import { useAppStore } from "../store/AppStore";
import { Priority, Task, TaskStatus } from "../types";
import { dateKey, minutes } from "../utils/stats";

const columns: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

const priorityScore: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const today = () => dateKey(new Date());

export function TaskBoardPage() {
  const { state, dispatch } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);
  const [columnModal, setColumnModal] = useState<TaskStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setNewTaskStatus("todo");
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeTaskId && !newTaskStatus && !columnModal) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeTaskId) setActiveTaskId(null);
      else if (newTaskStatus) setNewTaskStatus(null);
      else setColumnModal(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [activeTaskId, columnModal, newTaskStatus]);

  const categories = Array.from(new Set(state.tasks.map((task) => task.category))).filter(Boolean);
  const tasks = useMemo(() => {
    const filtered = state.tasks.filter((task) => {
      const matchesQuery = `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (priority === "all" || task.priority === priority) && (category === "all" || task.category === category);
    });
    return filtered.sort((a, b) => {
      if (sortBy === "priority") return priorityScore[a.priority] - priorityScore[b.priority];
      if (sortBy === "createdAt") return b.createdAt.localeCompare(a.createdAt);
      return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
    });
  }, [state.tasks, query, priority, category, sortBy]);

  const activeTask = state.tasks.find((task) => task.id === activeTaskId) ?? null;
  const overdueCount = state.tasks.filter((task) => task.status !== "done" && Boolean(task.dueDate) && task.dueDate < today()).length;
  const highCount = state.tasks.filter((task) => task.status !== "done" && task.priority === "high").length;
  const doneCount = state.tasks.filter((task) => task.status === "done").length;
  const completion = Math.round((doneCount / Math.max(1, state.tasks.length)) * 100);
  const nextDue = state.tasks.filter((task) => task.status !== "done" && task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <div className="tasks-page page-transition">
      <PageHeader eyebrow="Workspace" title="Your study plan" description="Turn big goals into small, manageable steps." action={<button className="primary task-create-button" onClick={() => setNewTaskStatus("todo")}><Plus size={16} /> New Task</button>} />
      <section className="task-alert-grid">
        <article className={`glass-card ${overdueCount ? "critical" : "good"}`}><AlertTriangle size={20} /><div><strong>{overdueCount}</strong><span>overdue tasks</span></div></article>
        <article className="glass-card warning"><Flame size={20} /><div><strong>{highCount}</strong><span>high priority</span></div></article>
        <article className="glass-card"><CalendarClock size={20} /><div><strong>{nextDue ? new Date(`${nextDue.dueDate}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}</strong><span>next deadline</span></div></article>
        <article className="glass-card good"><CheckCircle2 size={20} /><div><strong>{completion}%</strong><span>completion</span></div></article>
      </section>
      <div className="toolbar task-toolbar glass-pill bento-task-toolbar">
        <div className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks…" aria-label="Search tasks" /></div>
        <FilterMenu label={priority === "all" ? "All priorities" : priority} options={[["all", "All priorities"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]]} value={priority} onChange={setPriority} />
        <FilterMenu label={category === "all" ? "All categories" : category} options={[["all", "All categories"], ...categories.map((item) => [item, item] as [string, string])]} value={category} onChange={setCategory} />
        <FilterMenu label={sortBy === "dueDate" ? "Sort by due date" : sortBy === "priority" ? "Sort by priority" : "Sort by created"} options={[["dueDate", "Sort by due date"], ["priority", "Sort by priority"], ["createdAt", "Sort by created"]]} value={sortBy} onChange={setSortBy} />
      </div>
      {selectedIds.length > 0 && (
        <div className="bulk-bar">
          <strong>{selectedIds.length} selected</strong>
          <Select aria-label="Move selected tasks" onChange={(event) => event.target.value && dispatch({ type: "bulk-move-tasks", ids: selectedIds, status: event.target.value as TaskStatus })} defaultValue="">
            <option value="">Move to...</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option>
          </Select>
          <button className="danger" onClick={async () => { if (!await confirmAction(`Delete ${selectedIds.length} selected tasks?`)) return; dispatch({ type: "bulk-delete-tasks", ids: selectedIds }); setSelectedIds([]); }}><Trash2 size={16} /> Delete</button>
          <button onClick={() => setSelectedIds([])}><X size={16} /> Clear</button>
        </div>
      )}
      <div className="kanban task-kanban">
        {columns.map((column) => (
          <section
            className={`kanban-column glass-panel column-border-glow column-${column.status} ${dropTarget === column.status ? "drop-target" : ""}`}
            key={column.status}
            onDragEnter={() => setDropTarget(column.status)}
            onDragLeave={() => setDropTarget(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { dispatch({ type: "move-task", id: event.dataTransfer.getData("task-id"), status: column.status }); setDraggingId(null); setDropTarget(null); }}
          >
            <h2>{column.title}<span>{tasks.filter((task) => task.status === column.status).length}</span></h2>
	        <button className="column-add-button" onClick={() => setNewTaskStatus(column.status)}><Plus size={16} /> Add task</button>
            {tasks.filter((task) => task.status === column.status).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                dragging={draggingId === task.id}
                checked={selectedIds.includes(task.id)}
                onCheck={(checked) => setSelectedIds((ids) => checked ? [...ids, task.id] : ids.filter((id) => id !== task.id))}
                onOpen={() => setActiveTaskId(task.id)}
                onDragStart={() => setDraggingId(task.id)}
                onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
              />
            ))}
            {!tasks.some(task => task.status === column.status) && <div className="column-empty">
              {column.status === "done" ? <CheckCircle2 size={24} /> : column.status === "in-progress" ? <Play size={24} /> : <CheckSquare size={24} />}
              <strong>{query || priority !== "all" || category !== "all" ? "No matching tasks" : column.status === "todo" ? "A clear place to start" : column.status === "in-progress" ? "One thing at a time" : "Make room for your wins"}</strong>
              <p>{query || priority !== "all" || category !== "all" ? "Try a different search or filter." : column.status === "todo" ? "Add the next small step toward your study goal." : column.status === "in-progress" ? "Move a task here when you're ready to work on it." : "Completed tasks will appear here. Every step counts."}</p>
            </div>}
          </section>
        ))}
      </div>
      {activeTask && <TaskDetailModal task={activeTask} onClose={() => setActiveTaskId(null)} />}
      {newTaskStatus && <NewTaskModal status={newTaskStatus} onClose={() => setNewTaskStatus(null)} />}
      {columnModal && (
        <Portal><div className="modal">
          <div className="modal-panel task-list-modal clean-task-list-modal" role="dialog" aria-modal="true" aria-labelledby="task-list-title">
            <div className="modal-title">
              <div>
                <h2 id="task-list-title">{columns.find((column) => column.status === columnModal)?.title} tasks</h2>
                <p>{tasks.filter((task) => task.status === columnModal).length} tasks in this column</p>
              </div>
              <button className="ghost icon-only" onClick={() => setColumnModal(null)} aria-label="Close task list" title="Close task list"><X size={18} /></button>
            </div>
            <div className="task-list-head"><span>Task</span><span>Due</span><span>Progress</span><span /></div>
            <div className="task-modal-list clean-task-modal-list">
              {tasks.filter((task) => task.status === columnModal).map((task) => (
                <CompactTaskRow
                  key={task.id}
                  task={task}
                  onOpen={() => { setColumnModal(null); setActiveTaskId(task.id); }}
                />
              ))}
            </div>
          </div>
        </div></Portal>
      )}
    </div>
  );
}

function CompactTaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { dispatch } = useAppStore();
  const overdue = task.status !== "done" && Boolean(task.dueDate) && task.dueDate < today();
  return (
    <article className={`compact-task-row priority-${task.priority} ${overdue ? "overdue" : ""}`}>
      <div className="compact-task-body">
        <h3>{task.title || "Untitled task"}</h3>
        <div className="event-meta"><span>{task.category || "General"}</span><span className={`pill ${task.priority}`}>{task.priority}</span></div>
      </div>
      <div className={`compact-due ${overdue ? "overdue-text" : ""}`}>{task.dueDate}</div>
      <div className="compact-progress"><strong>{task.actualPomodoros}/{task.estimatedPomodoros}</strong><span>pomodoros</span></div>
      <div className="item-actions">
	        <button className="ghost icon-only" onClick={onOpen} title="Edit task" aria-label={`Edit task ${task.title}`}><Pencil size={15} /></button>
	        <button className="ghost icon-only danger-text" onClick={async () => { if (await confirmAction(`Delete “${task.title}”?`)) dispatch({ type: "delete-task", id: task.id }); }} title="Delete task" aria-label={`Delete task ${task.title}`}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function TaskCard({ task, checked, dragging, onCheck, onOpen, onDragStart, onDragEnd }: { task: Task; checked: boolean; dragging: boolean; onCheck: (checked: boolean) => void; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const { dispatch } = useAppStore();
  const subtasksDone = task.subtasks.filter((subtask) => subtask.done).length;
  const subtaskProgress = task.subtasks.length ? Math.round((subtasksDone / task.subtasks.length) * 100) : 0;
  const pomoProgress = Math.min(100, Math.round((task.actualPomodoros / Math.max(1, task.estimatedPomodoros)) * 100));
  const overdue = task.status !== "done" && Boolean(task.dueDate) && task.dueDate < today();

  return (
    <article className={`task-card glass-card drag-bounce priority-${task.priority} ${overdue ? "overdue" : ""} ${dragging ? "dragging" : ""}`} draggable onDragStart={(event) => { event.dataTransfer.setData("task-id", task.id); onDragStart(); }} onDragEnd={onDragEnd}>
      <div className="task-top">
        <label className="select-box"><input aria-label={`Select ${task.title}`} type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} /><CheckSquare size={15} /></label>
        <span className={`pill ${task.priority}`}>{task.priority}</span>
	        <button className="ghost icon-only" onClick={async () => { if (await confirmAction(`Delete “${task.title}”?`)) dispatch({ type: "delete-task", id: task.id }); }} title="Delete task" aria-label={`Delete task ${task.title}`}><Trash2 size={15} /></button>
	      </div>
	      <button className="task-title-button" onClick={onOpen}>{task.title}</button>
      {task.description && <p>{task.description}</p>}
      <div className="task-meta"><span>{task.category}</span><span className={overdue ? "overdue-text" : ""}>{overdue && <AlertTriangle size={13} />} {task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }) : "No deadline"}</span></div>
      {task.subtasks.length > 0 && <><div className="progress-row"><span>Subtasks</span><b>{subtasksDone}/{task.subtasks.length}</b></div><div className="bar"><span style={{ width: `${subtaskProgress}%` }} /></div></>}
      <div className="progress-row"><span>Pomodoros</span><b>{task.actualPomodoros}/{task.estimatedPomodoros}</b></div>
      <div className="bar accent"><span style={{ width: `${pomoProgress}%` }} /></div>
    </article>
  );
}

function FilterMenu({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (value: string) => void }) {
  return <Select className="task-filter" aria-label={options[0][1]} value={value} onChange={event => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</Select>;
}

function NewTaskModal({ status, onClose }: { status: TaskStatus; onClose: () => void }) {
  const { dispatch } = useAppStore();
  const [task, setTask] = useState<Task>({
    id: crypto.randomUUID(),
    title: "",
    description: "",
    status,
    priority: "medium",
    dueDate: today(),
    createdAt: new Date().toISOString(),
    estimatedPomodoros: 2,
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
          <label>Estimated Pomodoros<input type="number" min={1} value={task.estimatedPomodoros} onChange={(event) => setTask({ ...task, estimatedPomodoros: Math.max(1, Number(event.target.value) || 1) })} /></label>
        </div>
        <button className="primary" onClick={save} disabled={!task.title.trim()}>Create task</button>
      </div>
    </div></Portal>
  );
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
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
          <label>Estimated Pomodoros <input type="number" min={1} value={local.estimatedPomodoros} onChange={(event) => setLocal({ ...local, estimatedPomodoros: Math.max(1, Number(event.target.value) || 1) })} /></label>
        </div>
        <div className="detail-stats">
          <span>{timeSpent} min linked</span>
          <span>{linkedSessions.length} sessions</span>
          <span>{Math.round((timeSpent / Math.max(1, local.estimatedPomodoros * state.settings.focusDuration)) * 100)}% of estimate</span>
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
        <div className="task-detail-actions">
          <button className="primary" onClick={focusTask} disabled={!local.title.trim()}><Play size={16} /> Focus on task</button>
          <button onClick={save} disabled={!local.title.trim()}>Save task</button>
        </div>
      </div>
    </div></Portal>
  );
}

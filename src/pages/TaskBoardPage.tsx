import { isPlanDate, shiftDate, tasksForDate, type TaskDateScope } from "../utils/planning";
import { taskPomodoroMinutes } from "../utils/pomodoro";
import { Select } from "../components/Select";
import { confirmAction } from "../utils/confirm";
import { useEffect, useMemo, useState } from "react";
import { NewTaskModal, TaskDetailModal } from "../components/TaskModals";
import { AlertTriangle, CalendarClock, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Flame, Pencil, Play, Plus, Search, Trash2, X, LayoutGrid, List } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/Layout";
import { useAppStore } from "../store/AppStore";
import { Priority, Task, TaskStatus } from "../types";
import { dateKey } from "../utils/stats";

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
  const dateParam = searchParams.get('date');
  const selectedDate = isPlanDate(dateParam) ? dateParam : today();
  const scope: TaskDateScope = searchParams.get('scope') === 'all' ? 'all' : searchParams.get('scope') === 'unscheduled' ? 'unscheduled' : 'day';
  const changeDate = (date: string, nextScope: TaskDateScope = 'day') => {
    const params = new URLSearchParams(searchParams);
    params.set('date',date);
    if (nextScope === 'day') params.delete('scope'); else params.set('scope',nextScope);
    setSearchParams(params);
    setSelectedIds([]);
  };
  const scopeTasks = useMemo(() => tasksForDate(state.tasks,selectedDate,scope), [state.tasks,selectedDate,scope]);
  const unscheduledCount = state.tasks.filter(task=>!task.plannedDate).length;
  const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'});
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);
  const [view, setView] = useState<'board' | 'list'>(() => {try {return localStorage.getItem('studytrack.taskView') === 'list' ? 'list' : 'board';} catch {return 'board';}});
  const [deadline, setDeadline] = useState('all');
  useEffect(() => {try {localStorage.setItem('studytrack.taskView',view);}catch {}},[view]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") setNewTaskStatus("todo");
    const id = searchParams.get("task");
    if (id) setActiveTaskId(id);
    if (searchParams.has("new") || searchParams.has("task")) {
      const params = new URLSearchParams(searchParams);
      params.delete('new');params.delete('task');
      const task = state.tasks.find(task=>task.id===id);
      if(task) {
        if(task.plannedDate) {params.set('date',task.plannedDate);params.delete('scope');}
        else params.set('scope','unscheduled');
      }
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, state.tasks]);
  useEffect(() => {setSelectedIds([]);},[selectedDate,scope]);
  useEffect(() => {setSelectedIds(ids => ids.filter(id => scopeTasks.some(task => task.id === id)));}, [scopeTasks]);

  const categories = Array.from(new Set(state.tasks.map((task) => task.category))).filter(Boolean);
  const tasks = useMemo(() => {
    const filtered = scopeTasks.filter((task) => {
      const matchesQuery = `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(query.toLowerCase());
      const matchesDeadline = deadline === 'all' || (deadline === 'today' && task.dueDate === today() && task.status !== 'done') || (deadline === 'overdue' && !!task.dueDate && task.dueDate < today() && task.status !== 'done') || (deadline === 'undated' && !task.dueDate) || (deadline === 'planned' && task.plannedDate === today());
      return matchesDeadline && matchesQuery && (priority === "all" || task.priority === priority) && (category === "all" || task.category === category);
    });
    return filtered.sort((a, b) => {
      if (sortBy === "priority") return priorityScore[a.priority] - priorityScore[b.priority];
      if (sortBy === "createdAt") return b.createdAt.localeCompare(a.createdAt);
      return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
    });
  }, [scopeTasks, query, priority, category, sortBy, deadline]);

  const activeTask = state.tasks.find((task) => task.id === activeTaskId) ?? null;
  const overdueCount = scopeTasks.filter((task) => task.status !== "done" && Boolean(task.dueDate) && task.dueDate < today()).length;
  const highCount = scopeTasks.filter((task) => task.status !== "done" && task.priority === "high").length;
  const doneCount = scopeTasks.filter((task) => task.status === "done").length;
  const completion = Math.round((doneCount / Math.max(1, scopeTasks.length)) * 100);
  const nextDue = scopeTasks.filter((task) => task.status !== "done" && task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <div className="tasks-page page-transition">
      <PageHeader eyebrow="Workspace" title="Your study plan" description="One day at a time. Choose a date to see its tasks and progress." action={<button className="primary task-create-button" onClick={() => setNewTaskStatus("todo")}><Plus size={16} /> New Task</button>} />
      <section className="task-date-section" aria-label="Choose task day">
        <div className="task-date-navigation"><div className="plan-date-controls"><button className="ghost icon-only" aria-label="Previous task day" onClick={()=>changeDate(shiftDate(selectedDate,-1))}><ChevronLeft size={18}/></button><label><span className="sr-only">Task date</span><input aria-label="Task date" type="date" value={selectedDate} onChange={e=>{if(isPlanDate(e.target.value))changeDate(e.target.value);}}/></label><button className="ghost icon-only" aria-label="Next task day" onClick={()=>changeDate(shiftDate(selectedDate,1))}><ChevronRight size={18}/></button></div><div className="segmented"><button aria-pressed={scope==='day' && selectedDate===today()} onClick={()=>changeDate(today())}>Today</button><button aria-pressed={scope==='day' && selectedDate===shiftDate(today(),1)} onClick={()=>changeDate(shiftDate(today(),1))}>Tomorrow</button></div></div>
        <div className="task-date-scope"><div className="segmented" aria-label="Task date scope"><button aria-pressed={scope==='day'} onClick={()=>changeDate(selectedDate)}>Selected day</button><button aria-pressed={scope==='unscheduled'} onClick={()=>changeDate(selectedDate,'unscheduled')}>Unscheduled{unscheduledCount>0 && <span className="scope-count">{unscheduledCount}</span>}</button><button aria-pressed={scope==='all'} onClick={()=>changeDate(selectedDate,'all')}>All tasks</button></div><p>{scope==='day' ? dateLabel : scope==='unscheduled' ? 'Tasks without a study-plan date' : 'Your complete task library'} · {scopeTasks.length} {scopeTasks.length===1?'task':'tasks'}</p></div>
        {scope==='day' && !scopeTasks.length && unscheduledCount>0 && <p className="task-date-hint">Have existing tasks to plan? <button className="text-action" onClick={()=>changeDate(selectedDate,'unscheduled')}>View {unscheduledCount} unscheduled</button></p>}
      </section>
      <section className="task-alert-grid" aria-label="Task summary for current view">
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
      <div className="task-viewbar"><div className="segmented" aria-label="Task view"><button aria-pressed={view==='board'} onClick={()=>setView('board')}><LayoutGrid size={15}/> Board</button><button aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={15}/> List</button></div><Select aria-label="Deadline filter" value={deadline} onChange={e=>setDeadline(e.target.value)}><option value="all">Any deadline</option><option value="today">Due today</option><option value="overdue">Overdue</option><option value="undated">No deadline</option><option value="planned">Planned for today</option></Select><span>{tasks.length} matching {tasks.length===1?'task':'tasks'}</span></div>
      {selectedIds.length > 0 && (
        <div className="bulk-bar">
          <strong>{selectedIds.length} selected</strong><button onClick={()=>dispatch({type:"schedule-tasks",ids:selectedIds,date:selectedDate})}><CalendarClock size={15}/> Plan for {new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], {month:"short",day:"numeric"})}</button>
          <Select aria-label="Move selected tasks" onChange={(event) => event.target.value && dispatch({ type: "bulk-move-tasks", ids: selectedIds, status: event.target.value as TaskStatus })} defaultValue="">
            <option value="">Move to...</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option>
          </Select>
          <button className="danger" onClick={async () => { if (!await confirmAction(`Delete ${selectedIds.length} selected tasks?`)) return; dispatch({ type: "bulk-delete-tasks", ids: selectedIds }); setSelectedIds([]); }}><Trash2 size={16} /> Delete</button>
          <button onClick={() => setSelectedIds([])}><X size={16} /> Clear</button>
        </div>
      )}
      {view === 'list' ? <section className="panel task-list-view" aria-label="Task list">{tasks.map(task=><CompactTaskRow key={task.id} task={task} onOpen={()=>setActiveTaskId(task.id)}/>)}{!tasks.length && <div className="plan-empty"><Search size={26}/><h3>No matching tasks</h3><p>Adjust your filters or add a new task.</p></div>}</section> : <div className="kanban task-kanban">
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
              <strong>{query || priority !== "all" || category !== "all" || deadline !== "all" ? "No matching tasks" : column.status === "todo" ? "A clear place to start" : column.status === "in-progress" ? "One thing at a time" : "Make room for your wins"}</strong>
              <p>{query || priority !== "all" || category !== "all" || deadline !== "all" ? "Try a different search or filter." : column.status === "todo" ? scope === "day" ? "Add a task for this day, or choose a different date." : "Capture a task and give it a study date when you’re ready." : column.status === "in-progress" ? "Move a task here when you're ready to work on it." : "Completed tasks will appear here. Every step counts."}</p>
            </div>}
          </section>
        ))}
      </div>}
      {activeTask && <TaskDetailModal task={activeTask} onClose={() => setActiveTaskId(null)} />}
      {newTaskStatus && <NewTaskModal plannedDate={scope==='unscheduled'?undefined:selectedDate} status={newTaskStatus} onClose={() => setNewTaskStatus(null)} />}

    </div>
  );
}

function CompactTaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { state, dispatch } = useAppStore();
  const overdue = task.status !== "done" && Boolean(task.dueDate) && task.dueDate < today();
  return (
    <article className={`compact-task-row priority-${task.priority} ${overdue ? "overdue" : ""}`}>
      <div className="compact-task-body">
        <button className="task-list-title" onClick={onOpen}>{task.title || "Untitled task"}</button>
        <div className="event-meta"><span>{task.category || "General"} · {columns.find(c=>c.status===task.status)?.title}</span><span className={`pill ${task.priority}`}>{task.priority}</span></div>
      </div>
      <div className={`compact-due ${overdue ? "overdue-text" : ""}`}>{task.dueDate || "No deadline"}</div>
      <div className="compact-progress"><strong>{task.actualPomodoros}/{task.estimatedPomodoros}</strong><span>× {taskPomodoroMinutes(task,state.settings.focusDuration)} min</span></div>
      <div className="item-actions">
	        <button className="ghost icon-only" onClick={onOpen} title="Edit task" aria-label={`Edit task ${task.title}`}><Pencil size={15} /></button>
	        <button className="ghost icon-only danger-text" onClick={async () => { if (await confirmAction(`Delete “${task.title}”?`)) dispatch({ type: "delete-task", id: task.id }); }} title="Delete task" aria-label={`Delete task ${task.title}`}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function TaskCard({ task, checked, dragging, onCheck, onOpen, onDragStart, onDragEnd }: { task: Task; checked: boolean; dragging: boolean; onCheck: (checked: boolean) => void; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const { state, dispatch } = useAppStore();
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
      <div className="progress-row"><span>Pomodoros · {taskPomodoroMinutes(task,state.settings.focusDuration)} min each</span><b>{task.actualPomodoros}/{task.estimatedPomodoros}</b></div>
      <div className="bar accent"><span style={{ width: `${pomoProgress}%` }} /></div>
    </article>
  );
}

function FilterMenu({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (value: string) => void }) {
  return <Select className="task-filter" aria-label={options[0][1]} value={value} onChange={event => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</Select>;
}

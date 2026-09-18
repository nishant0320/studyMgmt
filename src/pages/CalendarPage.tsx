import { CategorySelect } from "../components/CategorySelect";
import { NewTaskModal, TaskDetailModal } from "../components/TaskModals";
import { confirmAction } from "../utils/confirm";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/Layout";
import { showToast } from "../utils/toast";
import { Portal } from "../components/Portal";
import type React from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  X,
  Zap,
  CheckCircle2
} from "lucide-react";
import { useAppStore } from "../store/AppStore";
import { CalendarEvent, Priority, Task } from "../types";
import { currentStreak, dateKey } from "../utils/stats";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const categoryColors = ["var(--accent-2)", "var(--accent-3)", "var(--accent)", "var(--good)", "var(--warning)", "var(--critical)", "var(--accent-soft)"];
const priorityColor: Record<Priority, string> = { high: "var(--critical)", medium: "var(--warning)", low: "var(--good)" };

type CalendarCell = { date: Date; isCurrentMonth: boolean };

export function CalendarPage() {
  const { state, dispatch } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventCategory, setEventCategory] = useState("General");
  const [eventDate, setEventDate] = useState(dateKey(new Date()));
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [calendarModal, setCalendarModal] = useState<null | "tasks" | "events" | "sessions">(null);
  const [navKey, setNavKey] = useState(0);

  useEffect(() => {
    if (!calendarModal && !showModal) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showModal) closeEventModal();
      else setCalendarModal(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [calendarModal, showModal]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const dailyGoal = state.settings.dailyGoalMinutes || 60;

  const calendarDays = useMemo<CalendarCell[]>(() => {
    const days: CalendarCell[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDayOfMonth - 1; i >= 0; i -= 1) days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i += 1) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    while (days.length < 42) days.push({ date: new Date(year, month + 1, days.length - firstDayOfMonth - daysInMonth + 1), isCurrentMonth: false });
    return days;
  }, [year, month]);

  const weekDays = useMemo<CalendarCell[]>(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { date, isCurrentMonth: date.getMonth() === month };
    });
  }, [selectedDate, month]);

  const getSessionsForDate = (date: Date) => state.sessions.filter((session) => new Date(session.startTime).toDateString() === date.toDateString());
  const getEventsForDate = (date: Date) => state.events.filter((event) => new Date(`${event.date}T00:00:00`).toDateString() === date.toDateString());
  const getTasksForDate = (date: Date) => state.tasks.filter((task) => (task.plannedDate || task.dueDate) === dateKey(date));
  const getStudyTimeForDate = (date: Date) => getSessionsForDate(date).reduce((sum, session) => sum + (session.type === "focus" ? session.actualDuration : 0), 0);
  const isGoalMet = (minutes: number) => minutes >= dailyGoal;
  const getHeatmapIntensity = (minutes: number) => {
    if (minutes === 0) return 0;
    if (minutes < dailyGoal * 0.25) return 1;
    if (minutes < dailyGoal * 0.5) return 2;
    if (minutes < dailyGoal) return 3;
    return 4;
  };

  const monthStats = useMemo(() => {
    const monthSessions = state.sessions.filter((session) => {
      const date = new Date(session.startTime);
      return date.getMonth() === month && date.getFullYear() === year && session.type === "focus";
    });
    const dailyTotals = monthSessions.reduce<Record<string, number>>((map, session) => {
      const key = new Date(session.startTime).toDateString();
      map[key] = (map[key] ?? 0) + session.actualDuration;
      return map;
    }, {});
    return {
      totalTime: monthSessions.reduce((sum, session) => sum + session.actualDuration, 0),
      activeDays: Object.keys(dailyTotals).length,
      sessions: monthSessions.length,
      goalsMetDays: Object.values(dailyTotals).filter((minutes) => minutes >= dailyGoal).length,
      streak: currentStreak(state),
    };
  }, [state, month, year, dailyGoal]);

  const selectedEvents = getEventsForDate(selectedDate);
  const selectedTasks = getTasksForDate(selectedDate);
  const selectedSessions = getSessionsForDate(selectedDate);
  const selectedTotalTime = getStudyTimeForDate(selectedDate);
  const selectedGoalProgress = Math.min(100, Math.round((selectedTotalTime / dailyGoal) * 100));
  const selectedGoalMet = isGoalMet(selectedTotalTime);
  const displayDays = viewMode === "week" ? weekDays : calendarDays;

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const navigate = (delta: number) => {
    setNavKey(prev => prev + 1);
    if (viewMode === "week") {
      const next = new Date(selectedDate);
      next.setDate(selectedDate.getDate() + delta * 7);
      setSelectedDate(next);
      setCurrentDate(next);
      return;
    }
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const goToToday = () => {
    setNavKey(prev => prev + 1);
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const openEventModal = (event?: CalendarEvent) => {
    setCalendarModal(null);
    setEditingEventId(event?.id ?? null);
    setEventTitle(event?.title ?? "");
    setEventCategory(event?.category ?? "General");
    setEventDate(event?.date ?? dateKey(selectedDate));
    setEventStartTime(event?.startTime ?? "");
    setEventEndTime(event?.endTime ?? "");
    setEventNotes(event?.notes ?? "");
    setShowModal(true);
  };

  const closeEventModal = () => {
    setShowModal(false);
    setEditingEventId(null);
    setEventTitle("");
    setEventCategory("General");
    setEventDate(dateKey(selectedDate));
    setEventStartTime("");
    setEventEndTime("");
    setEventNotes("");
  };

  const saveEvent = () => {
    if (!eventTitle.trim() || !eventDate) return;
    if (eventStartTime && eventEndTime && eventEndTime <= eventStartTime) { showToast("End time must be after the start time", "warning"); return; }
    const color = categoryColors[Math.abs(eventCategory.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % categoryColors.length];
    const eventData: CalendarEvent = {
      id: editingEventId ?? crypto.randomUUID(),
      title: eventTitle.trim(),
      date: eventDate,
      category: eventCategory.trim() || "General",
      color,
      startTime: eventStartTime || undefined,
      endTime: eventStartTime && eventEndTime ? eventEndTime : undefined,
      notes: eventNotes.trim() || undefined,
    };
    if (editingEventId) {
      dispatch({ type: "update-event", event: eventData });
    } else {
      dispatch({ type: "add-event", event: eventData });
    }
    closeEventModal();
  };

  const openTaskModal = (task?: Task) => {
    setCalendarModal(null);
    setEditingTaskId(task?.id ?? null);
    setShowTaskModal(!task);
  };
  const editingTask = state.tasks.find(task => task.id === editingTaskId);

  return (
    <div className="calendar-page calendar-command page-transition">
      <PageHeader eyebrow="Workspace" title="Calendar" description="A little structure for your days. A clear view of what’s next." action={<button className="primary" onClick={() => openEventModal()}><Plus size={16} /> New event</button>} />
      <div className="calendar-main glass-panel">
        <header className="calendar-header">
          <div className="calendar-nav">
            <button className="nav-btn transition-transform" onClick={() => navigate(-1)} aria-label={viewMode === "week" ? "Previous week" : "Previous month"} title={viewMode === "week" ? "Previous week" : "Previous month"}><ChevronLeft size={18} /></button>
            <h2 className="nav-title" key={navKey}>{viewMode === "week" ? `Week of ${weekDays[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : `${monthNames[month]} ${year}`}</h2>
            <button className="nav-btn transition-transform" onClick={() => navigate(1)} aria-label={viewMode === "week" ? "Next week" : "Next month"} title={viewMode === "week" ? "Next week" : "Next month"}><ChevronRight size={18} /></button>
          </div>
          <div className="header-actions">
            <div className="view-toggle">
              <button className={`toggle-btn ${viewMode === "month" ? "active" : ""}`} onClick={() => setViewMode("month")}><Calendar size={14} /> Month</button>
              <button className={`toggle-btn ${viewMode === "week" ? "active" : ""}`} onClick={() => setViewMode("week")}><TrendingUp size={14} /> Week</button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={goToToday}>Today</button>
          </div>
        </header>

        <div className="streak-banner">
          <StatCard icon={<Flame size={20} />} tone="fire" value={monthStats.streak} label="Day Streak" />
          <StatCard icon={<Target size={20} />} tone="target" value={monthStats.goalsMetDays} label="Goals Met" />
          <StatCard icon={<Zap size={20} />} tone="zap" value={formatTime(monthStats.totalTime)} label="This Month" />
          <StatCard icon={<Award size={20} />} tone="award" value={monthStats.activeDays} label="Active Days" />
        </div>

        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-squares">
            {[0, 1, 2, 3, 4].map((item) => <div key={item} className={`legend-square intensity-${item}`} />)}
          </div>
          <span className="legend-label">More</span>
          <span className="legend-goal">Goal met: {formatTime(dailyGoal)}</span>
        </div>

        <div className={`calendar-grid command-calendar-grid fade-enter-active ${viewMode === "week" ? "week-view" : ""}`} key={`grid-${navKey}`}>
          {dayNames.map((day) => <div key={day} className="calendar-day-header">{day}</div>)}
          {displayDays.map((day, index) => {
            const events = getEventsForDate(day.date);
            const tasks = getTasksForDate(day.date);
            const markers = [
              ...tasks.map((task) => ({ id: `task-${task.id}`, color: priorityColor[task.priority], shape: "task", title: task.title })),
              ...events.map((event) => ({ id: `event-${event.id}`, color: event.color, shape: "event", title: event.title })),
            ];
            const totalTime = getStudyTimeForDate(day.date);
            const intensity = getHeatmapIntensity(totalTime);
            const today = day.date.toDateString() === new Date().toDateString();
            const selected = day.date.toDateString() === selectedDate.toDateString();
            const goalMet = isGoalMet(totalTime);
            return (
              <div
                key={`${day.date.toISOString()}-${index}`}
                className={`calendar-day intensity-${intensity} ${goalMet ? "goal-met" : ""} ${markers.length ? "has-markers" : ""} ${!day.isCurrentMonth ? "other-month" : ""} ${today ? "today" : ""} ${selected ? "selected" : ""} ${viewMode === "week" ? "week-day" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${dateKey(day.date)}, ${formatTime(totalTime)} studied, ${tasks.length} tasks, ${events.length} events${goalMet ? ", goal met" : ""}`}
                title={`${dateKey(day.date)} - ${formatTime(totalTime)} studied${goalMet ? " - goal met" : ""}`}
                onClick={() => setSelectedDate(day.date)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDate(day.date);
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("task-id");
                  if (!state.tasks.some(task => task.id === id)) return;
                  dispatch({ type: "schedule-tasks", ids: [id], date: dateKey(day.date) });
                  setSelectedDate(day.date);
                }}
              >
                <div className="day-header">
                  {today && <span className="today-indicator" />}
                  <div className={`day-number ${today ? 'today-pulse' : ''}`}>{day.date.getDate()}</div>
                  {goalMet && <div className="goal-badge animated-checkmark" title="Goal met"><CheckCircle2 size={14} className="bounce-animation" /></div>}
                </div>
                {totalTime > 0 && <div className="day-time">{formatTime(totalTime)}</div>}
                <div className="day-indicators">
                  {markers.slice(0, 2).map(item => <div key={item.id} className="calendar-event-chip" style={{ borderLeftColor: item.color }} title={item.title}>{item.title}</div>)}
                  {markers.length > 2 && <span className="more-dots">+{markers.length - 2} more</span>}
                </div>
              </div>
            );
          })}
        </div>
        <section className="calendar-underbar">
          <article>
            <BookOpen size={16} />
            <strong>{formatTime(selectedTotalTime)}</strong>
            <span>focused on selected day</span>
          </article>
          <article>
            <Target size={16} />
            <strong>{selectedTasks.length}</strong>
            <span>tasks &amp; deadlines</span>
          </article>
          <article>
            <CalendarPlus size={16} />
            <strong>{selectedEvents.length}</strong>
            <span>events scheduled</span>
          </article>
        </section>
      </div>

      <aside className="calendar-sidebar glass-panel">
        <div className="sidebar-date">
          <div className="selected-day">{selectedDate.getDate()}</div>
          <div className="selected-info">
            <span className="selected-weekday">{dayNames[selectedDate.getDay()]}</span>
            <span className="selected-month">{monthNames[selectedDate.getMonth()]}</span>
          </div>
        </div>

        <div className="goal-progress-card">
          <div className="goal-header">
            <Target size={16} />
            <span>Daily Goal</span>
            {selectedGoalMet && <span className="goal-achieved" style={{ color: "var(--good)", textShadow: "0 0 10px var(--good)" }}>Achieved</span>}
          </div>
          <div className="goal-bar-container"><div className={`goal-bar-fill ${selectedGoalMet ? "complete" : ""}`} style={{ width: `${selectedGoalProgress}%`, background: selectedGoalMet ? "var(--good)" : "linear-gradient(90deg, var(--accent), var(--accent-hover))" }} /></div>
          <div className="goal-stats"><span>{formatTime(selectedTotalTime)} / {formatTime(dailyGoal)}</span><span>{selectedGoalProgress}%</span></div>
        </div>

        <SidebarSection title="Tasks" action={<div className="section-actions">{selectedTasks.length > 2 && <button className="add-btn muted-btn" onClick={() => setCalendarModal("tasks")} aria-label="View all tasks for selected day" title="View all tasks for selected day">{selectedTasks.length}</button>}<button className="add-btn" onClick={() => openTaskModal()} aria-label="Add task for selected day" title="Add task"><Plus size={15} /></button></div>}>
          {selectedTasks.length === 0 ? <div className="empty-state compact">No tasks planned or due</div> : selectedTasks.slice(0, 2).map((task) => (
            <div key={task.id} className="event-item task-event" draggable onDragStart={(event) => event.dataTransfer.setData("task-id", task.id)}>
              <div className="event-color" style={{ background: priorityColor[task.priority] }} />
              <div className="event-details"><div className="event-title">{task.title}</div><div className="event-meta"><span>{task.category}</span><span>{task.priority}</span><span>{task.plannedDate ? "Planned" : "Deadline · unscheduled"}</span></div></div>
              <div className="item-actions">
                <button className="ghost icon-only" onClick={() => openTaskModal(task)} title="Edit task" aria-label={`Edit task ${task.title}`}><Pencil size={14} /></button>
                <button className="ghost icon-only danger-text" onClick={async () => { if (await confirmAction(`Delete “${task.title}”?`)) dispatch({ type: "delete-task", id: task.id }); }} title="Delete task" aria-label={`Delete task ${task.title}`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </SidebarSection>

        <SidebarSection title="Events" action={<button className="add-btn" onClick={() => openEventModal()} aria-label="Add event for selected day" title="Add event"><Plus size={15} /></button>}>
          {selectedEvents.length === 0 ? <div className="empty-state compact">No events scheduled</div> : selectedEvents.slice(0, 2).map((event) => (
            <div key={event.id} className="event-item">
              <div className="event-color" style={{ background: event.color }} />
              <div className="event-details"><div className="event-title">{event.title}</div><div className="event-meta"><span>{event.category}</span><span>{formatEventTime(event)}</span></div>{event.notes && <small className="event-note-preview">{event.notes}</small>}</div>
              <div className="item-actions">
                <button className="ghost icon-only" onClick={() => openEventModal(event)} title="Edit event" aria-label={`Edit event ${event.title}`}><Pencil size={14} /></button>
                <button className="ghost icon-only danger-text" onClick={async () => { if (await confirmAction(`Delete “${event.title}”?`)) dispatch({ type: "delete-event", id: event.id }); }} title="Delete event" aria-label={`Delete event ${event.title}`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {selectedEvents.length > 2 && <button className="view-all-link" onClick={() => setCalendarModal("events")}>View all events</button>}
        </SidebarSection>

        {selectedSessions.length > 0 && (
          <SidebarSection title="Sessions" action={selectedSessions.length > 2 ? <button className="add-btn muted-btn" onClick={() => setCalendarModal("sessions")} aria-label="View all sessions for selected day" title="View all sessions">{selectedSessions.length}</button> : undefined}>
            {selectedSessions.slice(0, 2).map((session) => (
              <div key={session.id} className="session-item">
                <BookOpen size={14} />
                <span className="session-time">{session.actualDuration}m</span>
                <span className="session-mode">{session.category}</span>
              </div>
            ))}
          </SidebarSection>
        )}
      </aside>

      {calendarModal && (
        <Portal><div className="modal">
          <div className="modal-panel calendar-list-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-list-title">
            <div className="modal-title"><h2 id="calendar-list-title">{calendarModal === "tasks" ? "Tasks" : calendarModal === "events" ? "Events" : "Sessions"} on {dateKey(selectedDate)}</h2><button className="ghost icon-only" onClick={() => setCalendarModal(null)} aria-label="Close list modal" title="Close list modal"><X size={18} /></button></div>
            <div className="event-list">
              {calendarModal === "tasks" && selectedTasks.map((task) => (
                <div key={task.id} className="event-item"><div className="event-color" style={{ background: priorityColor[task.priority] }} /><div className="event-details"><div className="event-title">{task.title}</div><div className="event-meta"><span>{task.category}</span><span>{task.priority}</span><span>{task.plannedDate ? "Planned" : "Deadline · unscheduled"}</span><span>{task.estimatedPomodoros} pomodoros</span></div></div><div className="item-actions"><button className="ghost icon-only" onClick={() => openTaskModal(task)} title="Edit task" aria-label={`Edit task ${task.title}`}><Pencil size={14} /></button><button className="ghost icon-only danger-text" onClick={async () => { if (await confirmAction(`Delete “${task.title}”?`)) dispatch({ type: "delete-task", id: task.id }); }} title="Delete task" aria-label={`Delete task ${task.title}`}><Trash2 size={14} /></button></div></div>
              ))}
              {calendarModal === "events" && selectedEvents.map((event) => (
                <div key={event.id} className="event-item"><div className="event-color" style={{ background: event.color }} /><div className="event-details"><div className="event-title">{event.title}</div><div className="event-meta"><span>{event.category}</span><span>{formatEventTime(event)}</span></div>{event.notes && <small className="event-note-preview">{event.notes}</small>}</div><div className="item-actions"><button className="ghost icon-only" onClick={() => openEventModal(event)} title="Edit event" aria-label={`Edit event ${event.title}`}><Pencil size={14} /></button><button className="ghost icon-only danger-text" onClick={async () => { if (await confirmAction(`Delete “${event.title}”?`)) dispatch({ type: "delete-event", id: event.id }); }} title="Delete event" aria-label={`Delete event ${event.title}`}><Trash2 size={14} /></button></div></div>
              ))}
              {calendarModal === "sessions" && selectedSessions.map((session) => (
                <div key={session.id} className="session-item"><BookOpen size={14} /><span className="session-time">{session.actualDuration}m</span><span className="session-mode">{session.category} - {new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
              ))}
            </div>
          </div>
        </div></Portal>
      )}

      {showModal && (
        <Portal><div className="modal">
          <div className="modal-panel event-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
            <h2 id="event-modal-title">{editingEventId ? "Edit Event" : "Add Event"}</h2>
            <label>Title<input autoFocus value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title" /></label>
            <label>Date<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
            <div className="two-col">
              <label>Start time<input type="time" value={eventStartTime} onChange={(event) => setEventStartTime(event.target.value)} /></label>
              <label>End time<input type="time" value={eventEndTime} min={eventStartTime || undefined} disabled={!eventStartTime} onChange={(event) => setEventEndTime(event.target.value)} /></label>
            </div>
            <label>Category<CategorySelect value={eventCategory} onChange={setEventCategory}/></label>
            <label>Notes<textarea value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} placeholder="Location, preparation, or context" /></label>
            <div className="modal-actions"><button onClick={closeEventModal}>Cancel</button><button className="primary" onClick={saveEvent} disabled={!eventTitle.trim() || !eventDate}><CalendarPlus size={16} /> Save Event</button></div>
          </div>
        </div></Portal>
      )}

      {showTaskModal && <NewTaskModal status="todo" plannedDate={dateKey(selectedDate)} onClose={() => setShowTaskModal(false)} />}
      {editingTask && <TaskDetailModal key={editingTask.id} task={editingTask} onClose={() => setEditingTaskId(null)} />}

    </div>
  );
}

function StatCard({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string | number; label: string }) {
  return (
    <div className={`streak-item glass-card gradient-${tone}`}>
      <div className={`streak-icon ${tone}`}>{icon}</div>
      <div className="streak-info">
        <span className="streak-value">{value}</span>
        <span className="streak-label">{label}</span>
      </div>
    </div>
  );
}

function SidebarSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="sidebar-section"><div className="section-header"><h3>{title}</h3>{action}</div><div className="event-list">{children}</div></div>;
}

function formatEventTime(event: CalendarEvent) {
  if (!event.startTime) return "All day";
  const start = new Date(`${event.date}T${event.startTime}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!event.endTime) return start;
  const end = new Date(`${event.date}T${event.endTime}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${start} - ${end}`;
}

import { taskPomodoroMinutes } from "../utils/pomodoro";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "../components/Layout";
import { Portal } from "../components/Portal";
import { useAppStore } from "../store/AppStore";
import { useActiveTimer } from "../components/ActiveTimerProvider";
import { dateKey, minutes } from "../utils/stats";
import { plannedTasks, remainingMinutes, shiftDate } from "../utils/planning";
import { showToast } from "../utils/toast";

export function PlanPage() {
  const { state, dispatch } = useAppStore();
  const timer = useActiveTimer();
  const navigate = useNavigate();
  const today = dateKey(new Date());
  const [date, setDate] = useState(today);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const queue = plannedTasks(state.tasks, date);
  const active = queue.filter((task) => task.status !== "done");
  const completed = queue.filter((task) => task.status === "done");
  const remaining = remainingMinutes(queue, state.settings.focusDuration);
  const studied = minutes(
    state.sessions.filter((session) => dateKey(session.startTime) === date),
  );
  const capacity = Math.max(0, state.settings.dailyGoalMinutes - studied);
  const events = state.events
    .filter((event) => event.date === date)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const carry = state.tasks.filter(
    (task) =>
      task.status !== "done" && task.plannedDate && task.plannedDate < date,
  );
  const candidates = state.tasks
    .filter(
      (task) =>
        task.status !== "done" &&
        task.plannedDate !== date &&
        `${task.title} ${task.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const schedule = (ids: string[]) => {
    dispatch({ type: "schedule-tasks", ids, date });
    showToast(
      ids.length === 1
        ? "Added to your plan"
        : `${ids.length} tasks carried forward`,
      "success",
    );
  };
  const reorder = (id: string, direction: number) => {
    const ids = queue.map((task) => task.id);
    const index = ids.indexOf(id);
    const next = index + direction;
    if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    dispatch({ type: "reorder-plan", date, ids });
  };
  const focus = (id: string) => {
    if (timer.startedAt && timer.selectedTask !== id) {
      showToast(
        "Finish or reset your current block before switching tasks.",
        "info",
      );
      navigate("/timer");
      return;
    }
    navigate("/timer", { state: { focusTaskId: id } });
  };
  return (
    <div className="plan-page page-transition">
      <PageHeader
        eyebrow="Workspace"
        title="Make space for focus"
        description="Choose what matters today. Your deadlines stay where they are."
        action={
          <button className="primary" onClick={() => setPicker(true)}>
            <Plus size={16} /> Add to plan
          </button>
        }
      />
      <div className="plan-datebar">
        <div className="plan-date-controls">
          <button
            className="ghost icon-only"
            aria-label="Previous plan day"
            onClick={() => setDate(shiftDate(date, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            <span className="sr-only">Plan date</span>
            <input
              aria-label="Plan date"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <button
            className="ghost icon-only"
            aria-label="Next plan day"
            onClick={() => setDate(shiftDate(date, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="segmented">
          <button aria-pressed={date === today} onClick={() => setDate(today)}>
            Today
          </button>
          <button
            aria-pressed={date === shiftDate(today, 1)}
            onClick={() => setDate(shiftDate(today, 1))}
          >
            Tomorrow
          </button>
        </div>
      </div>
      <section className="plan-summary" aria-label="Plan overview">
        <article>
          <span>On your plan</span>
          <strong>
            {active.length}
            <small> tasks remaining</small>
          </strong>
        </article>
        <article>
          <span>Estimated focus left</span>
          <strong>
            {remaining}
            <small> min</small>
          </strong>
        </article>
        <article>
          <span>Already studied</span>
          <strong>
            {studied}
            <small> / {state.settings.dailyGoalMinutes} min goal</small>
          </strong>
        </article>
        <article>
          <span>Tasks finished</span>
          <strong>
            {completed.length}
            <small> / {queue.length} planned</small>
          </strong>
        </article>
      </section>
      <div className="plan-columns">
        <section className="panel plan-queue">
          <div className="section-heading">
            <div>
              <h2>Your focus queue</h2>
              <p>
                {new Date(`${date}T12:00:00`).toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span className="pill">{queue.length} planned</span>
          </div>
          {remaining > capacity && (
            <p className="plan-capacity">
              <Clock3 size={16} /> This plan is {remaining - capacity} min above
              your remaining daily goal. Move a task to tomorrow if you want a
              lighter day.
            </p>
          )}
          {!queue.length && (
            <div className="plan-empty">
              <CalendarDays size={32} />
              <h3>A little intention goes a long way</h3>
              <p>
                Pick a few tasks for this day, then work through them one block
                at a time.
              </p>
              <button onClick={() => setPicker(true)}>
                <Plus size={15} /> Choose tasks
              </button>
            </div>
          )}
          <ol className="plan-task-list">
            {queue.map((task, index) => (
              <li
                key={task.id}
                className={`plan-task ${task.status === "done" ? "is-done" : ""}`}
              >
                <button
                  className="plan-complete"
                  aria-label={`${task.status === "done" ? "Reopen" : "Complete"} ${task.title}`}
                  aria-pressed={task.status === "done"}
                  onClick={() =>
                    dispatch({
                      type: "move-task",
                      id: task.id,
                      status: task.status === "done" ? "todo" : "done",
                    })
                  }
                >
                  {task.status === "done" ? <Check size={17} /> : index + 1}
                </button>
                <div className="plan-task-copy">
                  <button
                    onClick={() =>
                      navigate(`/tasks?task=${encodeURIComponent(task.id)}`)
                    }
                  >
                    {task.title}
                  </button>
                  <p>
                    {task.category} ·{" "}
                    {Math.max(
                      0,
                      task.estimatedPomodoros - task.actualPomodoros,
                    ) * taskPomodoroMinutes(task, state.settings.focusDuration)}{" "}
                    min left
                    {task.dueDate && (
                      <span
                        className={
                          task.dueDate < today && task.status !== "done"
                            ? "danger-text"
                            : ""
                        }
                      >
                        {" "}
                        · Due{" "}
                        {new Date(
                          `${task.dueDate}T12:00:00`,
                        ).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="plan-task-actions">
                  {task.status !== "done" && (
                    <button
                      className="ghost icon-only"
                      aria-label={`Focus on ${task.title}`}
                      onClick={() => focus(task.id)}
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button
                    className="ghost icon-only"
                    disabled={index === 0}
                    aria-label={`Move ${task.title} up`}
                    onClick={() => reorder(task.id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="ghost icon-only"
                    disabled={index === queue.length - 1}
                    aria-label={`Move ${task.title} down`}
                    onClick={() => reorder(task.id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="ghost icon-only"
                    aria-label={`Remove ${task.title} from plan`}
                    onClick={() =>
                      dispatch({ type: "schedule-tasks", ids: [task.id] })
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!!active.length && (
            <button
              className="text-action"
              onClick={() => {
                dispatch({
                  type: "schedule-tasks",
                  ids: active.map((t) => t.id),
                  date: shiftDate(date, 1),
                });
                showToast("Unfinished tasks moved to the next day", "success");
              }}
            >
              Move unfinished tasks to the next day <ArrowRight size={15} />
            </button>
          )}
        </section>
        <aside className="plan-aside">
          <section className="panel">
            <div className="section-heading">
              <h2>
                <CalendarDays size={18} /> On the calendar
              </h2>
              <button
                className="ghost icon-only"
                aria-label="Open calendar"
                onClick={() => navigate("/calendar")}
              >
                <ArrowRight size={16} />
              </button>
            </div>
            {events.length ? (
              events.map((event) => (
                <div className="plan-event" key={event.id}>
                  <time>
                    {event.startTime || "Anytime"}
                    {event.endTime && ` – ${event.endTime}`}
                  </time>
                  <strong>{event.title}</strong>
                  <span>{event.category}</span>
                </div>
              ))
            ) : (
              <p className="muted-copy">
                No events planned for this day. Leave some space between study
                blocks.
              </p>
            )}
          </section>
          {!!carry.length && (
            <section className="panel plan-carry">
              <RotateCcw size={22} />
              <h2>A fresh place to start</h2>
              <p>
                {carry.length} unfinished{" "}
                {carry.length === 1 ? "task is" : "tasks are"} on an earlier
                plan. Bring them forward when you’re ready.
              </p>
              <button onClick={() => schedule(carry.map((t) => t.id))}>
                Bring {carry.length} forward <ArrowRight size={15} />
              </button>
            </section>
          )}
          <section className="panel plan-tip">
            <span className="overview-eyebrow">A SUSTAINABLE PACE</span>
            <h2>Leave room to think.</h2>
            <p>
              Estimates use your remaining Pomodoros and each task’s block duration. Breaks and calendar events
              are extra time, so a little breathing room helps.
            </p>
            <button
              className="text-action"
              onClick={() => navigate(`/tasks?new=1&date=${date}`)}
            >
              Capture a new task <Plus size={15} />
            </button>
          </section>
        </aside>
      </div>
      {picker && (
        <Portal>
          <div
            className="modal"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setPicker(false);
              }
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPicker(false);
            }}
          >
            <section
              className="modal-panel plan-picker"
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-picker-title"
            >
              <div className="modal-title">
                <div>
                  <h2 id="plan-picker-title">Choose your study tasks</h2>
                  <p>
                    Adding a task moves its plan to this day, keeping its
                    deadline.
                  </p>
                </div>
                <button
                  className="ghost icon-only"
                  aria-label="Close task picker"
                  onClick={() => setPicker(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="search">
                <Search size={16} />
                <input
                  autoFocus
                  aria-label="Search tasks to plan"
                  placeholder="Find a task or subject…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="plan-candidates">
                {candidates.map((task) => (
                  <button
                    key={task.id}
                    aria-label={`Add ${task.title} to plan`}
                    onClick={() => schedule([task.id])}
                  >
                    <div>
                      <strong>{task.title}</strong>
                      <span>
                        {task.category} · {task.priority}
                        {task.plannedDate && ` · Planned ${task.plannedDate}`}
                      </span>
                    </div>
                    <Plus size={18} />
                  </button>
                ))}
                {!candidates.length && (
                  <p className="muted-copy">
                    No unplanned tasks match. Your plan may already include
                    them.
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={() => setPicker(false)}>Done</button>
              </div>
            </section>
          </div>
        </Portal>
      )}
    </div>
  );
}

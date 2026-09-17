import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, Clock3, Flame, Plus, Play, Target, TrendingUp } from "lucide-react";
import { useAppStore } from "../store/AppStore";
import { currentStreak, todayStats, dateKey, dayMinutesMap, currentWeekDailyBreakdown } from "../utils/stats";
import { ProgressRing } from "../components/ProgressRing";
import { formatTimerClock, useActiveTimer } from "../components/ActiveTimerProvider";

export function DashboardPage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const timer = useActiveTimer();
  const [taskFilter, setTaskFilter] = useState("Upcoming");
  const today = todayStats(state);
  const streak = currentStreak(state);
  const now = new Date();
  const todayKey = dateKey(now);
  const goal = state.settings.dailyGoalMinutes;
  const progress = Math.min(1, today.minutesToday / Math.max(1, goal));
  const activeTasks = state.tasks.filter(t => t.status !== "done");
  const tasks = state.tasks.filter(t => taskFilter === "Completed" ? t.status === "done" : t.status !== "done" && (taskFilter !== "Today" || t.dueDate === todayKey))
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 4);
  const week = currentWeekDailyBreakdown(state);
  const weekMinutes = week.reduce((sum, d) => sum + d.minutes, 0);
  const maxMinutes = Math.max(goal, ...week.map(d => d.minutes), 1);
  const map = dayMinutesMap(state.sessions);
  const days = Array.from({ length: 84 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 83 + i);
    const key = dateKey(date);
    const mins = map[key] || 0;
    return { key, mins, level: mins === 0 ? 0 : Math.min(4, Math.ceil(mins / Math.max(1, goal) * 3)) };
  });
  const sessions = [...state.sessions].filter(s => s.type === "focus").sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 3);
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const focus = () => { if (!timer.running) timer.start(); navigate("/timer"); };
  return (
    <div className="overview">
      <header className="overview-heading">
        <div><div className="overview-eyebrow">YOUR PERSONAL STUDY SPACE</div><h1>{greeting}, {state.settings.profileName || "Student"}<span className="greeting-dot">.</span></h1><p>A little focus today. A little closer to your goals.</p></div>
        <button className="overview-date" onClick={() => navigate("/calendar")}><CalendarDays size={16} />{now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</button>
      </header>

      <div className="overview-metrics">
        {[
          { label: "Focus time today", value: `${today.minutesToday}`, unit: "min", note: `${today.sessionsToday} completed sessions`, icon: Clock3, tone: "mint" },
          { label: "Current streak", value: `${streak}`, unit: streak === 1 ? "day" : "days", note: streak ? "Keep your momentum going" : "A fresh start begins today", icon: Flame, tone: "peach" },
          { label: "Tasks completed", value: `${state.tasks.filter(t => t.status === "done").length}`, unit: `/ ${state.tasks.length}`, note: `${activeTasks.length} tasks still to explore`, icon: CheckCircle2, tone: "lilac" },
          { label: "Weekly focus", value: `${Math.floor(weekMinutes / 60)}h`, unit: `${weekMinutes % 60}m`, note: `of ${Math.round(state.settings.weeklyGoalMinutes / 60 * 10) / 10}h weekly goal`, icon: TrendingUp, tone: "blue" },
        ].map(({ label, value, unit, note, icon: Icon, tone }) => <article className="overview-metric" key={label}><div className="metric-top"><span>{label}</span><i className={tone}><Icon size={18} /></i></div><strong>{value} <small>{unit}</small></strong><p>{note}</p></article>)}
      </div>

      <button className="dashboard-plan-link" onClick={() => navigate('/plan')}><span className="plan-link-icon"><CalendarDays size={22}/></span><span><strong>Give today a little direction</strong><small>{state.tasks.filter(t => t.plannedDate === todayKey && t.status !== 'done').length} tasks in your daily plan · Choose, focus, make progress</small></span><ArrowRight size={20}/></button>
      <div className="overview-columns">
        <div className="overview-main">
          <section className="focus-invitation">
            <div className="focus-copy"><span className="focus-badge"><span /> MAKE ROOM FOR DEEP WORK</span><h2>Your next chapter<br />starts with focus.</h2><p>One task. One session. Real progress.<br />Settle in and give yourself this time.</p><button onClick={focus}><Play size={16} fill="currentColor" />{timer.running ? "Return to session" : timer.startedAt ? "Resume session" : timer.type === "focus" ? "Start focus session" : "Start break"}<ArrowRight size={17} /></button><small>{timer.plannedMinutes} min session <span>·</span> Your pace, your progress</small></div>
            <div className="focus-orbit" aria-hidden="true"><div className="orbit-dash" /><div className="orbit-core"><span>{timer.startedAt ? "IN PROGRESS" : timer.type === "focus" ? "TIME TO FOCUS" : "TIME TO REST"}</span><strong>{formatTimerClock(timer.remaining)}</strong><span><span className="orbit-dot" /> {timer.running ? "Stay with it" : "You’ve got this"}</span></div><div className="orbit-star">✦</div></div>
          </section>
          <section className="overview-card week-card">
            <div className="overview-card-heading"><div><h2>Focus overview</h2><p>Small efforts add up to something big.</p></div><span className="period-label">This week</span></div>
            <div className="week-summary"><strong>{Math.floor(weekMinutes / 60)}<small>h</small> {weekMinutes % 60}<small>m</small></strong><span><span className="legend-dot" /> Focus time <span className="legend-goal" /> Daily goal</span></div>
            <div className="week-chart" role="img" aria-label={`Weekly focus: ${week.map(d => `${d.day} ${d.minutes} minutes`).join(", ")}. Daily goal: ${goal} minutes.`}>
              <div className="chart-grid"><span>{maxMinutes}m</span><span>{Math.round(maxMinutes / 2)}m</span><span>0m</span></div>
              <div className="chart-bars"><div className="chart-goal" style={{ bottom: `${goal / maxMinutes * 100}%` }} />{week.map(d => <div className={`chart-column ${d.date === todayKey ? "is-today" : ""}`} key={d.date}><div className="chart-bar" style={{ height: `${d.minutes / maxMinutes * 100}%`, minHeight: d.minutes ? 4 : 0 }} title={`${d.day}: ${d.minutes} minutes`} /><span>{d.day}</span></div>)}</div>
            </div>
          </section>
          <section className="overview-card">
            <div className="overview-card-heading"><div><h2>Your study plan <span className="count-badge">{activeTasks.length}</span></h2><p>Clear your mind. Give every task a place.</p></div><button className="text-action" onClick={() => navigate("/tasks?new=1")}><Plus size={15} /> Add task</button></div>
            <div className="plan-tabs">{["Upcoming", "Today", "Completed"].map(filter => <button key={filter} className={filter === taskFilter ? "selected" : ""} onClick={() => setTaskFilter(filter)}>{filter}</button>)}<button className="view-all" onClick={() => navigate("/tasks")}>View all <ArrowRight size={14} /></button></div>
            <div className="plan-list">{tasks.length ? tasks.map(task => <div className="plan-row" key={task.id}><button className={`task-check ${task.status === "done" ? "checked" : ""}`} aria-label={`${task.status === "done" ? "Reopen" : "Complete"} ${task.title}`} onClick={() => dispatch({ type: "move-task", id: task.id, status: task.status === "done" ? "todo" : "done" })}>{task.status === "done" && <Check size={13} />}</button><button className="plan-task" onClick={() => navigate("/tasks")}><strong>{task.title}</strong><span>{task.category} <span>·</span> {task.dueDate ? task.dueDate < todayKey ? "Overdue" : task.dueDate === todayKey ? "Today" : new Date(`${task.dueDate}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }) : "No deadline"}</span></button><span className={`plan-priority ${task.priority}`}>{task.priority}</span></div>) : <div className="overview-empty"><CheckCircle2 size={24} /><strong>{taskFilter === "Completed" ? "Your wins will live here" : "A little room to breathe"}</strong><p>{taskFilter === "Completed" ? "Complete a task to see it here." : "No tasks in this view. Plan your next small step."}</p><button className="text-action" onClick={() => navigate("/tasks?new=1")}>Create a task <ArrowRight size={14} /></button></div>}</div>
          </section>
        </div>
        <aside className="overview-side">
          <section className="overview-card daily-card"><div className="overview-card-heading"><h2>Daily goal</h2><Target size={18} /></div><ProgressRing progress={progress} size={172} strokeWidth={10} colorFrom="#c5dfa9" colorTo="#91b77b" trackColor="#303d2b"><div className="goal-label"><strong>{Math.round(progress * 100)}<small>%</small></strong><span>of your daily goal</span></div></ProgressRing><p><strong>{today.minutesToday} min</strong> <span>/ {goal} min</span></p><div className="goal-message">{progress >= 1 ? "Goal reached. Take a moment to celebrate." : `${Math.max(0, goal - today.minutesToday)} more minutes. You can do this.`}</div><button className="text-action" onClick={() => navigate("/settings")}>Adjust goal <ArrowRight size={14} /></button></section>
          <section className="overview-card consistency-card"><div className="overview-card-heading"><h2>Build your rhythm</h2><Flame size={18} /></div><p>Every focused day makes a difference.</p><div className="rhythm-grid">{days.map(d => <div key={d.key} className={`rhythm-cell level-${d.level}`} title={`${d.key}: ${d.mins} minutes`} />)}</div><div className="rhythm-legend"><span>Last 12 weeks</span><span>Less {[0, 1, 2, 3, 4].map(n => <i className={`rhythm-cell level-${n}`} key={n} />)} More</span></div></section>
          <section className="overview-card recent-card"><div className="overview-card-heading"><h2>Recent sessions</h2><button className="text-action" aria-label="View session history" onClick={() => navigate("/history")}><ArrowRight size={16} /></button></div>{sessions.length ? sessions.map(s => <div className="recent-row" key={s.id}><i><ArrowDownLeft size={17} /></i><div><strong>{s.category}</strong><span>{dateKey(s.startTime) === todayKey ? "Today" : new Date(s.startTime).toLocaleDateString([], { month: "short", day: "numeric" })} · {s.completed && !s.interrupted ? "Completed" : "Interrupted"}</span></div><b>{s.actualDuration}<small> min</small></b></div>) : <p className="recent-empty">Your first session is the start of your story. Ready when you are.</p>}</section>
          <button className="reflection-link" onClick={() => navigate("/journal")}><i><BookOpen size={20} /></i><span><strong>A moment to reflect</strong><small>What went well today?</small></span><ArrowRight size={17} /></button>
        </aside>
      </div>
      <footer className="overview-footer"><span className="brand-mini">✦</span> Progress is a practice, not a finish line.</footer>
    </div>
  );
}

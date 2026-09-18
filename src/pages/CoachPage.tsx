import { buildAdversarialDashboard } from "../utils/coach";
import { useNavigate } from "react-router-dom";
import { useActiveTimer } from "../components/ActiveTimerProvider";
import { plannedTasks, remainingMinutes } from "../utils/planning";
import { taskPomodoroMinutes } from "../utils/pomodoro";
import { useEffect, useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import type React from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Clock,
  Copy,
  DollarSign,
  Gauge,
  Settings,
  Shield,
  Skull,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp } from "../components/CountUp";
import { ProgressRing } from "../components/ProgressRing";
import { useAppStore } from "../store/AppStore";
import { chartAxisTick, chartBarRadius, chartGridStroke, chartLine, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle, minuteTooltipFormatter } from "../utils/chartTheme";
import { dateKey } from "../utils/stats";
import { showToast } from "../utils/toast";

type VelocityStatus = "ahead" | "on-track" | "lagging";
type CoachTone = "good" | "warning" | "critical" | "neutral";

export function CoachPage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const timer = useActiveTimer();
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [local, setLocal] = useState({
    planned: state.settings.adversarialDailyPlanMinutes || state.settings.dailyGoalMinutes,
    hourlyRate: state.settings.adversarialHourlyRate,
    wakeHour: state.settings.adversarialWakeHour,
    sleepHour: state.settings.adversarialSleepHour,
    productivityRatio: state.settings.adversarialProductivityRatio,
    hardcoreMode: state.settings.adversarialHardcoreMode,
  });

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setShowSettings(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showSettings]);

  const dashboard = useMemo(() => buildAdversarialDashboard(state, now), [state, now]);
  const todayPlan = plannedTasks(state.tasks, dateKey(now)).filter(task => task.status !== "done");
  const nextTask = todayPlan[0];
  const hasHistory = state.sessions.some(session => session.type === "focus" && session.actualDuration > 0);
  const openSettings = () => {
    setLocal({planned:state.settings.adversarialDailyPlanMinutes || state.settings.dailyGoalMinutes, hourlyRate:state.settings.adversarialHourlyRate, wakeHour:state.settings.adversarialWakeHour, sleepHour:state.settings.adversarialSleepHour, productivityRatio:state.settings.adversarialProductivityRatio, hardcoreMode:state.settings.adversarialHardcoreMode});
    setShowSettings(true);
  };
  const velocityStatus: VelocityStatus = dashboard.temporalVelocity >= 1 ? "ahead" : dashboard.temporalVelocity >= 0.7 ? "on-track" : "lagging";
  const gradeTone: CoachTone = dashboard.gradeScore >= 80 ? "good" : dashboard.gradeScore >= 60 ? "warning" : "critical";

  const saveSettings = () => {
    if (local.sleepHour <= local.wakeHour) { showToast("Sleep hour must be later than wake hour", "warning"); return; }
    dispatch({
      type: "update-settings",
      settings: {
        adversarialDailyPlanMinutes: clamp(Math.round(local.planned), 1, 1440),
        adversarialHourlyRate: Math.max(0, local.hourlyRate),
        adversarialWakeHour: clamp(local.wakeHour, 0, 23),
        adversarialSleepHour: clamp(local.sleepHour, 1, 24),
        adversarialProductivityRatio: clamp(local.productivityRatio, 1, 100),
        adversarialHardcoreMode: local.hardcoreMode,
      },
    });
    setShowSettings(false);
  };

  const copyReport = async () => {
    const report = [
      `TrackMe study reflection (${new Date().toLocaleDateString()})`,
      `Today: ${formatTime(dashboard.todayMinutes)} / ${formatTime(dashboard.plannedMinutes)} (${dashboard.planPercent}%)`,
      `Study pace: ${Math.round(dashboard.temporalVelocity * 100)}%`,
      `Weekly progress: ${dashboard.weeklyPercent}%`,
      `Weekly goal remaining: ${formatTime(dashboard.timeDebt)}`,
      ...(state.settings.adversarialHardcoreMode ? [`Estimated time value: $${dashboard.opportunityCost.toFixed(0)}`] : []),
    ].join("\n");
    try { await navigator.clipboard.writeText(report); } catch { showToast("Could not copy. Check clipboard permissions and try again.", "warning"); return; }
    setCopied(true);
    showToast("Coach report copied", "success");
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={`coach-page adversarial page-transition ${velocityStatus} ${state.settings.adversarialHardcoreMode ? "hardcore" : ""}`}>
      {state.settings.adversarialHardcoreMode && (
        <div className="hardcore-warning-banner glass-card">
          <Skull size={22} className="pulse-anim" /> DIRECT FEEDBACK — Targets are guides. Adjust them when your day changes.
        </div>
      )}

      <header className="adversarial-header glass-card">
        <div>
          <h1>{state.settings.adversarialHardcoreMode && <Skull size={24} />} Study coach</h1>
          <p>{state.settings.adversarialHardcoreMode ? "Direct feedback enabled. Keep your targets realistic." : "Reflect on your pace and choose a realistic next step."}</p>
        </div>
        <div className="adversarial-actions">
          <button className="ghost icon-only" onClick={copyReport} title="Copy report" aria-label="Copy coach report">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
          <div className={`velocity-badge glass-pill ${velocityStatus}`}>
            {velocityStatus === "ahead" ? <ArrowUp size={20} /> : velocityStatus === "lagging" ? <ArrowDown size={20} /> : <Zap size={20} />}
            <div><strong><CountUp value={Math.round(dashboard.temporalVelocity * 100)} />%</strong><span>study pace</span></div>
          </div>
          <button onClick={openSettings} className="glass-btn"><Settings size={17} /> Tune</button>
        </div>
      </header>

      <section className="coach-next-step panel" aria-label="Your next study step">
        <div><span className="eyebrow">One manageable next step</span><h2>{timer.startedAt ? "Pick up your current session" : nextTask ? nextTask.title : dashboard.todayMinutes >= dashboard.plannedMinutes ? "Your daily target is covered" : "Give today a little direction"}</h2><p>{nextTask ? `${todayPlan.length} ${todayPlan.length === 1 ? "task" : "tasks"} in today's plan · ${remainingMinutes(todayPlan,state.settings.focusDuration)} min remaining. Next block: ${taskPomodoroMinutes(nextTask,state.settings.focusDuration)} min.` : "Choose a task for today, or start a free focus block. Small sessions count too."}</p></div>
        <div className="coach-next-actions"><button className="primary" onClick={() => navigate('/timer', timer.startedAt ? undefined : {state:{focusTaskId:nextTask?.id}})}>{timer.startedAt ? 'Return to timer' : nextTask ? 'Focus on next task' : 'Open timer'}</button><button onClick={() => navigate('/plan')}>Review daily plan</button></div>
      </section>
      <p className="insights-method-note">Coach uses your recorded sessions and targets. Scores are estimates for reflection, not a measure of your ability. Your plan can change.</p>
      <section className="adversarial-hero-grid">
        <article className={`grade-panel glass-card ${gradeTone}`}>
          <div className="grade-ring-wrap">
            <ProgressRing progress={hasHistory ? dashboard.gradeScore / 100 : 0} size={150} strokeWidth={8} colorFrom={gradeTone === 'good' ? 'var(--good)' : gradeTone === 'warning' ? 'var(--warning)' : 'var(--critical)'} colorTo="var(--accent-2)" glow={false} breathing={true}>
              <div className="grade-ring-content">
                <span>{hasHistory ? "Study rhythm" : "Getting started"}</span>
                <strong>{hasHistory ? dashboard.grade : "—"}</strong>
                <em>{hasHistory ? `${dashboard.gradeScore}/100` : "First block ahead"}</em>
              </div>
            </ProgressRing>
          </div>
          <p>{hasHistory ? dashboard.gradeMessage : "Start with one achievable block. Your patterns will become clearer over time."}</p>
        </article>

        <article className="plan-panel glass-card">
          <div className="panel-title"><Target size={18} /> Daily Plan vs Actual</div>
          <div className="plan-values"><strong><CountUp value={dashboard.todayMinutes} suffix="m" /></strong><span>/ {formatTime(dashboard.plannedMinutes)}</span><b><CountUp value={dashboard.planPercent} />%</b></div>
          <div className="bar tall"><span style={{ width: `${Math.min(100, dashboard.planPercent)}%` }} /></div>
          <p>{dashboard.optimismBias > 0 ? `${dashboard.optimismBias}% of the plan is still remaining.` : "Plan is covered. Keep it clean."}</p>
        </article>

        {state.settings.adversarialHardcoreMode && <MetricTile title="Estimated time value" value={`$${dashboard.opportunityCost.toFixed(0)}`} note={`Assumes $${state.settings.adversarialHourlyRate}/hour and ${state.settings.adversarialProductivityRatio}% of waking time for study`} icon={<DollarSign size={19} />} tone="neutral" />}
        <MetricTile title="Weekly goal remaining" value={formatTime(dashboard.timeDebt)} note="Remaining toward this calendar week’s target" icon={<AlertTriangle size={19} />} tone={dashboard.timeDebt > 0 ? "critical" : "good"} />
        <MetricTile title="Focus Score" value={`${dashboard.focusScore}%`} note="Estimate from completion, block length, and daily progress" icon={<Shield size={19} />} tone={dashboard.focusScore >= 75 ? "good" : dashboard.focusScore >= 45 ? "warning" : "critical"} />
        <MetricTile title="Most-used start hour" value={dashboard.bestHour.minutes ? formatHour(dashboard.bestHour.hour) : "No sessions yet"} note={`${formatTime(dashboard.bestHour.minutes)} logged there`} icon={<Clock size={19} />} tone="neutral" />
        <MetricTile title="Sessions Today" value={dashboard.sessionsToday.toString()} note="Completed focus blocks today" icon={<CalendarDays size={19} />} tone={dashboard.sessionsToday > 0 ? "good" : "neutral"} />
        <MetricTile title="Today vs Yesterday" value={formatDeltaTime(dashboard.todayVsYesterday)} note={dashboard.todayVsYesterday >= 0 ? "Ahead of yesterday" : "Behind yesterday"} icon={dashboard.todayVsYesterday >= 0 ? <ArrowUp size={19} /> : <ArrowDown size={19} />} tone={dashboard.todayVsYesterday >= 0 ? "good" : "critical"} />
        <MetricTile title="Monthly Summary" value={`${dashboard.monthlySummary.totalHours}h`} note={`Best week ${formatTime(dashboard.monthlySummary.bestWeek[1])}`} icon={<Gauge size={19} />} tone="neutral" />
        <MetricTile title="Planning gap" value={formatTime(dashboard.liarMetric)} note="Average plan vs actual gap" icon={<AlertTriangle size={19} />} tone={dashboard.liarMetric <= 5 ? "good" : dashboard.liarMetric <= 15 ? "warning" : "critical"} />
        <MetricTile title="Session Intensity" value={`${dashboard.sessionIntensity}%`} note="Actual minutes compared with planned blocks" icon={<Zap size={19} />} tone={dashboard.sessionIntensity >= 85 ? "good" : dashboard.sessionIntensity >= 55 ? "warning" : "critical"} />
      </section>

      <section className="adversarial-chart-grid">
        <ChartPanel title="Daily Expected vs Actual" icon={<Gauge size={19} />}>
          {dashboard.dailyData.some(day => day.actual > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" tick={chartAxisTick} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={chartAxisTick} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} formatter={minuteTooltipFormatter} separator=" " />
                <Bar dataKey="expected" fill="var(--sf-3)" radius={chartBarRadius} />
                <Bar dataKey="actual" radius={chartBarRadius}>
                  {dashboard.dailyData.map((day) => <Cell key={day.date} fill={day.actual >= day.expected ? "var(--good)" : day.isToday ? "var(--accent)" : "var(--accent-3)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty-state"><strong>No verdict yet</strong><span>Record a focus block to compare your study time with your target.</span></div>}
        </ChartPanel>

        <ChartPanel title="Four Week Trend" icon={<TrendingUp size={19} />}>
          {dashboard.weeklyData.some(week => week.actual > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.weeklyData}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" tick={chartAxisTick} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={chartAxisTick} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} formatter={minuteTooltipFormatter} separator=" " />
                <Line type="monotone" dataKey="actual" stroke="var(--accent)" strokeWidth={chartLine.strokeWidth} dot={{ ...chartLine.dot, stroke: "var(--accent)" }} activeDot={{ ...chartLine.activeDot, fill: "var(--accent)", stroke: "var(--accent)" }} style={{ filter: "none" }} />
                <Line type="monotone" dataKey="expected" stroke="var(--text-muted)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty-state"><strong>Trend waiting</strong><span>Your recorded focus time will appear here.</span></div>}
        </ChartPanel>
      </section>

      <section className="adversarial-bottom-grid">
        <article className="adversarial-panel coach-week-panel glass-card">
          <h2><TrendingUp size={19} /> Weekly progress</h2>
          <div className="coach-progress-line">
            <div><strong><CountUp value={dashboard.weeklyProgress} />%</strong><span>{formatTime(dashboard.thisWeekMinutes)} / {formatTime(state.settings.weeklyGoalMinutes)}</span></div>
            <div className="bar"><span style={{ width: `${Math.min(100, dashboard.weeklyProgress)}%` }} /></div>
          </div>
          <div className="week-compare-list">
            {dashboard.weekComparisonSeries.map((day) => (
              <div key={day.day}>
                <span>{day.day}</span>
                <b>{formatTime(day.thisWeek)}</b>
                <em>{formatTime(day.lastWeek)} last week</em>
              </div>
            ))}
          </div>
        </article>
        <article className="adversarial-panel coach-month-panel glass-card">
          <h2><CalendarDays size={19} /> Monthly Summary</h2>
          <div className="monthly-summary-grid">
            <div><span>Total</span><strong><CountUp value={dashboard.monthlySummary.totalHours} />h</strong></div>
            <div><span>Best week</span><strong>{formatTime(dashboard.monthlySummary.bestWeek[1])}</strong><small>{dashboard.monthlySummary.bestWeek[0]}</small></div>
            <div><span>Lightest week</span><strong>{formatTime(dashboard.monthlySummary.worstWeek[1])}</strong><small>{dashboard.monthlySummary.worstWeek[0]}</small></div>
          </div>
        </article>
        <article className="adversarial-panel glass-card">
          <h2><TrendingDown size={19} /> Days to reflect on</h2>
          <div className="worst-list">
            {dashboard.worstDays.length === 0 ? <p>No recorded days below your current target.</p> : dashboard.worstDays.map((day) => (
              <div key={day.date}><span>{day.label}</span><strong>{formatTime(day.deficit)} short</strong><em>{formatTime(day.actual)} logged</em></div>
            ))}
          </div>
        </article>
        <article className="adversarial-panel glass-card">
          <h2><Zap size={19} /> Action Brief</h2>
          <ul className="action-brief">
            {dashboard.actionBrief.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span className="emoji-icon" style={{ flexShrink: 0, marginTop: '2px' }}>{item.emoji}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {showSettings && (
        <Portal><div className="modal">
          <div className="modal-panel adversarial-settings glass-card" role="dialog" aria-modal="true" aria-labelledby="coach-settings-title">
	            <div className="modal-title"><h2 id="coach-settings-title">Coach preferences</h2><button className="ghost icon-only" onClick={() => setShowSettings(false)} aria-label="Close coach settings" title="Close coach settings"><X size={18} /></button></div>
            <label>Today planned minutes<input type="number" min={1} max={1440} value={local.planned} onChange={(event) => setLocal({ ...local, planned: Number(event.target.value) || 1 })} /></label>
            <div className="two-col">
              <label>Hourly value<input type="number" min={0} value={local.hourlyRate} onChange={(event) => setLocal({ ...local, hourlyRate: Number(event.target.value) || 0 })} /></label>
              <label>Expected productivity %<input type="number" min={1} max={100} value={local.productivityRatio} onChange={(event) => setLocal({ ...local, productivityRatio: Number(event.target.value) || 1 })} /></label>
            </div>
            <div className="two-col">
              <label>Wake hour<input type="number" min={0} max={23} value={local.wakeHour} onChange={(event) => setLocal({ ...local, wakeHour: Number(event.target.value) || 0 })} /></label>
              <label>Sleep hour<input type="number" min={1} max={24} value={local.sleepHour} onChange={(event) => setLocal({ ...local, sleepHour: Number(event.target.value) || 1 })} /></label>
            </div>
            <label className="check-row"><input type="checkbox" checked={local.hardcoreMode} onChange={(event) => setLocal({ ...local, hardcoreMode: event.target.checked })} /> Direct feedback mode</label>
            <button className="primary" onClick={saveSettings}>Save settings</button>
          </div>
        </div></Portal>
      )}
    </div>
  );
}

function MetricTile({ title, value, note, icon, tone }: { title: string; value: string | number; note: string; icon: React.ReactNode; tone: CoachTone }) {
  const textValue = String(value);
  const isTime = textValue.includes("h") || textValue.endsWith("m");
  const isTimeStr = textValue.includes(":");
  
  let displayValue: React.ReactNode = value;

  if (isTimeStr) {
    displayValue = value;
  } else if (isTime) {
    const parts = textValue.split(/([0-9]+)/).filter(Boolean);
    displayValue = parts.map((part, i) => {
      if (/^[0-9]+$/.test(part)) return <CountUp key={i} value={Number(part)} />;
      return part;
    });
  } else {
    const match = textValue.match(/^([^0-9.-]*)([0-9.]+)([^0-9]*)$/);
    if (match) {
      displayValue = <>{match[1]}<CountUp value={Number(match[2])} />{match[3]}</>;
    }
  }

  return (
    <article className={`adversarial-metric glass-card tone-${tone}`}>
      <div className="metric-header">
        <span>{title}</span>
        {icon}
      </div>
      <strong>{displayValue}</strong>
      <p>{note}</p>
    </article>
  );
}

function ChartPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="adversarial-panel chart-panel glass-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>{icon}{title}</h2>
      <div className="adversarial-chart-box">{children}</div>
    </article>
  );
}

function formatTime(mins: number) {
  if (mins < 60) return `${Math.max(0, Math.round(mins))}m`;
  const hours = Math.floor(mins / 60);
  const minutes = Math.round(mins % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatDeltaTime(mins: number) {
  const sign = mins >= 0 ? "+" : "-";
  return `${sign}${formatTime(Math.abs(mins))}`;
}

function formatHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const label = normalized % 12 || 12;
  return `${label}:00 ${normalized < 12 ? "AM" : "PM"}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

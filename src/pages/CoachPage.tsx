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
import { AppState, StudySession } from "../types";
import { chartAxisTick, chartBarRadius, chartGridStroke, chartLine, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle, minuteTooltipFormatter } from "../utils/chartTheme";
import { adversarialMetrics, currentStreak, dateKey, dayMinutesMap, minutes, monthlySummary, weekComparisonSeries } from "../utils/stats";
import { showToast } from "../utils/toast";

type VelocityStatus = "ahead" | "on-track" | "lagging";
type CoachTone = "good" | "warning" | "critical" | "neutral";

export function CoachPage() {
  const { state, dispatch } = useAppStore();
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
  const velocityStatus: VelocityStatus = dashboard.temporalVelocity >= 1 ? "ahead" : dashboard.temporalVelocity >= 0.7 ? "on-track" : "lagging";
  const gradeTone: CoachTone = dashboard.gradeScore >= 80 ? "good" : dashboard.gradeScore >= 60 ? "warning" : "critical";

  const saveSettings = () => {
    if (local.sleepHour <= local.wakeHour) { showToast("Sleep hour must be later than wake hour", "warning"); return; }
    dispatch({
      type: "update-settings",
      settings: {
        adversarialDailyPlanMinutes: Math.max(1, local.planned),
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
      `TrackMe adversarial report (${new Date().toLocaleDateString()})`,
      `Today: ${formatTime(dashboard.todayMinutes)} / ${formatTime(dashboard.plannedMinutes)} (${dashboard.planPercent}%)`,
      `Study pace: ${Math.round(dashboard.temporalVelocity * 100)}%`,
      `Weekly progress: ${dashboard.weeklyPercent}%`,
      `Time debt: ${formatTime(dashboard.timeDebt)}`,
      `Opportunity cost: $${dashboard.opportunityCost.toFixed(0)}`,
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
          <Skull size={22} className="pulse-anim" /> HARDCORE MODE ACTIVE - No excuses. No mercy. Only the next block.
        </div>
      )}

      <header className="adversarial-header glass-card">
        <div>
          <h1>{state.settings.adversarialHardcoreMode && <Skull size={24} />} Study coach</h1>
          <p>{state.settings.adversarialHardcoreMode ? "Brutal honesty enabled." : "Reflect on your pace and choose a realistic next step."}</p>
        </div>
        <div className="adversarial-actions">
          <button className="ghost icon-only" onClick={copyReport} title="Copy report" aria-label="Copy coach report">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
          <div className={`velocity-badge glass-pill ${velocityStatus}`}>
            {velocityStatus === "ahead" ? <ArrowUp size={20} /> : velocityStatus === "lagging" ? <ArrowDown size={20} /> : <Zap size={20} />}
            <div><strong><CountUp value={Math.round(dashboard.temporalVelocity * 100)} />%</strong><span>study pace</span></div>
          </div>
          <button onClick={() => setShowSettings(true)} className="glass-btn"><Settings size={17} /> Tune</button>
        </div>
      </header>

      <section className="adversarial-hero-grid">
        <article className={`grade-panel glass-card ${gradeTone}`}>
          <div className="grade-ring-wrap">
            <ProgressRing progress={dashboard.gradeScore / 100} size={150} strokeWidth={8} colorFrom={gradeTone === 'good' ? 'var(--good)' : gradeTone === 'warning' ? 'var(--warning)' : 'var(--critical)'} colorTo="var(--accent-2)" glow={false} breathing={true}>
              <div className="grade-ring-content">
                <span>Grade</span>
                <strong>{dashboard.grade}</strong>
                <em><CountUp value={dashboard.gradeScore} />/100</em>
              </div>
            </ProgressRing>
          </div>
          <p>{dashboard.gradeMessage}</p>
        </article>

        <article className="plan-panel glass-card">
          <div className="panel-title"><Target size={18} /> Daily Plan vs Actual</div>
          <div className="plan-values"><strong><CountUp value={dashboard.todayMinutes} suffix="m" /></strong><span>/ {formatTime(dashboard.plannedMinutes)}</span><b><CountUp value={dashboard.planPercent} />%</b></div>
          <div className="bar tall"><span style={{ width: `${Math.min(100, dashboard.planPercent)}%` }} /></div>
          <p>{dashboard.optimismBias > 0 ? `${dashboard.optimismBias}% of the plan is still remaining.` : "Plan is covered. Keep it clean."}</p>
        </article>

        <MetricTile title="Opportunity Cost" value={`$${dashboard.opportunityCost.toFixed(0)}`} note={`${formatTime(dashboard.lostMinutes)} productive time gap`} icon={<DollarSign size={19} />} tone={dashboard.opportunityCost > 0 ? "warning" : "good"} />
        <MetricTile title="Time Debt" value={formatTime(dashboard.timeDebt)} note="Last 7 days below daily target" icon={<AlertTriangle size={19} />} tone={dashboard.timeDebt > 0 ? "critical" : "good"} />
        <MetricTile title="Focus Score" value={`${dashboard.focusScore}%`} note="Completion, session length, and clean starts" icon={<Shield size={19} />} tone={dashboard.focusScore >= 75 ? "good" : dashboard.focusScore >= 45 ? "warning" : "critical"} />
        <MetricTile title="Best Hour" value={formatHour(dashboard.bestHour.hour)} note={`${formatTime(dashboard.bestHour.minutes)} logged there`} icon={<Clock size={19} />} tone="neutral" />
        <MetricTile title="Sessions Today" value={dashboard.sessionsToday.toString()} note="Completed focus blocks today" icon={<CalendarDays size={19} />} tone={dashboard.sessionsToday > 0 ? "good" : "neutral"} />
        <MetricTile title="Today vs Yesterday" value={formatDeltaTime(dashboard.todayVsYesterday)} note={dashboard.todayVsYesterday >= 0 ? "Ahead of yesterday" : "Behind yesterday"} icon={dashboard.todayVsYesterday >= 0 ? <ArrowUp size={19} /> : <ArrowDown size={19} />} tone={dashboard.todayVsYesterday >= 0 ? "good" : "critical"} />
        <MetricTile title="Weekly progress" value={`${dashboard.weeklyProgress}%`} note={`${formatTime(dashboard.timeDebt)} still remaining this week`} icon={<TrendingUp size={19} />} tone={dashboard.weeklyProgress >= 100 ? "good" : dashboard.weeklyProgress >= 60 ? "warning" : "critical"} />
        <MetricTile title="Monthly Summary" value={`${dashboard.monthlySummary.totalHours}h`} note={`Best week ${formatTime(dashboard.monthlySummary.bestWeek[1])}`} icon={<Gauge size={19} />} tone="neutral" />
        <MetricTile title="Planning gap" value={formatTime(dashboard.liarMetric)} note="Average plan vs actual gap" icon={<AlertTriangle size={19} />} tone={dashboard.liarMetric <= 5 ? "good" : dashboard.liarMetric <= 15 ? "warning" : "critical"} />
        <MetricTile title="Session Intensity" value={`${dashboard.sessionIntensity}%`} note="Actual minutes compared with planned blocks" icon={<Zap size={19} />} tone={dashboard.sessionIntensity >= 85 ? "good" : dashboard.sessionIntensity >= 55 ? "warning" : "critical"} />
      </section>

      <section className="adversarial-chart-grid">
        <ChartPanel title="Daily Expected vs Actual" icon={<Gauge size={19} />}>
          {dashboard.dailyData.filter((day) => day.actual > 0).length >= 3 ? (
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
          ) : <div className="chart-empty-state"><strong>No verdict yet</strong><span>Log three days before the scoreboard chart judges the pattern.</span></div>}
        </ChartPanel>

        <ChartPanel title="Four Week Trend" icon={<TrendingUp size={19} />}>
          {dashboard.weeklyData.filter((week) => week.actual > 0).length >= 2 ? (
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
          ) : <div className="chart-empty-state"><strong>Trend waiting</strong><span>Give it two active weeks and this line becomes useful.</span></div>}
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
            <div><span>Worst week</span><strong>{formatTime(dashboard.monthlySummary.worstWeek[1])}</strong><small>{dashboard.monthlySummary.worstWeek[0]}</small></div>
          </div>
        </article>
        <article className="adversarial-panel glass-card">
          <h2><TrendingDown size={19} /> Worst Days</h2>
          <div className="worst-list">
            {dashboard.worstDays.length === 0 ? <p>Nothing ugly in the last 14 days.</p> : dashboard.worstDays.map((day) => (
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
            <label>Today planned minutes<input type="number" min={1} value={local.planned} onChange={(event) => setLocal({ ...local, planned: Number(event.target.value) || 1 })} /></label>
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

function buildAdversarialDashboard(state: AppState, now: Date) {
  const focusSessions = state.sessions.filter((session) => session.type === "focus");
  const expanded = adversarialMetrics(state);
  const comparison = weekComparisonSeries(state);
  const month = monthlySummary(state);
  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(addDays(now, -1));
  const map = dayMinutesMap(state.sessions);
  const todayMinutes = map[todayKey] ?? 0;
  const yesterdayMinutes = map[yesterdayKey] ?? 0;
  const plannedMinutes = state.settings.adversarialDailyPlanMinutes || state.settings.dailyGoalMinutes;
  const wakeHour = state.settings.adversarialWakeHour;
  const sleepHour = Math.max(state.settings.adversarialSleepHour, wakeHour + 1);
  const awakeHoursTotal = Math.max(1, sleepHour - wakeHour);
  const hourNow = now.getHours() + now.getMinutes() / 60;
  const awakeHoursSoFar = clamp(hourNow - wakeHour, 0, awakeHoursTotal);
  const expectedByNow = Math.round((awakeHoursSoFar / awakeHoursTotal) * plannedMinutes);
  const temporalVelocity = expectedByNow > 0 ? todayMinutes / expectedByNow : todayMinutes > 0 ? 1.2 : 1;
  const expectedProductiveMinutes = awakeHoursSoFar * 60 * (state.settings.adversarialProductivityRatio / 100);
  const lostMinutes = Math.max(0, Math.round(expectedProductiveMinutes - todayMinutes));
  const opportunityCost = (lostMinutes / 60) * state.settings.adversarialHourlyRate;
  const planPercent = Math.round((todayMinutes / Math.max(1, plannedMinutes)) * 100);
  const optimismBias = Math.max(0, Math.round(((plannedMinutes - todayMinutes) / Math.max(1, plannedMinutes)) * 100));
  const weekStart = startOfWeek(now);
  const thisWeek = focusSessions.filter((session) => new Date(session.startTime) >= weekStart);
  const thisWeekMinutes = minutes(thisWeek);
  const weeklyPercent = Math.round((thisWeekMinutes / Math.max(1, state.settings.weeklyGoalMinutes)) * 100);
  const timeDebt = Math.max(0, state.settings.weeklyGoalMinutes - thisWeekMinutes);
  const completedRate = focusSessions.length ? Math.round((focusSessions.filter((session) => session.completed && !session.interrupted).length / focusSessions.length) * 100) : 0;
  const avgToday = todayMinutes / Math.max(1, state.sessions.filter((session) => dateKey(session.startTime) === todayKey && session.type === "focus").length);
  const focusScore = Math.min(100, Math.round(completedRate * 0.45 + Math.min(100, (avgToday / 45) * 100) * 0.35 + Math.min(100, planPercent) * 0.2));
  const gradeScore = Math.round(Math.min(100, weeklyPercent) * 0.45 + focusScore * 0.35 + Math.min(100, temporalVelocity * 100) * 0.2);
  const grade = gradeScore >= 95 ? "A+" : gradeScore >= 85 ? "A" : gradeScore >= 75 ? "B" : gradeScore >= 65 ? "C" : gradeScore >= 50 ? "D" : "F";
  const gradeMessage = gradeScore >= 85 ? "Pressure is converting into output." : gradeScore >= 65 ? "The system is alive, but leaking minutes." : "Your plan may need adjusting. Try a shorter, achievable session.";
  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(now, index - 6);
    const key = dateKey(date);
    return { date: key, label: date.toLocaleDateString(undefined, { weekday: "short" }), actual: map[key] ?? 0, expected: state.settings.dailyGoalMinutes, isToday: key === todayKey };
  });
  const weeklyData = Array.from({ length: 4 }, (_, index) => {
    const end = addDays(now, -(3 - index) * 7);
    const start = addDays(end, -6);
    const sessions = focusSessions.filter((session) => {
      const date = new Date(session.startTime);
      return date >= startOfDay(start) && date <= endOfDay(end);
    });
    return { label: index === 3 ? "This Week" : `${3 - index}w ago`, actual: minutes(sessions), expected: state.settings.weeklyGoalMinutes };
  });
  const worstDays = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(now, -index);
    const key = dateKey(date);
    const actual = map[key] ?? 0;
    return { date: key, label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), actual, deficit: Math.max(0, state.settings.dailyGoalMinutes - actual) };
  }).filter((day) => day.deficit > 0).sort((a, b) => b.deficit - a.deficit).slice(0, 5);
  const bestHour = bestProductiveHour(focusSessions);
  const actionBrief = [
    todayMinutes < plannedMinutes 
      ? { emoji: "🔴", text: `Close ${formatTime(plannedMinutes - todayMinutes)} before adding new tasks.` } 
      : { emoji: "✅", text: "Daily plan is paid. Stop polishing and log the win." },
    temporalVelocity < 0.7 
      ? { emoji: "⚠️", text: "Use a short sprint now; the day is behind schedule." } 
      : { emoji: "🛡️", text: "Protect the next focus block from interruption." },
    yesterdayMinutes > todayMinutes 
      ? { emoji: "⚡", text: `Beat yesterday by ${formatTime(yesterdayMinutes - todayMinutes + 1)}.` } 
      : { emoji: "🔥", text: "You are not behind yesterday. Keep the margin." },
  ];
  return {
    todayMinutes,
    plannedMinutes,
    planPercent,
    optimismBias,
    temporalVelocity,
    opportunityCost,
    lostMinutes,
    weeklyPercent,
    timeDebt,
    focusScore,
    gradeScore,
    grade,
    gradeMessage,
    dailyData,
    weeklyData,
    worstDays,
    bestHour,
    actionBrief,
    sessionsToday: expanded.sessionsToday,
    sessionIntensity: expanded.sessionIntensity,
    liarMetric: expanded.liarMetric,
    todayVsYesterday: expanded.todayVsYesterday,
    weeklyProgress: expanded.weeklyProgress,
    thisWeekMinutes,
    weekComparisonSeries: comparison,
    monthlySummary: month,
  };
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

function bestProductiveHour(sessions: StudySession[]) {
  const totals = new Map<number, number>();
  sessions.forEach((session) => {
    const hour = new Date(session.startTime).getHours();
    totals.set(hour, (totals.get(hour) ?? 0) + session.actualDuration);
  });
  const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return { hour: best?.[0] ?? 9, minutes: best?.[1] ?? 0 };
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

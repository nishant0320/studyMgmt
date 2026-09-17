import { useMemo, useState } from "react";
import type React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CalendarCheck2, CheckCircle2, Clock, Download, Target, TrendingUp, Zap, Inbox } from "lucide-react";
import { formatTimerClock, useActiveTimer } from "../components/ActiveTimerProvider";
import { useAppStore } from "../store/AppStore";
import { StudySession } from "../types";
import { chartAxisTick, chartAxisTickSmall, chartBarRadius, chartCursor, chartGridStroke, chartLine, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle, minuteTooltipFormatter } from "../utils/chartTheme";
import { dateKey } from "../utils/stats";
import { showToast } from "../utils/toast";
import { CountUp } from "../components/CountUp";
import { EmptyState } from "../components/Layout";

type RangeKey = "7d" | "30d" | "90d";
type TrendPoint = { date: string; fullDate: string; minutes: number };
type CategoryPoint = { subject: string; minutes: number; fullMark: number };
type HourPoint = { hour: string; minutes: number };

const rangeDays: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };
const defaultCategories = ["DSA Algorithm", "System Design", "General Practice", "Project Work", "Revision", "Mock Interview", "Frontend Dev", "Backend Dev"];

export function AnalyticsPage() {
  const { state } = useAppStore();
  const activeTimer = useActiveTimer();
  const [range, setRange] = useState<RangeKey>("7d");
  const focusSessions = state.sessions.filter((session) => session.type === "focus");

  const dashboard = useMemo(() => buildDashboard(focusSessions, range, state.settings.dailyGoalMinutes), [focusSessions, range, state.settings.dailyGoalMinutes]);
  const hasTrendData = dashboard.trendData.filter((item) => item.minutes > 0).length >= 3;
  const hasCategoryData = dashboard.categoryData.filter((item) => item.minutes > 0).length >= 3;
  const hasHourlyData = dashboard.hourlyData.filter((item) => item.minutes > 0).length >= 3;
  
  const periodText = `vs last ${rangeDays[range]} days`;
  const previousText = dashboard.previousMinutes > 0
    ? `${dashboard.delta >= 0 ? "+" : ""}${dashboard.delta}% ${periodText}`
    : `First tracked period (${periodText})`;

  const exportRange = () => {
    const rows = [
      "date,focusMinutes,goalMinutes,goalMet",
      ...dashboard.trendData.map((item) => `${item.fullDate},${item.minutes},${state.settings.dailyGoalMinutes},${item.minutes >= state.settings.dailyGoalMinutes}`),
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `trackme-analytics-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${range.toUpperCase()} analytics exported`, "success");
  };

  return (
    <div className="analytics-page analytics-dashboard page-transition">
      <header className="analytics-header">
        <div>
          <h1>Study analytics</h1>
          <p>Understand your patterns. Find the study rhythm that works for you.</p>
        </div>
        <div className={`analytics-live ${activeTimer.running ? "running" : ""}`}><Activity size={16} /> {activeTimer.running ? `${formatTimerClock(activeTimer.remaining)} active` : "No active timer"}</div>
      </header>

      <section className="analytics-control-row">
        <div className="range-tabs glass-pill" aria-label="Analytics range">
          {(["7d", "30d", "90d"] as RangeKey[]).map((item) => (
            <button key={item} className={`pill-btn ${range === item ? "active-gradient" : ""}`} onClick={() => setRange(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
        <button className="btn glass-card" onClick={exportRange}><Download size={16} /> Export range</button>
      </section>

      <section className="analytics-kpi-grid">
        <KpiCard title="Total Study Time" value={formatTimeWithCountUp(dashboard.totalMinutes)} trend={previousText} icon={<Clock size={18} />} tone="accent" trendDirection={dashboard.delta > 0 ? "up" : dashboard.delta < 0 ? "down" : "neutral"} />
        <KpiCard title="Total Sessions" value={<CountUp value={dashboard.totalSessions} />} trend={dashboard.totalSessions ? `Consistent activity ${periodText}` : `No sessions in ${periodText}`} icon={<Zap size={18} />} tone="blue" trendDirection={dashboard.totalSessions > 0 ? "up" : "neutral"} />
        <KpiCard title="Avg. Session" value={<><CountUp value={dashboard.avgSessionLength} />m</>} trend={dashboard.avgSessionLength >= 45 ? `Deep focus achieved ${periodText}` : `Build longer blocks ${periodText}`} icon={<Target size={18} />} tone="purple" trendDirection={dashboard.avgSessionLength >= 45 ? "up" : "neutral"} />
        <KpiCard title="Clean Completion" value={<><CountUp value={dashboard.completionRate} />%</>} trend={`${dashboard.cleanSessions} uninterrupted blocks ${periodText}`} icon={<CheckCircle2 size={18} />} tone="good" trendDirection={dashboard.completionRate >= 80 ? "up" : "down"} />
        <KpiCard title="Active Days" value={<CountUp value={dashboard.activeDays} />} trend={`${dashboard.goalHits} daily goals reached ${periodText}`} icon={<CalendarCheck2 size={18} />} tone="blue" trendDirection={dashboard.activeDays > 0 ? "up" : "neutral"} />
        <KpiCard title="Goal Hit Rate" value={<><CountUp value={dashboard.goalHitRate} />%</>} trend={`Across ${rangeDays[range]} calendar days ${periodText}`} icon={<Target size={18} />} tone="accent" trendDirection={dashboard.goalHitRate >= 50 ? "up" : "down"} />
      </section>

      <section className="analytics-insight-strip glass-card" style={{ padding: "var(--sp-4)", display: "flex", gap: "var(--sp-4)", borderRadius: "var(--r-md)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <article style={{ flex: 1 }}><span>Strongest category</span><strong>{dashboard.strongestCategory?.subject ?? "No signal yet"}</strong><small>{dashboard.strongestCategory ? formatTime(dashboard.strongestCategory.minutes) : "Start a focus block"}</small></article>
        <article style={{ flex: 1 }}><span>Peak hour</span><strong>{dashboard.strongestHour?.hour ?? "No signal yet"}</strong><small>{dashboard.strongestHour ? <><CountUp value={dashboard.strongestHour.minutes} />m accumulated</> : "Needs session history"}</small></article>
        <article style={{ flex: 1 }}><span>Period comparison</span><strong>{dashboard.previousMinutes ? <>{dashboard.delta >= 0 ? "+" : ""}<CountUp value={dashboard.delta} />%</> : "Baseline"}</strong><small>{dashboard.delta >= 0 ? "Output is moving up" : "Output is below last period"}</small></article>
      </section>

      <section className="analytics-chart-layout">
        <ChartCard className="study-trend-card" icon={<TrendingUp size={20} />} title="Study Trends" tone="accent">
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.trendData} margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="studyMinutesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={chartAxisTick} />
                <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} tickFormatter={(value) => `${value}m`} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} cursor={chartCursor} formatter={minuteTooltipFormatter} separator=" " />
                <Area type="monotone" dataKey="minutes" stroke="var(--accent)" strokeWidth={chartLine.strokeWidth} fill="var(--accent)" fillOpacity={0.12} dot={{ ...chartLine.dot, stroke: "var(--accent)" }} activeDot={{ ...chartLine.activeDot, stroke: "var(--accent)", fill: "var(--accent)" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <ChartEmpty title="Not enough trend data" body="Log three focus days to draw a meaningful curve." icon={<TrendingUp size={48} />} />}
        </ChartCard>

        <ChartCard className="focus-radar-card" icon={<Target size={20} />} title="Focus Distribution" tone="purple">
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height="100%">
	              <RadarChart data={dashboard.categoryData} outerRadius="58%" margin={{ top: 18, right: 34, bottom: 18, left: 34 }}>
                <PolarGrid stroke={chartGridStroke} />
                <PolarAngleAxis dataKey="subject" tick={chartAxisTickSmall} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, "auto"]} />
                <Radar dataKey="minutes" stroke="var(--accent)" strokeWidth={2} fill="var(--accent)" fillOpacity={0.5} style={{ filter: "none" }} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} formatter={minuteTooltipFormatter} separator=" " />
              </RadarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty title="Distribution needs range" body="Study in three categories to unlock the radar." icon={<Target size={48} />} />}
        </ChartCard>

        <ChartCard className="hour-card" icon={<Clock size={20} />} title="Peak Productivity Hours" tone="blue">
          {hasHourlyData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.hourlyData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="barGradientAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--accent-hover)" />
                  </linearGradient>
                  <linearGradient id="barGradientDim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-3)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="hour" interval={3} axisLine={false} tickLine={false} tick={chartAxisTick} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "var(--accent-soft)" }} contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} formatter={minuteTooltipFormatter} separator=" " />
                <Bar dataKey="minutes" radius={chartBarRadius}>
                  {dashboard.hourlyData.map((item) => <Cell key={item.hour} fill={item.minutes >= 60 ? "url(#barGradientAccent)" : "url(#barGradientDim)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty title="No peak hour yet" body="Log three focus sessions and this becomes useful." icon={<Clock size={48} />} />}
        </ChartCard>
      </section>
    </div>
  );
}

function buildDashboard(sessions: StudySession[], range: RangeKey, dailyGoal: number) {
  const days = rangeDays[range];
  const start = startOfDay(addDays(new Date(), -(days - 1)));
  const previousStart = startOfDay(addDays(start, -days));
  const previousEnd = addDays(start, -1);
  const filtered = sessions.filter((session) => new Date(session.startTime) >= start);
  const previous = sessions.filter((session) => {
    const date = new Date(session.startTime);
    return date >= previousStart && date <= endOfDay(previousEnd);
  });

  const totalsByDay = new Map<string, number>();
  filtered.forEach((session) => totalsByDay.set(dateKey(session.startTime), (totalsByDay.get(dateKey(session.startTime)) ?? 0) + session.actualDuration));
  const trendData: TrendPoint[] = Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const key = dateKey(date);
    return { date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), fullDate: key, minutes: totalsByDay.get(key) ?? 0 };
  });

  const categories = Array.from(new Set([...defaultCategories, ...sessions.map((session) => session.category || "General")])).slice(0, 10);
  const categoryTotals = new Map<string, number>();
  filtered.forEach((session) => categoryTotals.set(session.category || "General", (categoryTotals.get(session.category || "General") ?? 0) + session.actualDuration));
  const fullMark = Math.max(100, ...Array.from(categoryTotals.values()));
  const categoryData: CategoryPoint[] = categories.map((subject) => ({ subject, minutes: categoryTotals.get(subject) ?? 0, fullMark }));

  const hourlyTotals = new Array<number>(24).fill(0);
  filtered.forEach((session) => {
    hourlyTotals[new Date(session.startTime).getHours()] += session.actualDuration;
  });
  const hourlyData: HourPoint[] = hourlyTotals.map((minutes, hour) => ({ hour: formatHour(hour), minutes }));

  const totalMinutes = filtered.reduce((sum, session) => sum + session.actualDuration, 0);
  const previousMinutes = previous.reduce((sum, session) => sum + session.actualDuration, 0);
  const delta = previousMinutes ? Math.round(((totalMinutes - previousMinutes) / previousMinutes) * 100) : 0;
  const totalSessions = filtered.length;
  const avgSessionLength = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;
  const cleanSessions = filtered.filter((session) => session.completed && !session.interrupted).length;
  const completionRate = totalSessions ? Math.round((cleanSessions / totalSessions) * 100) : 0;
  const activeDays = Array.from(totalsByDay.values()).filter((value) => value > 0).length;
  const goalHits = Array.from(totalsByDay.values()).filter((value) => value >= dailyGoal).length;
  const goalHitRate = activeDays ? Math.round((goalHits / activeDays) * 100) : 0;
  const strongestCategory = categoryData.filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes)[0];
  const strongestHour = hourlyData.filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes)[0];

  return { trendData, categoryData, hourlyData, totalMinutes, previousMinutes, delta, totalSessions, avgSessionLength, cleanSessions, completionRate, activeDays, goalHits, goalHitRate, strongestCategory, strongestHour };
}

function KpiCard({ title, value, trend, icon, tone, trendDirection }: { title: string; value: React.ReactNode; trend: string; icon: React.ReactNode; tone: "accent" | "blue" | "purple" | "good", trendDirection?: "up" | "down" | "neutral" }) {
  return (
    <article className={`analytics-kpi-card glass-card tone-${tone}`} style={{ borderLeft: `3px solid var(--${tone === 'accent' ? 'accent' : tone === 'good' ? 'green' : tone === 'blue' ? 'blue' : 'purple'})`, paddingLeft: "16px" }}>
      <div>
        <span>{title}</span>
        <strong>
          {value}
          {trendDirection === "up" && <span style={{color: 'var(--green)', fontSize: '0.6em', marginLeft: '6px', verticalAlign: 'middle', filter: "none"}}>▲</span>}
          {trendDirection === "down" && <span style={{color: 'var(--red)', fontSize: '0.6em', marginLeft: '6px', verticalAlign: 'middle', filter: "none"}}>▼</span>}
        </strong>
        <small>{trend}</small>
      </div>
      <i>{icon}</i>
    </article>
  );
}

function ChartCard({ title, icon, tone, className, children }: { title: string; icon: React.ReactNode; tone: "accent" | "blue" | "purple"; className?: string; children: React.ReactNode }) {
  return (
    <article className={`analytics-chart-card glass-card ${className ?? ""}`}>
      <h2 className={`chart-title tone-${tone}`}>{icon}{title}</h2>
      <div className="analytics-chart-box">{children}</div>
    </article>
  );
}

function ChartEmpty({ title, body, icon }: { title: string; body: string, icon?: React.ReactNode }) {
  return (
    <div className="chart-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
      <div style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>{icon || <Inbox size={48} />}</div>
      <strong style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>{title}</strong>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '80%' }}>{body}</span>
    </div>
  );
}

function formatTime(mins: number) {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatTimeWithCountUp(mins: number) {
  if (mins < 60) return <><CountUp value={mins} />m</>;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return minutes ? <><CountUp value={hours} />h <CountUp value={minutes} />m</> : <><CountUp value={hours} />h</>;
}

function formatHour(hour: number) {
  if (hour === 0) return "12AM";
  if (hour === 12) return "12PM";
  return hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}


import { buildDashboard, rangeDays, type RangeKey } from "../utils/analytics";
import { useMemo, useState } from "react";
import type React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CalendarCheck2, CheckCircle2, Clock, Download, Target, TrendingUp, Zap, Inbox } from "lucide-react";
import { formatTimerClock, useActiveTimer } from "../components/ActiveTimerProvider";
import { useAppStore } from "../store/AppStore";
import { chartAxisTick, chartBarRadius, chartCursor, chartGridStroke, chartLine, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle, minuteTooltipFormatter } from "../utils/chartTheme";
import { showToast } from "../utils/toast";
import { CountUp } from "../components/CountUp";

export function AnalyticsPage() {
  const { state } = useAppStore();
  const activeTimer = useActiveTimer();
  const [range, setRange] = useState<RangeKey>("7d");

  const dashboard = useMemo(() => buildDashboard(state.sessions, range, state.settings.dailyGoalMinutes), [state.sessions, range, state.settings.dailyGoalMinutes]);
  const hasTrendData = dashboard.trendData.some((item) => item.minutes > 0);
  const hasCategoryData = dashboard.categoryData.some((item) => item.minutes > 0);
  const hasHourlyData = dashboard.hourlyData.some((item) => item.minutes > 0);
  
  const periodText = `vs last ${rangeDays[range]} days`;
  const previousText = dashboard.previousMinutes > 0
    ? `${dashboard.delta >= 0 ? "+" : ""}${dashboard.delta}% ${periodText}`
    : dashboard.totalMinutes ? "No earlier focus time to compare" : "No focus time in either period";

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
            <button key={item} className={`pill-btn ${range === item ? "active-gradient" : ""}`} aria-pressed={range === item} onClick={() => setRange(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
        <button className="btn glass-card" onClick={exportRange}><Download size={16} /> Export range</button>
      </section>

      <section className="analytics-kpi-grid">
        <KpiCard title="Total Study Time" value={formatTimeWithCountUp(dashboard.totalMinutes)} trend={previousText} icon={<Clock size={18} />} tone="accent" trendDirection={dashboard.delta > 0 ? "up" : dashboard.delta < 0 ? "down" : "neutral"} />
        <KpiCard title="Total Sessions" value={<CountUp value={dashboard.totalSessions} />} trend="Focus sessions in this period" icon={<Zap size={18} />} tone="blue"  />
        <KpiCard title="Avg. Session" value={<><CountUp value={dashboard.avgSessionLength} />m</>} trend="Actual focus time per recorded block" icon={<Target size={18} />} tone="purple"  />
        <KpiCard title="Completion rate" value={<><CountUp value={dashboard.completionRate} />%</>} trend={`${dashboard.cleanSessions} completed without interruption`} icon={<CheckCircle2 size={18} />} tone="good"  />
        <KpiCard title="Active Days" value={<CountUp value={dashboard.activeDays} />} trend={`${dashboard.goalHits} ${dashboard.goalHits === 1 ? "day" : "days"} reached your daily goal`} icon={<CalendarCheck2 size={18} />} tone="blue"  />
        <KpiCard title="Goal Hit Rate" value={<><CountUp value={dashboard.goalHitRate} />%</>} trend={`${dashboard.goalHits} of ${rangeDays[range]} calendar days`} icon={<Target size={18} />} tone="accent"  />
      </section>

      <section className="analytics-insight-strip glass-card" style={{ padding: "var(--sp-4)", display: "flex", gap: "var(--sp-4)", borderRadius: "var(--r-md)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <article style={{ flex: 1 }}><span>Most studied subject</span><strong>{dashboard.strongestCategory?.subject ?? "No signal yet"}</strong><small>{dashboard.strongestCategory ? formatTime(dashboard.strongestCategory.minutes) : "Start a focus block"}</small></article>
        <article style={{ flex: 1 }}><span>Most-used start hour</span><strong>{dashboard.strongestHour?.hour ?? "No signal yet"}</strong><small>{dashboard.strongestHour ? <><CountUp value={dashboard.strongestHour.minutes} />m accumulated</> : "Needs session history"}</small></article>
        <article style={{ flex: 1 }}><span>Period comparison</span><strong>{dashboard.previousMinutes ? <>{dashboard.delta >= 0 ? "+" : ""}<CountUp value={dashboard.delta} />%</> : "Baseline"}</strong><small>{dashboard.previousMinutes ? `${formatTime(dashboard.previousMinutes)} in the previous period` : "No earlier focus time to compare"}</small></article>
      </section>

      <p className="insights-method-note">Focus time includes completed and unfinished blocks; breaks are excluded. Goals use your current daily target. Today is still in progress.</p>
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
          ) : <ChartEmpty title="Your first session starts the chart" body="Log a focus block to see your study time here." icon={<TrendingUp size={48} />} />}
        </ChartCard>

        <ChartCard className="focus-radar-card" icon={<Target size={20} />} title="Time by subject" tone="purple">
          {hasCategoryData ? <div className="analytics-subject-list" aria-label="Focus time by subject">{dashboard.categoryData.map(item => <div className="analytics-subject-row" key={item.subject}><div><strong>{item.subject}</strong><span>{formatTime(item.minutes)} · {Math.round(item.minutes / Math.max(1, dashboard.totalMinutes) * 100)}%</span></div><div className="bar"><span style={{width:`${item.minutes / Math.max(1,dashboard.categoryData[0].minutes) * 100}%`}}/></div></div>)}</div> : <ChartEmpty title="Your subjects will appear here" body="Record a focus session in any subject to see its share of your time." icon={<Target size={48}/>}/>}
        </ChartCard>

        <ChartCard className="hour-card" icon={<Clock size={20} />} title="Focus by session start hour" tone="blue">
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
          ) : <ChartEmpty title="No focus sessions yet" body="Recorded minutes are grouped by the hour each session started." icon={<Clock size={48} />} />}
        </ChartCard>
      </section>
    </div>
  );
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

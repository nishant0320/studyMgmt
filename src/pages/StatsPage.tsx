import type React from "react";
import { PageHeader } from "../components/Layout";
import { CountUp } from "../components/CountUp";
import { useAppStore } from "../store/AppStore";
import { bestHour, categoryDistribution, completionRate, currentStreak, currentWeekDailyBreakdown, dayMinutesMap, longestStreak, minutes, procrastinationIndex, todayStats } from "../utils/stats";
import { CheckCircle2, Clock3, Download, Flame, Layers3, ListChecks, Printer, Target, Trophy } from "lucide-react";
import { showToast } from "../utils/toast";

export function StatsPage() {
  const { state } = useAppStore();
  const dayMap = dayMinutesMap(state.sessions);
  const bestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
  const categoryTotals = state.sessions.reduce<Record<string, number>>((map, s) => {
    map[s.category] = (map[s.category] ?? 0) + s.actualDuration;
    return map;
  }, {});
  const favorite = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";
  const today = todayStats(state);
  const total = minutes(state.sessions);
  const week = currentWeekDailyBreakdown(state);
  const weekMinutes = week.reduce((sum, d) => sum + d.minutes, 0);
  const weeklyProgress = Math.min(100, Math.round((weekMinutes / Math.max(1, state.settings.weeklyGoalMinutes)) * 100));
  const quality = completionRate(state.sessions);
  const doneTasks = state.tasks.filter((t) => t.status === "done").length;
  const categoryRows = categoryDistribution(state.sessions).sort((a, b) => b.value - a.value);
  const categoryMax = Math.max(1, ...categoryRows.map((r) => r.value));
  
  const procrastination = procrastinationIndex(state.tasks);

  const cards = [
    ["All-time total", `${Math.floor(total / 60)}h ${total % 60}m`],
    ["Current streak", `${currentStreak(state)} days`],
    ["Longest streak", `${longestStreak(state)} days`],
    ["Favorite subject", favorite],
    ["Best day ever", bestDay ? `${bestDay[0]} (${bestDay[1]}m)` : "No data"],
    ["Best hour", bestHour(state.sessions)],
    ["Today", `${today.minutesToday}m, ${today.sessionsToday} sessions`],
    ["Tasks done", String(doneTasks)],
  ];

  const exportImage = () => {
    const rows = cards.map(([label, value], index) => {
      const x = index % 2 ? 535 : 80;
      const y = 218 + Math.floor(index / 2) * 104;
      return `<rect x="${x - 18}" y="${y - 54}" width="390" height="82" rx="14" fill="rgb(32,34,38)" stroke="rgb(44,47,53)"/><text x="${x}" y="${y - 18}" fill="rgb(156,167,197)" font-size="16" font-weight="700">${escapeXml(String(label))}</text><text x="${x}" y="${y + 18}" fill="rgb(244,240,255)" font-size="22" font-weight="600">${escapeXml(String(value))}</text>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="680"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="rgb(124,92,252)"/><stop offset="1" stop-color="rgb(240,160,80)"/></linearGradient></defs><rect width="100%" height="100%" rx="24" fill="rgb(17,18,20)"/><rect x="34" y="34" width="932" height="612" rx="22" fill="rgb(25,27,30)" stroke="rgb(50,57,92)"/><text x="80" y="96" fill="rgb(167,201,147)" font-size="22" font-weight="800" letter-spacing="3">TRACKME SNAPSHOT</text><text x="80" y="146" fill="rgb(244,240,255)" font-size="42" font-weight="900">${escapeXml(new Date().toLocaleDateString())}</text>${rows}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url; link.download = "trackme-summary.svg"; link.click();
    URL.revokeObjectURL(url);
    showToast("Snapshot exported", "success");
  };

  return (
    <div className="stats-page page-transition">
      <PageHeader
        eyebrow="Insights"
        title="Your study snapshot"
        description="See how far you’ve come, one focused day at a time."
        action={
          <div className="top-stats">
            <button onClick={() => window.print()}><Printer size={15} /> Print</button>
            <button onClick={exportImage}><Download size={15} /> Export image</button>
          </div>
        }
      />

      <section className="stats-overview-grid">
        <article className="stats-hero-card">
          <div>
            <span>All-time focus bank</span>
            <strong className="focus-bank-time"><CountUp value={Math.floor(total / 60)} /><span>h</span> <CountUp value={total % 60} /><span>m</span></strong>
            <p>{state.sessions.filter((s) => s.type === "focus").length} focus blocks across {Object.keys(dayMap).length} active days</p>
          </div>
          <div className="stats-hero-orbit" style={{ position: 'relative', width: 120, height: 120, display: 'grid', placeItems: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" strokeWidth="8" strokeDasharray="326" strokeDashoffset={326 - (326 * weeklyProgress) / 100} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s var(--ease)', filter: "none" }} />
            </svg>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
              <Trophy size={18} style={{ color: "var(--accent)" }} />
              <b style={{ fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}><CountUp value={weeklyProgress} />%</b>
              <small style={{ color: 'var(--text-muted)', fontSize: 10 }}>week goal</small>
            </div>
          </div>
        </article>
        <StatSignal icon={<Flame size={18} />} label="Consistency" value={<><CountUp value={currentStreak(state)} /> days</>} note={`${longestStreak(state)} day personal best`} tone="warning" trend="up" />
        <StatSignal icon={<CheckCircle2 size={18} />} label="Clean completion" value={<><CountUp value={quality} />%</>} note="Finished without interruption" tone="good" trend={quality >= 80 ? "up" : "down"} />
        <StatSignal icon={<ListChecks size={18} />} label="Task throughput" value={<CountUp value={doneTasks} />} note={`${state.tasks.filter((t) => t.status !== "done").length} tasks still active`} tone="blue" trend={doneTasks > 0 ? "up" : "neutral"} />
        <StatSignal icon={<Target size={18} />} label="Late completion" value={<><CountUp value={procrastination} />%</>} note="Completed after due date" tone="critical" trend={procrastination < 20 ? "down" : "up"} />
      </section>

      <section className="stats-detail-grid">
        <article className="panel weekly-pulse-card">
          <h2><Clock3 size={16} /> This week <span><CountUp value={weekMinutes} /> / <CountUp value={state.settings.weeklyGoalMinutes} /> min</span></h2>
          <div className="weekly-pulse-list">
            {week.map((day) => (
              <div key={day.date} className={day.minutes >= day.goal ? "goal-hit" : ""}>
                <span>{day.day}</span>
                <div className="bar"><i className="gradient" style={{ width: `${Math.min(100, Math.round((day.minutes / Math.max(1, day.goal)) * 100))}%`, background: "var(--accent)" }} /></div>
                <strong><CountUp value={day.minutes} />m</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel category-leaderboard-card">
          <h2><Layers3 size={16} /> Category mix <span>{categoryRows.length} categories</span></h2>
          <div className="category-leaderboard">
            {categoryRows.length === 0
              ? <p>No focus categories logged yet.</p>
              : categoryRows.slice(0, 6).map((item, index) => (
                  <div key={item.name}>
                    <b>{index + 1}</b>
                    <span>{item.name}</span>
                    <div className="bar"><i className="gradient" style={{ width: `${Math.round((item.value / categoryMax) * 100)}%`, background: "var(--accent)" }} /></div>
                    <strong><CountUp value={item.value} />m</strong>
                  </div>
                ))}
          </div>
        </article>
      </section>

      <section className="snapshot">
        <div className="snapshot-title">
          <span>TrackMe summary</span>
          <strong>{new Date().toLocaleDateString()}</strong>
        </div>
        <div className="stat-grid">
          {cards.map(([label, value]) => <Card key={label} label={String(label)} value={value} />)}
        </div>
      </section>
    </div>
  );
}

function StatSignal({ icon, label, value, note, tone, trend }: { icon: React.ReactNode; label: string; value: React.ReactNode; note: string; tone: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <article className={`stat-signal tone-${tone}`}>
      <i>{icon}</i>
      <span>{label}</span>
      <strong>
        {value}
        {trend === "up" && <span className="trend-arrow-up" style={{color: 'var(--good)', fontSize: '0.6em', marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block', animation: 'bounce-up 2s infinite'}}>▲</span>}
        {trend === "down" && <span className="trend-arrow-down" style={{color: 'var(--critical)', fontSize: '0.6em', marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block', animation: 'bounce-down 2s infinite'}}>▼</span>}
      </strong>
      <small>{note}</small>
    </article>
  );
}

function escapeXml(v: string) {
  return v.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c));
}

function Card({ label, value }: { label: string; value: string | number }) {
  const text = String(value);
  const match = text.match(/^(\d+)(.*)$/);
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

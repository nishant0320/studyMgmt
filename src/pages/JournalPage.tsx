import { confirmAction } from "../utils/confirm";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Coffee,
  Download,
  FileJson,
  FileText,
  Flame,
  Frown,
  Meh,
  Plus,
  Save,
  Smile,
  Sparkles,
  Target,
  Trash2,
  X,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppStore } from "../store/AppStore";
import { JournalEntry, JournalGoal } from "../types";
import { chartAxisTickSmall, chartGridStroke, chartLine, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle, numberTooltipFormatter } from "../utils/chartTheme";
import { dateKey, minutes, sessionsOnDate } from "../utils/stats";
import { showToast } from "../utils/toast";

const today = dateKey(new Date());
const moodOptions = [
  { id: 5, icon: Sparkles, label: "Great", className: "great", color: "var(--accent)" },
  { id: 4, icon: Smile, label: "Good", className: "good", color: "var(--good)" },
  { id: 3, icon: Meh, label: "Neutral", className: "neutral", color: "var(--text-muted)" },
  { id: 2, icon: Coffee, label: "Tired", className: "tired", color: "var(--warn)" },
  { id: 1, icon: Frown, label: "Struggling", className: "rough", color: "var(--danger)" },
];

export function JournalPage() {
  const { state, dispatch } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraftState] = useState<JournalEntry>(() => normalizeEntry(state.journalEntries.find(entry => entry.date === today) ?? blankEntry(today)));
  const [newGoal, setNewGoal] = useState("");
  const [showExport, setShowExport] = useState(false);

  const entriesByDate = useMemo(() => new Map(state.journalEntries.map((entry) => [entry.date, entry])), [state.journalEntries]);
  const selectedEntry = entriesByDate.get(selectedDate);

  useEffect(() => {
    setDraftState(normalizeEntry(selectedEntry ?? blankEntry(selectedDate)));
    setNewGoal("");
  }, [selectedDate, selectedEntry]);

  const recentDates = useMemo(() => Array.from({ length: 12 }, (_, index) => dateKey(addDays(new Date(), -index))), []);
  const daySessions = sessionsOnDate(state.sessions, selectedDate);
  const dayMinutes = minutes(daySessions);
  const categoryRows = Object.entries(daySessions.reduce<Record<string, number>>((map, session) => {
    map[session.category || "General"] = (map[session.category || "General"] ?? 0) + (session.type === "focus" ? session.actualDuration : 0);
    return map;
  }, {})).sort((a, b) => b[1] - a[1]);
  
  const totalCategoryMinutes = categoryRows.reduce((sum, [_, mins]) => sum + mins, 0);

  const streak = journalStreak(entriesByDate);
  const completedGoals = (draft.goals ?? []).filter((goal) => goal.completed).length;
  const goalProgress = draft.goals?.length ? Math.round((completedGoals / draft.goals.length) * 100) : 0;
  const trend = state.journalEntries.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map((entry) => ({ date: entry.date.slice(5), mood: entry.moodRating, focus: entry.focusRating }));
  const cleanDraft = { ...draft, updatedAt: undefined };
  const cleanSaved = { ...normalizeEntry(selectedEntry ?? blankEntry(selectedDate)), updatedAt: undefined };
  const dirty = JSON.stringify(cleanDraft) !== JSON.stringify(cleanSaved);

  const setDraft = (entry: JournalEntry) => {
    const saved = { ...entry, updatedAt: new Date().toISOString() };
    setDraftState(saved);
    dispatch({ type: "upsert-journal", entry: saved });
  };
  const changeDate = (date: string) => setSelectedDate(date);
  const navigateDate = (delta: number) => changeDate(dateKey(addDays(new Date(`${selectedDate}T00:00:00`), delta)));

  const saveEntry = () => {
    dispatch({ type: "upsert-journal", entry: { ...draft, updatedAt: new Date().toISOString() } });
    showToast("Journal entry saved", "success");
  };

  const deleteEntry = async () => {
    if (!await confirmAction("Delete this journal entry?")) return;
    dispatch({ type: "delete-journal", date: selectedDate });
    setDraftState(blankEntry(selectedDate));
    showToast("Journal entry deleted", "warning");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty) saveEntry();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dirty, draft]);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const goal: JournalGoal = { id: crypto.randomUUID(), text: newGoal.trim(), completed: false };
    setDraft({ ...draft, goals: [...(draft.goals ?? []), goal] });
    setNewGoal("");
  };

  const toggleGoal = (id: string) => setDraft({ ...draft, goals: (draft.goals ?? []).map((goal) => goal.id === id ? { ...goal, completed: !goal.completed } : goal) });
  const removeGoal = (id: string) => setDraft({ ...draft, goals: (draft.goals ?? []).filter((goal) => goal.id !== id) });

  const exportData = (format: "json" | "csv") => {
    const payload = { exportDate: new Date().toISOString(), sessions: state.sessions, journalEntries: state.journalEntries };
    const content = format === "json" ? JSON.stringify(payload, null, 2) : journalCsv(state.journalEntries);
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `studytrack-journal-${selectedDate}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
    showToast(`Journal exported as ${format.toUpperCase()}`, "success");
  };

  const colors = ["var(--accent)", "var(--accent-2)", "var(--accent-3)", "var(--accent-4)", "var(--good)"];

  return (
    <div className="journal-page journal-dashboard page-transition">
      <header className="journal-header">
        <div>
          <h1>Study journal</h1>
          <p>Make sense of today. Set an intention for tomorrow.</p>
        </div>
        <div className="journal-header-actions">
          <div className="journal-stat-chip"><Flame size={16} /><strong>{streak}</strong><span>day streak</span></div>
          <div className="journal-stat-chip"><Award size={16} /><strong>{state.journalEntries.length}</strong><span>entries</span></div>
          <div className="export-wrapper">
            <button className="secondary icon-only" onClick={() => setShowExport(!showExport)} aria-label="Export journal data" title="Export journal data">
              <Download size={17} />
            </button>
            {showExport && (
              <div className="export-dropdown glass-card">
                <button onClick={() => exportData("json")}><FileJson size={17} /><span>JSON</span></button>
                <button onClick={() => exportData("csv")}><FileText size={17} /><span>CSV</span></button>
                <button className="ghost icon-only" onClick={() => setShowExport(false)} aria-label="Close export menu" title="Close export menu"><X size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="journal-date-nav">
        <button className="icon-only ghost" onClick={() => navigateDate(-1)} aria-label="Previous journal day" title="Previous journal day"><ChevronLeft size={18} /></button>
        <div className="journal-date-scroll">
          {recentDates.map((date) => {
            const day = new Date(`${date}T00:00:00`);
            return (
              <button key={date} className={`journal-date-chip glass-pill ${date === selectedDate ? "active primary" : "glass-panel"} ${entriesByDate.has(date) ? "has-entry" : ""}`} onClick={() => changeDate(date)}>
                <span>{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <strong>{day.getDate()}</strong>
                {date === today && <em>Today</em>}
              </button>
            );
          })}
        </div>
        <button className="icon-only ghost" onClick={() => navigateDate(1)} aria-label="Next journal day" title="Next journal day"><ChevronRight size={18} /></button>
      </nav>

      <section className="journal-grid">
        <article className="journal-card reflection-card glass-card">
          <div className="journal-card-head">
            <div>
              <h2><BookOpen size={20} className="accent-text" /> Daily Reflection</h2>
              <span className="text-muted">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <div className="journal-card-actions">
              <div className={`journal-save-state ${dirty ? "unsaved" : ""}`}>
                <span className={`pulse-indicator ${dirty ? "amber" : "green"}`} />
                {dirty ? "Saving…" : selectedEntry ? "All changes saved" : "Saves automatically"}
              </div>
              {selectedEntry && <button className="ghost danger-text icon-only" onClick={deleteEntry} aria-label="Delete journal entry" title="Delete journal entry"><Trash2 size={18} /></button>}
              <button className="primary journal-save-button" onClick={saveEntry} disabled={!dirty}><Save size={15} /> Save</button>
            </div>
          </div>

          <div className="journal-section">
            <label>How are you feeling?</label>
            <div className="mood-grid">
              {moodOptions.map((mood) => {
                const Icon = mood.icon;
                const isActive = draft.moodRating === mood.id;
                return (
                  <button 
                    key={mood.id} 
                    className={`mood-button ${isActive ? "active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setDraft({ ...draft, moodRating: mood.id })}
                  >
                    <Icon size={22} />
                    <span>{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="journal-section">
            <label>How focused were you?</label>
            <div className="focus-rating-grid">
              {[1, 2, 3, 4, 5].map((rating) => {
                const isActive = rating <= draft.focusRating;
                return (
                  <button 
                    key={rating} 
                    className={`focus-rating-button ${isActive ? "active" : ""}`}
                    aria-label={`Focus rating ${rating} of 5`} aria-pressed={rating === draft.focusRating}
                    onClick={() => setDraft({ ...draft, focusRating: rating })}
                  >
                    <span>{rating}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <JournalField label="What did you accomplish today?" value={draft.summary} placeholder="Write about your progress, challenges, learnings, and wins..." onChange={(value) => setDraft({ ...draft, summary: value })} />

          <div className="journal-section goals-section section-band">
            <div className="goals-title">
              <label>Daily Goals</label>
              {(draft.goals?.length ?? 0) > 0 && <span className="text-muted">{completedGoals}/{draft.goals?.length} done</span>}
            </div>
            {(draft.goals?.length ?? 0) > 0 && 
              <div className="goal-meter">
                <div style={{ width: `${goalProgress}%` }} />
              </div>
            }
            <div className="add-goal-row">
              <input value={newGoal} onChange={(event) => setNewGoal(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addGoal()} placeholder="Add a goal..." />
              <button className="primary icon-only" onClick={addGoal} disabled={!newGoal.trim()} aria-label="Add goal"><Plus size={16} /></button>
            </div>
            <div className="goals-list">
              {(draft.goals ?? []).length === 0 ? <div className="journal-empty-line text-muted">No goals set for this day</div> : draft.goals!.map((goal) => (
                <div key={goal.id} className={`goal-row ${goal.completed ? "done" : ""}`}>
                  <button className={`ghost icon-only premium-switch ${goal.completed ? "active" : ""}`} onClick={() => toggleGoal(goal.id)} aria-label={goal.completed ? "Mark goal incomplete" : "Mark goal complete"}>
                    {goal.completed ? <CheckCircle size={17} className="good-text" /> : <Circle size={17} className="text-muted" />}
                  </button>
                  <span>{goal.text}</span>
                  <button className="ghost icon-only danger-text" onClick={() => removeGoal(goal.id)} aria-label="Delete goal" title="Delete goal"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="journal-side">
          <section className="journal-card day-summary-card glass-card">
            <h2><TrendingUp size={20} className="accent-text" /> Day Summary</h2>
            <div className="journal-day-stats">
              <div className="stat-box">
                <Clock3 size={24} className="accent-text" />
                <strong>{formatTime(dayMinutes)}</strong>
                <span>focused</span>
              </div>
              <div className="stat-box">
                <Target size={24} className="accent-2-text" />
                <strong>{daySessions.filter(s => s.type === "focus").length}</strong>
                <span>sessions</span>
              </div>
            </div>
            {categoryRows.length > 0 ? (
              <div className="journal-category-list">
                {categoryRows.map(([category, mins], index) => (
                  <div key={category} className="category-row">
                    <div className="category-labels">
                      <span>{category}</span>
                      <b>{formatTime(mins)}</b>
                    </div>
                    <div className="category-meter">
                      <div style={{ width: `${(mins / totalCategoryMinutes) * 100}%`, background: colors[index % colors.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-session-state text-muted">
                <Brain size={48} />
                <strong>No study sessions</strong>
                <span>Start a session to track progress</span>
              </div>
            )}
            <div className="writing-prompts section-band">
              <strong>Spark prompts</strong>
              <ul>
                <li>What was your biggest win today?</li>
                <li>What challenged you the most?</li>
                <li>What will you do differently tomorrow?</li>
              </ul>
            </div>
            <div className="journal-trend-card">
              <strong>Mood / Focus Trend</strong>
              <div className="journal-trend-chart">
                {trend.length < 2 ? (
                  <div className="journal-empty-line text-muted">Save two entries to see a trend</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tickLine={false} axisLine={false} tick={chartAxisTickSmall} />
                      <YAxis domain={[1, 5]} stroke="var(--text-muted)" tickLine={false} axisLine={false} tick={chartAxisTickSmall} width={20} />
                      <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} formatter={numberTooltipFormatter} separator=" " />
                      <Line type="monotone" dataKey="mood" stroke="var(--accent-2)" strokeWidth={chartLine.strokeWidth} dot={false} activeDot={{ ...chartLine.activeDot, fill: "var(--accent-2)", stroke: "var(--accent-2)" }} />
                      <Line type="monotone" dataKey="focus" stroke="var(--accent)" strokeWidth={chartLine.strokeWidth} dot={false} activeDot={{ ...chartLine.activeDot, fill: "var(--accent)", stroke: "var(--accent)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function JournalField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <div className="journal-section">
      <label htmlFor={`journal-${label.replace(/\s/g, "-")}`}>{label}</label>
      <textarea id={`journal-${label.replace(/\s/g, "-")}`} 
        value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} 
      />
    </div>
  );
}

function blankEntry(date: string): JournalEntry {
  return { date, moodRating: 3, focusRating: 3, summary: "", whatWentWell: "", whatDidnt: "", tomorrowPlan: "", goals: [] };
}

function normalizeEntry(entry: JournalEntry): JournalEntry {
  return { ...blankEntry(entry.date), ...entry, goals: entry.goals ?? [] };
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function journalStreak(entries: Map<string, JournalEntry>) {
  let count = 0;
  for (let i = 0; i < 365; i += 1) {
    const date = dateKey(addDays(new Date(), -i));
    const entry = entries.get(date);
    const hasEntry = entry && words(`${entry.summary} ${entry.whatWentWell} ${entry.whatDidnt} ${entry.tomorrowPlan}`) > 0;
    if (!hasEntry) { if (i === 0) continue; break; }
    count += 1;
  }
  return count;
}

function formatTime(mins: number) {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function journalCsv(entries: JournalEntry[]) {
  const header = "date,mood,focus,summary,whatWentWell,whatDidnt,tomorrowPlan";
  const rows = entries.map((entry) => [entry.date, entry.moodRating, entry.focusRating, entry.summary, entry.whatWentWell, entry.whatDidnt, entry.tomorrowPlan].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
  return [header, ...rows].join("\n");
}

import { AppState, Badge, CalendarEvent, JournalEntry, Settings, StudySession, Task } from "../types";

const day = 24 * 60 * 60 * 1000;
const today = new Date();

const isoDate = (offset: number) => {
  const d = new Date(today.getTime() + offset * day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const at = (offset: number, hour: number, minutes = 0) => {
  const d = new Date(today.getTime() + offset * day);
  d.setHours(hour, minutes, 0, 0);
  return d.toISOString();
};

export const defaultSettings: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  dailyGoalMinutes: 90,
  weeklyGoalMinutes: 540,
  theme: "dark",
  accentColor: "#a7c993",
  soundEnabled: true,
  autoStartNextSession: false,
  notificationsEnabled: false,
  demoDataEnabled: true,
  adversarialHourlyRate: 50,
  adversarialWakeHour: 6,
  adversarialSleepHour: 22,
  adversarialProductivityRatio: 50,
  adversarialHardcoreMode: false,
  adversarialDailyPlanMinutes: 90,
  profileName: "Student",
  focusSoundEnabled: true,
  focusSoundType: "rain",
  pomodoroPreset: "classic",
  showStreakNotifications: true,
};


export const starterBadges: Badge[] = [
  { id: "first-focus", name: "First Focus", description: "Complete your first focus session.", icon: "Sparkles", criteria: { metric: "completedFocusSessions", threshold: 1, label: "1 completed focus session" }, dateEarned: null, tier: "bronze", category: "Focus" },
  { id: "focus-ten", name: "Ten Clean Blocks", description: "Finish 10 focused sessions without interruption.", icon: "CheckCircle2", criteria: { metric: "completedFocusSessions", threshold: 10, label: "10 completed focus sessions" }, dateEarned: null, tier: "bronze", category: "Focus" },
  { id: "focus-fifty", name: "Fifty Block Mind", description: "Build a serious focus-session base.", icon: "CheckCircle2", criteria: { metric: "completedFocusSessions", threshold: 50, label: "50 completed focus sessions" }, dateEarned: null, tier: "silver", category: "Focus" },
  { id: "clean-80", name: "Clean Eighty", description: "Keep your clean completion rate at 80% or better.", icon: "ShieldCheck", criteria: { metric: "cleanCompletionRate", threshold: 80, label: "80% clean completion rate" }, dateEarned: null, tier: "gold", category: "Focus" },
  { id: "three-day", name: "Three-Day Thread", description: "Meet your goal for 3 days in a row.", icon: "Flame", criteria: { metric: "goalStreak", threshold: 3, label: "3 day goal streak" }, dateEarned: null, tier: "bronze", category: "Consistency" },
  { id: "seven-day", name: "Seven-Day Thread", description: "Hold the line for a full week.", icon: "Flame", criteria: { metric: "goalStreak", threshold: 7, label: "7 day goal streak" }, dateEarned: null, tier: "silver", category: "Consistency" },
  { id: "fourteen-day", name: "Two Week Thread", description: "Make studying part of the weather.", icon: "Flame", criteria: { metric: "goalStreak", threshold: 14, label: "14 day goal streak" }, dateEarned: null, tier: "gold", category: "Consistency" },
  { id: "ten-hours", name: "Ten Hour Bank", description: "Log 10 total focus hours.", icon: "Trophy", criteria: { metric: "totalFocusMinutes", threshold: 600, label: "10 total focus hours" }, dateEarned: null, tier: "bronze", category: "Volume" },
  { id: "fifty-hours", name: "Fifty Hour Vault", description: "Accumulate 50 focused hours.", icon: "Trophy", criteria: { metric: "totalFocusMinutes", threshold: 3000, label: "50 total focus hours" }, dateEarned: null, tier: "silver", category: "Volume" },
  { id: "hundred-hours", name: "Hundred Hour Archive", description: "Cross the 100-hour mark.", icon: "Trophy", criteria: { metric: "totalFocusMinutes", threshold: 6000, label: "100 total focus hours" }, dateEarned: null, tier: "gold", category: "Volume" },
  { id: "task-closer", name: "Task Closer", description: "Finish 5 tasks.", icon: "CheckCircle2", criteria: { metric: "doneTasks", threshold: 5, label: "5 completed tasks" }, dateEarned: null, tier: "bronze", category: "Exploration" },
  { id: "task-sweeper", name: "Task Sweeper", description: "Finish 15 tasks.", icon: "CheckCircle2", criteria: { metric: "doneTasks", threshold: 15, label: "15 completed tasks" }, dateEarned: null, tier: "silver", category: "Exploration" },
  { id: "journalist", name: "Evening Debrief", description: "Write 5 journal entries.", icon: "BookOpen", criteria: { metric: "journalEntries", threshold: 5, label: "5 journal days" }, dateEarned: null, tier: "bronze", category: "Exploration" },
  { id: "journal-20", name: "Reflection Ledger", description: "Write 20 daily reflections.", icon: "BookOpen", criteria: { metric: "journalEntries", threshold: 20, label: "20 journal days" }, dateEarned: null, tier: "silver", category: "Exploration" },
  { id: "feature-tour", name: "Full Tour", description: "Use the timer, tasks, journal, calendar, and history data paths.", icon: "Sparkles", criteria: { metric: "featureCoverage", threshold: 5, label: "5 feature areas used" }, dateEarned: null, tier: "gold", category: "Exploration" },
  { id: "comeback", name: "Clean Comeback", description: "Return after a gap and complete a session.", icon: "RotateCcw", criteria: { metric: "comebackSessions", threshold: 1, label: "1 comeback session after a gap" }, dateEarned: null, tier: "bronze", category: "Comeback" },
  { id: "comeback-three", name: "Reset Without Drama", description: "Stack three comeback sessions over time.", icon: "RotateCcw", criteria: { metric: "comebackSessions", threshold: 3, label: "3 comeback sessions" }, dateEarned: null, tier: "silver", category: "Comeback" },
  { id: "comeback-five", name: "Durable Return", description: "Come back five times without turning the gap into a story.", icon: "RotateCcw", criteria: { metric: "comebackSessions", threshold: 5, label: "5 comeback sessions" }, dateEarned: null, tier: "gold", category: "Comeback" },
];

export const demoTasks: Task[] = [
  {
    id: "task-math",
    title: "Linear algebra problem set",
    description: "Finish eigenvectors and matrix diagonalization questions.",
    status: "in-progress",
    priority: "high",
    dueDate: isoDate(1),
    createdAt: at(-8, 9),
    estimatedPomodoros: 5,
    actualPomodoros: 3,
    category: "Math",
    subtasks: [
      { id: "s1", title: "Review lecture notes", done: true },
      { id: "s2", title: "Solve odd problems", done: true },
      { id: "s3", title: "Redo mistakes", done: false },
    ],
  },
  {
    id: "task-cs",
    title: "Algorithms reading",
    description: "Dynamic programming chapter and notes.",
    status: "todo",
    priority: "medium",
    dueDate: isoDate(3),
    createdAt: at(-4, 15),
    estimatedPomodoros: 4,
    actualPomodoros: 1,
    category: "CS",
    subtasks: [
      { id: "s4", title: "Read chapter", done: false },
      { id: "s5", title: "Summarize patterns", done: false },
    ],
  },
  {
    id: "task-history",
    title: "History essay outline",
    description: "Draft thesis and evidence map.",
    status: "done",
    priority: "low",
    dueDate: isoDate(-2),
    createdAt: at(-10, 12),
    completedAt: at(-1, 18),
    estimatedPomodoros: 3,
    actualPomodoros: 4,
    category: "History",
    subtasks: [
      { id: "s6", title: "Pick sources", done: true },
      { id: "s7", title: "Outline paragraphs", done: true },
    ],
  },
];

export const demoSessions: StudySession[] = Array.from({ length: 42 }, (_, index) => {
  const offset = -20 + Math.floor(index / 2);
  const planned = [28, 32, 36, 40][index % 4];
  const completed = index % 9 !== 0;
  const actual = completed ? planned + (index % 5 === 0 ? 5 : -2) : Math.max(12, planned - 14);
  const startHour = [8, 10, 14, 19][index % 4];
  const task = [demoTasks[0], demoTasks[1], demoTasks[2]][index % 3];
  return {
    id: `session-${index}`,
    taskId: task.id,
    startTime: at(offset, startHour, (index * 7) % 50),
    endTime: at(offset, startHour, ((index * 7) % 50) + Math.min(actual, 55)),
    plannedDuration: planned,
    actualDuration: actual,
    type: "focus",
    completed,
    interrupted: !completed,
    category: task.category,
    notes: completed ? "Solid block, minor context switching." : "Interrupted, restart with a smaller target.",
  };
});

export const demoJournal: JournalEntry[] = [-7, -5, -4, -2, -1, 0].map((offset, i) => ({
  date: isoDate(offset),
  moodRating: [3, 4, 2, 5, 4, 3][i],
  focusRating: [3, 4, 2, 5, 4, 4][i],
  summary: "Reviewed the day, kept notes short, and identified one clear next action.",
  whatWentWell: "Starting before lunch made the second session easier.",
  whatDidnt: "Phone nearby during the evening block was a predictable distraction.",
  tomorrowPlan: "Begin with the highest priority task and run one adaptive focus block.",
}));

export const demoEvents: CalendarEvent[] = [
  { id: "event-1", title: "Mock exam", date: isoDate(2), category: "Exam", color: "var(--critical)", startTime: "09:00", endTime: "11:00", notes: "Bring the formula sheet and calculator." },
  { id: "event-2", title: "Study group", date: isoDate(4), category: "Group", color: "var(--accent-4)", startTime: "18:30", endTime: "19:30" },
];

export const makeInitialState = (): AppState => ({
  sessions: demoSessions,
  tasks: demoTasks,
  journalEntries: demoJournal,
  badges: starterBadges,
  settings: defaultSettings,
  events: demoEvents,
});

/** A new personal workspace starts with real progress, not sample activity. */
export const makeEmptyState = (): AppState => ({
  sessions: [], tasks: [], journalEntries: [], events: [],
  badges: starterBadges.map(badge => ({ ...badge, dateEarned: null })),
  settings: { ...defaultSettings, demoDataEnabled: false },
});

export type SessionType = "focus" | "break" | "longBreak";
export type TaskStatus = "todo" | "in-progress" | "done";
export type Priority = "low" | "medium" | "high";
export type BadgeTier = "bronze" | "silver" | "gold";
export type BadgeMetric =
  | "completedFocusSessions"
  | "goalStreak"
  | "totalFocusMinutes"
  | "doneTasks"
  | "journalEntries"
  | "cleanCompletionRate"
  | "featureCoverage"
  | "comebackSessions";

export type StudySession = {
  source?: "timer" | "manual";
  id: string;
  taskId?: string;
  startTime: string;
  endTime: string;
  plannedDuration: number;
  actualDuration: number;
  type: SessionType;
  completed: boolean;
  interrupted: boolean;
  category: string;
  notes?: string;
};

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  pomodoroMinutes?: number;
  completedByPomodoros?: boolean;
  plannedDate?: string;
  planOrder?: number;
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  estimatedPomodoros: number;
  actualPomodoros: number;
  category: string;
  subtasks: Subtask[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  category: string;
  color: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export type JournalEntry = {
  date: string;
  moodRating: number;
  summary: string;
  whatWentWell: string;
  whatDidnt: string;
  tomorrowPlan: string;
  focusRating: number;
  goals?: JournalGoal[];
  updatedAt?: string;
};

export type JournalGoal = {
  id: string;
  text: string;
  completed: boolean;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    metric: BadgeMetric;
    threshold: number;
    label: string;
  };
  dateEarned: string | null;
  tier: BadgeTier;
  category: string;
};

export type Settings = {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  theme: "dark";
  accentColor: string;
  soundEnabled: boolean;
  autoStartNextSession: boolean;
  notificationsEnabled: boolean;
  demoDataEnabled: boolean;
  adversarialHourlyRate: number;
  adversarialWakeHour: number;
  adversarialSleepHour: number;
  adversarialProductivityRatio: number;
  adversarialHardcoreMode: boolean;
  adversarialDailyPlanMinutes: number;
  profileName: string;
  focusSoundEnabled: boolean;
  focusSoundType: "silence" | "rain" | "lofi" | "whitenoise" | "forest";
  pomodoroPreset: "classic" | "52-17" | "90-20" | "custom";
  showStreakNotifications: boolean;
};

export type AppState = {
  customCategories?: string[];
  sessions: StudySession[];
  tasks: Task[];
  journalEntries: JournalEntry[];
  badges: Badge[];
  settings: Settings;
  events: CalendarEvent[];
};

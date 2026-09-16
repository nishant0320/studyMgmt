import { AppState, Badge, BadgeMetric, StudySession, Task } from "../types";

export const dateKey = (value: string | Date) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const minutes = (sessions: StudySession[]) => sessions.reduce((sum, session) => sum + (session.type === "focus" ? session.actualDuration : 0), 0);
export const completedFocus = (sessions: StudySession[]) => sessions.filter((session) => session.type === "focus" && session.completed && !session.interrupted);

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
const startOfWeek = (date = new Date()) => addDays(startOfDay(date), -date.getDay());

export function sessionsOnDate(sessions: StudySession[], date: string) {
  return sessions.filter((session) => dateKey(session.startTime) === date);
}

export function todayStats(state: AppState) {
  const today = dateKey(new Date());
  const sessions = sessionsOnDate(state.sessions, today);
  return {
    sessionsToday: completedFocus(sessions).length,
    minutesToday: minutes(sessions),
    goalMet: minutes(sessions) >= state.settings.dailyGoalMinutes,
  };
}

export function dayMinutesMap(sessions: StudySession[]) {
  return sessions.reduce<Record<string, number>>((map, session) => {
    const key = dateKey(session.startTime);
    map[key] = (map[key] ?? 0) + (session.type === "focus" ? session.actualDuration : 0);
    return map;
  }, {});
}

export function currentStreak(state: AppState, requireGoal = true) {
  const map = dayMinutesMap(state.sessions);
  let streak = 0;
  for (let i = 0; i < 730; i += 1) {
    const date = dateKey(addDays(startOfDay(), -i));
    const passed = requireGoal ? (map[date] ?? 0) >= state.settings.dailyGoalMinutes : (map[date] ?? 0) > 0;
    if (!passed) { if (i === 0) continue; break; }
    streak += 1;
  }
  return streak;
}

export function longestStreak(state: AppState) {
  const map = dayMinutesMap(state.sessions);
  const keys = Object.keys(map).sort();
  let best = 0;
  let current = 0;
  keys.forEach((key, index) => {
    const previous = keys[index - 1];
    const consecutive = previous && (new Date(key).getTime() - new Date(previous).getTime()) / 86400000 === 1;
    current = (map[key] ?? 0) >= state.settings.dailyGoalMinutes ? (consecutive ? current + 1 : 1) : 0;
    best = Math.max(best, current);
  });
  return best;
}

export function weeklySeries(state: AppState, weeks = 8) {
  return Array.from({ length: weeks }, (_, i) => {
    const end = addDays(startOfDay(), -7 * (weeks - i - 1));
    const start = addDays(end, -6);
    const sessions = state.sessions.filter((session) => {
      const t = new Date(session.startTime);
      return t >= start && t < addDays(end, 1);
    });
    return { label: `W${i + 1}`, minutes: minutes(sessions), sessions: completedFocus(sessions).length };
  });
}

export function currentWeekDailyBreakdown(state: AppState) {
  const map = dayMinutesMap(state.sessions);
  const start = startOfWeek();
  return Array.from({ length: 7 }, (_, i) => {
    const key = dateKey(addDays(start, i));
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i], date: key, minutes: map[key] ?? 0, goal: state.settings.dailyGoalMinutes };
  });
}

export function weekComparisonSeries(state: AppState) {
  const map = dayMinutesMap(state.sessions);
  const start = startOfWeek();
  return Array.from({ length: 7 }, (_, i) => {
    const thisKey = dateKey(addDays(start, i));
    const lastKey = dateKey(addDays(start, i - 7));
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i], thisWeek: map[thisKey] ?? 0, lastWeek: map[lastKey] ?? 0 };
  });
}

export function monthlySummary(state: AppState) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthSessions = state.sessions.filter((session) => {
    const t = new Date(session.startTime);
    return t >= monthStart && t < addDays(monthEnd, 1);
  });
  const weeks = new Map<string, number>();
  monthSessions.forEach((session) => {
    const week = dateKey(startOfWeek(new Date(session.startTime)));
    weeks.set(week, (weeks.get(week) ?? 0) + (session.type === "focus" ? session.actualDuration : 0));
  });
  const sorted = [...weeks.entries()].sort((a, b) => a[1] - b[1]);
  return {
    totalHours: Math.round((minutes(monthSessions) / 60) * 10) / 10,
    bestWeek: sorted[sorted.length - 1] ?? ["No week yet", 0],
    worstWeek: sorted[0] ?? ["No week yet", 0],
  };
}

export function dailySeries(state: AppState, days = 14) {
  const map = dayMinutesMap(state.sessions);
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(startOfDay(), i - days + 1);
    const key = dateKey(d);
    return { date: key.slice(5), fullDate: key, minutes: map[key] ?? 0, goal: state.settings.dailyGoalMinutes };
  });
}

export function categoryDistribution(sessions: StudySession[]) {
  const map = sessions.reduce<Record<string, number>>((acc, session) => {
    if (session.type === "focus") acc[session.category || "General"] = (acc[session.category || "General"] ?? 0) + session.actualDuration;
    return acc;
  }, {});
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export function hourDistribution(sessions: StudySession[]) {
  const map = sessions.reduce<Record<string, number>>((acc, session) => {
    const hour = new Date(session.startTime).getHours();
    acc[`${hour}:00`] = (acc[`${hour}:00`] ?? 0) + (session.completed ? session.actualDuration : Math.round(session.actualDuration * 0.5));
    return acc;
  }, {});
  return Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour}:00`, minutes: map[`${hour}:00`] ?? 0 })).filter((item) => item.minutes > 0);
}

export function dayOfWeekPerformance(sessions: StudySession[]) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map = sessions.reduce<Record<string, number>>((acc, session) => {
    const name = names[new Date(session.startTime).getDay()];
    acc[name] = (acc[name] ?? 0) + (session.type === "focus" ? session.actualDuration : 0);
    return acc;
  }, {});
  return names.map((day) => ({ day, minutes: map[day] ?? 0 }));
}

export function sessionLengthBuckets(sessions: StudySession[]) {
  const buckets = [
    { label: "<20", min: 0, max: 19 },
    { label: "20-34", min: 20, max: 34 },
    { label: "35-49", min: 35, max: 49 },
    { label: "50+", min: 50, max: 999 },
  ];
  return buckets.map((bucket) => ({
    label: bucket.label,
    count: sessions.filter((session) => session.type === "focus" && session.actualDuration >= bucket.min && session.actualDuration <= bucket.max).length,
  }));
}

export function completionRate(sessions: StudySession[]) {
  const focus = sessions.filter((session) => session.type === "focus");
  if (!focus.length) return 0;
  return Math.round((completedFocus(focus).length / focus.length) * 100);
}

export function bestHour(sessions: StudySession[]) {
  const data = hourDistribution(sessions);
  return data.sort((a, b) => b.minutes - a.minutes)[0]?.hour ?? "No data";
}

export function procrastinationIndex(tasks: Task[]) {
  const done = tasks.filter((task) => task.status === "done" && task.completedAt && task.dueDate);
  if (!done.length) return 0;
  const late = done.filter((task) => new Date(task.completedAt!) > new Date(`${task.dueDate}T23:59:59`)).length;
  return Math.round((late / done.length) * 100);
}

export function adversarialMetrics(state: AppState) {
  const allFocus = state.sessions.filter((session) => session.type === "focus");
  const last7 = state.sessions.filter((session) => new Date(session.startTime) >= addDays(startOfDay(), -6));
  const thisWeekMinutes = minutes(last7);
  const timeDebt = state.settings.weeklyGoalMinutes - thisWeekMinutes;
  const completion = completionRate(allFocus);
  const consistency = Math.min(100, (currentStreak(state) / 7) * 100);
  const volume = Math.min(100, (thisWeekMinutes / state.settings.weeklyGoalMinutes) * 100);
  const gradeScore = Math.round(consistency * 0.35 + volume * 0.4 + completion * 0.25);
  const grade = gradeScore >= 90 ? "A" : gradeScore >= 80 ? "B" : gradeScore >= 70 ? "C" : gradeScore >= 60 ? "D" : "F";
  const interrupted = allFocus.filter((session) => session.interrupted);
  const opportunityCost = interrupted.reduce((sum, session) => sum + Math.max(0, session.plannedDuration - session.actualDuration), 0);
  const liarMetric = allFocus.length ? Math.round(allFocus.reduce((sum, session) => sum + Math.abs(session.plannedDuration - session.actualDuration), 0) / allFocus.length) : 0;
  const intensity = allFocus.length ? Math.round((allFocus.reduce((sum, session) => sum + session.actualDuration / session.plannedDuration, 0) / allFocus.length) * 100) : 0;
  const today = todayStats(state).minutesToday;
  const map = dayMinutesMap(state.sessions);
  const allDays = Object.values(map).sort((a, b) => a - b);
  const todayRank = allDays.length ? Math.round((allDays.filter((value) => value <= today).length / allDays.length) * 100) : 0;
  const yesterdayKey = dateKey(addDays(startOfDay(), -1));
  return {
    weeklyGrade: grade,
    gradeScore,
    focusScore: completion,
    procrastination: procrastinationIndex(state.tasks),
    timeDebt,
    currentStreak: currentStreak(state),
    bestHour: bestHour(state.sessions),
    sessionIntensity: intensity,
    todayRank,
    sessionsToday: todayStats(state).sessionsToday,
    opportunityCost,
    liarMetric,
    todayVsYesterday: today - (map[yesterdayKey] ?? 0),
    weeklyProgress: Math.round((thisWeekMinutes / state.settings.weeklyGoalMinutes) * 100),
  };
}

export function badgeMetricValue(state: AppState, metric: BadgeMetric) {
  switch (metric) {
    case "completedFocusSessions":
      return completedFocus(state.sessions).length;
    case "goalStreak":
      return currentStreak(state);
    case "totalFocusMinutes":
      return minutes(state.sessions);
    case "doneTasks":
      return state.tasks.filter((task) => task.status === "done").length;
    case "journalEntries":
      return new Set(state.journalEntries.map((entry) => entry.date)).size;
    case "cleanCompletionRate":
      return completionRate(state.sessions);
    case "featureCoverage": {
      const areas = [
        state.sessions.length > 0,
        state.tasks.length > 0,
        state.journalEntries.length > 0,
        state.events.length > 0,
        state.sessions.some((session) => session.notes),
      ];
      return areas.filter(Boolean).length;
    }
    case "comebackSessions": {
      const focusDays = [...new Set(completedFocus(state.sessions).map((session) => dateKey(session.startTime)))].sort();
      return focusDays.filter((day, index) => index > 0 && (new Date(day).getTime() - new Date(focusDays[index - 1]).getTime()) / 86400000 >= 3).length;
    }
    default:
      return 0;
  }
}

export function badgeProgress(state: AppState, badge: Badge) {
  return Math.min(100, Math.round((badgeMetricValue(state, badge.criteria.metric) / Math.max(1, badge.criteria.threshold)) * 100));
}

export function computeEarnedBadges(state: AppState): Badge[] {
  const now = new Date().toISOString();
  return state.badges.map((badge) => (badgeMetricValue(state, badge.criteria.metric) >= badge.criteria.threshold && !badge.dateEarned ? { ...badge, dateEarned: now } : badge));
}

export function exportCsv(sessions: StudySession[]) {
  const header = "date,start,end,type,category,planned,actual,completed,interrupted,notes";
  const rows = sessions.map((session) =>
    [
      dateKey(session.startTime),
      new Date(session.startTime).toLocaleTimeString(),
      new Date(session.endTime).toLocaleTimeString(),
      session.type,
      session.category,
      session.plannedDuration,
      session.actualDuration,
      session.completed,
      session.interrupted,
      `"${(session.notes ?? "").replace(/"/g, '""')}"`,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

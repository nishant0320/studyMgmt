import type { AppState, StudySession } from "../types";
import { adversarialMetrics, dateKey, dayMinutesMap, minutes, monthlySummary, weekComparisonSeries } from "./stats";

export function buildAdversarialDashboard(state: AppState, now: Date) {
  state = { ...state, sessions: state.sessions.filter(session => new Date(session.startTime) <= now) };
  const focusSessions = state.sessions.filter((session) => session.type === "focus" && new Date(session.startTime) <= now);
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
  const gradeMessage = gradeScore >= 85 ? "Your recent sessions are supporting your goals." : gradeScore >= 65 ? "Keep the parts of your routine that are working." : "Your plan may need adjusting. Try a shorter, achievable session.";
  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(now, index - 6);
    const key = dateKey(date);
    return { date: key, label: date.toLocaleDateString(undefined, { weekday: "short" }), actual: map[key] ?? 0, expected: state.settings.dailyGoalMinutes, isToday: key === todayKey };
  });
  const weeklyData = Array.from({ length: 4 }, (_, index) => {
    const start = addDays(weekStart, -(3 - index) * 7);
    const end = index === 3 ? now : endOfDay(addDays(start, 6));
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
  }).filter((day) => day.date < todayKey && day.actual > 0 && day.deficit > 0).sort((a, b) => b.deficit - a.deficit).slice(0, 5);
  const bestHour = bestProductiveHour(focusSessions);
  const actionBrief = [
    todayMinutes < plannedMinutes 
      ? { emoji: "🔴", text: `${formatTime(plannedMinutes - todayMinutes)} remains toward your target. Choose a block that fits your energy.` } 
      : { emoji: "✅", text: "Your target is covered. Reflect on what worked and take a break." },
    temporalVelocity < 0.7 
      ? { emoji: "⚠️", text: "A short block or a smaller target can help when the day changes." } 
      : { emoji: "🛡️", text: "Protect the next focus block from interruption." },
    yesterdayMinutes > todayMinutes 
      ? { emoji: "⚡", text: `Yesterday had ${formatTime(yesterdayMinutes)} of focus. Use it as context, not a requirement.` } 
      : { emoji: "🔥", text: "Make room for rest as well as progress." },
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
    weeklyProgress: weeklyPercent,
    thisWeekMinutes,
    weekComparisonSeries: comparison,
    monthlySummary: month,
  };
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

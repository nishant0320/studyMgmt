import type { StudySession } from "../types";
import { dateKey } from "./stats";
export type RangeKey = "7d" | "30d" | "90d";
type TrendPoint = { date: string; fullDate: string; minutes: number };
type HourPoint = { hour: string; minutes: number };
export const rangeDays: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function buildDashboard(sessions: StudySession[], range: RangeKey, dailyGoal: number, now = new Date()) {
  const days = rangeDays[range];
  const start = startOfDay(addDays(now, -(days - 1)));
  const previousStart = startOfDay(addDays(start, -days));
  const previousEnd = addDays(start, -1);
  sessions = sessions.filter(session => session.type === "focus");
  const filtered = sessions.filter((session) => new Date(session.startTime) >= start && new Date(session.startTime) <= now);
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

  const categoryTotals = new Map<string, number>();
  filtered.forEach(session => categoryTotals.set(session.category || "General", (categoryTotals.get(session.category || "General") ?? 0) + session.actualDuration));
  const categoryData = [...categoryTotals].filter(([, minutes]) => minutes > 0)
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.subject.localeCompare(b.subject));

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
  const goalHitRate = Math.round((goalHits / days) * 100);
  const strongestCategory = categoryData.filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes)[0];
  const strongestHour = hourlyData.filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes)[0];

  return { trendData, categoryData, hourlyData, totalMinutes, previousMinutes, delta, totalSessions, avgSessionLength, cleanSessions, completionRate, activeDays, goalHits, goalHitRate, strongestCategory, strongestHour };
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


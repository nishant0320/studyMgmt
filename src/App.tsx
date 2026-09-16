import { Navigate, Route, Routes } from "react-router-dom";
import { lazy } from "react";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
const TimerPage = lazy(() => import("./pages/TimerPage").then(module => ({ default: module.TimerPage })));
const TaskBoardPage = lazy(() => import("./pages/TaskBoardPage").then(module => ({ default: module.TaskBoardPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then(module => ({ default: module.CalendarPage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then(module => ({ default: module.HistoryPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then(module => ({ default: module.AnalyticsPage })));
const CoachPage = lazy(() => import("./pages/CoachPage").then(module => ({ default: module.CoachPage })));
const JournalPage = lazy(() => import("./pages/JournalPage").then(module => ({ default: module.JournalPage })));
const BadgesPage = lazy(() => import("./pages/BadgesPage").then(module => ({ default: module.BadgesPage })));
const StatsPage = lazy(() => import("./pages/StatsPage").then(module => ({ default: module.StatsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(module => ({ default: module.SettingsPage })));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/timer" element={<TimerPage />} />
        <Route path="/tasks" element={<TaskBoardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/badges" element={<BadgesPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

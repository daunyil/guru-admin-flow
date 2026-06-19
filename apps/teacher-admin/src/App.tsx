/**
 * Root App: router + AppShell.
 * Sprint 3: 8 routes — Today, Profile, NewYear, Backup, Calendar, Prota, Promes, Schedule.
 */

import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./shared/layout/AppShell";
import { TodayPage } from "./routes/TodayPage";
import { ProfilePage } from "./modules/profile/ProfilePage";
import { BackupPage } from "./modules/backup/BackupPage";
import { NewYearWizard } from "./modules/new-year/NewYearWizard";
import { CalendarPage } from "./modules/calendar/CalendarPage";
import { ProtaPage } from "./modules/prota/ProtaPage";
import { PromesPage } from "./modules/promes/PromesPage";
import { SchedulePage } from "./modules/schedule/SchedulePage";

export function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/new-year" element={<NewYearWizard />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/prota" element={<ProtaPage />} />
          <Route path="/promes" element={<PromesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}

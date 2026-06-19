/**
 * Root App: router + AppShell.
 * Sprint 4: 11 routes — Today, Profile, NewYear, Backup, Calendar, Prota, Promes, Schedule, Roster, Attendance, Journal.
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
import { RosterPage } from "./modules/roster/RosterPage";
import { AttendancePage } from "./modules/attendance/AttendancePage";
import { JournalPage } from "./modules/journal/JournalPage";

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
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}

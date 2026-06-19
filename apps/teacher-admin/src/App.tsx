/**
 * Root App: router + AppShell.
 * Sprint 5: 13 routes — +SemesterReport, +Completeness.
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
import { SemesterReportPage } from "./modules/semester-report/SemesterReportPage";
import { CompletenessPage } from "./modules/completeness/CompletenessPage";

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
          <Route path="/semester-report" element={<SemesterReportPage />} />
          <Route path="/completeness" element={<CompletenessPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}

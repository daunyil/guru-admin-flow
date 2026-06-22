/**
 * Root App: router + AppShell.
 * v0.6.2: 17 routes — +QuickAttendance, +QuickJournal, +Grades, +ATP, +RPP.
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
import { QuickAttendancePage } from "./modules/attendance/QuickAttendancePage";
import { QuickJournalPage } from "./modules/journal/QuickJournalPage";
import { GradesPage } from "./modules/grades/GradesPage";
import { ATPPage } from "./modules/atp/ATPPage";
import { RPPPage } from "./modules/rpp/RPPPage";
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
          <Route path="/attendance" element={<QuickAttendancePage />} />
          <Route path="/journal" element={<QuickJournalPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/atp" element={<ATPPage />} />
          <Route path="/rpp" element={<RPPPage />} />
          <Route path="/semester-report" element={<SemesterReportPage />} />
          <Route path="/completeness" element={<CompletenessPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}

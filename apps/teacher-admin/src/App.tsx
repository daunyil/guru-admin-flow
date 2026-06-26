/**
 * Root App: router + AppShell.
 * AI-PROMPT-BRIDGE-RC1: 26 routes — +/evaluation-docs.
 * SUPABASE-AUTH-RLS-RC1: AuthGate aktif hanya saat env Supabase diisi.
 */

import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthGate } from "./modules/auth/AuthGate";
import { AppShell } from "./shared/layout/AppShell";
import { ErrorBoundary } from "./shared/ui/ErrorBoundary";
import { TodayPage } from "./routes/TodayPage";
import { ProfilePage } from "./modules/profile/ProfilePage";
import { BackupPage } from "./modules/backup/BackupPage";
import { NewYearWizard } from "./modules/new-year/NewYearWizard";
import { CalendarPage } from "./modules/calendar/CalendarPage";
import { ProtaPage } from "./modules/prota/ProtaPage";
import { PromesPage } from "./modules/promes/PromesPage";
import { SchedulePage } from "./modules/schedule/SchedulePage";
import { RosterPage } from "./modules/roster/RosterPage";
import { AssignmentsPage } from "./modules/assignments/AssignmentsPage";
import { QuickAttendancePage } from "./modules/attendance/QuickAttendancePage";
import { QuickJournalPage } from "./modules/journal/QuickJournalPage";
import { GradesPage } from "./modules/grades/GradesPage";
import { ATPPage } from "./modules/atp/ATPPage";
import { LKPDPage } from "./modules/lkpd/LKPDPage";
import { RPPPage } from "./modules/rpp/RPPPage";
import { RppBulkReplacePage } from "./modules/rpp-bulk/RppBulkReplacePage";
import { RemedialPage } from "./modules/remedial/RemedialPage";
import { EnrichmentPage } from "./modules/pengayaan/EnrichmentPage";
import { AdminPackagePage } from "./modules/admin-package/AdminPackagePage";
import { SemesterReportPage } from "./modules/semester-report/SemesterReportPage";
import { CompletenessPage } from "./modules/completeness/CompletenessPage";
import { AppsScriptImportPage } from "./modules/apps-script-import/AppsScriptImportPage";
import { AutoDocumentPage } from "./modules/auto-document/AutoDocumentPage";
import { EvaluationDocsPage } from "./modules/evaluation-docs/EvaluationDocsPage";
import { DailyDutyPage } from "./modules/daily-duty/DailyDutyPage";

export function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
      <AuthGate>
        <AppShell>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/new-year" element={<NewYearWizard />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/apps-script-import" element={<AppsScriptImportPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/prota" element={<ProtaPage />} />
            <Route path="/promes" element={<PromesPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/attendance" element={<QuickAttendancePage />} />
            <Route path="/journal" element={<QuickJournalPage />} />
            <Route path="/grades" element={<GradesPage />} />
            <Route path="/atp" element={<ATPPage />} />
            <Route path="/lkpd" element={<LKPDPage />} />
            <Route path="/rpp" element={<RPPPage />} />
            <Route path="/rpp-bulk" element={<RppBulkReplacePage />} />
            <Route path="/remedial" element={<RemedialPage />} />
            <Route path="/pengayaan" element={<EnrichmentPage />} />
            <Route path="/admin-package" element={<AdminPackagePage />} />
            <Route path="/semester-report" element={<SemesterReportPage />} />
            <Route path="/completeness" element={<CompletenessPage />} />
            <Route path="/auto-document" element={<AutoDocumentPage />} />
            <Route path="/evaluation-docs" element={<EvaluationDocsPage />} />
            <Route path="/piket" element={<DailyDutyPage />} />
            <Route path="*" element={<TodayPage />} />
          </Routes>
        </AppShell>
      </AuthGate>
      </ErrorBoundary>
    </HashRouter>
  );
}

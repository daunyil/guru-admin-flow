/**
 * Root App: router + AppShell.
 * CODE-SPLIT-01: Lazy-loaded routes for code-splitting.
 *   - Only TodayPage is eagerly loaded (landing page).
 *   - All other pages use React.lazy() + Suspense for on-demand loading.
 *   - manualChunks in vite.config.ts splits vendor code.
 * SUPABASE-AUTH-RLS-RC1: AuthGate aktif hanya saat env Supabase diisi.
 */

import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthGate } from "./modules/auth/AuthGate";
import { AppShell } from "./shared/layout/AppShell";
import { ErrorBoundary } from "./shared/ui/ErrorBoundary";
import { TodayPage } from "./routes/TodayPage";
import { LoadingState } from "./shared/ui";

/* ------------------------------------------------------------------ */
/*  Lazy-loaded pages — each becomes a separate chunk                 */
/* ------------------------------------------------------------------ */

const ProfilePage = lazy(() => import("./modules/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const BackupPage = lazy(() => import("./modules/backup/BackupPage").then((m) => ({ default: m.BackupPage })));
const NewYearWizard = lazy(() => import("./modules/new-year/NewYearWizard").then((m) => ({ default: m.NewYearWizard })));
const CalendarPage = lazy(() => import("./modules/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const ProtaPage = lazy(() => import("./modules/prota/ProtaPage").then((m) => ({ default: m.ProtaPage })));
const PromesPage = lazy(() => import("./modules/promes/PromesPage").then((m) => ({ default: m.PromesPage })));
const SchedulePage = lazy(() => import("./modules/schedule/SchedulePage").then((m) => ({ default: m.SchedulePage })));
const RosterPage = lazy(() => import("./modules/roster/RosterPage").then((m) => ({ default: m.RosterPage })));
const AssignmentsPage = lazy(() => import("./modules/assignments/AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })));
const QuickAttendancePage = lazy(() => import("./modules/attendance/QuickAttendancePage").then((m) => ({ default: m.QuickAttendancePage })));
const QuickJournalPage = lazy(() => import("./modules/journal/QuickJournalPage").then((m) => ({ default: m.QuickJournalPage })));
const GradesPage = lazy(() => import("./modules/grades/GradesPage").then((m) => ({ default: m.GradesPage })));
const ATPPage = lazy(() => import("./modules/atp/ATPPage").then((m) => ({ default: m.ATPPage })));
const LKPDPage = lazy(() => import("./modules/lkpd/LKPDPage").then((m) => ({ default: m.LKPDPage })));
const RPPPage = lazy(() => import("./modules/rpp/RPPPage").then((m) => ({ default: m.RPPPage })));
const RppBulkReplacePage = lazy(() => import("./modules/rpp-bulk/RppBulkReplacePage").then((m) => ({ default: m.RppBulkReplacePage })));
const RemedialPage = lazy(() => import("./modules/remedial/RemedialPage").then((m) => ({ default: m.RemedialPage })));
const EnrichmentPage = lazy(() => import("./modules/pengayaan/EnrichmentPage").then((m) => ({ default: m.EnrichmentPage })));
const AdminPackagePage = lazy(() => import("./modules/admin-package/AdminPackagePage").then((m) => ({ default: m.AdminPackagePage })));
const SemesterReportPage = lazy(() => import("./modules/semester-report/SemesterReportPage").then((m) => ({ default: m.SemesterReportPage })));
const CompletenessPage = lazy(() => import("./modules/completeness/CompletenessPage").then((m) => ({ default: m.CompletenessPage })));
const AppsScriptImportPage = lazy(() => import("./modules/apps-script-import/AppsScriptImportPage").then((m) => ({ default: m.AppsScriptImportPage })));
const AutoDocumentPage = lazy(() => import("./modules/auto-document/AutoDocumentPage").then((m) => ({ default: m.AutoDocumentPage })));
const EvaluationDocsPage = lazy(() => import("./modules/evaluation-docs/EvaluationDocsPage").then((m) => ({ default: m.EvaluationDocsPage })));
const DailyDutyPage = lazy(() => import("./modules/daily-duty/DailyDutyPage").then((m) => ({ default: m.DailyDutyPage })));
const LainnyaPage = lazy(() => import("./modules/lainnya/LainnyaPage").then((m) => ({ default: m.LainnyaPage })));
const ReportCenterPage = lazy(() => import("./modules/report-center/ReportCenterPage").then((m) => ({ default: m.ReportCenterPage })));
const TestPrintPage = lazy(() => import("./shared/documents/DocumentPrintPreviewExample").then((m) => ({ default: m.DocumentPrintPreviewExample })));

/* ------------------------------------------------------------------ */
/*  App                                                               */
/* ------------------------------------------------------------------ */

export function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
      <AuthGate>
        <AppShell>
          <Suspense fallback={<LoadingState />}>
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
              <Route path="/lainnya" element={<LainnyaPage />} />
              <Route path="/report-center" element={<ReportCenterPage />} />
              <Route path="/test-print" element={<TestPrintPage />} />
              <Route path="*" element={<TodayPage />} />
            </Routes>
          </Suspense>
        </AppShell>
      </AuthGate>
      </ErrorBoundary>
    </HashRouter>
  );
}

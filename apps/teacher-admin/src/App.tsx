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
import { TodayPage } from "@home/TodayPage";
import { LoadingState } from "./shared/ui";

/* ------------------------------------------------------------------ */
/*  Lazy-loaded pages — each becomes a separate chunk                   */
/*  Module groups: harian, piket, administrasi, integrasi, data-dasar   */
/* ------------------------------------------------------------------ */

// harian (Harian Guru)
const GradesPage = lazy(() => import("@harian/grades/GradesPage").then((m) => ({ default: m.GradesPage })));
const RekapSemesterPage = lazy(() => import("@harian/rekap-semester/RekapSemesterPage").then((m) => ({ default: m.RekapSemesterPage })));
const KbmHubPage = lazy(() => import("@harian/kbm-hub/KbmHubPage").then((m) => ({ default: m.KbmHubPage })));

// piket (Guru Piket)
const DailyDutyPage = lazy(() => import("@piket/daily-duty/DailyDutyPage").then((m) => ({ default: m.DailyDutyPage })));

// administrasi (Dokumen Generator)
const CalendarPage = lazy(() => import("@admin/perencanaan/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const ProtaPage = lazy(() => import("@admin/perencanaan/prota/ProtaPage").then((m) => ({ default: m.ProtaPage })));
const PromesPage = lazy(() => import("@admin/perencanaan/promes/PromesPage").then((m) => ({ default: m.PromesPage })));
const SchedulePage = lazy(() => import("@admin/perencanaan/schedule/SchedulePage").then((m) => ({ default: m.SchedulePage })));
const ATPPage = lazy(() => import("@admin/perencanaan/atp/ATPPage").then((m) => ({ default: m.ATPPage })));
const RPPPage = lazy(() => import("@admin/dokumen-ajar/rpp/RPPPage").then((m) => ({ default: m.RPPPage })));
const RppBulkReplacePage = lazy(() => import("@admin/dokumen-ajar/rpp-bulk/RppBulkReplacePage").then((m) => ({ default: m.RppBulkReplacePage })));
const LKPDPage = lazy(() => import("@admin/dokumen-ajar/lkpd/LKPDPage").then((m) => ({ default: m.LKPDPage })));
const EvaluationDocsPage = lazy(() => import("@admin/evaluasi/evaluation-docs/EvaluationDocsPage").then((m) => ({ default: m.EvaluationDocsPage })));
const RemedialPage = lazy(() => import("@admin/evaluasi/remedial/RemedialPage").then((m) => ({ default: m.RemedialPage })));
const EnrichmentPage = lazy(() => import("@admin/evaluasi/pengayaan/EnrichmentPage").then((m) => ({ default: m.EnrichmentPage })));
const SemesterReportPage = lazy(() => import("@admin/evaluasi/semester-report/SemesterReportPage").then((m) => ({ default: m.SemesterReportPage })));
const LainnyaPage = lazy(() => import("@admin/evaluasi/lainnya/LainnyaPage").then((m) => ({ default: m.LainnyaPage })));
const AdminPackagePage = lazy(() => import("@admin/paket/admin-package/AdminPackagePage").then((m) => ({ default: m.AdminPackagePage })));

// integrasi (Cross-cutting)
const AppsScriptImportPage = lazy(() => import("@integrasi/apps-script-import/AppsScriptImportPage").then((m) => ({ default: m.AppsScriptImportPage })));
const AutoDocumentPage = lazy(() => import("@integrasi/auto-document/AutoDocumentPage").then((m) => ({ default: m.AutoDocumentPage })));
const CompletenessPage = lazy(() => import("@integrasi/completeness/CompletenessPage").then((m) => ({ default: m.CompletenessPage })));
const ReportCenterPage = lazy(() => import("@integrasi/report-center/ReportCenterPage").then((m) => ({ default: m.ReportCenterPage })));

// data-dasar (Master Data)
const ProfilePage = lazy(() => import("@data/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const BackupPage = lazy(() => import("@data/backup/BackupPage").then((m) => ({ default: m.BackupPage })));
const NewYearWizard = lazy(() => import("@data/new-year/NewYearWizard").then((m) => ({ default: m.NewYearWizard })));
const RosterPage = lazy(() => import("@data/roster/RosterPage").then((m) => ({ default: m.RosterPage })));
const AssignmentsPage = lazy(() => import("@data/assignments/AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })));

// shared (cross-module)
const TestPrintPage = lazy(() => import("@shared/documents/DocumentPrintPreviewExample").then((m) => ({ default: m.DocumentPrintPreviewExample })));

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
              <Route path="/grades" element={<GradesPage />} />
              <Route path="/rekap-semester" element={<RekapSemesterPage />} />
              <Route path="/kbm-hub" element={<KbmHubPage />} />
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

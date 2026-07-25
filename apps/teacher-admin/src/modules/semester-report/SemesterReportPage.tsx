/**
 * Modul M08 Laporan Akhir Semester — halaman /semester-report
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M08)
 *
 * WYSIWYG-DOC-FASE7: SemesterReport sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen A4).
 *   - Sidebar: Konteks (pilih Kelas/Mapel), Ringkasan, Finalisasi.
 *   - DocumentPreview: kanvas A4 portrait + auto-save + status badge.
 *   - Auto-save ke schoolDocuments (docType: "rapor-semester").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 */

import { Card, Button, LoadingState } from "@shared/ui";
import { Link } from "react-router-dom";
import { DocumentPreview } from "@shared/documents";

import { useSemesterReportState } from "./useSemesterReportState";
import { SemesterReportDocument } from "./SemesterReportDocument";
import { SemesterReportSidebar } from "./SemesterReportSidebar";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function SemesterReportPage() {
  const {
    loading,
    activeYear,
    school,
    teacher,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    selectedAssignment,
    report,
    genResult,
    generating,
    finalizing,
    error,
    success,
    showSidebar,
    setShowSidebar,
    formatDokumen,
    docId,
    docStatus,
    docSemester,
    handleGenerate,
    handleFinalize,
    canFinalize,
    finalizeReasons,
    docDataForAutoSave,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  } = useSemesterReportState();

  if (loading) return <LoadingState />;

  /* ================================================================ */
  /*  WYSIWYG VIEW — sidebar + document                                */
  /* ================================================================ */

  return (
    <div className="doc-wysiwyg-layout">
      {/* ---------- MOBILE BACKDROP ---------- */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ---------- SIDEBAR ---------- */}
      <SemesterReportSidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        assignments={assignments}
        selectedAssignmentId={selectedAssignmentId}
        setSelectedAssignmentId={setSelectedAssignmentId}
        selectedAssignment={selectedAssignment}
        docSemester={docSemester}
        activeYear={activeYear}
        genResult={genResult}
        report={report}
        generating={generating}
        finalizing={finalizing}
        canFinalize={canFinalize}
        finalizeReasons={finalizeReasons}
        handleGenerate={handleGenerate}
        handleFinalize={handleFinalize}
      />

      {/* ---------- FLOATING SIDEBAR TOGGLE ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka sidebar"
        >
          ☰
        </button>
      )}

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {(!activeYear || !teacher) && (
          <Card className="border-amber-200 bg-amber-50 mb-3 no-print">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl">⚠</span>
              <div>
                <p className="font-semibold text-amber-900">Profil/tahun belum lengkap</p>
                <p className="text-sm text-amber-800 mt-1">Lengkapi profil dan tahun pelajaran terlebih dahulu.</p>
                <Link to="/profile"><Button variant="secondary" className="text-sm mt-2">Lengkapi Profil</Button></Link>
              </div>
            </div>
          </Card>
        )}
        {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 mb-3 no-print" role="status" aria-live="polite">{error}</div>}
        {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700 mb-3 no-print" role="status" aria-live="polite">{success}</div>}

        <DocumentPreview
          docId={docId}
          docType="rapor-semester"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {/* If profile/year not set, show notice inside canvas */}
          {!activeYear || !teacher ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Profil/Tahun Belum Lengkap</p>
              <p className="text-sm mt-1">Lengkapi profil dan tahun pelajaran terlebih dahulu.</p>
            </div>
          ) : !selectedAssignment ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Pilih Kelas dan Mapel</p>
              <p className="text-sm mt-1">Buka sidebar untuk memilih assignment.</p>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Laporan Belum Disusun</p>
              <p className="text-sm mt-1">Klik "Susun Laporan" di sidebar untuk generate.</p>
            </div>
          ) : (
            <SemesterReportDocument
              report={report}
              school={school}
              teacher={teacher!}
              academicYear={activeYear!}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}

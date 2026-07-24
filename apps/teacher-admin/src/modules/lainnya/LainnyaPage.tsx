/**
 * Dokumen Lainnya — generic WYSIWYG document editor for docType "lainnya".
 *
 * WYSIWYG-DOC-FASE11: Menyelesaikan cakupan SchoolDocType (11/11).
 *   - Layout always-on: sidebar (konteks, editor) + DocumentPreview (dokumen A4).
 *   - Sidebar: Konteks (pilih Kelas/Mapel), Judul & Isi, Ringkasan.
 *   - DocumentPreview: kanvas A4 portrait + auto-save + status badge.
 *   - Auto-save ke schoolDocuments (docType: "lainnya").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 *
 * Kegunaan: surat keterangan, catatan khusus, dokumen administrasi
 * lain yang tidak masuk kategori docType spesifik.
 */

import { Card, Button, LoadingState } from "../../shared/ui";
import { Link } from "react-router-dom";
import { DocumentPreview } from "../../shared/documents";

import { useLainnyaState } from "./useLainnyaState";
import { LainnyaSidebar } from "./LainnyaSidebar";
import { LainnyaDocument } from "./LainnyaDocument";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function LainnyaPage() {
  const {
    loading,
    activeYear,
    school,
    teacher,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    selectedAssignment,
    docTitle,
    setDocTitle,
    docContent,
    setDocContent,
    error,
    success,
    showSidebar,
    setShowSidebar,
    formatDokumen,
    docId,
    docStatus,
    docSemester,
    docDataForAutoSave,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  } = useLainnyaState();

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
      <LainnyaSidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        assignments={assignments}
        selectedAssignmentId={selectedAssignmentId}
        setSelectedAssignmentId={setSelectedAssignmentId}
        selectedAssignment={selectedAssignment}
        activeYear={activeYear}
        docSemester={docSemester}
        docTitle={docTitle}
        setDocTitle={setDocTitle}
        docContent={docContent}
        setDocContent={setDocContent}
        docStatus={docStatus}
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
        {success && <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 mb-3 no-print" role="status" aria-live="polite">{success}</div>}

        <DocumentPreview
          docId={docId}
          docType="lainnya"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
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
          ) : (
            <LainnyaDocument
              title={docTitle}
              content={docContent}
              school={school}
              teacher={teacher!}
              academicYear={activeYear!}
              semester={docSemester}
              assignment={selectedAssignment}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}

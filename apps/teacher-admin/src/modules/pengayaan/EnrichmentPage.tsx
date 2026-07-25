/**
 * Pengayaan — program pengayaan otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 3.
 * WYSIWYG-DOC-FASE6: Refactor ke layout WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Hapus toggle Mode Kerja / Mode Dokumen (WYSIWYG = dokumen selalu terlihat).
 *   - Auto-save ke schoolDocuments (docType: "pengayaan").
 *   - Uses ensureDoc pattern from FASE3/FASE4 audit fixes.
 *   - Sidebar slide animation + Final button loading state (UX-POLISH-01).
 *
 * Siswa dengan nilai akhir >= threshold (default 90) otomatis masuk pengayaan.
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 */

import { Card, CardHeader, Input, Button, EmptyState, Select } from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import { DocumentPreview } from "@shared/documents";
import { DEFAULT_ENRICHMENT_THRESHOLD } from "@guru-admin/domain";
import { LoadingState } from "@shared/ui";

import { useEnrichmentState } from "./useEnrichmentState";
import { PengayaanDocument } from "./PengayaanDocument";
import { EnrichmentSidebar } from "./EnrichmentSidebar";

/* ------------------------------------------------------------------ */
/*  EnrichmentPage                                                    */
/* ------------------------------------------------------------------ */

export function EnrichmentPage() {
  const {
    loading,
    year,
    teacher,
    school,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    program,
    setProgram,
    threshold,
    setThreshold,
    plan,
    setPlan,
    message,
    setMessage,
    presetActivity,
    setPresetActivity,
    presetMaterial,
    setPresetMaterial,
    presetNote,
    setPresetNote,
    showSidebar,
    setShowSidebar,
    docId,
    docStatus,
    formatDokumen,
    assignment,
    docDataForAutoSave,
    handleGenerate,
    handleUpdateStudent,
    handleSavePlan,
    handleFinalize,
    handleDelete,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  } = useEnrichmentState();

  if (loading) return <LoadingState />;

  /* ================================================================ */
  /*  NO PROGRAM YET — show assignment selector only                  */
  /* ================================================================ */
  if (!program) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">Program Pengayaan</h1>
          <p className="text-sm text-slate-500 mt-1">
            {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Siswa nilai &ge; {DEFAULT_ENRICHMENT_THRESHOLD} otomatis masuk pengayaan.
          </p>
        </div>

        {message && (
          <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader title="Pilih Kelas dan Mapel" description="Filter siswa dari GradeBook sesuai assignment." />
          {assignments.length === 0 ? (
            <EmptyState
              title="Belum ada Kelas dan Mapel"
              description="Buka menu Kelas dan Mapel untuk membuat assignment dulu."
              action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
            />
          ) : (
            <div className="space-y-3">
              <Select
                label="Kelas dan Mapel"
                id="enr-asg"
                value={selectedAssignmentId}
                onChange={setSelectedAssignmentId}
                options={[
                  { value: "", label: "-- Pilih --" },
                  ...assignments.map((a) => ({
                    value: a.id,
                    label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
                  })),
                ]}
              />
              {assignment && (
                <InfoCard
                  entries={[
                    { label: "Guru", value: assignment.teacherName },
                    { label: "Mapel", value: assignment.subject },
                    { label: "Kelas", value: assignment.classLabel },
                    { label: "Semester", value: String(assignment.semester) },
                    { label: "Tahun Pelajaran", value: year?.label ?? "-" },
                  ]}
                />
              )}
              {assignment && (
                <Input
                  label="Batas Nilai Pengayaan"
                  id="enr-thr"
                  type="number"
                  value={String(threshold)}
                  onChange={(v) => setThreshold(Number(v) || DEFAULT_ENRICHMENT_THRESHOLD)}
                  hint={`Siswa dengan nilai >= ${threshold} masuk pengayaan.`}
                />
              )}
              {assignment && (
                <Button onClick={handleGenerate}>
                  Susun dari Nilai
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — sidebar + document always visible                */
  /* ================================================================ */
  return (
    <div className="doc-wysiwyg-layout">
      {/* Mobile backdrop */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <EnrichmentSidebar
        program={program}
        plan={plan}
        setPlan={setPlan}
        assignments={assignments}
        selectedAssignmentId={selectedAssignmentId}
        setSelectedAssignmentId={setSelectedAssignmentId}
        threshold={threshold}
        setThreshold={setThreshold}
        presetActivity={presetActivity}
        setPresetActivity={setPresetActivity}
        presetMaterial={presetMaterial}
        setPresetMaterial={setPresetMaterial}
        presetNote={presetNote}
        setPresetNote={setPresetNote}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        setProgram={setProgram}
        setMessage={setMessage}
        handleGenerate={handleGenerate}
        handleUpdateStudent={handleUpdateStudent}
        handleSavePlan={handleSavePlan}
        handleFinalize={handleFinalize}
        handleDelete={handleDelete}
      />

      {/* Document Area */}
      <div className="doc-document-area">
        <DocumentPreview
          docId={docId}
          docType="pengayaan"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
          showFormatToggle={false}
        >
          <PengayaanDocument
            program={program}
            plan={plan}
            school={school}
            teacher={teacher}
            year={year}
          />
        </DocumentPreview>
      </div>

      {/* Sidebar toggle (when hidden) */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka panel kontrol"
          aria-label="Buka panel kontrol"
          aria-expanded={showSidebar}
        >
          ☰
        </button>
      )}

      {/* Toast messages */}
      {message && <div className={`doc-toast doc-toast-${message.type === "success" ? "success" : "error"} no-print`} role="status" aria-live="polite">{message.text}</div>}
    </div>
  );
}

/**
 * Remedial — program remedial otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 2.
 * WYSIWYG-DOC-FASE6: Refactor ke layout WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Hapus toggle Mode Kerja / Mode Dokumen (WYSIWYG = dokumen selalu terlihat).
 *   - Auto-save ke schoolDocuments (docType: "remedial").
 *   - Uses ensureDoc pattern from FASE3/FASE4 audit fixes.
 *   - Sidebar slide animation + Final button loading state (UX-POLISH-01).
 *
 * Siswa dengan nilai akhir < KKTP otomatis masuk daftar remedial.
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 */

import { Card, CardHeader, Button, EmptyState, Select } from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import { DocumentPreview, RemedialEnrichmentDocument } from "@shared/documents";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { LoadingState } from "@shared/ui";

import { useRemedialState } from "./useRemedialState";
import { RemedialDocument } from "./RemedialDocument";
import { RemedialSidebar } from "./RemedialSidebar";

/* ------------------------------------------------------------------ */
/*  RemedialPage                                                      */
/* ------------------------------------------------------------------ */

export function RemedialPage() {
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
    plan,
    setPlan,
    presetMethod,
    setPresetMethod,
    presetSchedule,
    setPresetSchedule,
    presetNote,
    setPresetNote,
    showSidebar,
    setShowSidebar,
    docId,
    docStatus,
    formatDokumen,
    docView,
    setDocView,
    assignment,
    message,
    setMessage,
    docDataForAutoSave,
    handleGenerate,
    handleUpdateStudent,
    handleSavePlan,
    handleFinalize,
    handleDelete,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  } = useRemedialState();

  if (loading) return <LoadingState />;

  /* ================================================================ */
  /*  NO PROGRAM YET — show assignment selector only                  */
  /* ================================================================ */
  if (!program) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">Program Remedial</h1>
          <p className="text-sm text-slate-500 mt-1">
            {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Siswa nilai &lt; KKTP otomatis masuk remedial.
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
                id="rem-asg"
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
      <RemedialSidebar
        program={program}
        plan={plan}
        setPlan={setPlan}
        assignments={assignments}
        selectedAssignmentId={selectedAssignmentId}
        setSelectedAssignmentId={setSelectedAssignmentId}
        presetMethod={presetMethod}
        setPresetMethod={setPresetMethod}
        presetSchedule={presetSchedule}
        setPresetSchedule={setPresetSchedule}
        presetNote={presetNote}
        setPresetNote={setPresetNote}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        docView={docView}
        setDocView={setDocView}
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
          docType="remedial"
          orientation={docView === "remedial-enrichment" ? "landscape" : formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={docView === "remedial-enrichment" ? undefined : handleOrientationChange}
          showFormatToggle={docView !== "remedial-enrichment"}
        >
          {docView === "remedial-enrichment" ? (
            <RemedialEnrichmentDocument
              withPrintArea={false}
              data={{
                context: {
                  schoolName: school?.name,
                  schoolAddress: school?.address,
                  schoolOffice: "Dinas Pendidikan",
                  academicYear: year?.label,
                  semester: program.semester === 1 ? "Ganjil" : "Genap",
                  teacherName: program.teacherName ?? teacher?.name,
                  subject: program.subject,
                  classLabel: program.classLabel,
                  headmasterName: school?.headmasterName,
                  headmasterNip: school?.headmasterNip,
                  place: school?.regency ?? "",
                  dateLabel: formatLongDateID(program.startDate ?? todayISODate()),
                },
                kktp: program.kktp,
                rows: program.students.map((s, i) => ({
                  no: i + 1,
                  name: s.studentName,
                  initialScore: s.finalScore ?? "—",
                  unfinishedTp: s.tpToImprove ?? "—",
                  activityType: "Remedial" as const,
                  activity: s.method ?? "Pembelajaran ulang / tugas perbaikan",
                  finalScore: s.remedialScore ?? "—",
                  status: (s.remedialScore !== undefined && s.remedialScore !== null && Number(s.remedialScore) >= program.kktp) ? "TUNTAS" as const : "BELUM TUNTAS" as const,
                })),
              }}
            />
          ) : (
            <RemedialDocument
              program={program}
              plan={plan}
              school={school}
              teacher={teacher}
              year={year}
            />
          )}
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

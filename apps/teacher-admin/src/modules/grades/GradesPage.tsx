/**
 * Nilai V3 — UH/UTS/UAS (default) atau KD/PTS/PAS (legacy).
 *
 * WYSIWYG-DOC-FASE8: Daftar Nilai sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (konteks, KKTP, aksi) + DocumentPreview (tabel nilai).
 *   - Sidebar: Konteks (pilih Kelas/Mapel), Ringkasan, Quick Actions, Import.
 *   - DocumentPreview: kanvas A4 landscape + tabel nilai + auto-save.
 *   - Auto-save ke schoolDocuments (docType: "daftar-nilai").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 *
 * Refactored into: grades-types, grades-utils, GradeDocument,
 *   useGradesInit, useGradesData, useGradesDoc, useCbtImport, usePasteImport, GradesSidebar.
 */
import { useEffect } from "react";
import { LoadingState } from "@shared/ui";
import { DocumentPreview } from "@shared/documents";
import { useGradesInit } from "./useGradesInit";
import { useGradesData } from "./useGradesData";
import { useGradesDoc } from "./useGradesDoc";
import { useCbtImport } from "./useCbtImport";
import { usePasteImport } from "./usePasteImport";
import { GradeDocument } from "./GradeDocument";
import { GradesSidebar } from "./GradesSidebar";

export function GradesPage() {
  // ── Init ──
  const { loading, year, teacher, assignments, rosters, docSemester, setDocSemester, message, setMessage } = useGradesInit();

  // ── Core data ──
  const data = useGradesData({ year, teacher, assignments, rosters, docSemester, setMessage });

  // ── Doc lifecycle ──
  const doc = useGradesDoc({
    year,
    selectedAssignment: data.selectedAssignment,
    selectedAssignmentId: data.selectedAssignmentId,
    docSemester,
  });

  // ── CBT import ──
  const cbt = useCbtImport({
    selectedAssignment: data.selectedAssignment,
    rosters,
    entries: data.entries,
    setEntries: data.setEntries,
    setDirty: data.setDirty,
    setMessage,
  });

  // ── Paste import ──
  const paste = usePasteImport({
    selectedAssignment: data.selectedAssignment,
    rosters,
    entries: data.entries,
    setEntries: data.setEntries,
    setDirty: data.setDirty,
    setMessage,
  });

  // ── Reset imports on assignment change ──
  useEffect(() => {
    cbt.setCbtPreview(null);
    cbt.setCbtJsonInput("");
    cbt.setShowCbtImport(false);
    cbt.setCbtSourceWarning(null);
    paste.setPastePreview(null);
    paste.setPasteText("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.selectedAssignmentId]);

  // ── Auto-set semester from assignment ──
  useEffect(() => {
    const asg = data.selectedAssignment();
    if (asg) setDocSemester(asg.semester);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.selectedAssignmentId]);

  if (loading) return <LoadingState />;

  return (
    <div className="doc-wysiwyg-layout">
      <GradesSidebar
        showSidebar={doc.showSidebar}
        setShowSidebar={doc.setShowSidebar}
        assignments={assignments}
        selectedAssignmentId={data.selectedAssignmentId}
        handleAssignmentChange={data.handleAssignmentChange}
        assignment={data.assignment}
        year={year}
        kktp={data.kktp}
        setKktp={data.setKktp}
        setDirty={data.setDirty}
        gradeModel={data.gradeModel}
        setGradeModel={data.setGradeModel}
        uhCount={data.uhCount}
        setUhCount={data.setUhCount}
        weightUH={data.weightUH}
        setWeightUH={data.setWeightUH}
        weightUTS={data.weightUTS}
        setWeightUTS={data.setWeightUTS}
        weightUAS={data.weightUAS}
        setWeightUAS={data.setWeightUAS}
        gradeBook={data.gradeBook}
        dirty={data.dirty}
        handleSave={data.handleSave}
        handleFillAll80={data.handleFillAll80}
        handleRandomControlled={data.handleRandomControlled}
        entries={data.entries}
        calculated={data.calculated}
        remedialCount={data.remedialCount}
        enrichmentCount={data.enrichmentCount}
        cbtTarget={cbt.cbtTarget}
        setCbtTarget={cbt.setCbtTarget}
        cbtPreview={cbt.cbtPreview}
        setCbtPreview={cbt.setCbtPreview}
        cbtSourceWarning={cbt.cbtSourceWarning}
        setCbtSourceWarning={cbt.setCbtSourceWarning}
        showCbtImport={cbt.showCbtImport}
        setShowCbtImport={cbt.setShowCbtImport}
        cbtJsonInput={cbt.cbtJsonInput}
        setCbtJsonInput={cbt.setCbtJsonInput}
        handleCbtPreview={cbt.handleCbtPreview}
        handleCbtApply={cbt.handleCbtApply}
        pasteText={paste.pasteText}
        setPasteText={paste.setPasteText}
        pastePreview={paste.pastePreview}
        setPastePreview={paste.setPastePreview}
        handlePastePreview={paste.handlePastePreview}
        handleApplyPaste={paste.handleApplyPaste}
      />

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {message && <div className="info-banner-success mb-3 no-print" role="status" aria-live="polite">{message}</div>}

        <DocumentPreview
          docId={doc.docId}
          docType="daftar-nilai"
          orientation={doc.formatDokumen}
          status={doc.docStatus}
          data={data.docDataForAutoSave}
          onSave={doc.handleSaveDoc}
          onSetFinal={doc.handleSetFinal}
          onOrientationChange={doc.handleOrientationChange}
        >
          {!data.assignment ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Pilih Kelas dan Mapel</p>
              <p className="text-sm mt-1">Buka sidebar untuk memilih assignment.</p>
            </div>
          ) : data.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Belum Ada Data Siswa</p>
              <p className="text-sm mt-1">Buat roster kelas terlebih dahulu.</p>
            </div>
          ) : (
            <GradeDocument
              calculated={data.calculated}
              kktp={data.kktp}
              assignment={data.assignment}
              yearLabel={year?.label ?? ""}
              teacherName={teacher?.name ?? ""}
              editable
              onSetScore={data.setScore}
              gradeModel={data.gradeModel}
              uhCount={data.uhCount}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}

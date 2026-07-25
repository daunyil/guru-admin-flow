/**
 * Bank ATP/TP — Tujuan Pembelajaran per guru per mapel per kelas.
 *
 * WYSIWYG-DOC-FASE5: ATP sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Auto-save ke schoolDocuments (docType: "atp").
 *
 * This file is the thin orchestrator. Logic lives in useATPPageState,
 * sub-components in ATPForm / AIPromptOverlay / ATPDocument / ATPSidebar /
 * ATPImportOverlay, and pure utils in atpUtils.
 */

import { LoadingState } from "@shared/ui";
import { DocumentPreview, AtpReportDocument } from "@shared/documents";
import { useATPPageState } from "./useATPPageState";
import { ATPForm } from "./ATPForm";
import { AIPromptOverlay } from "./AIPromptOverlay";
import { ATPDocument } from "./ATPDocument";
import { ATPSidebar } from "./ATPSidebar";
import { ATPImportOverlay } from "./ATPImportOverlay";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function ATPPage() {
  const state = useATPPageState();

  if (state.loading) return <LoadingState />;

  return (
    <>
      <div className="doc-wysiwyg-layout">
        {/* Mobile backdrop */}
        <div
          className={`doc-sidebar-backdrop no-print ${!state.showSidebar ? "doc-backdrop-hidden" : ""}`}
          onClick={() => state.setShowSidebar(false)}
          aria-hidden="true"
        />

        {/* Sidebar toggle */}
        {!state.showSidebar && (
          <button
            type="button"
            className="doc-sidebar-toggle no-print"
            onClick={() => state.setShowSidebar(true)}
            title="Buka sidebar"
            aria-label="Buka panel kontrol"
            aria-expanded={state.showSidebar}
          >
            ☰
          </button>
        )}

        {/* Sidebar */}
        <ATPSidebar
          showSidebar={state.showSidebar}
          onCloseSidebar={() => state.setShowSidebar(false)}
          profileIncomplete={state.profileIncomplete}
          teacher={state.teacher}
          year={state.year}
          filterSubject={state.filterSubject}
          onFilterSubjectChange={state.setFilterSubject}
          filterGrade={state.filterGrade}
          onFilterGradeChange={state.setFilterGrade}
          subjects={state.subjects}
          grades={state.grades}
          filteredEntries={state.filteredEntries}
          groupedByBab={state.groupedByBab}
          totalEntries={state.entries.length}
          docView={state.docView}
          onDocViewChange={state.setDocView}
          message={state.message}
          onAddTP={() => { state.setEditing(null); state.setShowForm(true); }}
          onImportTP={() => state.setShowImport(true)}
          onEditTP={(e) => { state.setEditing(e); state.setShowForm(true); }}
          onDeleteTP={state.handleDelete}
          onShowAIPrompt={state.setShowAIPrompt}
          showAIPromptId={state.showAIPrompt}
        />

        {/* Document Area */}
        <div className="doc-document-area">
          {state.profileIncomplete && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3 no-print">
              <p className="font-semibold text-amber-900">Profil/tahun belum lengkap</p>
              <p className="text-sm text-amber-800 mt-1">Lengkapi profil sekolah dan guru terlebih dahulu untuk menggunakan fitur Bank TP.</p>
            </div>
          )}
          <DocumentPreview
            docId={state.docId}
            docType="atp"
            orientation={state.docView === "atp-report" ? "landscape" : state.formatDokumen}
            status={state.docStatus}
            data={state.docDataForAutoSave}
            onSave={state.handleSaveDoc}
            onSetFinal={state.handleSetFinal}
            onOrientationChange={state.docView === "atp-report" ? undefined : state.handleOrientationChange}
            showFormatToggle={state.docView !== "atp-report"}
          >
            {state.docView === "atp-report" ? (
              <AtpReportDocument
                withPrintArea={false}
                data={{
                  context: {
                    schoolName: state.schoolName,
                    academicYear: state.year?.label,
                    semester: state.year?.semester2Start && new Date() >= new Date(state.year.semester2Start) ? "Genap" : "Ganjil",
                    teacherName: state.teacher?.name,
                    subject: state.filterSubject || "Semua Mapel",
                    classLabel: state.filterGrade || "Semua Kelas",
                    headmasterName: state.school?.headmasterName ?? "",
                    headmasterNip: state.school?.headmasterNip ?? "",
                  },
                  rows: state.filteredEntries.map((entry) => ({
                    element: entry.elemen ?? "",
                    learningOutcome: entry.cp ?? "",
                    learningObjective: entry.tp ?? "",
                    allocationJp: entry.alokasiJP ?? 0,
                    pancasilaProfile: entry.profilPelajar ?? "",
                  })),
                }}
              />
            ) : (
              <ATPDocument
                subject={state.filterSubject}
                grade={state.filterGrade}
                tahunAjaran={state.year?.label ?? ""}
                schoolName={state.schoolName}
                teacherName={state.teacher?.name ?? ""}
                entries={state.filteredEntries}
                groupedByBab={state.groupedByBab}
              />
            )}
          </DocumentPreview>
        </div>
      </div>

      {/* Overlay: ATP Form */}
      {state.showForm && (
        <ATPForm
          editing={state.editing}
          defaultSubject={state.filterSubject || (state.teacher?.subjects?.[0]?.subject ?? "")}
          defaultGrade={state.filterGrade || (state.teacher?.subjects?.[0]?.grades?.[0] ?? "VII")}
          defaultPhase={state.teacher?.subjects?.[0]?.phases?.[0] ?? "D"}
          onSave={state.handleSave}
          onCancel={() => { state.setShowForm(false); state.setEditing(null); }}
        />
      )}

      {/* Overlay: Import */}
      {state.showImport && (
        <ATPImportOverlay
          importMode={state.importMode}
          onImportModeChange={(v) => { state.setImportMode(v); state.setImportPreview(null); }}
          importJson={state.importJson}
          onImportJsonChange={(v) => { state.setImportJson(v); state.setImportPreview(null); }}
          importExcel={state.importExcel}
          onImportExcelChange={(v) => { state.setImportExcel(v); state.setImportPreview(null); }}
          importMeta={state.importMeta}
          onImportMetaChange={(m) => { state.setImportMeta(m); state.setImportPreview(null); }}
          importPreview={state.importPreview}
          onPreview={state.handleImportPreview}
          onApply={state.handleImportApply}
          onCancel={() => { state.setShowImport(false); state.setImportPreview(null); }}
        />
      )}

      {/* Overlay: AI Prompt */}
      {state.showAIPrompt && (
        <AIPromptOverlay
          entry={state.entries.find((e) => e.id === state.showAIPrompt) ?? null}
          onGenerate={state.generateAIPromptFn}
          onCopy={(text) => { navigator.clipboard.writeText(text); state.setMessage("Prompt disalin."); }}
          onClose={() => state.setShowAIPrompt(null)}
        />
      )}
    </>
  );
}

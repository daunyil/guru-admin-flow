/**
 * Modul M04 Promes — halaman /promes
 * Sumber: docs/SPRINT_2_DESIGN.md §5, §6
 *
 * WYSIWYG-DOC-FASE2: Refactor ke layout WYSIWYG.
 *   - Saat result ada → DocumentPreview sebagai view utama + sidebar kontrol.
 *   - Saat result belum → form biasa.
 *   - Hapus toggle Mode Kerja / Mode Dokumen (WYSIWYG = dokumen selalu terlihat).
 *
 * KRITIS (lihat §0 CRITICAL PROMES RULE):
 *   - Material capacity pakai INTRA JP (intraJpPerWeek), BUKAN total 3 JP
 *   - KO tampil sebagai row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP
 *   - Cadangan dari INTRA capacity, tidak boleh membuat materialCapacityJP negatif
 *
 * Refactored into separate files:
 *   - usePromesState.ts — all state management, effects, handlers
 *   - PromesSidebar.tsx — sidebar component (when result exists)
 *   - PromesFormView.tsx — form view (when result is null)
 *   - PromesPage.tsx — this file, just composition
 */

import { LoadingState } from "@shared/ui";
import { DocumentPreview } from "@shared/documents";
import { PromesPortraitDocument } from "./PromesPortraitDocument";
import { PromesLandscapeKurikulumMerdekaDocument } from "./PromesMerdekaDocument";
import { PromesLandscapeMatrixDocument } from "./PromesLandscapeMatrixDocument";
import { usePromesState } from "./usePromesState";
import { PromesSidebar } from "./PromesSidebar";
import { PromesFormView } from "./PromesFormView";

export function PromesPage() {
  const {
    loading,
    activeYear,
    profiles,
    calendar,
    school,
    teacher,
    selectedProfileId,
    setSelectedProfileId,
    semester,
    setSemester,
    options,
    setOptions,
    result,
    setResult,
    generating,
    error,
    setError,
    showSidebar,
    setShowSidebar,
    variasiDokumen,
    setVariasiDokumen,
    formatDokumen,
    docId,
    docStatus,
    currentProfile,
    profileIncomplete,
    docDataForAutoSave,
    handleGenerate,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  } = usePromesState();

  if (loading) return <LoadingState />;

  /* ================================================================ */
  /*  WYSIWYG VIEW — result exists, show sidebar + document           */
  /* ================================================================ */
  if (result) {
    const { weeks, distribution, koRows, summary, status } = result;

    return (
      <div className="doc-wysiwyg-layout">
        {/* ---------- MOBILE BACKDROP ---------- */}
        <div
          className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />

        {/* ---------- SIDEBAR ---------- */}
        <PromesSidebar
          result={result}
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          setSelectedProfileId={setSelectedProfileId}
          semester={semester}
          setSemester={setSemester}
          options={options}
          setOptions={setOptions}
          variasiDokumen={variasiDokumen}
          setVariasiDokumen={setVariasiDokumen}
          docId={docId}
          generating={generating}
          error={error}
          profileIncomplete={profileIncomplete}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          setResult={setResult}
          setError={setError}
          handleGenerate={handleGenerate}
        />

        {/* ---------- DOCUMENT AREA ---------- */}
        <div className="doc-document-area">
          <DocumentPreview
            docId={docId}
            docType="promes"
            orientation={formatDokumen}
            status={docStatus}
            data={docDataForAutoSave}
            onSave={handleSaveDoc}
            onSetFinal={handleSetFinal}
            onOrientationChange={handleOrientationChange}
          >
            {variasiDokumen === "ringkas" ? (
              <PromesPortraitDocument
                weeks={weeks}
                distribution={distribution}
                koRows={koRows}
                summary={summary}
                status={status}
                semester={semester}
                activeYearLabel={activeYear?.label ?? ""}
                schoolName={school?.name ?? ""}
                schoolRegency={school?.regency ?? ""}
                headmasterName={school?.headmasterName ?? ""}
                headmasterNip={school?.headmasterNip ?? ""}
                teacherName={teacher?.name ?? ""}
                teacherNip={teacher?.nip ?? ""}
                profile={currentProfile}
              />
            ) : variasiDokumen === "merdeka" ? (
              <PromesLandscapeKurikulumMerdekaDocument
                weeks={weeks}
                distribution={distribution}
                summary={summary}
                status={status}
                semester={semester}
                activeYearLabel={activeYear?.label ?? ""}
                schoolName={school?.name ?? ""}
                schoolRegency={school?.regency ?? ""}
                headmasterName={school?.headmasterName ?? ""}
                headmasterNip={school?.headmasterNip ?? ""}
                teacherName={teacher?.name ?? ""}
                teacherNip={teacher?.nip ?? ""}
                profile={currentProfile}
                options={options}
                logoUrl={school?.logo ?? undefined}
              />
            ) : (
              <PromesLandscapeMatrixDocument
                weeks={weeks}
                distribution={distribution}
                koRows={koRows}
                summary={summary}
                status={status}
                semester={semester}
                activeYearLabel={activeYear?.label ?? ""}
                schoolName={school?.name ?? ""}
                schoolRegency={school?.regency ?? ""}
                headmasterName={school?.headmasterName ?? ""}
                headmasterNip={school?.headmasterNip ?? ""}
                teacherName={teacher?.name ?? ""}
                teacherNip={teacher?.nip ?? ""}
                profile={currentProfile}
              />
            )}
          </DocumentPreview>
        </div>

        {/* ---------- SIDEBAR TOGGLE (when hidden) ---------- */}
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
      </div>
    );
  }

  /* ================================================================ */
  /*  FORM VIEW — belum ada result, tampilkan form susun Promes       */
  /* ================================================================ */
  return (
    <PromesFormView
      activeYear={activeYear}
      profiles={profiles}
      selectedProfileId={selectedProfileId}
      setSelectedProfileId={setSelectedProfileId}
      semester={semester}
      setSemester={setSemester}
      options={options}
      setOptions={setOptions}
      generating={generating}
      error={error}
      profileIncomplete={profileIncomplete}
      handleGenerate={handleGenerate}
      calendarLength={calendar.length}
    />
  );
}

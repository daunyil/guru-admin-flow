/**
 * GradesSidebar — sidebar layout for Daftar Nilai WYSIWYG view.
 *
 * Includes `.doc-sidebar-scroll` wrapper for Select dropdown positioning fix.
 */
import { Input, Select, Button, Badge, Textarea, EmptyState } from "@shared/ui";
import { ContextCard } from "@shared/ui/ContextCard";
import { buildContextInfo, getCbtTargetLabels } from "@guru-admin/domain";
import type { AcademicYear, TeachingAssignment, GradeBook, GradeEntry, CbtImportTarget, CbtMatchPreview } from "@guru-admin/domain";
import type { PastePreviewResult } from "./grades-types";

interface GradesSidebarProps {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;

  // Konteks
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  handleAssignmentChange: (id: string) => void;
  assignment: TeachingAssignment | undefined;
  year: AcademicYear | null;

  // KKTP & Model
  kktp: string;
  setKktp: (v: string) => void;
  setDirty: (d: boolean) => void;
  gradeModel: "uh" | "kd";
  setGradeModel: (v: "uh" | "kd") => void;
  uhCount: number;
  setUhCount: (v: number) => void;
  weightUH: number;
  setWeightUH: (v: number) => void;
  weightUTS: number;
  setWeightUTS: (v: number) => void;
  weightUAS: number;
  setWeightUAS: (v: number) => void;

  // GradeBook status & actions
  gradeBook: GradeBook | null;
  dirty: boolean;
  handleSave: () => void;
  handleFillAll80: () => void;
  handleRandomControlled: () => void;

  // Ringkasan
  entries: GradeEntry[];
  calculated: GradeEntry[];
  remedialCount: number;
  enrichmentCount: number;

  // Import CBT
  cbtTarget: CbtImportTarget;
  setCbtTarget: (v: CbtImportTarget) => void;
  cbtPreview: CbtMatchPreview | null;
  setCbtPreview: (p: CbtMatchPreview | null) => void;
  cbtSourceWarning: string | null;
  setCbtSourceWarning: (w: string | null) => void;
  showCbtImport: boolean;
  setShowCbtImport: (show: boolean) => void;
  cbtJsonInput: string;
  setCbtJsonInput: (v: string) => void;
  handleCbtPreview: () => void;
  handleCbtApply: () => void;

  // Paste Excel
  pasteText: string;
  setPasteText: (v: string) => void;
  pastePreview: PastePreviewResult | null;
  setPastePreview: (p: PastePreviewResult | null) => void;
  handlePastePreview: (text: string) => void;
  handleApplyPaste: () => void;
}

export function GradesSidebar(props: GradesSidebarProps) {
  const {
    showSidebar, setShowSidebar,
    assignments, selectedAssignmentId, handleAssignmentChange, assignment, year,
    kktp, setKktp, setDirty, gradeModel, setGradeModel,
    uhCount, setUhCount, weightUH, setWeightUH, weightUTS, setWeightUTS, weightUAS, setWeightUAS,
    gradeBook, dirty, handleSave, handleFillAll80, handleRandomControlled,
    entries, calculated, remedialCount, enrichmentCount,
    cbtTarget, setCbtTarget, cbtPreview, setCbtPreview, cbtSourceWarning, setCbtSourceWarning,
    showCbtImport, setShowCbtImport, cbtJsonInput, setCbtJsonInput, handleCbtPreview, handleCbtApply,
    pasteText, setPasteText, pastePreview, setPastePreview, handlePastePreview, handleApplyPaste,
  } = props;

  return (
    <>
      {/* ---------- MOBILE BACKDROP ---------- */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ---------- SIDEBAR ---------- */}
      <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Daftar Nilai</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setShowSidebar(false)}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* -- doc-sidebar-scroll wrapper for Select dropdown fix -- */}
        <div className="doc-sidebar-scroll">

          {/* -- Konteks -- */}
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Konteks</h3>
            {assignments.length === 0 ? (
              <EmptyState title="Belum ada Kelas dan Mapel" description="Buka menu Kelas dan Mapel dulu."
                action={<Button variant="secondary" className="text-xs" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>} />
            ) : (
              <Select label="Kelas dan Mapel" id="g-assignment" value={selectedAssignmentId} onChange={handleAssignmentChange}
                options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject} · ${a.teacherName}` }))]} />
            )}
            {assignment && year && (
              <div className="mt-2">
                <ContextCard info={buildContextInfo({ assignment, academicYear: year })} />
              </div>
            )}
          </div>

          {/* -- KKTP & Model -- SELALU TAMPIL */}
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">KKTP & Model</h3>
            {!assignment ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel terlebih dahulu untuk mengatur KKTP dan model penilaian.</p>
            ) : (
              <>
                <Input label="KKTP" id="g-kktp" type="number" value={kktp} onChange={(v) => { setKktp(v); setDirty(true); }} />
                <Select
                  label="Model Penilaian"
                  id="g-model"
                  value={gradeModel}
                  onChange={(v) => { setGradeModel(v as "uh" | "kd"); setDirty(true); }}
                  options={[
                    { value: "uh", label: "UH / UTS / UAS" },
                    { value: "kd", label: "KD / PTS / PAS (legacy)" },
                  ]}
                />
                {gradeModel === "uh" && (
                  <>
                    <Select
                      label="Jumlah UH"
                      id="g-uhcount"
                      value={String(uhCount)}
                      onChange={(v) => { setUhCount(Number(v)); setDirty(true); }}
                      options={[
                        { value: "2", label: "2 UH" },
                        { value: "3", label: "3 UH" },
                        { value: "4", label: "4 UH" },
                        { value: "5", label: "5 UH" },
                        { value: "6", label: "6 UH" },
                      ]}
                    />
                    <div className="space-y-1 mt-1">
                      <Input label={`Bobot UH (${weightUH}%)`} id="g-wuh" type="number" value={String(weightUH)} onChange={(v) => { setWeightUH(Number(v) || 0); setDirty(true); }} />
                      <Input label={`Bobot UTS (${weightUTS}%)`} id="g-wuts" type="number" value={String(weightUTS)} onChange={(v) => { setWeightUTS(Number(v) || 0); setDirty(true); }} />
                      <Input label={`Bobot UAS (${weightUAS}%)`} id="g-wuas" type="number" value={String(weightUAS)} onChange={(v) => { setWeightUAS(Number(v) || 0); setDirty(true); }} />
                      {(weightUH + weightUTS + weightUAS) !== 100 && (
                        <p className="text-xs text-amber-600">Total bobot = {weightUH + weightUTS + weightUAS}% (disarankan 100%)</p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-2 mt-2">
                  <Button onClick={handleSave} disabled={!dirty} className="w-full text-sm">
                    {dirty ? "Simpan" : "Tersimpan"}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs flex-1" onClick={handleFillAll80}>Isi 80</Button>
                    <Button variant="secondary" className="text-xs flex-1" onClick={handleRandomControlled}>Acak</Button>
                  </div>
                  {gradeBook && <Badge variant="neutral">GradeBook: {gradeBook.status}</Badge>}
                </div>
              </>
            )}
          </div>

          {/* -- Ringkasan -- SELALU TAMPIL */}
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Ringkasan</h3>
            {!assignment || entries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel terlebih dahulu untuk melihat ringkasan nilai.</p>
            ) : (
              <dl className="doc-summary-dl">
                <div><dt>Terisi</dt><dd>{calculated.filter((e) => e.finalScore !== null).length}</dd></div>
                <div><dt>Total</dt><dd>{entries.length}</dd></div>
                <div><dt>Remedial</dt><dd className="kme-ineffective-text">{remedialCount}</dd></div>
                <div><dt>Pengayaan</dt><dd className="kme-effective-text">{enrichmentCount}</dd></div>
              </dl>
            )}
          </div>

          {/* -- Import CBT -- SELALU TAMPIL */}
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Import CBT</h3>
            {!assignment || entries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel terlebih dahulu untuk mengimport nilai CBT.</p>
            ) : (
              <>
                <div className="flex gap-2 items-end">
                  <Select
                    label="Target"
                    id="cbt-target"
                    value={cbtTarget}
                    onChange={(v) => {
                      setCbtTarget(v as CbtImportTarget);
                      setCbtPreview(null);
                      setCbtSourceWarning(null);
                    }}
                    options={getCbtTargetLabels(gradeModel, uhCount)}
                  />
                  <Button variant="secondary" className="text-xs" onClick={() => setShowCbtImport(!showCbtImport)}>
                    {showCbtImport ? "Tutup" : "CBT"}
                  </Button>
                </div>

                {showCbtImport && (
                  <div className="space-y-2 mt-2">
                    <Textarea
                      id="cbt-json"
                      label=""
                      value={cbtJsonInput}
                      onChange={(v) => { setCbtJsonInput(v); setCbtPreview(null); }}
                      rows={4}
                      placeholder='{"source":"cbt","students":[...]}'
                    />
                    <Button variant="secondary" className="text-xs w-full" onClick={handleCbtPreview} disabled={!cbtJsonInput.trim()}>
                      Preview Match
                    </Button>
                    {cbtSourceWarning && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                        ℹ {cbtSourceWarning}
                      </div>
                    )}
                    {cbtPreview && (
                      <div className="space-y-1">
                        <div className="flex gap-2 text-xs">
                          <Badge variant="success">{cbtPreview.summary.matched} cocok</Badge>
                          {cbtPreview.summary.unmatchedCbt > 0 && <Badge variant="error">{cbtPreview.summary.unmatchedCbt} miss</Badge>}
                        </div>
                        <Button className="text-xs w-full" onClick={handleCbtApply} disabled={cbtPreview.summary.matched === 0}>
                          Terapkan {cbtTarget.toUpperCase()} ({cbtPreview.summary.matched})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* -- Paste Excel -- SELALU TAMPIL */}
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Paste Excel</h3>
            {!assignment || entries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel terlebih dahulu untuk paste nilai dari Excel.</p>
            ) : (
              <>
                <Textarea id="paste-grades" label="" value={pasteText} onChange={(v) => { setPasteText(v); setPastePreview(null); if (v.trim()) handlePastePreview(v); }} rows={3}
                  placeholder="1  Andi  80  85  75  90  70  85  78  82" />
                <div className="flex gap-2 mt-2">
                  <Button variant="secondary" className="text-xs flex-1" onClick={() => handlePastePreview(pasteText)} disabled={!pasteText.trim()}>
                    Preview
                  </Button>
                  {pastePreview && (
                    <Button className="text-xs flex-1" onClick={handleApplyPaste} disabled={pastePreview.matched.length === 0}>
                      Apply ({pastePreview.matched.length})
                    </Button>
                  )}
                </div>
                {pastePreview && pastePreview.unmatched.length > 0 && (
                  <p className="text-xs text-amber-700 mt-1">⚠ {pastePreview.unmatched.length} baris tidak cocok.</p>
                )}
              </>
            )}
          </div>

        </div>{/* end .doc-sidebar-scroll */}
      </aside>

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
    </>
  );
}

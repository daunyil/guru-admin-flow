/**
 * Nilai V2 — KD1-KD6, PTS, PAS, Nilai Akhir.
 *
 * WYSIWYG-DOC-FASE8: Daftar Nilai sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (konteks, KKTP, aksi) + DocumentPreview (tabel nilai).
 *   - Sidebar: Konteks (pilih Kelas/Mapel), Ringkasan, Quick Actions, Import.
 *   - DocumentPreview: kanvas A4 landscape + tabel nilai + auto-save.
 *   - Auto-save ke schoolDocuments (docType: "daftar-nilai").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 *
 * GRADEBOOK-V2-KD-IMPORT-RC1:
 *   - Kolom: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS, Nilai Akhir.
 *   - KD1 = Bab 1, dst.
 *   - Nilai Akhir = rata-rata KD (40%) + PTS (25%) + PAS (35%).
 *   - Paste Excel multi-kolom + Import CBT JSON.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, Select, Button, Badge, Textarea, EmptyState, ContextCard } from "../../shared/ui";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { findGradeBook, saveGradeBook, updateGradeBook } from "../../shared/db/gradebook-repo";
import type {
  AcademicYear, TeacherProfile, ClassRoster, GradeBook, GradeEntry, TeachingAssignment,
} from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
import { LoadingState } from "../../shared/ui";
import {
  calculateGradeBookEntries, buildContextInfo, parseExcelPaste,
  validateCbtImport, previewCbtMatch, applyCbtToEntries,
  type CbtImportTarget, type CbtMatchPreview,
} from "@guru-admin/domain";
// WYSIWYG-DOC-FASE8
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

/** Kolom nilai yang bisa diisi. */
const SCORE_COLUMNS: Array<{ key: keyof GradeEntry; label: string; width: string }> = [
  { key: "kd1", label: "KD1", width: "w-16" },
  { key: "kd2", label: "KD2", width: "w-16" },
  { key: "kd3", label: "KD3", width: "w-16" },
  { key: "kd4", label: "KD4", width: "w-16" },
  { key: "kd5", label: "KD5", width: "w-16" },
  { key: "kd6", label: "KD6", width: "w-16" },
  { key: "pts", label: "PTS", width: "w-16" },
  { key: "pas", label: "PAS", width: "w-16" },
];

export function GradesPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [kktp, setKktp] = useState("75");
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");

  // CBT import
  const [cbtJsonInput, setCbtJsonInput] = useState("");
  const [cbtTarget, setCbtTarget] = useState<CbtImportTarget>("kd1");
  const [cbtPreview, setCbtPreview] = useState<CbtMatchPreview | null>(null);
  const [showCbtImport, setShowCbtImport] = useState(false);
  const [cbtSourceWarning, setCbtSourceWarning] = useState<string | null>(null);

  // Paste Excel preview
  const [pastePreview, setPastePreview] = useState<{
    matched: Array<{ studentName: string; studentNumber?: number; scores: Partial<GradeEntry> }>;
    unmatched: string[];
  } | null>(null);

  // WYSIWYG-DOC-FASE8
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("landscape");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /*  Init                                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      if (y && tp) {
        const todayISO = todayISODate();
        const defaultSemester: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setDocSemester(defaultSemester);
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, defaultSemester));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  /* ---------------------------------------------------------------- */
  /*  Assignment selection                                            */
  /* ---------------------------------------------------------------- */

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  // Dirty guard saat ganti assignment
  function handleAssignmentChange(newId: string) {
    if (newId === selectedAssignmentId) return;
    if (dirty) {
      const ok = window.confirm(
        "Nilai belum disimpan. Ganti Kelas dan Mapel akan membuang perubahan. Lanjutkan?"
      );
      if (!ok) return;
    }
    setSelectedAssignmentId(newId);
    setDirty(false);
  }

  // Auto-set semester from assignment
  useEffect(() => {
    const asg = selectedAssignment();
    if (asg) setDocSemester(asg.semester);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId]);

  /* ---------------------------------------------------------------- */
  /*  Load entries                                                    */
  /* ---------------------------------------------------------------- */

  async function loadEntries() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) { setEntries([]); setGradeBook(null); return; }
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) { setEntries([]); setGradeBook(null); return; }

    try {
      const existing = await findGradeBook({
        academicYearId: assignment.academicYearId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        semester: assignment.semester,
        subject: assignment.subject,
      });

      if (existing) {
        setGradeBook(existing);
        setKktp(String(existing.passingScore));
        setEntries(existing.entries.slice().sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)));
      } else {
        setGradeBook(null);
        const newEntries: GradeEntry[] = roster.students.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          studentNumber: s.number,
          kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
          pts: null, pas: null,
          finalScore: null, averageKd: null,
          dailyScore: null, assignmentScore: null, summativeScore: null,
          remedialScore: null, averageScore: null,
          status: "incomplete" as const,
        }));
        setEntries(newEntries);
      }
      setDirty(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal memuat data nilai. Coba lagi.");
    }
  }

  useEffect(() => {
    void loadEntries();
    setCbtPreview(null);
    setCbtJsonInput("");
    setShowCbtImport(false);
    setPastePreview(null);
    setPasteText("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId]);

  /* ---------------------------------------------------------------- */
  /*  ensureDoc (find-or-create schoolDocument)                       */
  /* ---------------------------------------------------------------- */

  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!year || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "daftar-nilai",
        semester,
        tahunAjaran: year.label,
        kodeMapel: asg.subject,
        kodeKelas: asg.classLabel,
        teacherId: asg.teacherId,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "daftar-nilai",
          semester,
          tahunAjaran: year.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: year.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
          orientation: "landscape",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("landscape");
      }
    } finally {
      ensuringRef.current = false;
    }
  }, [year]);

  useEffect(() => {
    const asg = selectedAssignment();
    if (asg) {
      void ensureDoc(asg, docSemester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, year?.id]);

  /* ---------------------------------------------------------------- */
  /*  WYSIWYG callbacks                                               */
  /* ---------------------------------------------------------------- */

  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    setFormatDokumen(orientation);
    if (docId) void updateSchoolDocumentLayout(docId, { orientation });
  }, [docId]);

  /* ---------------------------------------------------------------- */
  /*  Score editing                                                   */
  /* ---------------------------------------------------------------- */

  function setScore(idx: number, field: keyof GradeEntry, value: string) {
    const num = value === "" ? null : Math.max(0, Math.min(100, Number(value)));
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: num };
    setEntries(next);
    setDirty(true);
  }

  function handleFillAll80() {
    setEntries(entries.map((e) => ({
      ...e,
      kd1: 80, kd2: 80, kd3: 80, kd4: 80, kd5: 80, kd6: 80,
      pts: 80, pas: 80,
    })));
    setDirty(true);
    setMessage("Semua diisi 80. Klik Simpan.");
  }

  function handleRandomControlled() {
    setEntries(entries.map((e) => {
      const base = 75 + Math.floor(Math.random() * 20);
      return { ...e, kd1: base, kd2: base, kd3: base, kd4: base, kd5: base, kd6: base, pts: base, pas: base };
    }));
    setDirty(true);
    setMessage("Nilai diacak terkontrol (75-94). Klik Simpan.");
  }

  /* ---------------------------------------------------------------- */
  /*  CBT Import                                                      */
  /* ---------------------------------------------------------------- */

  function handleCbtPreview() {
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;
    try {
      const json = JSON.parse(cbtJsonInput);
      const validation = validateCbtImport(json);
      if (!validation.success) {
        setMessage(validation.errors.join("; "));
        setCbtPreview(null);
        setCbtSourceWarning(null);
        return;
      }
      const preview = previewCbtMatch(validation.data!, roster.students);
      setCbtPreview(preview);
      if (validation.data!.source !== "cbt") {
        setCbtSourceWarning(
          "Sumber JSON tidak ditandai sebagai \"cbt\". Pastikan format berasal dari sistem CBT."
        );
      } else {
        setCbtSourceWarning(null);
      }
      setMessage(`Preview: ${preview.summary.matched} cocok, ${preview.summary.unmatchedCbt} CBT tidak cocok, ${preview.summary.missingRoster} siswa roster belum ada nilai CBT.`);
    } catch (e) {
      setMessage("JSON tidak valid: " + (e instanceof Error ? e.message : String(e)));
      setCbtPreview(null);
      setCbtSourceWarning(null);
    }
  }

  function handleCbtApply() {
    if (!cbtPreview) return;
    if (cbtPreview.summary.missingRoster > 0) {
      const ok = window.confirm(
        `${cbtPreview.summary.missingRoster} siswa roster belum ada di data CBT. ` +
        `Nilai lama mereka tidak akan diubah. Lanjutkan?`
      );
      if (!ok) return;
    }
    const updated = applyCbtToEntries(entries, cbtPreview, cbtTarget);
    setEntries(updated);
    setDirty(true);
    setMessage(`Nilai CBT diterapkan ke kolom ${cbtTarget.toUpperCase()} (${cbtPreview.summary.matched} siswa). Klik Simpan.`);
    setShowCbtImport(false);
    setCbtPreview(null);
    setCbtJsonInput("");
    setCbtSourceWarning(null);
  }

  /* ---------------------------------------------------------------- */
  /*  Paste Excel                                                     */
  /* ---------------------------------------------------------------- */

  function handlePastePreview(text: string) {
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;

    const { matched, unmatched } = parseExcelPaste(text, roster.students);
    if (matched.length === 0) {
      setPastePreview(null);
      setMessage("Tidak ada siswa yang cocok. Pastikan format: No, Nama, KD1-KD6, PTS, PAS.");
      return;
    }

    setPastePreview({
      matched: matched.map((m) => ({
        studentName: m.rosterStudent.name,
        studentNumber: m.rosterStudent.number,
        scores: m.scores,
      })),
      unmatched,
    });
    setMessage(`Preview: ${matched.length} siswa cocok, ${unmatched.length} baris tidak cocok. Klik "Terapkan ke Nilai" untuk menyimpan.`);
  }

  function handleApplyPaste() {
    if (!pastePreview) return;
    if (pastePreview.unmatched.length > 0) {
      const ok = window.confirm(
        `${pastePreview.unmatched.length} baris tidak cocok dengan roster dan akan diabaikan. ` +
        `Lanjutkan apply ${pastePreview.matched.length} siswa yang cocok?`
      );
      if (!ok) return;
    }
    const next = [...entries];
    for (const { studentName, scores } of pastePreview.matched) {
      const idx = next.findIndex((e) => e.studentName === studentName);
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...scores };
      }
    }
    setEntries(next);
    setDirty(true);
    setMessage(`${pastePreview.matched.length} siswa diterapkan ke nilai. Klik Simpan untuk menyimpan permanen.`);
    setPastePreview(null);
    setPasteText("");
  }

  /* ---------------------------------------------------------------- */
  /*  Save gradebook                                                  */
  /* ---------------------------------------------------------------- */

  async function handleSave() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;

    try {
      if (gradeBook) {
        const updated = await updateGradeBook(gradeBook.id, { passingScore: Number(kktp) || 75, entries });
        if (updated) {
          setGradeBook(updated);
          setEntries(updated.entries.slice().sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)));
          setDirty(false);
          setMessage("Nilai tersimpan.");
        }
      } else {
        const created = await saveGradeBook({
          academicYearId: assignment.academicYearId,
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          classLabel: assignment.classLabel,
          subject: assignment.subject,
          semester: assignment.semester,
          passingScore: Number(kktp) || 75,
          entries,
          status: "draft",
        });
        setGradeBook(created);
        setEntries(created.entries.slice().sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)));
        setDirty(false);
        setMessage("Nilai tersimpan.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan.");
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Auto-save data memo                                             */
  /* ---------------------------------------------------------------- */

  const calculated = useMemo(
    () => calculateGradeBookEntries(entries, Number(kktp) || 75),
    [entries, kktp]
  );

  const assignment = selectedAssignment();
  const remedialCount = calculated.filter((e) => e.status === "remedial").length;
  const enrichmentCount = calculated.filter((e) => (e.finalScore ?? 0) >= 90).length;

  const docDataForAutoSave = useMemo(() => {
    if (!assignment) return {};
    return {
      semester: docSemester,
      tahunAjaran: year?.label ?? "",
      subject: assignment.subject,
      classLabel: assignment.classLabel,
      kktp: Number(kktp) || 75,
      totalStudents: entries.length,
      filledCount: calculated.filter((e) => e.finalScore !== null).length,
      remedialCount,
      enrichmentCount,
    };
  }, [assignment, docSemester, year?.label, entries.length, calculated, kktp, remedialCount, enrichmentCount]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

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

        {/* -- KKTP -- */}
        {assignment && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">KKTP & Aksi</h3>
            <Input label="KKTP" id="g-kktp" type="number" value={kktp} onChange={(v) => { setKktp(v); setDirty(true); }} />
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
          </div>
        )}

        {/* -- Ringkasan -- */}
        {assignment && entries.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Ringkasan</h3>
            <dl className="doc-summary-dl">
              <div><dt>Terisi</dt><dd>{calculated.filter((e) => e.finalScore !== null).length}</dd></div>
              <div><dt>Total</dt><dd>{entries.length}</dd></div>
              <div><dt>Remedial</dt><dd className="kme-ineffective-text">{remedialCount}</dd></div>
              <div><dt>Pengayaan</dt><dd className="kme-effective-text">{enrichmentCount}</dd></div>
            </dl>
          </div>
        )}

        {/* -- Import CBT -- */}
        {assignment && entries.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Import CBT</h3>
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
                options={[
                  { value: "kd1", label: "KD1" }, { value: "kd2", label: "KD2" },
                  { value: "kd3", label: "KD3" }, { value: "kd4", label: "KD4" },
                  { value: "kd5", label: "KD5" }, { value: "kd6", label: "KD6" },
                  { value: "pts", label: "PTS" }, { value: "pas", label: "PAS" },
                ]}
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
          </div>
        )}

        {/* -- Paste Excel -- */}
        {assignment && entries.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Paste Excel</h3>
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
          </div>
        )}
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

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {message && <div className="info-banner-success mb-3 no-print" role="status" aria-live="polite">{message}</div>}

        <DocumentPreview
          docId={docId}
          docType="daftar-nilai"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {!assignment ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Pilih Kelas dan Mapel</p>
              <p className="text-sm mt-1">Buka sidebar untuk memilih assignment.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Belum Ada Data Siswa</p>
              <p className="text-sm mt-1">Buat roster kelas terlebih dahulu.</p>
            </div>
          ) : (
            <GradeDocument
              calculated={calculated}
              kktp={kktp}
              assignment={assignment}
              yearLabel={year?.label ?? ""}
              teacherName={teacher?.name ?? ""}
              editable
              onSetScore={setScore}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GradeDocument — A4 formal table for grades (editable in canvas)   */
/* ------------------------------------------------------------------ */

function GradeDocument({
  calculated,
  kktp,
  assignment,
  yearLabel,
  teacherName,
  editable,
  onSetScore,
}: {
  calculated: GradeEntry[];
  kktp: string;
  assignment: TeachingAssignment;
  yearLabel: string;
  teacherName: string;
  editable?: boolean;
  onSetScore?: (idx: number, field: keyof GradeEntry, value: string) => void;
}) {
  return (
    <div className="document-page document-landscape">
      <div className="document-title">DAFTAR NILAI</div>
      <div className="document-subtitle">{yearLabel} — Semester {assignment.semester === 1 ? "Ganjil" : "Genap"}</div>
      <table className="document-identity">
        <tbody>
          <tr><td>Sekolah</td><td>{teacherName || "-"}</td><td>Mapel</td><td>{assignment.subject}</td></tr>
          <tr><td>Kelas</td><td>{assignment.classLabel}</td><td>KKTP</td><td>{kktp || "-"}</td></tr>
          <tr><td>Guru</td><td>{assignment.teacherName}</td><td>Semester</td><td>{assignment.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
        </tbody>
      </table>
      <table className="document-table" style={{ fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={{ width: "4%" }}>No</th>
            <th style={{ width: "20%" }}>Nama</th>
            <th>KD1</th><th>KD2</th><th>KD3</th><th>KD4</th><th>KD5</th><th>KD6</th>
            <th>PTS</th><th>PAS</th>
            <th style={{ width: "7%" }}>Akhir</th>
            <th style={{ width: "9%" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {calculated.map((e, i) => (
            <tr key={e.studentId}>
              <td className="text-center">{i + 1}</td>
              <td>{e.studentName}</td>
              {SCORE_COLUMNS.map((col) => (
                <td key={col.key} className="text-center">
                  {editable && onSetScore ? (
                    <input
                      type="number"
                      className="w-12 px-1 py-0.5 border border-slate-300 rounded text-sm text-center no-print"
                      value={(e[col.key] as number | null) ?? ""}
                      onChange={(ev) => onSetScore(i, col.key, ev.target.value)}
                      min={0} max={100}
                    />
                  ) : (
                    <span className="print-only">{(e[col.key] as number | null) ?? "-"}</span>
                  )}
                </td>
              ))}
              <td className="text-center font-bold">{e.finalScore ?? "-"}</td>
              <td className="text-center">
                {e.status === "complete" ? "Tuntas" : e.status === "remedial" ? "Remedial" : "Belum"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Nilai V2 — KD1-KD6, PTS, PAS, Nilai Akhir.
 *
 * GRADEBOOK-V2-KD-IMPORT-RC1:
 *   - Kolom: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS, Nilai Akhir.
 *   - KD1 = Bab 1, dst. Tidak perlu tulis Bab di header.
 *   - Nilai Akhir dihitung otomatis: rata-rata KD (40%) + PTS (25%) + PAS (35%).
 *   - Paste Excel multi-kolom (No, Nama, KD1-KD6, PTS, PAS).
 *   - Isi Otomatis Semua (preset nilai).
 *   - Pilih Data Mengajar sebagai konteks.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, Textarea, EmptyState, ContextCard } from "../../shared/ui";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { findGradeBook, saveGradeBook, updateGradeBook } from "../../shared/db/gradebook-repo";
import type {
  AcademicYear, TeacherProfile, ClassRoster, GradeBook, GradeEntry, TeachingAssignment,
} from "@guru-admin/domain";
import {
  calculateGradeBookEntries, assignmentShortLabel, buildContextInfo, parseExcelPaste,
  validateCbtImport, previewCbtMatch, applyCbtToEntries,
  type CbtImportTarget, type CbtMatchPreview,
} from "@guru-admin/domain";

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
  const [kktp, setKktp] = useState(75);
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

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      if (y && tp) {
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const defaultSemester: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, defaultSemester));
      }
      setLoading(false);
    })();
  }, []);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function loadEntries() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) { setEntries([]); setGradeBook(null); return; }
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) { setEntries([]); setGradeBook(null); return; }

    const existing = await findGradeBook({
      academicYearId: assignment.academicYearId,
      teacherId: assignment.teacherId,
      classId: assignment.classId,
      semester: assignment.semester,
      subject: assignment.subject,
    });

    if (existing) {
      setGradeBook(existing);
      setKktp(existing.passingScore);
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
  }

  useEffect(() => { void loadEntries(); }, [selectedAssignmentId]);

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
        return;
      }
      const preview = previewCbtMatch(validation.data!, roster.students);
      setCbtPreview(preview);
      setMessage(`Preview: ${preview.summary.matched} cocok, ${preview.summary.unmatched} tidak cocok.`);
    } catch (e) {
      setMessage("JSON tidak valid: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function handleCbtApply() {
    if (!cbtPreview) return;
    const updated = applyCbtToEntries(entries, cbtPreview, cbtTarget);
    setEntries(updated);
    setDirty(true);
    setMessage(`Nilai CBT diterapkan ke kolom ${cbtTarget.toUpperCase()} (${cbtPreview.summary.matched} siswa). Klik Simpan.`);
    setShowCbtImport(false);
    setCbtPreview(null);
    setCbtJsonInput("");
  }

  function handlePasteExcel(text: string) {
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;

    const { matched, unmatched } = parseExcelPaste(text, roster.students);
    if (matched.length === 0) {
      setMessage("Tidak ada siswa yang cocok. Pastikan format: No, Nama, KD1-KD6, PTS, PAS.");
      return;
    }

    const next = [...entries];
    for (const { rosterStudent, scores } of matched) {
      const idx = next.findIndex((e) => e.studentId === rosterStudent.id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...scores };
      }
    }
    setEntries(next);
    setDirty(true);
    const msg = `${matched.length} siswa cocok. ${unmatched.length} baris tidak cocok.`;
    setMessage(msg);
  }

  async function handleSave() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;

    try {
      if (gradeBook) {
        const updated = await updateGradeBook(gradeBook.id, { passingScore: kktp, entries });
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
          passingScore: kktp,
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

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const calculated = calculateGradeBookEntries(entries, kktp);
  const remedialCount = calculated.filter((e) => e.status === "remedial").length;
  const enrichmentCount = calculated.filter((e) => (e.finalScore ?? 0) >= 90).length;
  const assignment = selectedAssignment();

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Daftar Nilai</h1>
        <p className="text-sm text-slate-500 mt-1">
          {assignment ? assignmentShortLabel(assignment) : "Pilih Data Mengajar dulu."}
        </p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      {/* Pilih Data Mengajar */}
      <Card>
        <CardHeader title="Pilih Data Mengajar" description="KD1=Bab1, KD2=Bab2, dst. Nilai Akhir = rata-rata KD (40%) + PTS (25%) + PAS (35%)." />
        {assignments.length === 0 ? (
          <EmptyState title="Belum ada Data Mengajar" description="Buka menu Data Mengajar dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Data Mengajar</Button>} />
        ) : (
          <Select label="Data Mengajar" id="g-assignment" value={selectedAssignmentId} onChange={setSelectedAssignmentId}
            options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject} · ${a.teacherName}` }))]} />
        )}
      </Card>

      {assignment && entries.length > 0 && (
        <>
          {year && <ContextCard info={buildContextInfo({ assignment, academicYear: year })} />}

          {/* KKTP + quick actions */}
          <Card>
            <div className="flex gap-3 items-end flex-wrap">
              <Input label="KKTP" id="g-kktp" type="number" value={String(kktp)} onChange={(v) => { setKktp(Number(v) || 75); setDirty(true); }} />
              <Button variant="secondary" className="text-sm" onClick={handleFillAll80}>Isi Semua 80</Button>
              <Button variant="secondary" className="text-sm" onClick={handleRandomControlled}>Acak Terkontrol</Button>
              <Button onClick={handleSave} disabled={!dirty} className="text-sm">{dirty ? "Simpan" : "Tersimpan"}</Button>
              {gradeBook && <Badge variant="neutral">GradeBook: {gradeBook.status}</Badge>}
            </div>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-brand-50 rounded"><p className="text-lg font-bold text-brand-700">{calculated.filter((e) => e.finalScore !== null).length}</p><p className="text-xs">Terisi</p></div>
            <div className="p-2 bg-slate-100 rounded"><p className="text-lg font-bold">{entries.length}</p><p className="text-xs">Total</p></div>
            <div className="p-2 bg-rose-50 rounded"><p className="text-lg font-bold text-rose-700">{remedialCount}</p><p className="text-xs">Remedial</p></div>
            <div className="p-2 bg-emerald-50 rounded"><p className="text-lg font-bold text-emerald-700">{enrichmentCount}</p><p className="text-xs">Pengayaan</p></div>
          </div>

          {/* Grade table V2 */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 px-2 sticky left-0 bg-white">No</th>
                    <th className="py-2 px-2 sticky left-0 bg-white" style={{ minWidth: "120px" }}>Nama</th>
                    {SCORE_COLUMNS.map((col) => (
                      <th key={col.key} className={`py-2 px-2 ${col.width} text-center`}>{col.label}</th>
                    ))}
                    <th className="py-2 px-2 w-20 text-center bg-slate-50">Akhir</th>
                    <th className="py-2 px-2 w-24 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.map((e, i) => (
                    <tr key={e.studentId} className="border-b border-slate-100">
                      <td className="py-1.5 px-2">{e.studentNumber}</td>
                      <td className="py-1.5 px-2 font-medium">{e.studentName}</td>
                      {SCORE_COLUMNS.map((col) => (
                        <td key={col.key} className="py-1.5 px-2">
                          <input
                            type="number"
                            className="w-14 px-1 py-1 border border-slate-300 rounded text-sm text-center"
                            value={(e[col.key] as number | null) ?? ""}
                            onChange={(ev) => setScore(i, col.key, ev.target.value)}
                            min={0} max={100}
                          />
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-center font-bold bg-slate-50">{e.finalScore ?? "-"}</td>
                      <td className="py-1.5 px-2 text-center">
                        {e.status === "remedial" && <Badge variant="error">Remedial</Badge>}
                        {(e.finalScore ?? 0) >= 90 && e.status !== "remedial" && <Badge variant="success">Pengayaan</Badge>}
                        {e.status === "complete" && (e.finalScore ?? 0) < 90 && <Badge variant="neutral">Tuntas</Badge>}
                        {e.status === "incomplete" && <Badge variant="warning">Belum</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Import CBT JSON */}
          <Card>
            <CardHeader title="Import Nilai dari CBT" description="Paste JSON dari sistem CBT. Pilih target kolom (KD/PTS/PAS)." />
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <Select
                  label="Target Kolom"
                  id="cbt-target"
                  value={cbtTarget}
                  onChange={(v) => setCbtTarget(v as CbtImportTarget)}
                  options={[
                    { value: "kd1", label: "KD1" }, { value: "kd2", label: "KD2" },
                    { value: "kd3", label: "KD3" }, { value: "kd4", label: "KD4" },
                    { value: "kd5", label: "KD5" }, { value: "kd6", label: "KD6" },
                    { value: "pts", label: "PTS" }, { value: "pas", label: "PAS" },
                  ]}
                />
                <Button variant="secondary" className="text-sm" onClick={() => setShowCbtImport(!showCbtImport)}>
                  {showCbtImport ? "Tutup" : "Buka Import CBT"}
                </Button>
              </div>

              {showCbtImport && (
                <>
                  <Textarea
                    id="cbt-json"
                    label=""
                    value={cbtJsonInput}
                    onChange={(v) => { setCbtJsonInput(v); setCbtPreview(null); }}
                    rows={6}
                    placeholder='{"source":"cbt","students":[{"nis":"2025001","name":"Andi","score":85},{"name":"Budi","number":2,"score":70}]}'
                  />
                  <Button variant="secondary" className="text-sm" onClick={handleCbtPreview} disabled={!cbtJsonInput.trim()}>
                    Preview Match Siswa
                  </Button>

                  {cbtPreview && (
                    <div className="p-3 bg-slate-50 rounded-md space-y-2">
                      <div className="flex gap-3 text-sm flex-wrap">
                        <Badge variant="success">{cbtPreview.summary.matched} cocok</Badge>
                        {cbtPreview.summary.unmatchedCbt > 0 && (
                          <Badge variant="error">{cbtPreview.summary.unmatchedCbt} CBT tidak cocok</Badge>
                        )}
                        {cbtPreview.summary.missingRoster > 0 && (
                          <Badge variant="warning">{cbtPreview.summary.missingRoster} siswa belum ada nilai CBT</Badge>
                        )}
                      </div>

                      {/* Match table */}
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-left">
                              <th className="py-1 px-2">Roster</th>
                              <th className="py-1 px-2">CBT</th>
                              <th className="py-1 px-2">Skor</th>
                              <th className="py-1 px-2">Match</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cbtPreview.matched.map((m, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="py-1 px-2">{m.rosterStudent.name}</td>
                                <td className="py-1 px-2">{m.cbtStudent.name}</td>
                                <td className="py-1 px-2 font-bold">{m.cbtStudent.score}</td>
                                <td className="py-1 px-2"><Badge variant="neutral">{m.matchBy}</Badge></td>
                              </tr>
                            ))}
                            {cbtPreview.unmatched.map((u, i) => (
                              <tr key={`un-${i}`} className="border-b border-slate-100 bg-rose-50">
                                <td className="py-1 px-2 text-rose-400">-</td>
                                <td className="py-1 px-2">{u.name}</td>
                                <td className="py-1 px-2">{u.score}</td>
                                <td className="py-1 px-2"><Badge variant="error">CBT tidak cocok</Badge></td>
                              </tr>
                            ))}
                            {cbtPreview.missingRoster.map((m, i) => (
                              <tr key={`miss-${i}`} className="border-b border-slate-100 bg-amber-50">
                                <td className="py-1 px-2">{m.name}</td>
                                <td className="py-1 px-2 text-amber-400">-</td>
                                <td className="py-1 px-2 text-amber-400">-</td>
                                <td className="py-1 px-2"><Badge variant="warning">belum ada CBT</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {cbtPreview.summary.missingRoster > 0 && (
                        <div className="p-2 bg-amber-100 rounded text-xs text-amber-800">
                          ⚠ {cbtPreview.summary.missingRoster} siswa roster belum ada di data CBT.
                          Nilai lama mereka tidak akan diubah. Pastikan ini disengaja.
                        </div>
                      )}

                      <Button onClick={handleCbtApply} disabled={cbtPreview.summary.matched === 0}>
                        Terapkan ke Kolom {cbtTarget.toUpperCase()} ({cbtPreview.summary.matched} siswa)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Paste Excel multi-kolom */}
          <Card>
            <CardHeader title="Paste dari Excel" description="Format: No, Nama, KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS (dipisah tab/koma)." />
            <Textarea id="paste-grades" label="" value={pasteText} onChange={(v) => { setPasteText(v); if (v.trim()) handlePasteExcel(v); }} rows={5}
              placeholder="1    Andi    80      85      75      90      70      85      78      82&#10;2        Budi    70      75      65      80      60      75      68      72" />
          </Card>
        </>
      )}
    </div>
  );
}

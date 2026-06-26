/**
 * Nilai V2 — KD1-KD6, PTS, PAS, Nilai Akhir.
 *
 * GRADEBOOK-V2-KD-IMPORT-RC1:
 *   - Kolom: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS, Nilai Akhir.
 *   - KD1 = Bab 1, dst. Tidak perlu tulis Bab di header.
 *   - Nilai Akhir dihitung otomatis: rata-rata KD (40%) + PTS (25%) + PAS (35%).
 *   - Paste Excel multi-kolom (No, Nama, KD1-KD6, PTS, PAS).
 *   - Isi Otomatis Semua (preset nilai).
 *   - Pilih Kelas dan Mapel sebagai konteks.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, Textarea, EmptyState, ContextCard, PrintExportButtons } from "../../shared/ui";
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

  // UX-DAILY-07: paste Excel preview (tidak langsung apply)
  const [pastePreview, setPastePreview] = useState<{
    matched: Array<{ studentName: string; studentNumber?: number; scores: Partial<GradeEntry> }>;
    unmatched: string[];
  } | null>(null);

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

  useEffect(() => {
    void loadEntries();
    // PATCH-AUDIT: ganti assignment → clear preview CBT lama (roster beda → preview beda)
    setCbtPreview(null);
    setCbtJsonInput("");
    setShowCbtImport(false);
    // UX-DAILY-07: clear paste preview juga (roster beda → match beda)
    setPastePreview(null);
    setPasteText("");
  }, [selectedAssignmentId]);

  // UX-DAILY-09: dirty guard saat ganti Kelas dan Mapel
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

  // P1-3: warning ringan jika source tidak ditandai sebagai "cbt" (tidak block import)
  const [cbtSourceWarning, setCbtSourceWarning] = useState<string | null>(null);

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
      // P1-3: source check — warning saja, tidak block
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
    // P1-1: konfirmasi jika ada siswa roster yang belum ada nilai CBT
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

  // UX-DAILY-07: preview paste Excel dulu, TIDAK langsung apply
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

  // UX-DAILY-07: apply paste setelah user konfirmasi
  function handleApplyPaste() {
    if (!pastePreview) return;
    // UX-DAILY-07: confirm bila ada unmatched
    if (pastePreview.unmatched.length > 0) {
      const ok = window.confirm(
        `${pastePreview.unmatched.length} baris tidak cocok dengan roster dan akan diabaikan. ` +
        `Lanjutkan apply ${pastePreview.matched.length} siswa yang cocok?`
      );
      if (!ok) return;
    }

    // Build map studentName → scores dari preview (cari by name di entries)
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
          {assignment ? assignmentShortLabel(assignment) : "Pilih Kelas dan Mapel dulu."}
        </p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      {/* Pilih Kelas dan Mapel */}
      <Card>
        <CardHeader title="Pilih Kelas dan Mapel" description="KD1=Bab1, KD2=Bab2, dst. Nilai Akhir = rata-rata KD (40%) + PTS (25%) + PAS (35%)." />
        {assignments.length === 0 ? (
          <EmptyState title="Belum ada Kelas dan Mapel" description="Buka menu Kelas dan Mapel dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>} />
        ) : (
          <Select label="Kelas dan Mapel" id="g-assignment" value={selectedAssignmentId} onChange={handleAssignmentChange}
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
                  onChange={(v) => {
                    setCbtTarget(v as CbtImportTarget);
                    // P0-3: ganti target → clear preview (preview KD1 tidak bisa langsung diterapkan ke PTS/PAS tanpa preview ulang)
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

                  {cbtSourceWarning && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      ℹ {cbtSourceWarning}
                    </div>
                  )}

                  {cbtPreview && (
                    <div className="p-3 bg-slate-50 rounded-md space-y-2">
                      {/* P1-2: tampilkan Total CBT dan Total Roster */}
                      <div className="text-xs text-slate-600">
                        Total CBT: <strong>{cbtPreview.summary.totalCbt}</strong> · Total Roster: <strong>{cbtPreview.summary.totalRoster}</strong>
                      </div>
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
            <CardHeader title="Paste dari Excel" description="Format: No, Nama, KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS (dipisah tab/koma). Preview dulu sebelum apply." />
            <Textarea id="paste-grades" label="" value={pasteText} onChange={(v) => { setPasteText(v); setPastePreview(null); if (v.trim()) handlePastePreview(v); }} rows={5}
              placeholder="1    Andi    80      85      75      90      70      85      78      82&#10;2        Budi    70      75      65      80      60      75      68      72" />
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" className="text-sm" onClick={handlePastePreview.bind(null, pasteText)} disabled={!pasteText.trim()}>
                Preview Match
              </Button>
              {pastePreview && (
                <Button className="text-sm" onClick={handleApplyPaste} disabled={pastePreview.matched.length === 0}>
                  Terapkan ke Nilai ({pastePreview.matched.length} siswa)
                </Button>
              )}
            </div>

            {pastePreview && (
              <div className="p-3 bg-slate-50 rounded-md space-y-2 mt-2">
                <div className="flex gap-3 text-sm flex-wrap">
                  <Badge variant="success">{pastePreview.matched.length} cocok</Badge>
                  {pastePreview.unmatched.length > 0 && (
                    <Badge variant="error">{pastePreview.unmatched.length} tidak cocok</Badge>
                  )}
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="py-1 px-2">Siswa</th>
                        <th className="py-1 px-2">Nilai (KD/PTS/PAS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.matched.map((m, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-1 px-2">{m.studentNumber}. {m.studentName}</td>
                          <td className="py-1 px-2 text-slate-600">
                            {Object.entries(m.scores)
                              .filter(([, v]) => v !== null && v !== undefined)
                              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                              .join(", ") || "(kosong)"}
                          </td>
                        </tr>
                      ))}
                      {pastePreview.unmatched.map((u, i) => (
                        <tr key={`un-${i}`} className="border-b border-slate-100 bg-rose-50">
                          <td className="py-1 px-2 text-rose-400">-</td>
                          <td className="py-1 px-2 text-rose-700">{u}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pastePreview.unmatched.length > 0 && (
                  <p className="text-xs text-amber-700">
                    ⚠ {pastePreview.unmatched.length} baris tidak cocok dengan roster. Bila Anda "Terapkan", baris ini akan diabaikan.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* PRINT-EXPORT-COMPLETE-01: Cetak Daftar Nilai */}
          <Card>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-700">Cetak Daftar Nilai</h3>
              <PrintExportButtons
                filename={`nilai-${assignment.classLabel}-${assignment.subject}`}
                title="Daftar Nilai"
                schoolName={teacher?.name ?? ""}
                orientation="landscape"
                targetId="print-grades"
              />
            </div>
          </Card>

          {/* Print-area untuk daftar nilai */}
          <div className="print-area hidden print:block" id="print-grades">
            <div className="document-page document-landscape">
              <div className="document-title">DAFTAR NILAI</div>
              <div className="document-subtitle">{year?.label ?? ""} — Semester {assignment.semester === 1 ? "Ganjil" : "Genap"}</div>
              <table className="document-identity">
                <tbody>
                  <tr><td>Sekolah</td><td>{teacher?.name ?? "-"}</td><td>Mapel</td><td>{assignment.subject}</td></tr>
                  <tr><td>Kelas</td><td>{assignment.classLabel}</td><td>KKTP</td><td>{kktp}</td></tr>
                  <tr><td>Guru</td><td>{assignment.teacherName}</td><td>Semester</td><td>{assignment.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
                </tbody>
              </table>
              <table className="document-table">
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>No</th>
                    <th style={{ width: "25%" }}>Nama</th>
                    <th>KD1</th><th>KD2</th><th>KD3</th><th>KD4</th><th>KD5</th><th>KD6</th>
                    <th>PTS</th><th>PAS</th>
                    <th style={{ width: "8%" }}>Akhir</th>
                    <th style={{ width: "10%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.map((e, i) => (
                    <tr key={e.studentId}>
                      <td className="text-center">{i + 1}</td>
                      <td>{e.studentName}</td>
                      <td className="text-center">{e.kd1 ?? "-"}</td>
                      <td className="text-center">{e.kd2 ?? "-"}</td>
                      <td className="text-center">{e.kd3 ?? "-"}</td>
                      <td className="text-center">{e.kd4 ?? "-"}</td>
                      <td className="text-center">{e.kd5 ?? "-"}</td>
                      <td className="text-center">{e.kd6 ?? "-"}</td>
                      <td className="text-center">{e.pts ?? "-"}</td>
                      <td className="text-center">{e.pas ?? "-"}</td>
                      <td className="text-center font-bold">{e.finalScore ?? "-"}</td>
                      <td className="text-center">{e.status === "complete" ? "Tuntas" : e.status === "remedial" ? "Remedial" : "Belum"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

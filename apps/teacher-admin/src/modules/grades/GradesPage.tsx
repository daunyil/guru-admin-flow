/**
 * PATCH-05: Nilai Cepat — administrasi ringan, bukan sistem ujian.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §5
 *
 * Fitur: Isi Semua 80, Acak Terkontrol, Salin Sebelumnya, Paste Excel
 * Remedial otomatis < KKTP, Pengayaan ≥ 90
 *
 * PATCH-FLOW-RC1: pakai gradeBooks schema yang sudah ada (bukan db.table("grades") dynamic).
 * GradeBook adalah entitas per (academicYearId, teacherId, classId, subject, semester),
 * dengan entries[] berisi GradeEntry per student.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, Textarea } from "../../shared/ui";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
} from "../../shared/db/gradebook-repo";
import type { AcademicYear, TeacherProfile, ClassRoster, GradeBook, GradeEntry } from "@guru-admin/domain";
import { calculateGradeBookEntries } from "@guru-admin/domain";

export function GradesPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [kktp, setKktp] = useState(75);
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      if (tp?.subjects[0]) setSelectedSubject(tp.subjects[0].subject);
      setLoading(false);
    })();
  }, []);

  async function loadEntries() {
    if (!year || !teacher || !selectedClassId || !selectedSubject) return;
    const roster = rosters.find((r) => r.id === selectedClassId);
    if (!roster) return;

    // Cari GradeBook existing via findGradeBook (academicYearId + teacherId + classId + semester + subject)
    const existing = await findGradeBook({
      academicYearId: year.id,
      teacherId: teacher.id,
      classId: roster.classId,
      semester,
      subject: selectedSubject,
    });

    if (existing) {
      setGradeBook(existing);
      setKktp(existing.passingScore);
      setEntries(
        existing.entries
          .slice()
          .sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0))
      );
    } else {
      // Buat entries baru dari roster (in-memory only, belum disimpan sampai klik Simpan)
      setGradeBook(null);
      const newEntries: GradeEntry[] = roster.students.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        studentNumber: s.number,
        dailyScore: null,
        assignmentScore: null,
        summativeScore: null,
        remedialScore: null,
        averageScore: null,
        finalScore: null,
        status: "incomplete",
      }));
      setEntries(newEntries);
    }
    setDirty(false);
  }

  useEffect(() => {
    void loadEntries();
  }, [selectedClassId, selectedSubject, semester]);

  function setScore(idx: number, field: "dailyScore" | "finalScore", value: string) {
    const num = value === "" ? null : Math.max(0, Math.min(100, Number(value)));
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: num };
    setEntries(next);
    setDirty(true);
  }

  function handleFillAll80() {
    setEntries(entries.map((e) => ({ ...e, dailyScore: 80, finalScore: 80 })));
    setDirty(true);
    setMessage("Semua diisi 80. Klik Simpan.");
  }

  function handleRandomControlled() {
    setEntries(
      entries.map((e) => {
        const base = 75 + Math.floor(Math.random() * 20); // 75-94
        return { ...e, dailyScore: base, finalScore: base };
      })
    );
    setDirty(true);
    setMessage("Nilai diacak terkontrol (75-94). Klik Simpan.");
  }

  function handlePasteExcel(text: string) {
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const next = [...entries];
    lines.forEach((line, i) => {
      if (i < next.length) {
        const val = Number(line.replace(/[^\d.]/g, ""));
        if (!isNaN(val) && val >= 0 && val <= 100) {
          next[i] = { ...next[i], dailyScore: val, finalScore: val };
        }
      }
    });
    setEntries(next);
    setDirty(true);
    setMessage("Nilai di-paste dari Excel. Klik Simpan.");
  }

  async function handleSave() {
    if (!year || !teacher) return;
    const roster = rosters.find((r) => r.id === selectedClassId);
    if (!roster) return;

    try {
      if (gradeBook) {
        // Update existing GradeBook
        const updated = await updateGradeBook(gradeBook.id, {
          passingScore: kktp,
          entries,
        });
        if (updated) {
          setGradeBook(updated);
          setEntries(
            updated.entries
              .slice()
              .sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0))
          );
          setDirty(false);
          setMessage("Nilai tersimpan.");
        }
      } else {
        // Create new GradeBook
        const created = await saveGradeBook({
          academicYearId: year.id,
          teacherId: teacher.id,
          classId: roster.classId,
          classLabel: roster.classLabel,
          subject: selectedSubject,
          semester,
          passingScore: kktp,
          entries,
          status: "draft",
        });
        setGradeBook(created);
        setEntries(
          created.entries
            .slice()
            .sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0))
        );
        setDirty(false);
        setMessage("Nilai tersimpan.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  // Hitung summary pakai domain helper (auto-derive status)
  const calculated = calculateGradeBookEntries(entries, kktp);
  const finalScores = calculated
    .map((e) => e.finalScore)
    .filter((s): s is number => typeof s === "number");
  const remedialCount = calculated.filter((e) => e.status === "remedial").length;
  const enrichmentCount = calculated.filter((e) => (e.finalScore ?? 0) >= 90).length;
  const classAverage =
    finalScores.length > 0
      ? Math.round((finalScores.reduce((sum, s) => sum + s, 0) / finalScores.length) * 100) / 100
      : null;
  void classAverage; // reserved for future display

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Nilai Cepat</h1>
        <p className="text-sm text-slate-500 mt-1">Administrasi ringan — bukan sistem ujian.</p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      {/* Selector */}
      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <Select label="Kelas" id="g-class" value={selectedClassId} onChange={setSelectedClassId}
            options={[{ value: "", label: "-- Pilih --" }, ...rosters.map((r) => ({ value: r.id, label: r.classLabel }))]} />
          <Select label="Mapel" id="g-subject" value={selectedSubject} onChange={setSelectedSubject}
            options={(teacher?.subjects ?? []).map((s) => ({ value: s.subject, label: s.subject }))} />
          <Select label="Semester" id="g-sem" value={String(semester)} onChange={(v) => setSemester(Number(v) as 1 | 2)}
            options={[{ value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" }]} />
          <Input label="KKTP" id="g-kktp" type="number" value={String(kktp)} onChange={(v) => { setKktp(Number(v) || 75); setDirty(true); }} />
        </div>
      </Card>

      {selectedClassId && entries.length > 0 && (
        <>
          {/* Quick actions */}
          <Card>
            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="secondary" className="text-sm" onClick={handleFillAll80}>Isi Semua 80</Button>
              <Button variant="secondary" className="text-sm" onClick={handleRandomControlled}>Acak Terkontrol</Button>
              <Button onClick={handleSave} disabled={!dirty} className="text-sm">
                {dirty ? "Simpan" : "Tersimpan"}
              </Button>
              {gradeBook && (
                <Badge variant="neutral">
                  GradeBook: {gradeBook.status}
                </Badge>
              )}
            </div>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-brand-50 rounded">
              <p className="text-lg font-bold text-brand-700">
                {calculated.filter((e) => e.finalScore !== null).length}
              </p>
              <p className="text-xs">Terisi</p>
            </div>
            <div className="p-2 bg-slate-100 rounded">
              <p className="text-lg font-bold">{entries.length}</p>
              <p className="text-xs">Total</p>
            </div>
            <div className="p-2 bg-rose-50 rounded">
              <p className="text-lg font-bold text-rose-700">{remedialCount}</p>
              <p className="text-xs">Remedial</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded">
              <p className="text-lg font-bold text-emerald-700">{enrichmentCount}</p>
              <p className="text-xs">Pengayaan</p>
            </div>
          </div>

          {/* Grade table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 px-2">No</th>
                    <th className="py-2 px-2">Nama</th>
                    <th className="py-2 px-2 w-24">Harian</th>
                    <th className="py-2 px-2 w-24">Akhir</th>
                    <th className="py-2 px-2 w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.map((e, i) => (
                    <tr key={e.studentId} className="border-b border-slate-100">
                      <td className="py-1.5 px-2">{e.studentNumber}</td>
                      <td className="py-1.5 px-2">{e.studentName}</td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                          value={e.dailyScore ?? ""}
                          onChange={(ev) => setScore(i, "dailyScore", ev.target.value)}
                          min={0} max={100}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                          value={e.finalScore ?? ""}
                          onChange={(ev) => setScore(i, "finalScore", ev.target.value)}
                          min={0} max={100}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        {e.status === "remedial" && <Badge variant="error">Remedial</Badge>}
                        {(e.finalScore ?? 0) >= 90 && e.status !== "remedial" && (
                          <Badge variant="success">Pengayaan</Badge>
                        )}
                        {e.status === "complete" && (e.finalScore ?? 0) < 90 && (
                          <Badge variant="neutral">Tuntas</Badge>
                        )}
                        {e.status === "incomplete" && (
                          <Badge variant="warning">Belum</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Paste from Excel */}
          <Card>
            <CardHeader title="Paste dari Excel/CBT" description="Tempel kolom nilai (satu angka per baris)." />
            <Textarea id="paste-grades" label="" value="" onChange={handlePasteExcel} rows={5} placeholder="85\n90\n78\n..." />
          </Card>
        </>
      )}
    </div>
  );
}

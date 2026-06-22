/**
 * PATCH-05: Nilai Cepat — administrasi ringan, bukan sistem ujian.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §5
 *
 * PATCH-FLOW-RC2C: pakai TeachingAssignment sebagai konteks utama.
 *   - Pilih assignment → otomatis dapat (classId, subject, teacherId, semester, academicYearId).
 *   - Tidak lagi pilih kelas+mapel secara terpisah.
 *   - gradeBooks difilter via findGradeBook memakai context dari assignment.
 *   - Hindari campur data antar guru/mapel/kelas.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, Textarea, EmptyState } from "../../shared/ui";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import {
  listAssignmentsByTeacher,
} from "../../shared/db/teaching-assignment-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
} from "../../shared/db/gradebook-repo";
import type {
  AcademicYear,
  TeacherProfile,
  ClassRoster,
  GradeBook,
  GradeEntry,
  TeachingAssignment,
} from "@guru-admin/domain";
import { calculateGradeBookEntries, assignmentShortLabel } from "@guru-admin/domain";

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

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      if (y && tp) {
        // Default semester dari tanggal hari ini
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const defaultSemester =
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
    if (!assignment) {
      setEntries([]);
      setGradeBook(null);
      return;
    }
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) {
      setEntries([]);
      setGradeBook(null);
      return;
    }

    // Cari GradeBook existing via context assignment
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
      setEntries(
        existing.entries
          .slice()
          .sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0))
      );
    } else {
      // Buat entries baru dari roster (in-memory only)
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
  }, [selectedAssignmentId]);

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
        const base = 75 + Math.floor(Math.random() * 20);
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
    const assignment = selectedAssignment();
    if (!assignment) return;

    try {
      if (gradeBook) {
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

  const calculated = calculateGradeBookEntries(entries, kktp);
  const remedialCount = calculated.filter((e) => e.status === "remedial").length;
  const enrichmentCount = calculated.filter((e) => (e.finalScore ?? 0) >= 90).length;
  const assignment = selectedAssignment();

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Nilai Cepat</h1>
        <p className="text-sm text-slate-500 mt-1">
          {assignment
            ? assignmentShortLabel(assignment)
            : "Pilih Data Mengajar dulu."}
        </p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      {/* Assignment selector */}
      <Card>
        <CardHeader
          title="Pilih Data Mengajar"
          description="Pilih paket mengajar. Mapel+kelas+guru otomatis terikat."
        />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Data Mengajar"
            description="Buka menu 'Data Mengajar' untuk membuat assignment dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Data Mengajar</Button>}
          />
        ) : (
          <Select
            label="Data Mengajar"
            id="g-assignment"
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
        )}
      </Card>

      {assignment && entries.length > 0 && (
        <>
          {/* KKTP + quick actions */}
          <Card>
            <div className="grid sm:grid-cols-2 gap-3 items-end">
              <Input
                label="KKTP"
                id="g-kktp"
                type="number"
                value={String(kktp)}
                onChange={(v) => { setKktp(Number(v) || 75); setDirty(true); }}
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" className="text-sm" onClick={handleFillAll80}>Isi Semua 80</Button>
                <Button variant="secondary" className="text-sm" onClick={handleRandomControlled}>Acak Terkontrol</Button>
                <Button onClick={handleSave} disabled={!dirty} className="text-sm">
                  {dirty ? "Simpan" : "Tersimpan"}
                </Button>
              </div>
            </div>
            {gradeBook && (
              <div className="mt-3">
                <Badge variant="neutral">GradeBook: {gradeBook.status}</Badge>
              </div>
            )}
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

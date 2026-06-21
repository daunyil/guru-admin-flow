import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Button, EmptyState, Badge, Input, Select } from "../../shared/ui";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { listGradeBooks, saveGradeBook, updateGradeBook } from "../../shared/db/gradebook-repo";
import type { AcademicYear, ClassRoster, GradeBook, GradeEntryStatus, SchoolProfile, TeacherProfile } from "@guru-admin/domain";
import { calculateGradeBookEntries, summarizeGradeBook } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type ScoreField = "dailyScore" | "assignmentScore" | "summativeScore" | "remedialScore";

export function GradesPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [gradeBooks, setGradeBooks] = useState<GradeBook[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [subject, setSubject] = useState("Pendidikan Pancasila");
  const [passingScore, setPassingScore] = useState("75");
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function reloadBooks(yearId: string) {
    setGradeBooks(await listGradeBooks(yearId));
  }

  useEffect(() => {
    void (async () => {
      const [year, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
      setActiveYear(year ?? null);
      setSchool(sp);
      setTeacher(tp ?? null);
      if (tp?.subjects?.[0]?.subject) setSubject(tp.subjects[0].subject);
      if (year) {
        const classRosters = await listClassRosters(year.id);
        setRosters(classRosters);
        if (classRosters.length > 0) setSelectedRosterId(classRosters[0].id);
        await reloadBooks(year.id);
      }
      setLoading(false);
    })();
  }, []);

  const selectedRoster = useMemo(() => rosters.find((roster) => roster.id === selectedRosterId) ?? null, [rosters, selectedRosterId]);

  useEffect(() => {
    if (!selectedRoster || !teacher) {
      setGradeBook(null);
      return;
    }
    const existing = gradeBooks.find((book) => book.classId === selectedRoster.classId && book.teacherId === teacher.id && book.semester === semester && book.subject === subject);
    setGradeBook(existing ?? null);
    if (existing) setPassingScore(String(existing.passingScore));
  }, [gradeBooks, selectedRoster, semester, subject, teacher]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;
  if (!activeYear || !teacher) {
    return <div className="space-y-4"><Header /><Card><EmptyState title="Profil/tahun belum lengkap" description="Lengkapi profil guru dan tahun pelajaran aktif dulu." /></Card></div>;
  }

  async function handleCreateOrOpen() {
    if (!activeYear || !teacher || !selectedRoster) return;
    const score = Number(passingScore) || 75;
    const existing = gradeBooks.find((book) => book.classId === selectedRoster.classId && book.teacherId === teacher.id && book.semester === semester && book.subject === subject);
    if (existing) {
      setGradeBook(existing);
      return;
    }
    const created = await saveGradeBook({
      academicYearId: activeYear.id,
      teacherId: teacher.id,
      classId: selectedRoster.classId,
      classLabel: selectedRoster.classLabel,
      subject,
      semester,
      passingScore: score,
      status: "draft",
      entries: selectedRoster.students.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        studentNumber: student.number,
        dailyScore: null,
        assignmentScore: null,
        summativeScore: null,
        remedialScore: null,
        averageScore: null,
        finalScore: null,
        status: "incomplete" as GradeEntryStatus,
        note: "",
      })),
    });
    setGradeBook(created);
    await reloadBooks(activeYear.id);
    setSuccess("Rekap nilai dibuat.");
  }

  async function handleSave() {
    if (!gradeBook || !activeYear) return;
    const score = Number(passingScore) || gradeBook.passingScore;
    const updated = await updateGradeBook(gradeBook.id, { subject, passingScore: score, entries: calculateGradeBookEntries(gradeBook.entries, score) });
    if (updated) {
      setGradeBook(updated);
      await reloadBooks(activeYear.id);
      setSuccess("Nilai tersimpan.");
    }
  }

  function updateScore(index: number, field: ScoreField, value: string) {
    if (!gradeBook) return;
    const nextEntries = gradeBook.entries.map((entry, i) => i === index ? { ...entry, [field]: parseScoreInput(value) } : entry);
    setGradeBook({ ...gradeBook, entries: calculateGradeBookEntries(nextEntries, Number(passingScore) || gradeBook.passingScore) });
  }

  function updateNote(index: number, note: string) {
    if (!gradeBook) return;
    setGradeBook({ ...gradeBook, entries: gradeBook.entries.map((entry, i) => i === index ? { ...entry, note } : entry) });
  }

  const summary = gradeBook ? summarizeGradeBook(gradeBook) : null;

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear.label} />
      {success && <div className="info-banner-success">{success}</div>}
      <Card>
        <CardHeader title="Pengaturan Nilai" description="Pilih kelas, semester, dan mapel." />
        {rosters.length === 0 ? <EmptyState title="Belum ada daftar siswa" description="Buka menu Siswa dan buat roster kelas dulu." /> : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-4 gap-3">
              <Select label="Kelas" id="grade-roster" value={selectedRosterId} onChange={setSelectedRosterId} options={rosters.map((roster) => ({ value: roster.id, label: roster.classLabel }))} />
              <Select label="Semester" id="grade-semester" value={String(semester)} onChange={(value) => setSemester(Number(value) as 1 | 2)} options={[{ value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" }]} />
              <Input label="Mata Pelajaran" id="grade-subject" value={subject} onChange={setSubject} />
              <Input label="KKTP/KKM" id="grade-passing" type="number" value={passingScore} onChange={setPassingScore} hint="Default 75" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleCreateOrOpen}>{gradeBook ? "Buka Rekap Nilai" : "Buat Rekap Nilai"}</Button>
              {gradeBook && <Button variant="secondary" onClick={handleSave}>Simpan Nilai</Button>}
              {gradeBook && <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>{showDocument ? "Mode Kerja" : "Mode Dokumen"}</Button>}
              {gradeBook && showDocument && <Button variant="secondary" onClick={() => window.print()}>Cetak</Button>}
            </div>
          </div>
        )}
      </Card>

      {summary && <Card><CardHeader title="Ringkasan Nilai" /><div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-sm"><Stat label="Siswa" value={summary.totalStudents} /><Stat label="Tuntas" value={summary.completeCount} color="text-brand-700" /><Stat label="Remedial" value={summary.remedialCount} color="text-amber-700" /><Stat label="Belum Lengkap" value={summary.incompleteCount} /><Stat label="Rata-rata" value={summary.classAverage ?? "-"} /></div></Card>}

      {gradeBook && !showDocument && <Card><CardHeader title={`Input Nilai — ${gradeBook.classLabel}`} description="Harian, Tugas, Sumatif, Remedial, dan catatan." /><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-slate-200 text-left"><th className="py-2 px-2">No</th><th className="py-2 px-2 min-w-40">Nama</th><th className="py-2 px-2">Harian</th><th className="py-2 px-2">Tugas</th><th className="py-2 px-2">Sumatif</th><th className="py-2 px-2">Remedial</th><th className="py-2 px-2">Akhir</th><th className="py-2 px-2">Status</th><th className="py-2 px-2 min-w-56">Catatan</th></tr></thead><tbody>{gradeBook.entries.map((entry, index) => <tr key={entry.studentId} className="border-b border-slate-100"><td className="py-2 px-2">{entry.studentNumber ?? index + 1}</td><td className="py-2 px-2 font-medium">{entry.studentName}</td><ScoreCell value={entry.dailyScore} onChange={(value) => updateScore(index, "dailyScore", value)} /><ScoreCell value={entry.assignmentScore} onChange={(value) => updateScore(index, "assignmentScore", value)} /><ScoreCell value={entry.summativeScore} onChange={(value) => updateScore(index, "summativeScore", value)} /><ScoreCell value={entry.remedialScore} onChange={(value) => updateScore(index, "remedialScore", value)} /><td className="py-2 px-2 font-semibold">{formatScore(entry.finalScore)}</td><td className="py-2 px-2"><StatusBadge status={entry.status} /></td><td className="py-2 px-2"><input value={entry.note ?? ""} onChange={(event) => updateNote(index, event.target.value)} className="input text-xs py-1" placeholder="Catatan..." /></td></tr>)}</tbody></table></div><div className="mt-4 flex gap-2 flex-wrap"><Button onClick={handleSave}>Simpan Nilai</Button><Button variant="secondary" onClick={() => setShowDocument(true)}>Mode Dokumen</Button></div></Card>}

      {gradeBook && showDocument && <GradeDocument gradeBook={gradeBook} school={school} teacher={teacher} academicYear={activeYear} onBack={() => setShowDocument(false)} />}
    </div>
  );
}

function Header({ yearLabel }: { yearLabel?: string }) {
  return <div className="page-header"><h1>Nilai Ringan</h1><p>{yearLabel ? `Tahun pelajaran: ${yearLabel}` : "Input nilai harian, tugas, sumatif, dan remedial."}</p></div>;
}

function ScoreCell({ value, onChange }: { value: number | null | undefined; onChange: (value: string) => void }) {
  return <td className="py-2 px-2"><input type="number" min="0" max="100" value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="input w-20 text-xs py-1" /></td>;
}

function GradeDocument({ gradeBook, school, teacher, academicYear, onBack }: { gradeBook: GradeBook; school?: SchoolProfile; teacher: TeacherProfile; academicYear: AcademicYear; onBack: () => void }) {
  const summary = summarizeGradeBook(gradeBook);
  return <Card><div className="print-area"><div className="document-page document-landscape"><div className="document-title">REKAP NILAI SISWA</div><div className="document-subtitle">{school?.name ?? "Sekolah"}</div><div className="document-subtitle">Tahun Pelajaran {academicYear.label}</div><table className="document-identity"><tbody><tr><td>Mata Pelajaran</td><td>{gradeBook.subject}</td><td>Kelas</td><td>{gradeBook.classLabel}</td></tr><tr><td>Guru</td><td>{teacher.name}</td><td>Semester</td><td>{gradeBook.semester === 1 ? "Ganjil" : "Genap"}</td></tr><tr><td>KKTP/KKM</td><td>{gradeBook.passingScore}</td><td>Status</td><td>{gradeBook.status}</td></tr></tbody></table><table className="document-table"><thead><tr><th style={{ width: "5%" }}>No</th><th>Nama Siswa</th><th>Harian</th><th>Tugas</th><th>Sumatif</th><th>Remedial</th><th>Rata-rata</th><th>Nilai Akhir</th><th>Status</th><th>Catatan</th></tr></thead><tbody>{gradeBook.entries.map((entry, index) => <tr key={entry.studentId}><td className="text-center">{entry.studentNumber ?? index + 1}</td><td>{entry.studentName}</td><td className="text-center">{formatScore(entry.dailyScore)}</td><td className="text-center">{formatScore(entry.assignmentScore)}</td><td className="text-center">{formatScore(entry.summativeScore)}</td><td className="text-center">{formatScore(entry.remedialScore)}</td><td className="text-center">{formatScore(entry.averageScore)}</td><td className="text-center">{formatScore(entry.finalScore)}</td><td className="text-center">{statusLabel(entry.status)}</td><td>{entry.note || "-"}</td></tr>)}</tbody><tfoot><tr><td colSpan={2}>RINGKASAN</td><td colSpan={2}>Tuntas: {summary.completeCount}</td><td colSpan={2}>Remedial: {summary.remedialCount}</td><td colSpan={2}>Belum lengkap: {summary.incompleteCount}</td><td colSpan={2}>Rata-rata kelas: {summary.classAverage ?? "-"}</td></tr></tfoot></table><div className="signature-grid"><div><p>Mengetahui,</p><p>Kepala Sekolah</p><div className="sig-space" /><p className="sig-name">{school?.headmasterName ?? "(...........................)"}</p><p>NIP. {school?.headmasterNip ?? "....................."}</p></div><div><p>{school?.regency ?? "..........."}, {formatLongDateID(todayISODate())}</p><p>Guru Mata Pelajaran</p><div className="sig-space" /><p className="sig-name">{teacher.name}</p><p>NIP. {teacher.nip ?? "....................."}</p></div></div></div></div><div className="print-toolbar"><Button variant="secondary" onClick={onBack}>Mode Kerja</Button><Button onClick={() => window.print()}>Cetak</Button></div></Card>;
}

function Stat({ label, value, color = "" }: { label: string; value: number | string; color?: string }) {
  return <div className="p-2 bg-slate-50 rounded"><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-slate-500">{label}</p></div>;
}

function StatusBadge({ status }: { status: GradeEntryStatus }) {
  const variant = status === "complete" ? "success" : status === "remedial" ? "warning" : "neutral";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

function statusLabel(status: GradeEntryStatus): string {
  if (status === "complete") return "Tuntas";
  if (status === "remedial") return "Remedial";
  return "Belum lengkap";
}

function parseScoreInput(value: string): number | null {
  if (value.trim() === "") return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.max(0, Math.min(100, numberValue));
}

function formatScore(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

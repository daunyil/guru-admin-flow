import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession, listLessonSessions } from "../../shared/db/lesson-session-repo";
import { getAttendanceBySession, saveDefaultAttendance, updateAttendance } from "../../shared/db/attendance-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { db } from "../../shared/db/schema";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { generateDefaultAttendance, summarizeAttendance } from "@guru-admin/domain";
import type { AcademicYear, AttendanceRecord, ClassRoster, LessonSession, TeachingAssignment, TeacherProfile } from "@guru-admin/domain";
import { formatLongDateID, nowTimestamp, todayISODate } from "@guru-admin/shared";

type Status = "present" | "sick" | "excused" | "absent";
type Mode = "jadwal" | "susulan";
type SaveInfo = { sessionId: string; subject: string; classLabel: string; date: string; summary: ReturnType<typeof summarizeAttendance> };
const statusButtons: Array<{ value: Status; short: string; active: string }> = [
  { value: "present", short: "H", active: "bg-brand-600 text-white" },
  { value: "sick", short: "S", active: "bg-amber-500 text-white" },
  { value: "excused", short: "I", active: "bg-slate-500 text-white" },
  { value: "absent", short: "A", active: "bg-rose-600 text-white" },
];

export function QuickAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [mode, setMode] = useState<Mode>("jadwal");
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [allSessions, setAllSessions] = useState<LessonSession[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveInfo | null>(null);
  const [searchParams] = useSearchParams();
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void init(); }, []);
  useEffect(() => { void loadTodaySessions(); }, [date, teacher?.id]);
  useEffect(() => { void loadSusulan(); }, [assignmentId, year?.id]);
  useEffect(() => { if (selectedSessionId) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [selectedSessionId]);

  async function init() {
    const [activeYear, profile] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
    setYear(activeYear ?? null); setTeacher(profile);
    if (activeYear && profile) {
      const today = todayISODate();
      const sem: 1 | 2 = activeYear.semester2Start <= today && today <= activeYear.semester2End ? 2 : 1;
      const list = await listAssignmentsByTeacher(profile.id, activeYear.id, sem);
      setAssignments(list); if (list[0]) setAssignmentId(list[0].id);
    }
    const sid = searchParams.get("sessionId");
    if (sid) setSelectedSessionId(sid);
    if (searchParams.get("mode") === "susulan") setMode("susulan");
    setLoading(false);
  }
  async function loadTodaySessions() { if (teacher) setSessions(await getLessonSessionsByDate(teacher.id, date)); }
  function assignment() { return assignments.find((a) => a.id === assignmentId); }
  async function loadSusulan() {
    if (!year || !assignment()) { setAllSessions([]); setAllRecords([]); return; }
    const a = assignment(); if (!a) return;
    const sess = (await listLessonSessions(year.id, a.semester)).filter((s) => !s.deletedAt && s.classId === a.classId && s.subject === a.subject && s.teacherId === a.teacherId).sort((x, y) => x.date.localeCompare(y.date) || x.startPeriod - y.startPeriod);
    setAllSessions(sess);
    const ids = new Set(sess.map((s) => s.id));
    const rows = await db.attendanceRecords.where("classId").equals(a.classId).toArray();
    setAllRecords(rows.filter((r) => !r.deletedAt && ids.has(r.sessionId)) as AttendanceRecord[]);
  }
  async function afterSave(info: SaveInfo) { setNotice("Absensi tersimpan."); setSaved(info); await loadTodaySessions(); await loadSusulan(); }
  function closeSaved() { setSaved(null); if (mode === "susulan") setSelectedSessionId(null); }
  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;
  const doneIds = new Set(allRecords.map((r) => r.sessionId));

  return <div className="space-y-4">
    <div className="page-header"><h1 className="text-2xl font-bold text-slate-900">Absensi Cepat</h1><p className="text-sm text-slate-500 mt-1">{year ? `TP ${year.label}` : "Belum ada tahun aktif"}</p></div>
    {notice && <div className="info-banner-success">{notice}</div>}
    <Card><div className="flex gap-2 flex-wrap"><Button variant={mode === "jadwal" ? "primary" : "secondary"} onClick={() => { setMode("jadwal"); setSelectedSessionId(null); }}>Absen Reguler</Button><Button variant={mode === "susulan" ? "primary" : "secondary"} onClick={() => { setMode("susulan"); setSelectedSessionId(null); }}>Absen Susulan</Button></div></Card>
    {mode === "jadwal" && <><Card><Input label="Tanggal" id="att-date" type="date" value={date} onChange={setDate} /></Card><Card><CardHeader title="Absen Reguler" description={`${sessions.length} sesi`} />{sessions.length === 0 ? <EmptyState title="Tidak ada sesi" description="Pilih tanggal lain atau buka Absen Susulan." /> : <div className="space-y-2">{sessions.map((s) => <button key={s.id} onClick={() => { setSelectedSessionId(s.id); setSaved(null); }} className={`w-full text-left p-3 border rounded-md ${selectedSessionId === s.id ? "border-brand-400 bg-brand-50" : "border-slate-200"}`}><b>{s.subject}</b> <Badge variant="neutral">{s.classLabel}</Badge><div className="text-xs text-slate-500">{s.startTime}-{s.endTime}</div></button>)}</div>}</Card></>}
    {mode === "susulan" && <><Card><CardHeader title="Absen Susulan" description="Hijau = sudah diisi, merah = belum diisi." />{assignments.length === 0 ? <EmptyState title="Belum ada Kelas dan Mapel" description="Buat assignment dulu." /> : <Select label="Kelas dan Mapel" id="susulan-asg" value={assignmentId} onChange={(v) => { setAssignmentId(v); setSelectedSessionId(null); }} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject}` }))]} />}</Card><Card><CardHeader title="Daftar Semua Pertemuan" description={`${allSessions.filter((s) => doneIds.has(s.id)).length} hijau · ${allSessions.filter((s) => !doneIds.has(s.id)).length} merah`} />{allSessions.length === 0 ? <EmptyState title="Belum ada pertemuan" description="Generate sesi dari menu Jadwal dulu." /> : <div className="space-y-2">{allSessions.map((s, i) => { const done = doneIds.has(s.id); return <button key={s.id} onClick={() => { setSelectedSessionId(s.id); setSaved(null); }} className={`w-full text-left p-3 border rounded-xl ${selectedSessionId === s.id ? "border-brand-500 bg-brand-50" : done ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}><div className="flex justify-between gap-3"><span>Pertemuan {i + 1} · {formatLongDateID(s.date)}</span><Badge variant={done ? "success" : "error"}>{done ? "Sudah diisi" : "Belum diisi"}</Badge></div></button>; })}</div>}</Card></>}
    {selectedSessionId && <div ref={editorRef}><AttendanceEditor sessionId={selectedSessionId} date={date} year={year} onSaved={afterSave} onError={setNotice} /></div>}
    {saved && <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 no-print"><div className="mx-auto max-w-xl rounded-2xl border bg-white shadow-2xl p-4"><p className="font-bold text-emerald-700">Absensi tersimpan</p><p className="text-sm text-slate-600">{saved.subject} - {saved.classLabel} · {formatLongDateID(saved.date)}</p><p className="text-xs text-slate-500">H: {saved.summary.present} · S: {saved.summary.sick} · I: {saved.summary.excused} · A: {saved.summary.absent}</p><div className="grid grid-cols-2 gap-2 mt-4"><Button onClick={() => { window.location.hash = `#/journal?sessionId=${saved.sessionId}`; }}>Lanjut Isi Jurnal</Button><Button variant="secondary" onClick={closeSaved}>Tutup</Button></div></div></div>}
  </div>;
}

function AttendanceEditor({ sessionId, date, year, onSaved, onError }: { sessionId: string; date: string; year: AcademicYear | null; onSaved: (info: SaveInfo) => void | Promise<void>; onError: (msg: string) => void; }) {
  const [loading, setLoading] = useState(true); const [session, setSession] = useState<LessonSession | null>(null); const [roster, setRoster] = useState<ClassRoster | null>(null); const [records, setRecords] = useState<AttendanceRecord[]>([]); const [changes, setChanges] = useState<Map<string, Status>>(new Map()); const [isNew, setIsNew] = useState(false);
  useEffect(() => { void (async () => { const s = await getLessonSession(sessionId); if (!s) { onError("Sesi tidak ditemukan"); setLoading(false); return; } setSession(s); const r = year ? await findClassRoster(year.id, s.classId) : null; setRoster(r ?? null); const existing = await getAttendanceBySession(s.id); if (existing.length > 0) setRecords(existing); else if (r) { setRecords(generateDefaultAttendance({ roster: r, sessionId: s.id, date: s.date })); setIsNew(true); } setLoading(false); })(); }, [sessionId]);
  function eff(r: AttendanceRecord): Status { return changes.get(r.studentId) ?? (r.status as Status); }
  async function save() { if (!session) return; const next = isNew ? records.map((r) => changes.has(r.studentId) ? { ...r, status: changes.get(r.studentId) as AttendanceRecord["status"], updatedAt: nowTimestamp() } : r) : (changes.size ? await updateAttendance(session.id, Array.from(changes.entries()).map(([studentId, status]) => ({ studentId, status: status as AttendanceRecord["status"] }))) : records); if (isNew) { await saveDefaultAttendance(next); setIsNew(false); } setRecords(next); setChanges(new Map()); await onSaved({ sessionId: session.id, subject: session.subject, classLabel: session.classLabel, date: session.date, summary: summarizeAttendance(next) }); }
  if (loading) return <p className="text-sm text-slate-500">Memuat absensi...</p>; if (!roster) return <Card><EmptyState title="Belum ada daftar siswa" description="Buat roster kelas dulu." /></Card>;
  const summary = summarizeAttendance(records.map((r) => ({ ...r, status: eff(r) })));
  return <Card><CardHeader title={`Absensi - ${roster.classLabel}`} description={`${session?.subject ?? "Mapel"} · ${formatLongDateID(session?.date ?? date)}`} /><div className="grid grid-cols-4 gap-2 mb-4 text-center"><div className="p-2 bg-brand-50 rounded">H {summary.present}</div><div className="p-2 bg-amber-50 rounded">S {summary.sick}</div><div className="p-2 bg-slate-100 rounded">I {summary.excused}</div><div className="p-2 bg-rose-50 rounded">A {summary.absent}</div></div><div className="space-y-2 max-h-96 overflow-y-auto">{records.map((r) => <div key={r.id} className="p-2 border rounded-md flex items-center justify-between gap-2"><span className="text-sm font-medium truncate">{r.studentName}</span><div className="flex gap-1">{statusButtons.map((s) => <button key={s.value} onClick={() => { const m = new Map(changes); m.set(r.studentId, s.value); setChanges(m); }} className={`px-3 py-1.5 text-xs rounded-md font-bold ${eff(r) === s.value ? s.active : "bg-slate-100"}`}>{s.short}</button>)}</div></div>)}</div><div className="sticky bottom-0 mt-4 pt-3 bg-white border-t"><Button onClick={save} className="w-full">Simpan Absensi</Button></div></Card>;
}

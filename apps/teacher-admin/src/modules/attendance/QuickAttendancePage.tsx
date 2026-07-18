/**
 * UX-STABILITY-FIXPACK-01: Absensi Cepat — kartu pilihan + tombol eksplisit.
 *
 * Perubahan dari versi sebelumnya:
 *   - Pertemuan = kartu (bukan button clickable), dengan tombol "Isi Absensi"
 *   - Klik tombol → editor muncul di bawah kartu (dengan highlight)
 *   - Auto-scroll tetap ada, tapi hanya setelah user klik tombol (tidak kaget)
 *   - Simpan lokal tetap aman (Dexie first, Supabase best-effort)
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge, PrintExportButtons } from "../../shared/ui";
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
  // MV-POLISH-FIXPACK-02 P2: badge "Sudah diisi" di mode reguler dihitung dari records sesi hari itu,
  // bukan dari allRecords (yang berasal dari load susulan berdasarkan assignment terpilih).
  const [todayDoneIds, setTodayDoneIds] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void init(); }, []);
  useEffect(() => { void loadTodaySessions(); }, [date, teacher?.id]);
  useEffect(() => { void loadSusulan(); }, [assignmentId, year?.id]);
  useEffect(() => {
    if (!selectedSessionId) return;
    const t = setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    return () => clearTimeout(t);
  }, [selectedSessionId]);

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
  async function loadTodaySessions() {
    if (!teacher) return;
    const todaySessions = await getLessonSessionsByDate(teacher.id, date);
    setSessions(todaySessions);
    // MV-POLISH-FIXPACK-02 P2: load doneIds dari records sesi hari itu (bukan allRecords susulan)
    const doneSet = new Set<string>();
    for (const s of todaySessions) {
      const records = await getAttendanceBySession(s.id);
      if (records.length > 0) doneSet.add(s.id);
    }
    setTodayDoneIds(doneSet);
  }
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
  function handlePickSession(sid: string) { setSelectedSessionId(sid); setSaved(null); }
  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;
  const doneIds = new Set(allRecords.map((r) => r.sessionId));

  return <div className="space-y-4">
    <div className="page-header">
      <h1 className="text-2xl font-bold text-slate-900">Absensi Cepat</h1>
      <p className="text-sm text-slate-500 mt-1">{year ? `TP ${year.label}` : "Belum ada tahun aktif"}</p>
    </div>
    {notice && <div className="info-banner-success">{notice}</div>}

    {/* Mode selector */}
    <Card>
      <div className="flex gap-2 flex-wrap">
        <Button variant={mode === "jadwal" ? "primary" : "secondary"} onClick={() => { setMode("jadwal"); setSelectedSessionId(null); }}>Absen Reguler</Button>
        <Button variant={mode === "susulan" ? "primary" : "secondary"} onClick={() => { setMode("susulan"); setSelectedSessionId(null); }}>Absen Susulan</Button>
      </div>
    </Card>

    {/* Mode: Jadwal (absen hari ini berdasarkan tanggal) */}
    {mode === "jadwal" && (
      <>
        <Card><Input label="Tanggal" id="att-date" type="date" value={date} onChange={setDate} /></Card>
        <Card>
          <CardHeader title="Absen Reguler" description={`${sessions.length} sesi hari ini`} />
          {sessions.length === 0 ? (
            <EmptyState title="Tidak ada sesi" description="Pilih tanggal lain atau buka Absen Susulan." />
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const isActive = selectedSessionId === s.id;
                const done = todayDoneIds.has(s.id); // MV-POLISH-FIXPACK-02: dari sesi hari ini
                return (
                  <div key={s.id} className={`p-3 border rounded-lg transition-all ${isActive ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : done ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{s.subject}</span>
                          <Badge variant="neutral">{s.classLabel}</Badge>
                          {done && <Badge variant="success">Sudah diisi</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{s.startTime}–{s.endTime} · Jam {s.startPeriod}</p>
                      </div>
                      <div className="shrink-0">
                        {isActive ? (
                          <Badge variant="success">Sedang diisi</Badge>
                        ) : (
                          <Button
                            variant={done ? "secondary" : "primary"}
                            className="text-xs px-3 py-1.5"
                            onClick={() => handlePickSession(s.id)}
                          >
                            Isi Absensi
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </>
    )}

    {/* Mode: Susulan (absen semua pertemuan, hijau/merah) */}
    {mode === "susulan" && (
      <>
        <Card>
          <CardHeader title="Absen Susulan" description="Hijau = sudah diisi, merah = belum diisi." />
          {assignments.length === 0 ? (
            <EmptyState title="Belum ada Kelas dan Mapel" description="Buat assignment dulu di menu Kelas dan Mapel." />
          ) : (
            <Select label="Kelas dan Mapel" id="susulan-asg" value={assignmentId} onChange={(v) => { setAssignmentId(v); setSelectedSessionId(null); }} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject}` }))]} />
          )}
        </Card>
        {assignmentId && (
          <Card>
            <CardHeader title="Daftar Semua Pertemuan" description={`${allSessions.filter((s) => doneIds.has(s.id)).length} sudah diisi · ${allSessions.filter((s) => !doneIds.has(s.id)).length} belum`} />
            {allSessions.length === 0 ? (
              <EmptyState title="Belum ada pertemuan" description="Generate sesi dari menu Jadwal dulu." />
            ) : (
              <div className="space-y-2">
                {allSessions.map((s, i) => {
                  const done = doneIds.has(s.id);
                  const isActive = selectedSessionId === s.id;
                  return (
                    <div key={s.id} className={`p-3 border rounded-lg transition-all ${isActive ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : done ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">Pertemuan {i + 1}</span>
                            <span className="text-xs text-slate-500">· {formatLongDateID(s.date)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{s.subject} · {s.classLabel} · {s.startTime}–{s.endTime}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isActive ? (
                            <Badge variant="success">Sedang diisi</Badge>
                          ) : (
                            <>
                              <Badge variant={done ? "success" : "error"}>{done ? "Sudah diisi" : "Belum diisi"}</Badge>
                              <Button
                                variant={done ? "secondary" : "primary"}
                                className="text-xs px-3 py-1.5"
                                onClick={() => handlePickSession(s.id)}
                              >
                                {done ? "Ubah" : "Isi Absensi"}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </>
    )}

    {/* PRINT-EXPORT-COMPLETE-01: Cetak Rekap Absensi (mode susulan) */}
    {mode === "susulan" && assignmentId && allSessions.length > 0 && (
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-700">Cetak Rekap Absensi</h3>
          <PrintExportButtons
            filename={`rekap-absensi-${assignment()?.classLabel ?? ""}-${assignment()?.subject ?? ""}`}
            title="Rekap Absensi"
            orientation="portrait"
            targetId="print-attendance"
          />
        </div>
      </Card>
    )}

    {/* Print-area untuk rekap absensi */}
    {mode === "susulan" && assignmentId && allSessions.length > 0 && (
      <div className="print-area hidden print:block" id="print-attendance">
        <div className="document-page document-portrait">
          <div className="document-title">REKAP ABSENSI</div>
          <div className="document-subtitle">{year?.label ?? ""} — Semester {assignment()?.semester === 1 ? "Ganjil" : "Genap"}</div>
          <table className="document-identity">
            <tbody>
              <tr><td>Kelas</td><td>{assignment()?.classLabel ?? "-"}</td><td>Mapel</td><td>{assignment()?.subject ?? "-"}</td></tr>
              <tr><td>Guru</td><td>{assignment()?.teacherName ?? "-"}</td><td>Total Pertemuan</td><td>{allSessions.length}</td></tr>
            </tbody>
          </table>
          <table className="document-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>No</th>
                <th style={{ width: "15%" }}>Tanggal</th>
                <th>Mapel</th>
                <th>Kelas</th>
                <th style={{ width: "10%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allSessions.map((s, i) => (
                <tr key={s.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{formatLongDateID(s.date)}</td>
                  <td>{s.subject}</td>
                  <td>{s.classLabel}</td>
                  <td className="text-center">{doneIds.has(s.id) ? "Sudah diisi" : "Belum diisi"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Editor — muncul setelah user pilih pertemuan */}
    {selectedSessionId && (
      <div ref={editorRef}>
        <AttendanceEditor sessionId={selectedSessionId} date={date} year={year} onSaved={afterSave} onError={setNotice} />
      </div>
    )}

    {/* Toast saved */}
    {saved && (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 no-print">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white shadow-2xl p-4">
          <p className="font-bold text-emerald-700">Absensi tersimpan</p>
          <p className="text-sm text-slate-600">{saved.subject} - {saved.classLabel} · {formatLongDateID(saved.date)}</p>
          <p className="text-xs text-slate-500">H: {saved.summary.present} · S: {saved.summary.sick} · I: {saved.summary.excused} · A: {saved.summary.absent}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button onClick={() => { window.location.hash = `#/journal?sessionId=${saved.sessionId}`; }}>Lanjut Isi Jurnal</Button>
            <Button variant="secondary" onClick={closeSaved}>Tutup</Button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

/* ------------------------------------------------------------------ */
/*  Attendance Editor                                                   */
/* ------------------------------------------------------------------ */

function AttendanceEditor({ sessionId, date, year, onSaved, onError }: { sessionId: string; date: string; year: AcademicYear | null; onSaved: (info: SaveInfo) => void | Promise<void>; onError: (msg: string) => void; }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, Status>>(new Map());
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    void (async () => {
      const s = await getLessonSession(sessionId);
      if (!s) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(s);
      const r = year ? await findClassRoster(year.id, s.classId) : null;
      setRoster(r ?? null);
      const existing = await getAttendanceBySession(s.id);
      if (existing.length > 0) setRecords(existing);
      else if (r) { setRecords(generateDefaultAttendance({ roster: r, sessionId: s.id, date: s.date })); setIsNew(true); }
      setLoading(false);
    })();
  }, [sessionId]);

  function eff(r: AttendanceRecord): Status { return changes.get(r.studentId) ?? (r.status as Status); }

  async function save() {
    if (!session) return;
    try {
      const next = isNew
        ? records.map((r) => changes.has(r.studentId) ? { ...r, status: changes.get(r.studentId) as AttendanceRecord["status"], updatedAt: nowTimestamp() } : r)
        : (changes.size
          ? await updateAttendance(session.id, Array.from(changes.entries()).map(([studentId, status]) => ({ studentId, status: status as AttendanceRecord["status"] })))
          : records);
      if (isNew) { await saveDefaultAttendance(next); setIsNew(false); }
      setRecords(next); setChanges(new Map());
      await onSaved({ sessionId: session.id, subject: session.subject, classLabel: session.classLabel, date: session.date, summary: summarizeAttendance(next) });
    } catch (e) {
      // RELEASE-FIXPACK-P1-P2-01: jangan biarkan UI stuck bila DB gagal
      onError(e instanceof Error ? e.message : "Gagal menyimpan absensi. Coba lagi.");
    }
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Memuat absensi...</p></Card>;
  if (!roster) return <Card><EmptyState title="Belum ada daftar siswa" description="Buat roster kelas dulu di menu Siswa." /></Card>;

  const summary = summarizeAttendance(records.map((r) => ({ ...r, status: eff(r) })));

  return (
    <Card>
      <CardHeader title={`Absensi — ${roster.classLabel}`} description={`${session?.subject ?? "Mapel"} · ${formatLongDateID(session?.date ?? date)}`} />
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="p-2 bg-brand-50 rounded"><span className="font-bold text-brand-700">H {summary.present}</span></div>
        <div className="p-2 bg-amber-50 rounded"><span className="font-bold text-amber-700">S {summary.sick}</span></div>
        <div className="p-2 bg-slate-100 rounded"><span className="font-bold text-slate-600">I {summary.excused}</span></div>
        <div className="p-2 bg-rose-50 rounded"><span className="font-bold text-rose-700">A {summary.absent}</span></div>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {records.map((r) => (
          <div key={r.id} className="p-2 border rounded-md flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{r.studentNumber ?? ""}. {r.studentName}</span>
            <div className="flex gap-1">
              {statusButtons.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { const m = new Map(changes); m.set(r.studentId, s.value); setChanges(m); }}
                  className={`px-3 py-1.5 text-xs rounded-md font-bold ${eff(r) === s.value ? s.active : "bg-slate-100"}`}
                >
                  {s.short}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 mt-4 pt-3 bg-white border-t">
        <Button onClick={save} className="w-full">Simpan Absensi</Button>
      </div>
    </Card>
  );
}

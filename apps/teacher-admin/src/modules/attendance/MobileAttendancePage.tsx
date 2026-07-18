import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Button, EmptyState, Badge } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession } from "../../shared/db/lesson-session-repo";
import { initAttendanceForSession, updateAttendance } from "../../shared/db/attendance-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { summarizeAttendance } from "@guru-admin/domain";
import type { AcademicYear, AttendanceRecord, ClassRoster, LessonSession } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type Status = AttendanceRecord["status"];

const STATUS_OPTIONS: Array<{ value: Status; short: string; label: string }> = [
  { value: "present", short: "H", label: "Hadir" },
  { value: "sick", short: "S", label: "Sakit" },
  { value: "excused", short: "I", label: "Izin" },
  { value: "late", short: "T", label: "Terlambat" },
  { value: "absent", short: "A", label: "Alpa" },
];

export function MobileAttendancePage() {
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  async function loadSessions(targetDate = date) {
    const teacher = await getTeacherProfile();
    if (!teacher) return;
    setSessions(await getLessonSessionsByDate(teacher.id, targetDate));
  }

  useEffect(() => {
    void (async () => {
      const activeYear = await getActiveAcademicYear();
      setYear(activeYear ?? null);
      await loadSessions();
      const sid = searchParams.get("sessionId");
      if (sid) setSelectedSessionId(sid);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { void loadSessions(date); }, [date]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;
  if (!year) return <Card><EmptyState title="Belum ada tahun pelajaran aktif" /></Card>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1>Absensi HP</h1>
        <p>Format cepat H/S/I/T/A seperti aplikasi SIAKAD.</p>
      </div>
      {message && <div className="info-banner-success">{message}</div>}
      <Card>
        <CardHeader title="Tanggal" description="Pilih tanggal absensi." />
        <Input label="" id="attendance-date" type="date" value={date} onChange={setDate} />
      </Card>
      <Card>
        <CardHeader title="Sesi Mengajar" description={`${sessions.length} sesi`} />
        {sessions.length === 0 ? <EmptyState title="Tidak ada sesi" description="Buat sesi dari menu Jadwal." /> : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button key={session.id} onClick={() => setSelectedSessionId(session.id)} className={`w-full p-4 text-left rounded-2xl border ${selectedSessionId === session.id ? "border-brand-400 bg-brand-50" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black">{session.classLabel} · {session.subject}</div>
                    <div className="text-xs text-slate-500 font-semibold">{session.startTime}–{session.endTime}</div>
                  </div>
                  <Badge variant="neutral">Pilih</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
      {selectedSessionId && <MobileAttendanceEditor sessionId={selectedSessionId} academicYearId={year.id} onSaved={() => setMessage("Absensi tersimpan.")} />}
    </div>
  );
}

function MobileAttendanceEditor({ sessionId, academicYearId, onSaved }: { sessionId: string; academicYearId: string; onSaved: () => void }) {
  const [session, setSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, Status>>(new Map());
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) return;
      setSession(sess);
      const r = await findClassRoster(academicYearId, sess.classId);
      setRoster(r ?? null);
      setRecords(await initAttendanceForSession({ sessionId: sess.id, date: sess.date, roster: r ?? null }));
    })();
  }, [sessionId, academicYearId]);

  function effectiveStatus(record: AttendanceRecord): Status {
    return changes.get(record.studentId) ?? record.status;
  }

  function updateLocal(studentId: string, status: Status) {
    const next = new Map(changes);
    next.set(studentId, status);
    setChanges(next);
  }

  async function save() {
    const payload = Array.from(changes.entries()).map(([studentId, status]) => ({ studentId, status }));
    const updated = await updateAttendance(sessionId, payload);
    setRecords(updated);
    setChanges(new Map());
    onSaved();
  }

  if (!session) return <p className="text-sm text-slate-500">Memuat daftar siswa...</p>;
  if (!roster || records.length === 0) return <Card><EmptyState title="Belum ada daftar siswa" description={`Buat daftar siswa untuk ${session.classLabel}.`} /></Card>;

  const effectiveRecords = records.map((record) => ({ ...record, status: effectiveStatus(record) }));
  const summary = summarizeAttendance(effectiveRecords);
  const visibleRecords = query.trim()
    ? effectiveRecords.filter((record) => record.studentName.toLowerCase().includes(query.trim().toLowerCase()))
    : effectiveRecords;

  return (
    <Card>
      <CardHeader title={`${session.classLabel} · ${session.subject}`} description={formatLongDateID(session.date)} />
      <div className="grid grid-cols-5 gap-2 mb-4 text-center">
        <SmallStat label="H" value={summary.present} />
        <SmallStat label="S" value={summary.sick} />
        <SmallStat label="I" value={summary.excused} />
        <SmallStat label="T" value={summary.late} />
        <SmallStat label="A" value={summary.absent} />
      </div>
      <div className="sticky top-24 z-10 mb-3 no-print">
        <Input label="" id="att-search" value={query} onChange={setQuery} placeholder="Cari nama siswa..." />
      </div>
      <div className="space-y-2">
        {visibleRecords.map((record) => {
          const status = effectiveStatus(record);
          return (
            <div key={record.id} className="siakad-student-row">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400">{record.studentNumber ?? "-"}</div>
                <div className="text-xs font-black uppercase truncate">{record.studentName}</div>
              </div>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map((item) => (
                  <button key={item.value} onClick={() => updateLocal(record.studentId, item.value)} className={`abs-status-btn ${status === item.value ? `active-${item.value}` : ""}`} title={item.label}>{item.short}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-24 md:static mt-4 no-print">
        <Button onClick={save} disabled={changes.size === 0}>Simpan {changes.size > 0 ? `(${changes.size})` : ""}</Button>
      </div>
    </Card>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-slate-50 p-2"><div className="text-xl font-black text-slate-900">{value}</div><div className="text-[9px] font-extrabold text-slate-500">{label}</div></div>;
}

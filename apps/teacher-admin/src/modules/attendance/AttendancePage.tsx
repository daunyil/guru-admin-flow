/**
 * Modul M06 Absensi HP — halaman /attendance
 * Sumber: docs/PROJECT_CONTRACT.md §8.2
 *
 * Filosofi:
 *   - Default semua hadir
 *   - Guru hanya ubah yang sakit/izin/alpa/terlambat
 *   - Mobile-first untuk input cepat
 *   - Mode Dokumen untuk preview/cetak (format Excel-like)
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Button, EmptyState, Badge } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession } from "../../shared/db/lesson-session-repo";
import { initAttendanceForSession, updateAttendance } from "../../shared/db/attendance-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import type { LessonSession, AttendanceRecord, ClassRoster, AcademicYear } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { summarizeAttendance } from "@guru-admin/domain";

type Status = AttendanceRecord["status"];
const STATUSES: Array<{ value: Status; label: string; short: string; color: string }> = [
  { value: "present", label: "Hadir", short: "H", color: "success" },
  { value: "sick", label: "Sakit", short: "S", color: "warning" },
  { value: "excused", label: "Izin", short: "I", color: "neutral" },
  { value: "late", label: "Terlambat", short: "T", color: "warning" },
  { value: "absent", label: "Alpa", short: "A", color: "error" },
];

export function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  async function reloadSessions() {
    const teacher = await getTeacherProfile();
    if (!teacher) return;
    const sess = await getLessonSessionsByDate(teacher.id, selectedDate);
    setSessions(sess);
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      setActiveYear(year ?? null);
      await reloadSessions();
      // Bila ada sessionId di URL, langsung pilih sesi itu
      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) setSelectedSessionId(urlSessionId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    void reloadSessions();
  }, [selectedDate]);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYear) {
    return (
      <div className="space-y-4">
        <Header />
        <Card><EmptyState title="Belum ada tahun pelajaran aktif" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header dateLabel={formatLongDateID(selectedDate)} sessionCount={sessions.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <Card>
        <CardHeader title="Pilih Tanggal" />
        <Input label="" id="att-date" type="date" value={selectedDate} onChange={setSelectedDate} />
      </Card>

      <Card>
        <CardHeader
          title={`Sesi Mengajar — ${formatLongDateID(selectedDate)}`}
          description={`${sessions.length} sesi`}
        />
        {sessions.length === 0 ? (
          <EmptyState
            title="Tidak ada sesi mengajar"
            description="Bisa jadi hari libur, atau jadwal belum di-generate. Buka menu Jadwal untuk generate sesi."
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left p-3 border rounded-md ${
                  selectedSessionId === s.id ? "border-brand-400 bg-brand-50" : "border-slate-200"
                } ${s.status === "cancelled" ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{s.startTime}–{s.endTime}</span>
                    <span className="text-sm text-slate-700 ml-2">{s.subject}</span>
                    <Badge variant="neutral">{s.classLabel}</Badge>
                  </div>
                  <Badge variant={s.status === "planned" ? "success" : "error"}>
                    {s.status === "planned" ? "Planned" : "Cancelled"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selectedSessionId && (
        <AttendanceEditor
          sessionId={selectedSessionId}
          academicYearId={activeYear.id}
          onSaved={() => setSuccess("Absensi tersimpan.")}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}

function Header({ dateLabel, sessionCount }: { dateLabel?: string; sessionCount?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Absensi Cepat</h1>
      <p className="text-sm text-slate-500 mt-1">
        {dateLabel ? `${dateLabel} · ${sessionCount ?? 0} sesi` : "Default semua hadir, ubah yang tidak hadir."}
      </p>
    </div>
  );
}

function AttendanceEditor({
  sessionId,
  academicYearId,
  onSaved,
  onError,
}: {
  sessionId: string;
  academicYearId: string;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, { status: Status; note?: string }>>(new Map());
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const r = await findClassRoster(academicYearId, sess.classId);
      setRoster(r ?? null);

      const initialized = await initAttendanceForSession({
        sessionId: sess.id,
        date: sess.date,
        roster: r ?? null,
      });
      setRecords(initialized);
      setLoading(false);
    })();
  }, [sessionId]);

  function setStudentStatus(studentId: string, status: Status) {
    const next = new Map(changes);
    next.set(studentId, { status, note: next.get(studentId)?.note });
    setChanges(next);
  }

  function getEffectiveStatus(record: AttendanceRecord): Status {
    return changes.get(record.studentId)?.status ?? record.status;
  }

  async function handleSave() {
    try {
      const changesArray = Array.from(changes.entries()).map(([studentId, v]) => ({
        studentId,
        status: v.status,
        note: v.note,
      }));
      const updated = await updateAttendance(sessionId, changesArray);
      setRecords(updated);
      setChanges(new Map());
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat absensi...</p>;
  if (!session) return null;
  if (!roster || records.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Belum ada daftar siswa"
          description={`Buat roster untuk kelas ${session.classLabel} di menu Roster dulu.`}
        />
      </Card>
    );
  }

  // Hitung summary dari effective status
  const effectiveRecords = records.map((r) => ({
    ...r,
    status: getEffectiveStatus(r),
  }));
  const summary = summarizeAttendance(effectiveRecords);

  return (
    <Card>
      <CardHeader
        title={`Absensi — ${session.classLabel}`}
        description={`${session.subject} · ${formatLongDateID(session.date)} · ${session.startTime}–${session.endTime}`}
      />

      {/* Summary */}
      <div className="grid grid-cols-5 gap-2 mb-4 text-center">
        <div className="p-2 bg-brand-50 rounded">
          <p className="text-lg font-bold text-brand-700">{summary.present}</p>
          <p className="text-xs text-brand-600">Hadir</p>
        </div>
        <div className="p-2 bg-amber-50 rounded">
          <p className="text-lg font-bold text-amber-700">{summary.sick}</p>
          <p className="text-xs text-amber-600">Sakit</p>
        </div>
        <div className="p-2 bg-slate-100 rounded">
          <p className="text-lg font-bold text-slate-700">{summary.excused}</p>
          <p className="text-xs text-slate-600">Izin</p>
        </div>
        <div className="p-2 bg-orange-50 rounded">
          <p className="text-lg font-bold text-orange-700">{summary.late}</p>
          <p className="text-xs text-orange-600">Terlambat</p>
        </div>
        <div className="p-2 bg-rose-50 rounded">
          <p className="text-lg font-bold text-rose-700">{summary.absent}</p>
          <p className="text-xs text-rose-600">Alpa</p>
        </div>
      </div>

      {/* Mode Kerja: input cepat */}
      {!showDocumentPreview && (
        <>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {records.map((r) => {
              const status = getEffectiveStatus(r);
              const isChanged = changes.has(r.studentId);
              return (
                <div
                  key={r.id}
                  className={`p-2 border rounded-md ${isChanged ? "border-brand-300 bg-brand-50/50" : "border-slate-200"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-400 w-6 shrink-0">{r.studentNumber}</span>
                      <span className="text-sm font-medium truncate">{r.studentName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0 max-w-[60%] justify-end">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setStudentStatus(r.studentId, s.value)}
                          className={`px-2.5 py-1.5 text-xs rounded-md font-medium min-w-[44px] ${
                            status === s.value
                              ? s.value === "present" ? "bg-brand-600 text-white"
                                : s.value === "sick" ? "bg-amber-500 text-white"
                                : s.value === "excused" ? "bg-slate-500 text-white"
                                : s.value === "late" ? "bg-orange-500 text-white"
                                : "bg-rose-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} disabled={changes.size === 0}>
              Simpan {changes.size > 0 ? `(${changes.size} perubahan)` : ""}
            </Button>
            <Button variant="secondary" onClick={() => setShowDocumentPreview(true)}>
              Mode Dokumen
            </Button>
          </div>
        </>
      )}

      {/* Mode Dokumen: format Excel-like, print ready */}
      {showDocumentPreview && (
        <>
          <div className="print-area">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold">DAFTAR HADIR SISWA</h2>
              <p className="text-sm">{session.subject} — Kelas {session.classLabel}</p>
              <p className="text-sm">{formatLongDateID(session.date)} · Jam ke {session.startPeriod} ({session.startTime}–{session.endTime})</p>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-400">
                  <th className="py-2 px-2 text-left border border-slate-300">No</th>
                  <th className="py-2 px-2 text-left border border-slate-300">NIS</th>
                  <th className="py-2 px-2 text-left border border-slate-300">Nama Siswa</th>
                  <th className="py-2 px-2 text-center border border-slate-300">H</th>
                  <th className="py-2 px-2 text-center border border-slate-300">S</th>
                  <th className="py-2 px-2 text-center border border-slate-300">I</th>
                  <th className="py-2 px-2 text-center border border-slate-300">A</th>
                  <th className="py-2 px-2 text-left border border-slate-300">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {effectiveRecords.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200">
                    <td className="py-1.5 px-2 border border-slate-300">{r.studentNumber}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-xs">{r.nis ?? "-"}</td>
                    <td className="py-1.5 px-2 border border-slate-300">{r.studentName}</td>
                    <td className="py-1.5 px-2 text-center border border-slate-300">{r.status === "present" ? "✓" : ""}</td>
                    <td className="py-1.5 px-2 text-center border border-slate-300">{r.status === "sick" ? "✓" : ""}</td>
                    <td className="py-1.5 px-2 text-center border border-slate-300">{r.status === "excused" ? "✓" : ""}</td>
                    <td className="py-1.5 px-2 text-center border border-slate-300">{r.status === "absent" ? "✓" : ""}</td>
                    <td className="py-1.5 px-2 border border-slate-300">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-400 font-bold">
                  <td colSpan={3} className="py-2 px-2 border border-slate-300 text-right">Jumlah:</td>
                  <td className="py-2 px-2 text-center border border-slate-300">{summary.present}</td>
                  <td className="py-2 px-2 text-center border border-slate-300">{summary.sick}</td>
                  <td className="py-2 px-2 text-center border border-slate-300">{summary.excused}</td>
                  <td className="py-2 px-2 text-center border border-slate-300">{summary.absent}</td>
                  <td className="py-2 px-2 border border-slate-300">Total: {summary.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-2 mt-4 no-print">
            <Button variant="secondary" onClick={() => setShowDocumentPreview(false)}>Mode Kerja</Button>
            <Button onClick={() => window.print()}>Cetak</Button>
            <Button onClick={handleSave} disabled={changes.size === 0}>
              Simpan {changes.size > 0 ? `(${changes.size})` : ""}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

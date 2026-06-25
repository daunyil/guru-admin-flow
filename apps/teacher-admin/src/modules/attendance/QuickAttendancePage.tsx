/**
 * ATTENDANCE-JOURNAL-SIMPLE-FLOW-RC1
 *
 * Fokus patch:
 * - Absensi reguler tetap untuk input biasa dari jadwal/tanggal.
 * - Absensi susulan dipisah, tampil semua pertemuan dengan warna:
 *   hijau = sudah diisi, merah = belum diisi.
 * - Tidak ada UI Absen Manual di halaman utama.
 * - Setelah simpan absensi, tampil panel sukses dengan dua aksi:
 *   Lanjut Isi Jurnal / Tutup.
 * - Nilai tidak disentuh.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge, ContextCard, InfoCard, PrintExportButtons } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession, listLessonSessions } from "../../shared/db/lesson-session-repo";
import {
  initAttendanceForSession,
  updateAttendance,
  saveDefaultAttendance,
  getAttendanceBySession,
} from "../../shared/db/attendance-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { db } from "../../shared/db/schema";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import {
  generateDefaultAttendance,
  summarizeAttendance,
  buildContextInfo,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceRecord,
  ClassRoster,
  LessonSession,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate, nowTimestamp } from "@guru-admin/shared";

type Status = "present" | "sick" | "excused" | "absent";
type AttendanceMode = "jadwal" | "susulan";

type SaveResult = {
  message: string;
  sessionId: string;
  classLabel: string;
  subject: string;
  date: string;
  summary: ReturnType<typeof summarizeAttendance>;
  journalExists?: boolean;
};

const STATUS_OPTIONS: Array<{ value: Status; short: string; label: string; activeClass: string }> = [
  { value: "present", short: "H", label: "Hadir", activeClass: "bg-brand-600 text-white" },
  { value: "sick", short: "S", label: "Sakit", activeClass: "bg-amber-500 text-white" },
  { value: "excused", short: "I", label: "Izin", activeClass: "bg-slate-500 text-white" },
  { value: "absent", short: "A", label: "Alpa", activeClass: "bg-rose-600 text-white" },
];

export function QuickAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [mode, setMode] = useState<AttendanceMode>("jadwal");
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [allAssignmentSessions, setAllAssignmentSessions] = useState<LessonSession[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [searchParams] = useSearchParams();
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);

      if (y && tp) {
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        const teacherAssignments = await listAssignmentsByTeacher(tp.id, y.id, sem);
        setAssignments(teacherAssignments);
        if (teacherAssignments.length > 0) setSelectedAssignmentId(teacherAssignments[0].id);
      }

      if (tp) setSessions(await getLessonSessionsByDate(tp.id, date));

      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) {
        setSelectedSessionId(urlSessionId);
        setMode("jadwal");
      }

      const urlMode = searchParams.get("mode");
      if (urlMode === "susulan") setMode("susulan");

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    void reloadSessions();
  }, [date, teacher?.id]);

  useEffect(() => {
    void loadAssignmentCatchupData();
  }, [selectedAssignmentId, year?.id, teacher?.id]);

  useEffect(() => {
    if (selectedSessionId && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSessionId]);

  async function reloadSessions() {
    if (!teacher) return;
    setSessions(await getLessonSessionsByDate(teacher.id, date));
  }

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  function handleAssignmentChange(newId: string) {
    if (selectedSessionId) {
      const ok = window.confirm("Ganti Kelas dan Mapel akan menutup sesi yang sedang diisi. Lanjutkan?");
      if (!ok) return;
    }
    setSelectedAssignmentId(newId);
    setSelectedSessionId(null);
    setSaveResult(null);
  }

  async function loadAssignmentCatchupData() {
    if (!year || !teacher) return;
    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (!assignment) {
      setAllAssignmentSessions([]);
      setAllAttendanceRecords([]);
      return;
    }

    const allSessions = await listLessonSessions(year.id, assignment.semester);
    const assignmentSessions = allSessions
      .filter(
        (s) =>
          s.classId === assignment.classId &&
          s.subject === assignment.subject &&
          s.teacherId === assignment.teacherId &&
          !s.deletedAt
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);

    setAllAssignmentSessions(assignmentSessions);

    const sessionIds = new Set(assignmentSessions.map((s) => s.id));
    const allAtt = await db.attendanceRecords
      .where("classId")
      .equals(assignment.classId)
      .toArray();
    const filtered = allAtt.filter((r) => !r.deletedAt && sessionIds.has(r.sessionId)) as AttendanceRecord[];
    setAllAttendanceRecords(filtered);
  }

  function closeSavePanel() {
    setSaveResult(null);
    if (mode === "susulan") setSelectedSessionId(null);
  }

  function goToJournal(result: SaveResult) {
    window.location.hash = `#/journal?sessionId=${result.sessionId}`;
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();
  const attendedSessionIds = new Set(allAttendanceRecords.map((r) => r.sessionId));
  const doneCount = allAssignmentSessions.filter((s) => attendedSessionIds.has(s.id)).length;
  const pendingCount = Math.max(allAssignmentSessions.length - doneCount, 0);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Absensi Cepat</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · {formatLongDateID(date)}
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <Card>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={mode === "jadwal" ? "primary" : "secondary"}
            onClick={() => { setMode("jadwal"); setSelectedSessionId(null); setSaveResult(null); }}
            className="text-sm"
          >
            Absen Reguler
          </Button>
          <Button
            variant={mode === "susulan" ? "primary" : "secondary"}
            onClick={() => { setMode("susulan"); setSelectedSessionId(null); setSaveResult(null); }}
            className="text-sm"
          >
            Absen Susulan
          </Button>
        </div>
      </Card>

      {mode === "jadwal" && (
        <>
          <Card>
            <Input label="Tanggal" id="att-date" type="date" value={date} onChange={setDate} />
          </Card>
          <Card>
            <CardHeader title="Absen Reguler" description={`${sessions.length} sesi pada tanggal ini`} />
            {sessions.length === 0 ? (
              <EmptyState
                title="Tidak ada sesi jadwal pada tanggal ini"
                description="Pilih tanggal lain, atau buka Absen Susulan untuk melihat semua pertemuan."
                action={<Button variant="secondary" onClick={() => setMode("susulan")}>Buka Absen Susulan</Button>}
              />
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSessionId(s.id); setSaveResult(null); }}
                    className={`w-full text-left p-3 border rounded-md ${
                      selectedSessionId === s.id ? "border-brand-400 bg-brand-50" : "border-slate-200"
                    } ${s.status === "cancelled" ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-sm">{s.startTime}–{s.endTime}</span>
                        <span className="text-sm text-slate-700 ml-2">{s.subject}</span>
                        <Badge variant="neutral">{s.classLabel}</Badge>
                      </div>
                      {s.status === "planned" ? <Badge variant="success">Isi</Badge> : <Badge variant="error">Batal</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {mode === "susulan" && (
        <>
          <Card>
            <CardHeader
              title="Absen Susulan"
              description="Tampilkan semua pertemuan. Hijau = sudah diisi, merah = belum diisi."
            />
            {assignments.length === 0 ? (
              <EmptyState
                title="Belum ada Kelas dan Mapel"
                description="Buka menu Kelas dan Mapel untuk membuat assignment dulu."
                action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
              />
            ) : (
              <Select
                label="Kelas dan Mapel"
                id="susulan-asg"
                value={selectedAssignmentId}
                onChange={handleAssignmentChange}
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

          {assignment && year && <ContextCard info={buildContextInfo({ assignment, academicYear: year })} />}

          {assignment && (
            <Card>
              <CardHeader title="Daftar Semua Pertemuan" description={`${doneCount} hijau · ${pendingCount} merah`} />
              {allAssignmentSessions.length === 0 ? (
                <EmptyState
                  title="Belum ada pertemuan"
                  description="Generate sesi dari menu Jadwal terlebih dahulu."
                />
              ) : (
                <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                  {allAssignmentSessions.map((s) => {
                    const isDone = attendedSessionIds.has(s.id);
                    const isActive = selectedSessionId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedSessionId(s.id); setSaveResult(null); }}
                        className={`w-full text-left p-3 border rounded-xl transition-all ${
                          isActive
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                            : isDone
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-rose-300 bg-rose-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">
                              Pertemuan {s.meetingNumber ?? "-"} · {formatLongDateID(s.date)}
                            </p>
                            <p className="text-xs text-slate-600">
                              Jam {s.startPeriod} · {s.startTime}–{s.endTime}
                            </p>
                          </div>
                          <Badge variant={isDone ? "success" : "error"}>
                            {isDone ? "Sudah diisi" : "Belum diisi"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {selectedSessionId && (
        <div ref={editorRef}>
          <AttendanceEditor
            sessionId={selectedSessionId}
            date={date}
            year={year}
            onSaved={async (result) => {
              setMessage({ type: "success", text: result.message });
              setSaveResult(result);
              await loadAssignmentCatchupData();
              await reloadSessions();
            }}
            onError={(msg) => setMessage({ type: "error", text: msg })}
          />
        </div>
      )}

      {saveResult && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 no-print">
          <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white shadow-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-emerald-700">✅ Absensi tersimpan</p>
                <p className="text-sm text-slate-600 mt-1">
                  {saveResult.subject} — {saveResult.classLabel} · {formatLongDateID(saveResult.date)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  H: {saveResult.summary.present} · S: {saveResult.summary.sick} · I: {saveResult.summary.excused} · A: {saveResult.summary.absent}
                </p>
              </div>
              <button
                onClick={closeSavePanel}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={() => goToJournal(saveResult)}>
                Lanjut Isi Jurnal
              </Button>
              <Button variant="secondary" onClick={closeSavePanel}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Attendance Editor                                                  */
/* ------------------------------------------------------------------ */

function AttendanceEditor({
  sessionId,
  date,
  year,
  onSaved,
  onError,
}: {
  sessionId: string;
  date: string;
  year: AcademicYear | null;
  onSaved: (result: SaveResult) => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, Status>>(new Map());
  const [showDoc, setShowDoc] = useState(false);
  const [isNewDraft, setIsNewDraft] = useState(false);

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) {
        onError("Sesi tidak ditemukan");
        setLoading(false);
        return;
      }
      setSession(sess);

      const r = year ? await findClassRoster(year.id, sess.classId) : null;
      setRoster(r ?? null);

      const existing = await getAttendanceBySession(sess.id);
      if (existing.length > 0) {
        setRecords(existing);
        setIsNewDraft(false);
      } else if (r) {
        const defaults = generateDefaultAttendance({
          roster: r,
          sessionId: sess.id,
          date: sess.date,
        });
        setRecords(defaults);
        setIsNewDraft(true);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  function setStudentStatus(studentId: string, status: Status) {
    const next = new Map(changes);
    next.set(studentId, status);
    setChanges(next);
  }

  function getEffectiveStatus(record: AttendanceRecord): Status {
    return changes.get(record.studentId) ?? (record.status as Status);
  }

  async function handleSave() {
    try {
      if (!session || !roster) return;
      const now = nowTimestamp();
      let updatedRecords: AttendanceRecord[];

      if (isNewDraft) {
        updatedRecords = records.map((r) => {
          const newStatus = changes.get(r.studentId);
          return newStatus
            ? { ...r, status: newStatus as AttendanceRecord["status"], updatedAt: now }
            : { ...r, updatedAt: now };
        });
        await saveDefaultAttendance(updatedRecords);
        setIsNewDraft(false);
      } else {
        const changesArray = Array.from(changes.entries()).map(([studentId, status]) => ({
          studentId,
          status: status as AttendanceRecord["status"],
        }));
        updatedRecords = changesArray.length > 0
          ? await updateAttendance(session.id, changesArray)
          : records;
      }

      setRecords(updatedRecords);
      setChanges(new Map());
      const summary = summarizeAttendance(updatedRecords.map((r) => ({ ...r, status: getEffectiveStatus(r) as AttendanceRecord["status"] })));
      await onSaved({
        message: "Absensi tersimpan.",
        sessionId: session.id,
        classLabel: session.classLabel,
        subject: session.subject,
        date: session.date,
        summary,
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  async function handleFillAllPresent() {
    const next = new Map<string, Status>();
    for (const r of records) next.set(r.studentId, "present");
    setChanges(next);
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat absensi...</p>;
  if (!roster || records.length === 0) {
    return (
      <Card>
        <EmptyState title="Belum ada daftar siswa" description="Buat roster untuk kelas ini di menu Siswa dulu." />
      </Card>
    );
  }

  const effectiveRecords = records.map((r) => ({
    ...r,
    status: getEffectiveStatus(r) as AttendanceRecord["status"],
  }));
  const summary = summarizeAttendance(effectiveRecords);

  return (
    <Card>
      <CardHeader
        title={`Absensi — ${roster.classLabel}`}
        description={`${session?.subject ?? "Mapel"} · ${formatLongDateID(session?.date ?? date)}`}
      />

      {session && (
        <div className="mb-4">
          <InfoCard
            entries={[
              { label: "Mapel", value: session.subject },
              { label: "Kelas", value: session.classLabel },
              { label: "Tanggal", value: formatLongDateID(session.date) },
              { label: "Pertemuan", value: String(session.meetingNumber ?? "-") },
              { label: "Jam", value: `${session.startPeriod} (${session.startTime}–${session.endTime})` },
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
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
        <div className="p-2 bg-rose-50 rounded">
          <p className="text-lg font-bold text-rose-700">{summary.absent}</p>
          <p className="text-xs text-rose-600">Alpa</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <Button variant="secondary" className="text-xs" onClick={handleFillAllPresent}>
          Isi Semua H
        </Button>
      </div>

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
                <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStudentStatus(r.studentId, s.value)}
                      className={`px-3 py-1.5 text-xs rounded-md font-bold min-w-[36px] ${
                        status === s.value
                          ? s.activeClass
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-4 pt-3 bg-white border-t border-slate-200 flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          {isNewDraft ? "Simpan Absensi" : changes.size > 0 ? `Simpan (${changes.size} perubahan)` : "Simpan Absensi"}
        </Button>
        <Button variant="secondary" onClick={() => setShowDoc(!showDoc)}>
          {showDoc ? "Mode Kerja" : "Mode Dokumen"}
        </Button>
      </div>

      {showDoc && (
        <div className="print-area mt-4">
          <div className="document-page document-portrait">
            <div className="document-title">DAFTAR HADIR SISWA</div>
            <div className="document-subtitle">
              {session?.subject ?? "Mapel"} — Kelas {roster.classLabel}
            </div>
            <div className="document-subtitle">{formatLongDateID(session?.date ?? date)}</div>
            <table className="document-table">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>No</th>
                  <th style={{ width: "12%" }}>NIS</th>
                  <th>Nama Siswa</th>
                  <th style={{ width: "6%" }}>H</th>
                  <th style={{ width: "6%" }}>S</th>
                  <th style={{ width: "6%" }}>I</th>
                  <th style={{ width: "6%" }}>A</th>
                  <th style={{ width: "15%" }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {effectiveRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="text-center">{r.studentNumber}</td>
                    <td>{r.nis ?? "-"}</td>
                    <td>{r.studentName}</td>
                    <td className="text-center">{r.status === "present" ? "✓" : ""}</td>
                    <td className="text-center">{r.status === "sick" ? "✓" : ""}</td>
                    <td className="text-center">{r.status === "excused" ? "✓" : ""}</td>
                    <td className="text-center">{r.status === "absent" ? "✓" : ""}</td>
                    <td>{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-center">JUMLAH</td>
                  <td className="text-center">{summary.present}</td>
                  <td className="text-center">{summary.sick}</td>
                  <td className="text-center">{summary.excused}</td>
                  <td className="text-center">{summary.absent}</td>
                  <td className="text-center">Total: {summary.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="print-toolbar">
            <PrintExportButtons filename={`absensi-${roster.classLabel}-${formatLongDateID(session?.date ?? date)}`} title="Daftar Hadir Siswa" />
          </div>
        </div>
      )}
    </Card>
  );
}

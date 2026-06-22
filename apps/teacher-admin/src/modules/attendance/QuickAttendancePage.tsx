/**
 * PATCH-02: Quick Attendance Core — absensi tercepat, tidak terkunci jadwal.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §3
 *
 * PATCH-FLOW-RC2C: mode manual/susulan memakai TeachingAssignment sebagai
 * konteks (bukan pilih kelas+mapel terpisah). Setiap absensi manual otomatis
 * terikat ke (academicYearId, semester, teacherId, subject, classId) yang
 * sudah ditetapkan di awal tahun.
 *
 * 3 mode:
 *   - Dari Jadwal: pilih LessonSession dari jadwal mengajar
 *   - Manual: pilih Data Mengajar + tanggal → auto create LessonSession ad-hoc
 *   - Susulan: sama dengan Manual, untuk tanggal lewat
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession, findOrCreateManualSession } from "../../shared/db/lesson-session-repo";
import {
  initAttendanceForSession,
  updateAttendance,
  saveDefaultAttendance,
  getAttendanceBySession,
} from "../../shared/db/attendance-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { generateDefaultAttendance, summarizeAttendance } from "@guru-admin/domain";
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

const STATUS_OPTIONS: Array<{ value: Status; short: string; label: string; activeClass: string }> = [
  { value: "present", short: "H", label: "Hadir", activeClass: "bg-brand-600 text-white" },
  { value: "sick", short: "S", label: "Sakit", activeClass: "bg-amber-500 text-white" },
  { value: "excused", short: "I", label: "Izin", activeClass: "bg-slate-500 text-white" },
  { value: "absent", short: "A", label: "Alpa", activeClass: "bg-rose-600 text-white" },
];

type AttendanceMode = "jadwal" | "manual" | "susulan";

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchParams] = useSearchParams();

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
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      if (tp) {
        const sess = await getLessonSessionsByDate(tp.id, date);
        setSessions(sess);
      }
      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) {
        setSelectedSessionId(urlSessionId);
        setMode("jadwal");
      }
      setLoading(false);
    })();
  }, []);

  async function reloadSessions() {
    if (!teacher) return;
    const sess = await getLessonSessionsByDate(teacher.id, date);
    setSessions(sess);
  }

  useEffect(() => {
    void reloadSessions();
  }, [date]);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function handleStartManual() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Data Mengajar dulu." });
      return;
    }
    // Cari roster untuk classId assignment
    const roster = await findClassRoster(year.id, assignment.classId);
    if (!roster) {
      setMessage({
        type: "error",
        text: `Belum ada roster untuk kelas ${assignment.classLabel}. Buat dulu di menu Siswa.`,
      });
      return;
    }
    try {
      const { session } = await findOrCreateManualSession({
        mode: mode === "jadwal" ? "manual" : mode,
        academicYear: year,
        teacherId: teacher.id,
        roster,
        subject: assignment.subject,
        date,
      });
      setSelectedSessionId(session.id);
      // Reload sessions agar muncul di list
      await reloadSessions();
      setMessage({
        type: "success",
        text: `Sesi ${mode} dibuat untuk ${assignment.classLabel} · ${assignment.subject}.`,
      });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Gagal membuat sesi.",
      });
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

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

      {/* Mode selector */}
      <Card>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={mode === "jadwal" ? "primary" : "secondary"}
            onClick={() => { setMode("jadwal"); setSelectedSessionId(null); }}
            className="text-sm"
          >
            Dari Jadwal
          </Button>
          <Button
            variant={mode === "manual" ? "primary" : "secondary"}
            onClick={() => { setMode("manual"); setSelectedSessionId(null); }}
            className="text-sm"
          >
            Manual
          </Button>
          <Button
            variant={mode === "susulan" ? "primary" : "secondary"}
            onClick={() => { setMode("susulan"); setSelectedSessionId(null); }}
            className="text-sm"
          >
            Susulan
          </Button>
        </div>
      </Card>

      {/* Date picker */}
      <Card>
        <Input label="" id="att-date" type="date" value={date} onChange={setDate} />
      </Card>

      {/* Mode: Jadwal */}
      {mode === "jadwal" && (
        <Card>
          <CardHeader title="Sesi dari Jadwal" description={`${sessions.length} sesi`} />
          {sessions.length === 0 ? (
            <EmptyState
              title="Tidak ada sesi jadwal hari ini"
              description="Pakai mode Manual atau Susulan dengan Data Mengajar."
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
                    {s.status === "planned" ? <Badge variant="success">Tersedia</Badge> : <Badge variant="error">Batal</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Mode: Manual / Susulan — pilih assignment */}
      {(mode === "manual" || mode === "susulan") && (
        <Card>
          <CardHeader
            title={mode === "manual" ? "Absen Manual" : "Absen Susulan"}
            description="Pilih Data Mengajar. Mapel+kelas+guru otomatis terikat."
          />
          {assignments.length === 0 ? (
            <EmptyState
              title="Belum ada Data Mengajar"
              description="Buka menu 'Data Mengajar' untuk membuat assignment dulu."
              action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Data Mengajar</Button>}
            />
          ) : (
            <div className="space-y-3">
              <Select
                label="Data Mengajar"
                id={`${mode}-asg`}
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
              {selectedAssignmentId && (
                <div className="p-3 bg-slate-50 rounded-md text-sm">
                  <p><span className="text-slate-500">Guru:</span> <strong>{selectedAssignment()?.teacherName}</strong></p>
                  <p><span className="text-slate-500">Mapel:</span> <strong>{selectedAssignment()?.subject}</strong></p>
                  <p><span className="text-slate-500">Kelas:</span> <strong>{selectedAssignment()?.classLabel}</strong></p>
                </div>
              )}
              {selectedAssignmentId && (
                <Button onClick={handleStartManual}>
                  {mode === "manual" ? "Mulai Absen" : "Mulai Absen Susulan"}
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Attendance Editor */}
      {selectedSessionId && (
        <AttendanceEditor
          sessionId={selectedSessionId}
          mode={mode}
          date={date}
          year={year}
          onSaved={(msg) => setMessage({ type: "success", text: msg })}
          onError={(msg) => setMessage({ type: "error", text: msg })}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Attendance Editor                                                  */
/* ------------------------------------------------------------------ */

function AttendanceEditor({
  sessionId,
  mode,
  date,
  year,
  onSaved,
  onError,
}: {
  sessionId: string;
  mode: AttendanceMode;
  date: string;
  year: AcademicYear | null;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, Status>>(new Map());
  const [isDraft, setIsDraft] = useState(mode === "susulan");
  const [showDoc, setShowDoc] = useState(false);
  const [isNewDraft, setIsNewDraft] = useState(false);

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const r = year ? await findClassRoster(year.id, sess.classId) : null;
      setRoster(r ?? null);

      const isManualMode = sess.teachingScheduleId === "manual" || sess.teachingScheduleId === "susulan";

      if (isManualMode) {
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
          setIsDraft(true);
        }
      } else {
        const initialized = await initAttendanceForSession({
          sessionId: sess.id,
          date: sess.date,
          roster: r ?? null,
        });
        setRecords(initialized);
        setIsNewDraft(false);
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
      if (!session) return;

      if (isNewDraft) {
        const now = nowTimestamp();
        const recordsToSave = records.map((r) => {
          const newStatus = changes.get(r.studentId);
          return newStatus
            ? { ...r, status: newStatus as AttendanceRecord["status"], updatedAt: now }
            : r;
        });
        await saveDefaultAttendance(recordsToSave);
        setRecords(recordsToSave);
        setChanges(new Map());
        setIsNewDraft(false);
        setIsDraft(false);
        onSaved("Absensi tersimpan.");
        return;
      }

      const changesArray = Array.from(changes.entries()).map(([studentId, status]) => ({
        studentId,
        status: status as AttendanceRecord["status"],
      }));

      if (changesArray.length === 0) {
        onSaved("Tidak ada perubahan.");
        return;
      }

      const updated = await updateAttendance(session.id, changesArray);
      setRecords(updated);
      setChanges(new Map());
      setIsDraft(false);
      onSaved("Absensi tersimpan.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  async function handleFillAllPresent() {
    const next = new Map<string, Status>();
    for (const r of records) {
      next.set(r.studentId, "present");
    }
    setChanges(next);
    onSaved("Semua diisi Hadir. Klik Simpan untuk konfirmasi.");
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat absensi...</p>;
  if (!roster || records.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Belum ada daftar siswa"
          description={`Buat roster untuk kelas ini di menu Siswa dulu.`}
        />
      </Card>
    );
  }

  const effectiveRecords = records.map((r) => ({
    ...r,
    status: getEffectiveStatus(r) as AttendanceRecord["status"],
  }));
  const summary = summarizeAttendance(effectiveRecords);
  const isManualSession = session?.teachingScheduleId === "manual" || session?.teachingScheduleId === "susulan";

  return (
    <Card>
      <CardHeader
        title={`Absensi — ${roster.classLabel}`}
        description={`${session?.subject ?? "Mapel"} · ${formatLongDateID(date)}${isDraft ? " · DRAFT" : ""}`}
      />

      {/* Summary */}
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

      {isManualSession && (
        <div className="mb-3 p-2 bg-amber-50 rounded text-xs text-amber-800">
          {session?.teachingScheduleId === "susulan" ? "Absen Susulan" : "Absen Manual"} —
          tidak terikat jadwal tetap.
        </div>
      )}

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
        <Button
          onClick={handleSave}
          disabled={changes.size === 0 && !isNewDraft && !isDraft}
          className="flex-1"
        >
          {isNewDraft
            ? "Simpan"
            : changes.size > 0
              ? `Simpan (${changes.size} perubahan)`
              : "Simpan"}
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
            <div className="document-subtitle">{formatLongDateID(date)}</div>
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
            <Button onClick={() => window.print()}>Cetak</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * UX-STABILITY-FIXPACK-01: Absensi Cepat — kartu pilihan + tombol eksplisit.
 *
 * WYSIWYG-DOC-FASE10: Absensi sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (konteks, daftar pertemuan) + DocumentPreview (editor/dokumen).
 *   - Sidebar: Konteks (pilih Kelas/Mapel, tanggal), Daftar Pertemuan (reguler + susulan).
 *   - DocumentPreview: kanvas A4 + auto-save + status badge.
 *   - Auto-save ke schoolDocuments (docType: "absen-semester").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Input, Select, Button, EmptyState, Badge, LoadingState } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession, listLessonSessions } from "../../shared/db/lesson-session-repo";
import { getAttendanceBySession, saveDefaultAttendance, updateAttendance } from "../../shared/db/attendance-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { db } from "../../shared/db/schema";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { generateDefaultAttendance, summarizeAttendance } from "@guru-admin/domain";
import type { AcademicYear, AttendanceRecord, ClassRoster, LessonSession, TeachingAssignment, TeacherProfile } from "@guru-admin/domain";
import { formatLongDateID, nowTimestamp, todayISODate } from "@guru-admin/shared";
// WYSIWYG-DOC-FASE10
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

type Status = "present" | "sick" | "excused" | "absent" | "late";
type Mode = "jadwal" | "susulan";
type SaveInfo = { sessionId: string; subject: string; classLabel: string; date: string; summary: ReturnType<typeof summarizeAttendance> };
const statusButtons: Array<{ value: Status; short: string; active: string }> = [
  { value: "present", short: "H", active: "bg-brand-600 text-white" },
  { value: "sick", short: "S", active: "bg-amber-500 text-white" },
  { value: "excused", short: "I", active: "bg-slate-500 text-white" },
  { value: "late", short: "T", active: "bg-orange-500 text-white" },
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
  const [todayDoneIds, setTodayDoneIds] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();

  // WYSIWYG-DOC-FASE10
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /*  Init                                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const [activeYear, profile] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(activeYear ?? null); setTeacher(profile);
      if (activeYear && profile) {
        const today = todayISODate();
        const sem: 1 | 2 = activeYear.semester2Start <= today && today <= activeYear.semester2End ? 2 : 1;
        setDocSemester(sem);
        const list = await listAssignmentsByTeacher(profile.id, activeYear.id, sem);
        setAssignments(list); if (list[0]) setAssignmentId(list[0].id);
      }
      const sid = searchParams.get("sessionId");
      if (sid) setSelectedSessionId(sid);
      if (searchParams.get("mode") === "susulan") setMode("susulan");
    } catch (err) {
      console.error("[QuickAttendance] Gagal init:", err);
      setNotice("Gagal memuat data. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTodaySessions(); }, [date, teacher?.id]);
  useEffect(() => { void loadSusulan(); }, [assignmentId, year?.id]);

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                    */
  /* ---------------------------------------------------------------- */

  async function loadTodaySessions() {
    if (!teacher) return;
    try {
      const todaySessions = await getLessonSessionsByDate(teacher.id, date);
      setSessions(todaySessions);
      const doneSet = new Set<string>();
      for (const s of todaySessions) {
        const records = await getAttendanceBySession(s.id);
        if (records.length > 0) doneSet.add(s.id);
      }
      setTodayDoneIds(doneSet);
    } catch (err) {
      console.error("[QuickAttendance] Gagal memuat sesi:", err);
    }
  }

  function assignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === assignmentId);
  }

  async function loadSusulan() {
    if (!year || !assignment()) { setAllSessions([]); setAllRecords([]); return; }
    const a = assignment(); if (!a) return;
    try {
      const sess = (await listLessonSessions(year.id, a.semester)).filter((s) => !s.deletedAt && s.classId === a.classId && s.subject === a.subject && s.teacherId === a.teacherId).sort((x, y) => x.date.localeCompare(y.date) || x.startPeriod - y.startPeriod);
      setAllSessions(sess);
      const ids = new Set(sess.map((s) => s.id));
      const rows = await db.attendanceRecords.where("classId").equals(a.classId).toArray();
      setAllRecords(rows.filter((r) => !r.deletedAt && ids.has(r.sessionId)) as AttendanceRecord[]);
    } catch (err) {
      console.error("[QuickAttendance] Gagal memuat susulan:", err);
    }
  }

  async function afterSave(info: SaveInfo) { setNotice("Absensi tersimpan."); setSaved(info); await loadTodaySessions(); await loadSusulan(); }
  function closeSaved() { setSaved(null); if (mode === "susulan") setSelectedSessionId(null); }
  function handlePickSession(sid: string) { setSelectedSessionId(sid); setSaved(null); }

  /* ---------------------------------------------------------------- */
  /*  ensureDoc (find-or-create schoolDocument)                       */
  /* ---------------------------------------------------------------- */

  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!year || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "absen-semester",
        semester,
        tahunAjaran: year.label,
        kodeMapel: asg.subject,
        kodeKelas: asg.classLabel,
        teacherId: asg.teacherId,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "absen-semester",
          semester,
          tahunAjaran: year.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: year.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
      }
    } catch (err) {
      console.error("[QuickAttendance] Gagal ensureDoc:", err);
    } finally {
      ensuringRef.current = false;
    }
  }, [year]);

  // Ensure doc when assignment changes
  useEffect(() => {
    const asg = assignment();
    if (asg) {
      setDocSemester(asg.semester);
      void ensureDoc(asg, asg.semester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, year?.id]);

  /* ---------------------------------------------------------------- */
  /*  WYSIWYG callbacks                                               */
  /* ---------------------------------------------------------------- */

  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    setFormatDokumen(orientation);
    if (docId) void updateSchoolDocumentLayout(docId, { orientation });
  }, [docId]);

  /* ---------------------------------------------------------------- */
  /*  Auto-save data memo                                             */
  /* ---------------------------------------------------------------- */

  const doneIds = useMemo(() => new Set(allRecords.map((r) => r.sessionId)), [allRecords]);

  const docDataForAutoSave = useMemo(() => {
    const asg = assignment();
    if (!asg) return {};
    return {
      semester: docSemester,
      tahunAjaran: year?.label ?? "",
      subject: asg.subject,
      classLabel: asg.classLabel,
      totalSessions: allSessions.length,
      doneCount: doneIds.size,
    };
  }, [assignmentId, docSemester, year?.label, allSessions.length, doneIds.size]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) return <LoadingState />;

  if (!year) {
    return (
      <Card>
        <EmptyState
          title="Belum ada tahun pelajaran aktif"
          description="Buat tahun pelajaran baru atau gunakan data contoh terlebih dahulu."
        />
      </Card>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — sidebar + document                                */
  /* ================================================================ */

  return (
    <div className="doc-wysiwyg-layout">
      {/* ---------- MOBILE BACKDROP ---------- */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ---------- SIDEBAR ---------- */}
      <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Absensi Cepat</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setShowSidebar(false)}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <p className="text-xs text-slate-500 mb-2">
            {year ? `TP ${year.label}` : "Belum ada tahun aktif"}
          </p>
          <Input label="Tanggal" id="att-date" type="date" value={date} onChange={setDate} />
          <div className="flex gap-2 mt-2 flex-wrap">
            <Button variant={mode === "jadwal" ? "primary" : "secondary"} onClick={() => { setMode("jadwal"); setSelectedSessionId(null); }} className="text-xs">Reguler</Button>
            <Button variant={mode === "susulan" ? "primary" : "secondary"} onClick={() => { setMode("susulan"); setSelectedSessionId(null); }} className="text-xs">Susulan</Button>
          </div>
        </div>

        {/* -- Daftar Pertemuan (Reguler) -- */}
        {mode === "jadwal" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Sesi Hari Ini</h3>
            <p className="text-xs text-slate-500 mb-1">{sessions.length} sesi di {formatLongDateID(date)}</p>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Tidak ada sesi. Pilih tanggal lain atau coba Susulan.</p>
            ) : (
              <ul className="doc-sidebar-list">
                {sessions.map((s) => {
                  const isActive = selectedSessionId === s.id;
                  const done = todayDoneIds.has(s.id);
                  return (
                    <li key={s.id}
                      className={`doc-sidebar-list-item cursor-pointer ${isActive ? "ring-2 ring-brand-300" : ""} ${done ? "bg-emerald-50" : ""}`}
                      onClick={() => handlePickSession(s.id)}
                    >
                      <span className="doc-sidebar-list-title">{s.subject} · {s.classLabel}</span>
                      <div className="flex items-center gap-1">
                        {done && <Badge variant="success">✓</Badge>}
                        {isActive && <Badge variant="success">Aktif</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* -- Daftar Pertemuan (Susulan) -- SELALU TAMPIL */}
        {mode === "susulan" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Susulan</h3>
            {assignments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada Kelas dan Mapel. Buat dulu di menu Kelas dan Mapel atau gunakan data contoh.</p>
            ) : (
              <Select label="Kelas dan Mapel" id="susulan-asg" value={assignmentId} onChange={(v) => { setAssignmentId(v); setSelectedSessionId(null); }} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject}` }))]} />
            )}
            {assignmentId && allSessions.length > 0 && (
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                <p className="text-xs text-slate-500">{allSessions.filter((s) => doneIds.has(s.id)).length} diisi · {allSessions.filter((s) => !doneIds.has(s.id)).length} belum</p>
                {allSessions.map((s, i) => {
                  const done = doneIds.has(s.id);
                  const isActive = selectedSessionId === s.id;
                  return (
                    <div key={s.id}
                      className={`p-2 border rounded text-xs cursor-pointer transition-colors ${isActive ? "border-brand-500 bg-brand-50" : done ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                      onClick={() => handlePickSession(s.id)}
                    >
                      <span className="font-medium">P{i + 1}</span> · {formatLongDateID(s.date)}
                      <Badge variant={done ? "success" : "error"}>{done ? "✓" : "!"}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {assignmentId && allSessions.length === 0 && (
              <p className="text-xs text-amber-600 italic mt-2">Belum ada sesi untuk kelas dan mapel ini. Buat jadwal mengajar terlebih dahulu.</p>
            )}
          </div>
        )}
      </aside>

      {/* ---------- FLOATING SIDEBAR TOGGLE ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka sidebar"
        >
          ☰
        </button>
      )}

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {notice && <div className="info-banner-success mb-3 no-print" role="status" aria-live="polite">{notice}</div>}

        <DocumentPreview
          docId={docId}
          docType="absen-semester"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {!selectedSessionId ? (
            <AttendanceUnfilledList
              mode={mode}
              date={date}
              sessions={sessions}
              allSessions={allSessions}
              todayDoneIds={todayDoneIds}
              doneIds={doneIds}
              assignmentId={assignmentId}
              assignments={assignments}
              onPickSession={handlePickSession}
            />
          ) : (
            <AttendanceEditor sessionId={selectedSessionId} date={date} year={year} onSaved={afterSave} onError={setNotice} />
          )}

          {/* Rekap Absensi Document (shown when susulan mode has data) */}
          {mode === "susulan" && assignmentId && allSessions.length > 0 && (
            <div className="document-page document-portrait mt-6" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
              <div className="document-title">REKAP ABSENSI</div>
              <div className="document-subtitle">{year?.label ?? ""} — Semester {assignment()?.semester === 1 ? "Ganjil" : "Genap"}</div>
              <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
                <tbody>
                  <tr><td>Kelas</td><td>{assignment()?.classLabel ?? "-"}</td><td>Mapel</td><td>{assignment()?.subject ?? "-"}</td></tr>
                  <tr><td>Guru</td><td>{assignment()?.teacherName ?? "-"}</td><td>Total Pertemuan</td><td>{allSessions.length}</td></tr>
                </tbody>
              </table>
              <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
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
          )}
        </DocumentPreview>
      </div>

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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AttendanceUnfilledList — daftar sesi yang belum diisi absensi      */
/* ------------------------------------------------------------------ */

function AttendanceUnfilledList({
  mode,
  date,
  sessions,
  allSessions,
  todayDoneIds,
  doneIds,
  assignmentId,
  assignments,
  onPickSession,
}: {
  mode: Mode;
  date: string;
  sessions: LessonSession[];
  allSessions: LessonSession[];
  todayDoneIds: Set<string>;
  doneIds: Set<string>;
  assignmentId: string;
  assignments: TeachingAssignment[];
  onPickSession: (sid: string) => void;
}) {
  // Mode Jadwal: tampilkan sesi hari ini
  if (mode === "jadwal") {
    const unfilled = sessions.filter((s) => !todayDoneIds.has(s.id) && s.status !== "cancelled");
    const filled = sessions.filter((s) => todayDoneIds.has(s.id));
    const cancelled = sessions.filter((s) => s.status === "cancelled");

    return (
      <div className="py-6 px-4">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Daftar Absensi</h3>
        <p className="text-sm text-slate-500 mb-4">{formatLongDateID(date)} · {sessions.length} sesi</p>

        {/* Belum diisi */}
        {unfilled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Belum Diisi ({unfilled.length})
            </h4>
            <div className="space-y-2">
              {unfilled.map((s) => (
                <div key={s.id} className="p-3 border border-rose-200 bg-rose-50 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.subject} — {s.classLabel}</p>
                    <p className="text-xs text-slate-500">{s.startTime}–{s.endTime} · Jam {s.startPeriod}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPickSession(s.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    Isi Absen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sudah diisi */}
        {filled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sudah Diisi ({filled.length})
            </h4>
            <div className="space-y-2">
              {filled.map((s) => (
                <div key={s.id} className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.subject} — {s.classLabel}</p>
                    <p className="text-xs text-slate-500">{s.startTime}–{s.endTime} · Jam {s.startPeriod}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPickSession(s.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    Lihat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batal */}
        {cancelled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Dibatalkan ({cancelled.length})
            </h4>
            <div className="space-y-2">
              {cancelled.map((s) => (
                <div key={s.id} className="p-3 border border-slate-200 bg-slate-50 rounded-lg opacity-60">
                  <p className="text-sm font-medium text-slate-500 truncate">{s.subject} — {s.classLabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-base font-medium">Tidak ada sesi di tanggal ini</p>
            <p className="text-sm mt-1">Coba pilih tanggal lain atau gunakan mode Susulan.</p>
          </div>
        )}
      </div>
    );
  }

  // Mode Susulan: tampilkan semua sesi per assignment
  if (!assignmentId) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-lg font-medium text-slate-500">Pilih Kelas dan Mapel</p>
        <p className="text-sm text-slate-400 mt-1">Buka sidebar atau pilih kelas dan mapel untuk melihat daftar pertemuan.</p>
        {assignments.length === 0 && (
          <p className="text-sm text-amber-600 mt-3">Belum ada Kelas dan Mapel. Buat dulu di menu Kelas dan Mapel.</p>
        )}
      </div>
    );
  }

  if (allSessions.length === 0) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-lg font-medium text-slate-500">Belum ada sesi</p>
        <p className="text-sm text-slate-400 mt-1">Buat jadwal mengajar terlebih dahulu agar sesi muncul di sini.</p>
      </div>
    );
  }

  const unfilled = allSessions.filter((s) => !doneIds.has(s.id));
  const filled = allSessions.filter((s) => doneIds.has(s.id));
  const asg = assignments.find((a) => a.id === assignmentId);

  return (
    <div className="py-6 px-4">
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        Daftar Absensi {asg ? `${asg.classLabel} · ${asg.subject}` : ""}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {filled.length} diisi · {unfilled.length} belum diisi · Total {allSessions.length} pertemuan
      </p>

      {/* Belum diisi — prioritas utama */}
      {unfilled.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Belum Diisi ({unfilled.length})
          </h4>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {unfilled.map((s, i) => (
              <div key={s.id} className="p-2.5 border border-rose-200 bg-rose-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    P{i + 1} · {formatLongDateID(s.date)}
                  </p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPickSession(s.id)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  Isi Absen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sudah diisi */}
      {filled.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sudah Diisi ({filled.length})
          </h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filled.map((s, i) => (
              <div key={s.id} className="p-2.5 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    P{i + 1} · {formatLongDateID(s.date)}
                  </p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPickSession(s.id)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
      onError(e instanceof Error ? e.message : "Gagal menyimpan absensi. Coba lagi.");
    }
  }

  if (loading) return <Card><LoadingState message="Memuat absensi..." /></Card>;
  if (!roster) return <Card><EmptyState title="Belum ada daftar siswa" description="Buat roster kelas dulu di menu Siswa." /></Card>;

  const summary = summarizeAttendance(records.map((r) => ({ ...r, status: eff(r) })));

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">Absensi — {roster.classLabel}</h3>
        <p className="text-xs text-slate-500">{session?.subject ?? "Mapel"} · {formatLongDateID(session?.date ?? date)}</p>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-4 text-center no-print">
        <div className="p-2 bg-brand-50 rounded"><span className="font-bold text-brand-700">H {summary.present}</span></div>
        <div className="p-2 bg-amber-50 rounded"><span className="font-bold text-amber-700">S {summary.sick}</span></div>
        <div className="p-2 bg-slate-100 rounded"><span className="font-bold text-slate-600">I {summary.excused}</span></div>
        <div className="p-2 bg-orange-50 rounded"><span className="font-bold text-orange-700">T {summary.late}</span></div>
        <div className="p-2 bg-rose-50 rounded"><span className="font-bold text-rose-700">A {summary.absent}</span></div>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto no-print">
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
      <div className="sticky bottom-0 mt-4 pt-3 bg-white border-t no-print">
        <Button onClick={save} disabled={changes.size === 0} className="w-full">{changes.size === 0 ? "Tidak Ada Perubahan" : "Simpan Absensi"}</Button>
      </div>
    </div>
  );
}

/**
 * PATCH-03: Quick Journal — jurnal 10-30 detik.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §4
 *
 * PATCH-FLOW-RC2D:
 *   - Jurnal MEETING-FIRST dengan rekap total/sudah/belum sesuai Promes
 *     (via LessonSession yang sudah di-generate dari jadwal).
 *   - Tombol "Setujui & Simpan" memanggil finalizeJournal (locked=true).
 *   - Bila absensi belum ada, tampilkan CTA "Buat Absensi Dulu" —
 *     jangan auto-create absensi saat membuka jurnal.
 *   - Tombol terpisah: "Simpan Draft" (tanpa lock) vs "Setujui & Finalkan".
 *   - Window khusus Jurnal Susulan: daftar pertemuan belum jurnal dengan
 *     tombol "Buat Jurnal" per pertemuan.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, ContextCard, PrintExportButtons } from "../../shared/ui";
import {
  getLessonSessionsByDate,
  getLessonSession,
  findOrCreateManualSession,
  listLessonSessions,
} from "../../shared/db/lesson-session-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import {
  initJournalForSessionFull,
  updateJournal,
  finalizeJournal,
  unlockJournal,
  listJournals,
} from "../../shared/db/journal-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import type {
  LessonSession,
  TeachingJournal,
  ProtaUnit,
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import {
  assignmentShortLabel,
  recapJournalsForAssignment,
  buildContextInfo,
  buildJournalNarrative,
  canFinalizeJournal,
  dateChangeRequiresConfirm,
  packStructuredNote,
  unpackStructuredNote,
  JOURNAL_ACTIVITY_CHOICES,
  JOURNAL_RESPONSE_CHOICES,
  JOURNAL_OBSTACLE_CHOICES,
  JOURNAL_FOLLOWUP_CHOICES,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type RealizationStatus = TeachingJournal["realizationStatus"];
const REALIZATION_OPTIONS: Array<{ value: RealizationStatus; label: string }> = [
  { value: "done", label: "Selesai" },
  { value: "continued", label: "Dilanjutkan" },
  { value: "cancelled", label: "Tidak Terlaksana" },
];

type JournalMode = "pertemuan" | "manual" | "susulan";

export function QuickJournalPage() {
  const [loading, setLoading] = useState(true);
  const [year, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [allAssignmentSessions, setAllAssignmentSessions] = useState<LessonSession[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<JournalMode>("pertemuan");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchParams] = useSearchParams();
  // JOURNAL-REVIEW-NARRATIVE-03: Opsi Lainnya / Darurat (Jurnal Manual)
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);

  // UX-DAILY-04: ref untuk auto-scroll ke editor jurnal
  const editorRef = useRef<HTMLDivElement | null>(null);

  // JOURNAL-REVIEW-NARRATIVE-03 §9: Date Guard — bungkus setDate dengan konfirmasi
  function handleDateChange(newDate: string) {
    if (newDate === date) return;
    const hasActiveDraft = !!selectedSessionId;
    if (dateChangeRequiresConfirm({ hasActiveDraft, isFinal: false })) {
      const ok = window.confirm(
        "Mengganti tanggal akan menutup draft jurnal yang sedang diisi. Lanjutkan?"
      );
      if (!ok) return;
      // Tutup draft yang sedang aktif
      setSelectedSessionId(null);
    }
    setDate(newDate);
  }

  // UX-DAILY-04: clear selectedSessionId saat ganti assignment
  function handleAssignmentChange(newId: string) {
    if (selectedSessionId) {
      const ok = window.confirm(
        "Ganti Kelas dan Mapel akan menutup jurnal yang sedang diisi. Lanjutkan?"
      );
      if (!ok) return;
    }
    setSelectedAssignmentId(newId);
    setSelectedSessionId(null);
  }

  // UX-DAILY-03: auto-scroll ke editor saat selectedSessionId berubah
  useEffect(() => {
    if (selectedSessionId && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSessionId]);

  useEffect(() => {
    void (async () => {
      const [y, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
      setActiveYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (y && tp) {
                const todayISO = todayISODate();
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) setSelectedSessionId(urlSessionId);
      // UX-DAILY-06: baca ?mode=manual dari URL (dari tombol Today "Jurnal Manual")
      const urlMode = searchParams.get("mode");
      if (urlMode === "manual") {
        setMode("manual");
      } else if (urlMode === "susulan") {
        setMode("susulan");
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    // RELEASE-FIXPACK-P1-P2-01: cleanup setTimeout untuk hindari race condition
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function loadAssignmentData() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setSessions([]);
      setAllAssignmentSessions([]);
      setJournals([]);
      return;
    }
    const allToday = await getLessonSessionsByDate(teacher.id, date);
    const todayForAssignment = allToday.filter(
      (s) => s.classId === assignment.classId && s.subject === assignment.subject
    );
    setSessions(todayForAssignment);

    const allSessions = await listLessonSessions(year.id, assignment.semester);
    const assignmentSessions = allSessions.filter(
      (s) =>
        s.classId === assignment.classId &&
        s.subject === assignment.subject &&
        s.teacherId === assignment.teacherId &&
        !s.deletedAt
    );
    setAllAssignmentSessions(assignmentSessions);

    const allJournals = await listJournals(year.id, assignment.semester);
    const assignmentJournals = allJournals.filter(
      (j) =>
        j.classId === assignment.classId &&
        j.subject === assignment.subject &&
        j.teacherId === assignment.teacherId
    );
    setJournals(assignmentJournals);
  }

  useEffect(() => {
    void loadAssignmentData();
  }, [selectedAssignmentId, date, year]);

  async function handleStartManualJournal() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Kelas dan Mapel dulu." });
      return;
    }
    const roster = await findClassRoster(year.id, assignment.classId);
    if (!roster) {
      setMessage({ type: "error", text: `Belum ada roster untuk kelas ${assignment.classLabel}.` });
      return;
    }
    try {
      const { session } = await findOrCreateManualSession({
        mode: "manual",
        academicYear: year,
        teacherId: teacher.id,
        roster,
        subject: assignment.subject,
        date,
      });
      setSelectedSessionId(session.id);
      await loadAssignmentData();
      setMessage({ type: "success", text: "Sesi jurnal manual dibuat. Isi jurnal di bawah." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal membuat sesi." });
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();
  const recap = assignment
    ? recapJournalsForAssignment({
        sessions: allAssignmentSessions,
        journals,
        assignment,
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Jurnal Mengajar</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : ""} · {formatLongDateID(date)}
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* Step 1: Pilih Kelas dan Mapel */}
      <Card>
        <CardHeader
          title="1. Pilih Kelas dan Mapel"
          description="Pilih paket mengajar. Mapel+kelas+guru otomatis terikat."
        />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Kelas dan Mapel"
            description="Buka menu 'Kelas dan Mapel' untuk membuat assignment dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
          />
        ) : (
          <Select
            label="Kelas dan Mapel"
            id="jrn-assignment"
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

      {assignment && recap && (
        <>
          {/* Context card */}
          {year && (
            <ContextCard info={buildContextInfo({ assignment, academicYear: year })} />
          )}

          {/* Rekap jurnal */}
          <Card>
            <CardHeader
              title="Rekap Jurnal"
              description={`Total ${recap.total} pertemuan terjadwal`}
            />
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-slate-100 rounded">
                <p className="text-lg font-bold text-slate-700">{recap.total}</p>
                <p className="text-xs">Total</p>
              </div>
              <div className="p-2 bg-brand-50 rounded">
                <p className="text-lg font-bold text-brand-700">{recap.done}</p>
                <p className="text-xs">Sudah Jurnal</p>
              </div>
              <div className="p-2 bg-amber-50 rounded">
                <p className="text-lg font-bold text-amber-700">{recap.pending}</p>
                <p className="text-xs">Belum Jurnal</p>
              </div>
              <div className="p-2 bg-rose-50 rounded">
                <p className="text-lg font-bold text-rose-700">{recap.cancelled}</p>
                <p className="text-xs">Batal</p>
              </div>
            </div>
            {recap.total === 0 && (
              <p className="text-xs text-amber-700 mt-2">
                Belum ada sesi untuk assignment ini. Generate sesi di menu Jadwal dulu.
              </p>
            )}
          </Card>

          {/* Mode selector + date — JOURNAL-REVIEW-NARRATIVE-03 */}
          <Card>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[160px]">
                <Input label="" id="jrn-date" type="date" value={date} onChange={handleDateChange} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Primary modes: Hari Ini + Jurnal Susulan */}
                <Button
                  variant={mode === "pertemuan" ? "primary" : "secondary"}
                  onClick={() => setMode("pertemuan")}
                  className="text-sm"
                >
                  Hari Ini
                </Button>
                <Button
                  variant={mode === "susulan" ? "primary" : "secondary"}
                  onClick={() => setMode("susulan")}
                  className="text-sm"
                >
                  Jurnal Susulan
                </Button>
                {/* JOURNAL-REVIEW-NARRATIVE-03 §3: Jurnal Manual dipindah ke Opsi Darurat */}
                <Button
                  variant={showEmergencyOptions ? "danger" : "secondary"}
                  onClick={() => setShowEmergencyOptions(!showEmergencyOptions)}
                  className="text-sm"
                >
                  {showEmergencyOptions ? "▲ Tutup Opsi" : "▼ Opsi Lainnya"}
                </Button>
              </div>
            </div>
            {showEmergencyOptions && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-2">Opsi Darurat</p>
                <p className="text-xs text-amber-800 mb-3">
                  Hanya digunakan bila sesi tidak tersedia di jadwal (mis. jurnal pengganti di luar jadwal reguler).
                </p>
                <Button
                  variant={mode === "manual" ? "primary" : "secondary"}
                  onClick={() => setMode("manual")}
                  className="text-sm"
                >
                  Buat Jurnal di Luar Jadwal
                </Button>
              </div>
            )}
          </Card>

          {/* Mode: Hari Ini — pilih pertemuan di tanggal dipilih */}
          {mode === "pertemuan" && (
            <Card>
              <CardHeader
                title="2. Pilih Pertemuan"
                description={`Tanggal ${formatLongDateID(date)} · ${sessions.length} sesi`}
              />
              {sessions.length === 0 ? (
                <EmptyState
                  title="Tidak ada pertemuan di tanggal ini"
                  description="Pilih tanggal lain, atau buka Opsi Lainnya untuk Jurnal Susulan / Darurat."
                  action={
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setMode("susulan")}>Jurnal Susulan</Button>
                      <Button variant="secondary" onClick={() => { setShowEmergencyOptions(true); setMode("manual"); }}>Jurnal Darurat</Button>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => {
                    const hasJournal = journals.some((j) => j.sessionId === s.id);
                    const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
                    const isActive = selectedSessionId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isActive
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                            : s.status === "cancelled"
                              ? "border-slate-200 opacity-50"
                              : hasJournal
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {isManual ? "Manual" : `${s.startTime}–${s.endTime} · Jam ${s.startPeriod}`}
                              </span>
                              <Badge variant="neutral">{s.classLabel}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isActive ? (
                              <Badge variant="success">Sedang diisi</Badge>
                            ) : s.status === "planned" ? (
                              <>
                                <Badge variant={hasJournal ? "success" : "warning"}>
                                  {hasJournal ? "✓ Jurnal" : "Belum jurnal"}
                                </Badge>
                                <Button
                                  variant={hasJournal ? "secondary" : "primary"}
                                  className="text-xs px-3 py-1.5"
                                  onClick={() => setSelectedSessionId(s.id)}
                                >
                                  {hasJournal ? "Ubah" : "Isi Jurnal"}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="error">Batal</Badge>
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

          {/* Mode: Jurnal Susulan — UX-STABILITY: semua pertemuan, hijau/merah */}
          {mode === "susulan" && (
            <Card>
              <CardHeader
                title="Jurnal Susulan"
                description={`${recap.done} sudah berjurnal · ${recap.pending} belum berjurnal`}
              />
              {allAssignmentSessions.length === 0 ? (
                <EmptyState
                  title="Belum ada pertemuan"
                  description="Generate sesi dari menu Jadwal dulu."
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {/* UX-STABILITY: tampilkan SEMUA pertemuan (hijau/merah), bukan hanya yang belum */}
                  {[...recap.doneMeetings, ...recap.pendingMeetings]
                    .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod)
                    .map((s, i) => {
                    const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
                    const isPast = s.date < todayISODate();
                    const isActive = selectedSessionId === s.id;
                    const done = recap.doneMeetings.some((d) => d.id === s.id);
                    return (
                      <div
                        key={s.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isActive
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                            : done
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-rose-300 bg-rose-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">Pertemuan {i + 1}</span>
                              <span className="text-xs text-slate-500">· {formatLongDateID(s.date)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isManual ? "Manual" : `Jam ${s.startPeriod} · ${s.startTime}–${s.endTime}`}
                              {s.plannedUnitId ? " · Punya rencana materi" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isActive ? (
                              <Badge variant="success">Sedang diisi</Badge>
                            ) : (
                              <>
                                <Badge variant={done ? "success" : "error"}>
                                  {done ? "Sudah jurnal" : isPast ? "Susulan" : "Belum jurnal"}
                                </Badge>
                                <Button
                                  variant={done ? "secondary" : "primary"}
                                  className="text-xs px-3 py-1"
                                  onClick={() => {
                                    setDate(s.date);
                                    setSelectedSessionId(s.id);
                                  }}
                                >
                                  {done ? "Ubah" : "Buat Jurnal"}
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

          {/* Mode: Jurnal Manual — JOURNAL-REVIEW-NARRATIVE-03: label jadi 'Buat Jurnal di Luar Jadwal' */}
          {mode === "manual" && (
            <Card>
              <CardHeader
                title="Buat Jurnal di Luar Jadwal"
                description={`Jurnal darurat untuk ${assignmentShortLabel(assignment)} di ${formatLongDateID(date)}`}
              />
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
                <p className="text-xs text-amber-900">
                  <strong>Catatan:</strong> Mode ini hanya untuk kondisi darurat bila sesi tidak tersedia di jadwal.
                  Untuk jurnal reguler, gunakan <em>Hari Ini</em> atau <em>Jurnal Susulan</em>.
                </p>
              </div>
              <Button onClick={handleStartManualJournal}>Mulai Jurnal Darurat</Button>
              <p className="text-xs text-slate-500 mt-2">
                Bila sudah ada sesi manual untuk tanggal+kelas+mapel ini, sesi akan dipakai ulang.
              </p>
            </Card>
          )}

          {selectedSessionId && (
            <div ref={editorRef}>
              <QuickJournalEditor
                sessionId={selectedSessionId}
                academicYearId={year?.id ?? ""}
                schoolName={school?.name ?? ""}
                teacherName={assignment?.teacherName ?? teacher?.name ?? ""}
                onSaved={(msg) => {
                  setMessage({ type: "success", text: msg });
                  void loadAssignmentData();
                  // UX-DAILY-03: clear selection setelah simpan di mode susulan
                  if (mode === "susulan") setSelectedSessionId(null);
                }}
                onError={(msg) => setMessage({ type: "error", text: msg })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QuickJournalEditor({
  sessionId,
  academicYearId,
  schoolName,
  teacherName,
  onSaved,
  onError,
}: {
  sessionId: string;
  academicYearId: string;
  schoolName: string;
  teacherName: string;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [needsAttendance, setNeedsAttendance] = useState(false);
  const [showDocument, setShowDocument] = useState(false);

  // JOURNAL-REVIEW-NARRATIVE-03 §4: review state
  const [reviewOpened, setReviewOpened] = useState(false);

  // Realization + material + followUp (existing schema fields)
  const [realizationStatus, setRealizationStatus] = useState<RealizationStatus>("done");
  const [actualMaterialTitle, setActualMaterialTitle] = useState("");
  const [followUp, setFollowUp] = useState("");

  // JOURNAL-REVIEW-NARRATIVE-03 §5: structured input (stored as JSON in `note`)
  const [activities, setActivities] = useState<string[]>([]);
  const [studentResponse, setStudentResponse] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [freeNote, setFreeNote] = useState("");

  const [availableUnits, setAvailableUnits] = useState<ProtaUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // Helper: reset reviewOpened saat input berubah (spec §4: "Jika isi jurnal berubah setelah review, reviewOpened kembali false.")
  function invalidateReview() {
    setReviewOpened(false);
  }

  // Wrapped setters that invalidate review
  function setActualMaterial(v: string) { setActualMaterialTitle(v); invalidateReview(); }
  function setActivitiesList(v: string[]) { setActivities(v); invalidateReview(); }
  function setResponse(v: string) { setStudentResponse(v); invalidateReview(); }
  function setObstacleVal(v: string) { setObstacle(v); invalidateReview(); }
  function setFreeNoteVal(v: string) { setFreeNote(v); invalidateReview(); }
  function setFollowUpVal(v: string) { setFollowUp(v); invalidateReview(); }
  function setRealization(v: RealizationStatus) { setRealizationStatus(v); invalidateReview(); }

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const roster = academicYearId ? await findClassRoster(academicYearId, sess.classId) : null;

      if (academicYearId) {
        const ps = await listProtaProfiles(academicYearId);
        const matchingProta = ps.find((p) => p.subject === sess.subject);
        if (matchingProta) {
          const units = matchingProta.units.filter((u) => u.semester === sess.semester);
          setAvailableUnits(units);
        }
      }

      // PATCH-FLOW-RC2D: jangan auto-create absensi
      const result = await initJournalForSessionFull({
        session: sess,
        roster: roster ?? null,
        plannedUnit: null,
      });
      if (result) {
        setJournal(result.journal);
        setNeedsAttendance(result.needsAttendance);
        setRealizationStatus(result.journal.realizationStatus);
        setActualMaterialTitle(result.journal.actualMaterialTitle ?? "");
        setFollowUp(result.journal.followUp ?? "");
        // JOURNAL-REVIEW-NARRATIVE-03: unpack structured note
        const structured = unpackStructuredNote(result.journal.note);
        setActivities(structured.activities);
        setStudentResponse(structured.studentResponse);
        setObstacle(structured.obstacle);
        setFreeNote(structured.freeNote);
        if (result.journal.plannedUnitId) setSelectedUnitId(result.journal.plannedUnitId);
        // Review dimulai tertutup. Bila jurnal sudah final, anggap review sudah dilakukan.
        setReviewOpened(result.journal.locked);
      }
      setLoading(false);
    })();
  // RELEASE-FIXPACK-P1-P2-01: tambah academicYearId ke deps untuk hindari stale closure
  }, [sessionId, academicYearId]);

  // JOURNAL-REVIEW-NARRATIVE-03 §6: build narrative on-the-fly for preview/print
  const narrative = useMemo(
    () => buildJournalNarrative({
      material: actualMaterialTitle || journal?.plannedMaterialTitle || "",
      activities,
      studentResponse,
      obstacle,
      followUp,
      freeNote,
    }),
    [actualMaterialTitle, journal, activities, studentResponse, obstacle, followUp, freeNote],
  );

  // JOURNAL-REVIEW-NARRATIVE-03 §4: tombol final aktif hanya bila canFinalizeJournal.ok
  const finalizeCheck = canFinalizeJournal({
    material: actualMaterialTitle || journal?.plannedMaterialTitle || "",
    activities,
    reviewOpened,
  });

  async function handleSaveDraft() {
    if (!journal) return;
    try {
      const structuredNote = packStructuredNote({ activities, studentResponse, obstacle, freeNote });
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: structuredNote,
        followUp: followUp || undefined,
      });
      if (updated) {
        setJournal(updated);
        onSaved("Draft jurnal tersimpan.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  // JOURNAL-REVIEW-NARRATIVE-03: Setujui & Finalkan = review + finalize
  async function handleApproveAndFinalize() {
    if (!journal) return;
    // Spec §4: validasi final wajib review dibuka
    if (!finalizeCheck.ok) {
      // RELEASE-FIXPACK-P1-P2-01: jangan panggil onError dengan string kosong.
      // Hanya panggil onError bila ada pesan error yang jelas.
      onError(finalizeCheck.message);
      return;
    }
    try {
      const structuredNote = packStructuredNote({ activities, studentResponse, obstacle, freeNote });
      // Simpan input dulu
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: structuredNote,
        followUp: followUp || undefined,
      });
      if (!updated) {
        onError("Gagal menyimpan input.");
        return;
      }
      // Lalu finalize (lock)
      const result = await finalizeJournal(updated.id);
      if (result.success && result.journal) {
        setJournal(result.journal);
        onSaved("Jurnal disetujui & difinalkan (terkunci).");
      } else {
        onError(result.errors.join(", ") || "Gagal finalisasi jurnal.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal finalisasi.");
    }
  }

  async function handleUnlock() {
    if (!journal) return;
    try {
      const unlocked = await unlockJournal(journal.id);
      if (unlocked) {
        setJournal(unlocked);
        setReviewOpened(false); // reset review saat buka revisi
        onSaved("Jurnal dibuka kembali (draft).");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal unlock.");
    }
  }

  async function handleCopyPrevious() {
    if (!session || !journal) return;
    try {
      const allJournals = await listJournals(session.academicYearId, session.semester);
      const prev = allJournals
        .filter(
          (j) =>
            j.classId === session.classId &&
            j.subject === session.subject &&
            j.date < session.date
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (prev) {
        setActualMaterialTitle(prev.actualMaterialTitle ?? prev.plannedMaterialTitle ?? "");
        const structured = unpackStructuredNote(prev.note);
        setActivities(structured.activities);
        setStudentResponse(structured.studentResponse);
        setObstacle(structured.obstacle);
        setFreeNote(structured.freeNote);
        setFollowUp(prev.followUp ?? "");
        setRealizationStatus(prev.realizationStatus);
        invalidateReview();
        onSaved("Disalin dari jurnal sebelumnya. Buka review lalu Setujui & Finalkan.");
      } else {
        onError("Tidak ada jurnal sebelumnya untuk kelas+mapel ini.");
      }
    } catch (e) {
      void e;
      onError("Gagal salin jurnal sebelumnya.");
    }
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId);
    if (unit) {
      setActualMaterial(unit.title);
    }
  }

  // Toggle activity chip
  function toggleActivity(activity: string) {
    if (activities.includes(activity)) {
      setActivitiesList(activities.filter((a) => a !== activity));
    } else {
      setActivitiesList([...activities, activity]);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat jurnal...</p>;
  if (!session || !journal) return null;

  const isLocked = journal.locked;
  const isManualSession = session.teachingScheduleId === "manual" || session.teachingScheduleId === "susulan";
  const effectiveMaterial = actualMaterialTitle || journal.plannedMaterialTitle || "";

  return (
    <Card>
      <CardHeader
        title={`Jurnal — ${session.classLabel}`}
        description={`${session.subject} · ${formatLongDateID(journal.date)}${isManualSession ? " · Darurat" : ` · Jam ${session.startPeriod}`}`}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge variant={isLocked ? "success" : "neutral"}>{isLocked ? "Final" : "Draft"}</Badge>
        {reviewOpened && !isLocked && <Badge variant="success">✓ Review dibuka</Badge>}
        {journal.totalStudents > 0 && (
          <Badge variant="neutral">
            H:{journal.presentCount} S:{journal.sickCount} I:{journal.excusedCount} A:{journal.absentCount}
          </Badge>
        )}
      </div>

      {/* PATCH-FLOW-RC2D: warning bila belum ada absensi */}
      {needsAttendance && !isLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
          <p className="font-semibold text-amber-900 text-sm">Belum ada absensi untuk sesi ini</p>
          <p className="text-xs text-amber-800 mt-1">
            Jurnal tidak akan punya data kehadiran. Buat absensi dulu di menu Absen
            (pilih sesi yang sama), atau lanjut simpan draft tanpa data kehadiran.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => (window.location.hash = `/attendance?sessionId=${session.id}`)}
            >
              Buat Absensi Dulu
            </Button>
          </div>
        </div>
      )}

      {/* Auto-fill info */}
      <div className="p-3 bg-slate-50 rounded-md space-y-1 text-sm mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
          Auto-fill (dari assignment + sesi + Prota + absensi)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-slate-500">Guru:</span> <strong>{teacherName}</strong></div>
          <div><span className="text-slate-500">Mapel:</span> <strong>{journal.subject}</strong></div>
          <div><span className="text-slate-500">Kelas:</span> <strong>{journal.classLabel}</strong></div>
          <div><span className="text-slate-500">Tanggal:</span> <strong>{formatLongDateID(journal.date)}</strong></div>
          <div><span className="text-slate-500">Materi (Promes):</span> <strong>{journal.plannedMaterialTitle ?? "-"}</strong></div>
          <div><span className="text-slate-500">TP:</span> <strong>{journal.plannedLearningOutcome ?? "-"}</strong></div>
        </div>
      </div>

      {/* JOURNAL-REVIEW-NARRATIVE-03 §4: tombol Simpan Draft + Lihat Review / Setujui & Finalkan */}
      <div className="flex gap-2 flex-wrap mb-4">
        {!isLocked ? (
          <>
            <Button
              onClick={handleApproveAndFinalize}
              disabled={!finalizeCheck.ok}
              className="bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✓ Setujui & Finalkan
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft}>
              Simpan Draft
            </Button>
            <Button
              variant={reviewOpened ? "primary" : "secondary"}
              onClick={() => { setReviewOpened(true); setShowDocument(true); }}
            >
              {reviewOpened ? "✓ Review Dibuka" : "Lihat Review"}
            </Button>
            <Button variant="secondary" onClick={handleCopyPrevious}>
              Salin Sebelumnya
            </Button>
          </>
        ) : (
          <>
            <Badge variant="success">Jurnal Final (terkunci)</Badge>
            <Button variant="secondary" onClick={handleUnlock}>
              Buka Kembali
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
          {showDocument ? "Mode Kerja" : "Mode Dokumen"}
        </Button>
      </div>

      {/* Validasi hint */}
      {!isLocked && !finalizeCheck.ok && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 mb-4">
          ⚠ {finalizeCheck.message}
        </div>
      )}

      <div className="space-y-3">
        {availableUnits.length > 0 && (
          <Select
            label="Ganti Materi (dari Prota)"
            id="jrn-unit"
            value={selectedUnitId}
            onChange={handleUnitChange}
            options={[
              { value: "", label: "-- Pakai materi Promes --" },
              ...availableUnits.map((u) => ({ value: u.id, label: `${u.title} (${u.jp} JP)` })),
            ]}
          />
        )}

        <Input
          label="Materi / Pokok Bahasan"
          id="jrn-material"
          value={actualMaterialTitle}
          onChange={setActualMaterial}
          placeholder={journal.plannedMaterialTitle ?? "Tulis materi"}
        />

        {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Kegiatan Pembelajaran (chip quick choices) */}
        <div>
          <label className="label">Kegiatan Pembelajaran</label>
          <div className="flex gap-2 flex-wrap">
            {JOURNAL_ACTIVITY_CHOICES.map((kegiatan) => (
              <button
                key={kegiatan}
                type="button"
                disabled={isLocked}
                onClick={() => toggleActivity(kegiatan)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  activities.includes(kegiatan)
                    ? "border-brand-500 bg-brand-100 text-brand-800"
                    : "border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100"
                } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {kegiatan}
              </button>
            ))}
          </div>
          {activities.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Terpilih: {activities.join(", ")}
            </p>
          )}
        </div>

        <Select
          label="Realisasi"
          id="jrn-real"
          value={realizationStatus}
          onChange={(v) => setRealization(v as RealizationStatus)}
          options={REALIZATION_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        />

        {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Respons Siswa (chip quick choices) */}
        <div>
          <label className="label">Respons Siswa</label>
          <div className="flex gap-2 flex-wrap">
            {JOURNAL_RESPONSE_CHOICES.map((resp) => (
              <button
                key={resp}
                type="button"
                disabled={isLocked}
                onClick={() => setResponse(studentResponse === resp ? "" : resp)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  studentResponse === resp
                    ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                    : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {resp}
              </button>
            ))}
          </div>
        </div>

        {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Kendala / Catatan (chip quick choices) */}
        <div>
          <label className="label">Kendala / Catatan</label>
          <div className="flex gap-2 flex-wrap">
            {JOURNAL_OBSTACLE_CHOICES.map((obs) => (
              <button
                key={obs}
                type="button"
                disabled={isLocked}
                onClick={() => setObstacleVal(obstacle === obs ? "" : obs)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  obstacle === obs
                    ? "border-amber-500 bg-amber-100 text-amber-800"
                    : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {obs}
              </button>
            ))}
          </div>
        </div>

        {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Catatan tambahan bebas */}
        <Textarea
          label="Catatan Tambahan (opsional)"
          id="jrn-freenote"
          value={freeNote}
          onChange={setFreeNoteVal}
          rows={2}
          placeholder="Catatan tambahan dari guru..."
        />

        {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Tindak Lanjut (chip quick choices) */}
        <div>
          <label className="label">Tindak Lanjut</label>
          <div className="flex gap-2 flex-wrap">
            {JOURNAL_FOLLOWUP_CHOICES.map((fu) => (
              <button
                key={fu}
                type="button"
                disabled={isLocked}
                onClick={() => setFollowUpVal(followUp === fu ? "" : fu)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  followUp === fu
                    ? "border-sky-500 bg-sky-100 text-sky-800"
                    : "border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100"
                } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {fu}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* JOURNAL-REVIEW-NARRATIVE-03 §8: Preview pakai narrative */}
      {showDocument && (
        <div className="print-area mt-4">
          <div className="document-page document-portrait">
            <div className="document-title">JURNAL MENGAJAR</div>
            <div className="document-subtitle">{schoolName}</div>
            <table className="document-identity">
              <tbody>
                <tr>
                  <td>Mata Pelajaran</td><td>{journal.subject}</td>
                  <td>Kelas</td><td>{journal.classLabel}</td>
                </tr>
                <tr>
                  <td>Guru</td><td>{teacherName}</td>
                  <td>Tanggal</td><td>{formatLongDateID(journal.date)}</td>
                </tr>
                <tr>
                  <td>Jam ke</td><td>{isManualSession ? "Darurat" : `${session.startPeriod} (${session.startTime}–${session.endTime})`}</td>
                  <td>Realisasi</td><td>{REALIZATION_OPTIONS.find((s) => s.value === realizationStatus)?.label}</td>
                </tr>
              </tbody>
            </table>
            <table className="document-table">
              <tbody>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Materi</td><td>{effectiveMaterial || "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td><td>{journal.plannedLearningOutcome ?? "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kehadiran</td><td>H: {journal.presentCount} · S: {journal.sickCount} · I: {journal.excusedCount} · A: {journal.absentCount} · Total: {journal.totalStudents}</td></tr>
                {/* JOURNAL-REVIEW-NARRATIVE-03 §8: pakai narrative */}
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kegiatan Pembelajaran</td><td>{narrative.activityNarrative}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan / Respons Siswa</td><td>{narrative.noteNarrative}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tindak Lanjut</td><td>{narrative.followUpNarrative}</td></tr>
              </tbody>
            </table>
            <div className="signature-grid">
              <div>
                <p>{schoolName.split(" ").slice(-2).join(" ")}, {formatLongDateID(journal.date)}</p>
                <p>Guru Mata Pelajaran</p>
                <div className="sig-space" />
                <p className="sig-name">{teacherName}</p>
              </div>
            </div>
          </div>
          <div className="print-toolbar">
            <PrintExportButtons filename={`jurnal-${journal.classLabel}-${journal.date}`} title="Jurnal Mengajar" />
          </div>
        </div>
      )}
    </Card>
  );
}

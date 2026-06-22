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

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, ContextCard } from "../../shared/ui";
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
  ProtaProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import {
  assignmentShortLabel,
  recapJournalsForAssignment,
  buildContextInfo,
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

  useEffect(() => {
    void (async () => {
      const [y, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
      setActiveYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (y && tp) {
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) setSelectedSessionId(urlSessionId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
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
      setMessage({ type: "error", text: "Pilih Data Mengajar dulu." });
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

      {/* Step 1: Pilih Data Mengajar */}
      <Card>
        <CardHeader
          title="1. Pilih Data Mengajar"
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
            id="jrn-assignment"
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
              description={`Total ${recap.total} pertemuan (sesuai LessonSession)`}
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

          {/* Mode selector + date */}
          <Card>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[160px]">
                <Input label="" id="jrn-date" type="date" value={date} onChange={setDate} />
              </div>
              <div className="flex gap-2 flex-wrap">
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
                <Button
                  variant={mode === "manual" ? "primary" : "secondary"}
                  onClick={() => setMode("manual")}
                  className="text-sm"
                >
                  Jurnal Manual
                </Button>
              </div>
            </div>
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
                  description="Pilih tanggal lain, atau pakai Jurnal Susulan / Jurnal Manual."
                  action={
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setMode("susulan")}>Jurnal Susulan</Button>
                      <Button variant="secondary" onClick={() => setMode("manual")}>Jurnal Manual</Button>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => {
                    const hasJournal = journals.some((j) => j.sessionId === s.id);
                    const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`w-full text-left p-3 border rounded-md ${
                          selectedSessionId === s.id ? "border-brand-400 bg-brand-50" : "border-slate-200"
                        } ${s.status === "cancelled" ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">
                              {isManual ? "Manual" : `${s.startTime}–${s.endTime} · Jam ${s.startPeriod}`}
                            </span>
                            <Badge variant="neutral">{s.classLabel}</Badge>
                          </div>
                          <div className="flex gap-1">
                            {s.status === "planned" ? (
                              hasJournal ? (
                                <Badge variant="success">✓ Jurnal</Badge>
                              ) : (
                                <Badge variant="warning">Belum jurnal</Badge>
                              )
                            ) : (
                              <Badge variant="error">Batal</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Mode: Jurnal Susulan — daftar pertemuan belum jurnal */}
          {mode === "susulan" && (
            <Card>
              <CardHeader
                title="Jurnal Susulan"
                description={`${recap.pending} pertemuan belum berjurnal`}
              />
              {recap.pendingMeetings.length === 0 ? (
                <EmptyState
                  title="Semua pertemuan sudah berjurnal 🎉"
                  description="Tidak ada jurnal susulan tertunda."
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recap.pendingMeetings.map((s) => {
                    const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
                    const isPast = s.date < todayISODate();
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setDate(s.date);
                          setSelectedSessionId(s.id);
                        }}
                        className={`w-full text-left p-3 border rounded-md ${
                          isPast ? "border-amber-300 bg-amber-50" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {formatLongDateID(s.date)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {isManual ? "Manual" : `Jam ${s.startPeriod} · ${s.startTime}–${s.endTime}`}
                              {s.plannedUnitId ? " · Punya rencana materi" : ""}
                            </p>
                          </div>
                          <Badge variant="warning">
                            {isPast ? "Susulan" : "Belum jurnal"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Mode: Jurnal Manual */}
          {mode === "manual" && (
            <Card>
              <CardHeader
                title="Jurnal Manual"
                description={`Buat jurnal ad-hoc untuk ${assignmentShortLabel(assignment)} di ${formatLongDateID(date)}`}
              />
              <Button onClick={handleStartManualJournal}>Mulai Jurnal Manual</Button>
              <p className="text-xs text-slate-500 mt-2">
                Catatan: bila sudah ada sesi manual untuk tanggal+kelas+mapel ini, sesi akan dipakai ulang.
              </p>
            </Card>
          )}

          {selectedSessionId && (
            <QuickJournalEditor
              sessionId={selectedSessionId}
              academicYearId={year?.id ?? ""}
              schoolName={school?.name ?? ""}
              teacherName={assignment?.teacherName ?? teacher?.name ?? ""}
              onSaved={(msg) => {
                setMessage({ type: "success", text: msg });
                void loadAssignmentData();
              }}
              onError={(msg) => setMessage({ type: "error", text: msg })}
            />
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
  const [realizationStatus, setRealizationStatus] = useState<RealizationStatus>("done");
  const [actualMaterialTitle, setActualMaterialTitle] = useState("");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [protas, setProtas] = useState<ProtaProfile[]>([]);
  const [availableUnits, setAvailableUnits] = useState<ProtaUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const roster = academicYearId ? await findClassRoster(academicYearId, sess.classId) : null;

      if (academicYearId) {
        const ps = await listProtaProfiles(academicYearId); void protas;
        setProtas(ps);
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
        setNote(result.journal.note ?? "");
        setFollowUp(result.journal.followUp ?? "");
        if (result.journal.plannedUnitId) setSelectedUnitId(result.journal.plannedUnitId);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  async function handleSaveDraft() {
    if (!journal) return;
    try {
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: note || undefined,
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

  // PATCH-FLOW-RC2D: Setujui & Simpan = finalizeJournal (locked=true)
  async function handleApproveAndFinalize() {
    if (!journal) return;
    try {
      // Simpan input dulu
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: note || undefined,
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
        setNote(prev.note ?? "");
        setFollowUp(prev.followUp ?? "");
        setRealizationStatus(prev.realizationStatus);
        onSaved("Disalin dari jurnal sebelumnya. Klik Setujui & Finalkan.");
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
      setActualMaterialTitle(unit.title);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat jurnal...</p>;
  if (!session || !journal) return null;

  const isLocked = journal.locked;
  const isManualSession = session.teachingScheduleId === "manual" || session.teachingScheduleId === "susulan";

  return (
    <Card>
      <CardHeader
        title={`Jurnal — ${session.classLabel}`}
        description={`${session.subject} · ${formatLongDateID(journal.date)}${isManualSession ? " · Manual" : ` · Jam ${session.startPeriod}`}`}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge variant={isLocked ? "success" : "neutral"}>{isLocked ? "Final" : "Draft"}</Badge>
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

      <div className="flex gap-2 flex-wrap mb-4">
        {!isLocked ? (
          <>
            <Button onClick={handleApproveAndFinalize} className="bg-brand-600">
              ✓ Setujui & Finalkan
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft}>
              Simpan Draft
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
          label="Materi Aktual"
          id="jrn-material"
          value={actualMaterialTitle}
          onChange={setActualMaterialTitle}
          placeholder={journal.plannedMaterialTitle ?? "Tulis materi"}
        />

        <Select
          label="Realisasi"
          id="jrn-real"
          value={realizationStatus}
          onChange={(v) => setRealizationStatus(v as RealizationStatus)}
          options={REALIZATION_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        />

        <Textarea
          label="Catatan (opsional)"
          id="jrn-note"
          value={note}
          onChange={setNote}
          rows={2}
          placeholder="Catatan singkat..."
        />

        <Textarea
          label="Tindak Lanjut (opsional)"
          id="jrn-followup"
          value={followUp}
          onChange={setFollowUp}
          rows={2}
          placeholder="Rencana pertemuan berikutnya..."
        />
      </div>

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
                  <td>Jam ke</td><td>{isManualSession ? "Manual" : `${session.startPeriod} (${session.startTime}–${session.endTime})`}</td>
                  <td>Realisasi</td><td>{REALIZATION_OPTIONS.find((s) => s.value === realizationStatus)?.label}</td>
                </tr>
              </tbody>
            </table>
            <table className="document-table">
              <tbody>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Materi</td><td>{actualMaterialTitle || journal.plannedMaterialTitle || "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td><td>{journal.plannedLearningOutcome ?? "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kehadiran</td><td>H: {journal.presentCount} · S: {journal.sickCount} · I: {journal.excusedCount} · A: {journal.absentCount} · Total: {journal.totalStudents}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan</td><td>{note || "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tindak Lanjut</td><td>{followUp || "-"}</td></tr>
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
            <Button onClick={() => window.print()}>Cetak</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * PATCH-03: Quick Journal — jurnal 10-30 detik.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §4
 *
 * PATCH-FLOW-RC2C: jurnal MEETING-FIRST (bukan form-first).
 *
 * Flow:
 *   1. Pilih Data Mengajar (assignment) — kunci context.
 *   2. App tampilkan daftar PERTEMUAN (LessonSession) untuk assignment itu.
 *      - Pertemuan yang sudah ada jurnal → badge "✓ Jurnal".
 *      - Pertemuan yang belum → badge "Belum jurnal".
 *   3. Guru klik pertemuan → editor jurnal auto-fill:
 *      - Guru, Mapel, Kelas: dari assignment
 *      - Tanggal, Jam ke: dari pertemuan (LessonSession)
 *      - Materi, TP: dari Promes (plannedUnit)
 *      - Kehadiran: dari absensi
 *   4. Guru klik Setujui & Simpan.
 *
 * Jurnal Manual: bila tidak ada pertemuan di tanggal yang dipilih, guru bisa
 * buat pertemuan ad-hoc dari assignment + tanggal.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select } from "../../shared/ui";
import {
  getLessonSessionsByDate,
  getLessonSession,
  findOrCreateManualSession,
  listLessonSessions,
} from "../../shared/db/lesson-session-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { initJournalForSessionFull, updateJournal, listJournals } from "../../shared/db/journal-repo";
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
import { assignmentShortLabel } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type RealizationStatus = TeachingJournal["realizationStatus"];
const REALIZATION_OPTIONS: Array<{ value: RealizationStatus; label: string }> = [
  { value: "done", label: "Selesai" },
  { value: "continued", label: "Dilanjutkan" },
  { value: "cancelled", label: "Tidak Terlaksana" },
];

type JournalMode = "pertemuan" | "manual";

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

  // Load semua sesi + jurnal untuk assignment yang dipilih
  async function loadAssignmentData() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setSessions([]);
      setAllAssignmentSessions([]);
      setJournals([]);
      return;
    }
    // Sesi untuk tanggal yang dipilih
    const allToday = await getLessonSessionsByDate(teacher.id, date);
    const todayForAssignment = allToday.filter(
      (s) => s.classId === assignment.classId && s.subject === assignment.subject
    );
    setSessions(todayForAssignment);

    // Semua sesi untuk assignment (untuk daftar "belum jurnal")
    const allSessions = await listLessonSessions(year.id, assignment.semester);
    const assignmentSessions = allSessions.filter(
      (s) =>
        s.classId === assignment.classId &&
        s.subject === assignment.subject &&
        s.teacherId === assignment.teacherId &&
        !s.deletedAt
    );
    setAllAssignmentSessions(assignmentSessions);

    // Semua jurnal untuk assignment
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
      setMessage({
        type: "error",
        text: `Belum ada roster untuk kelas ${assignment.classLabel}.`,
      });
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
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Gagal membuat sesi jurnal manual.",
      });
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();
  const journalSessionIds = new Set(journals.map((j) => j.sessionId));

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

      {assignment && (
        <>
          {/* Mode selector + date */}
          <Card>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[160px]">
                <Input label="" id="jrn-date" type="date" value={date} onChange={setDate} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={mode === "pertemuan" ? "primary" : "secondary"}
                  onClick={() => setMode("pertemuan")}
                  className="text-sm"
                >
                  Daftar Pertemuan
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

          {/* Mode: Daftar Pertemuan */}
          {mode === "pertemuan" && (
            <Card>
              <CardHeader
                title="2. Pilih Pertemuan"
                description={`Tanggal ${formatLongDateID(date)} · ${sessions.length} sesi`}
              />
              {sessions.length === 0 ? (
                <EmptyState
                  title="Tidak ada pertemuan di tanggal ini"
                  description="Pilih tanggal lain, atau pakai Jurnal Manual."
                  action={
                    <Button variant="secondary" onClick={() => setMode("manual")}>
                      Jurnal Manual
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => {
                    const hasJournal = journalSessionIds.has(s.id);
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

              {/* Daftar pertemuan yang belum jurnal (susulan) */}
              {allAssignmentSessions.filter(
                (s) => !journalSessionIds.has(s.id) && s.date < todayISODate() && s.status === "planned"
              ).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">
                    Belum berjurnal (susulan, tanggal lewat):
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allAssignmentSessions
                      .filter(
                        (s) => !journalSessionIds.has(s.id) && s.date < todayISODate() && s.status === "planned"
                      )
                      .slice(0, 10)
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setDate(s.date);
                            setSelectedSessionId(s.id);
                          }}
                          className="w-full text-left p-2 border border-amber-200 bg-amber-50 rounded-md text-xs hover:bg-amber-100"
                        >
                          {formatLongDateID(s.date)} · Jam {s.startPeriod} ·{" "}
                          {s.plannedUnitId ? "Punya rencana Prota" : "Tanpa rencana"}
                        </button>
                      ))}
                  </div>
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

      const j = await initJournalForSessionFull({
        session: sess,
        roster: roster ?? null,
        plannedUnit: null,
      });
      if (j) {
        setJournal(j);
        setRealizationStatus(j.realizationStatus);
        setActualMaterialTitle(j.actualMaterialTitle ?? "");
        setNote(j.note ?? "");
        setFollowUp(j.followUp ?? "");
        if (j.plannedUnitId) setSelectedUnitId(j.plannedUnitId);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  async function handleApproveAndSave() {
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
        onSaved("Jurnal disetujui & disimpan.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
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
        onSaved("Disalin dari jurnal sebelumnya. Klik Setujui & Simpan.");
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
        <Button onClick={handleApproveAndSave} disabled={isLocked} className="bg-brand-600">
          ✓ Setujui & Simpan
        </Button>
        <Button variant="secondary" onClick={handleCopyPrevious} disabled={isLocked}>
          Salin Sebelumnya
        </Button>
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

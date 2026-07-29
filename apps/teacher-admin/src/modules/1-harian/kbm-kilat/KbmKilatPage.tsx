/**
 * KbmKilatPage — Mode KBM Kilat: Accordion flow cepat isi KBM.
 *
 * Flow: Presensi → Jurnal → (Opsional) Nilai → Simpan
 * Guru mengisi seluruh KBM satu sesi dalam 1 layar, step-by-step.
 *
 * UX Pattern:
 *   - Accordion step-by-step (step 1 terbuka, lainnya hidden)
 *   - Setelah selesai step 1 → step 2 muncul & auto-open
 *   - Step 3 (Nilai) opsional — muncul setelah step 2 selesai
 *   - Bottom bar SIMPAN muncul setelah step 2 selesai
 *   - Mobile-first, touch-optimized
 *
 * Data layer:
 *   - attendance-repo: initAttendanceForSession, updateAttendance
 *   - journal-repo: initJournalForSession, updateJournal
 *   - lesson-session-repo: getLessonSessionsByDate, getLessonSession
 *   - class-roster-repo: findClassRoster
 *   - profile-repo: getActiveAcademicYear, getTeacherProfile
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 * Import dari @shared/db dan @guru-admin/domain saja.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLessonSessionsByDate, getLessonSession } from "@shared/db/lesson-session-repo";
import { initAttendanceForSession, updateAttendance } from "@shared/db/attendance-repo";
import { initJournalForSession, updateJournal } from "@shared/db/journal-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "@shared/db/profile-repo";
import { summarizeAttendance } from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceRecord,
  ClassRoster,
  LessonSession,
  TeachingJournal,
  TeacherProfile,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { LoadingState } from "@shared/ui";

/* ============================================================ */
/*  Types & Constants                                            */
/* ============================================================ */

type Status = AttendanceRecord["status"];

const STATUS_OPTIONS: Array<{ value: Status; short: string; label: string; color: string }> = [
  { value: "present", short: "H", label: "Hadir", color: "bg-emerald-600 text-white" },
  { value: "sick", short: "S", label: "Sakit", color: "bg-amber-500 text-white" },
  { value: "excused", short: "I", label: "Izin", color: "bg-blue-500 text-white" },
  { value: "late", short: "T", label: "Terlambat", color: "bg-orange-500 text-white" },
  { value: "absent", short: "A", label: "Alpa", color: "bg-rose-600 text-white" },
];

const INACTIVE_BTN = "bg-slate-200 text-slate-600";

type StepState = "pending" | "active" | "done";

/* ============================================================ */
/*  Component                                                    */
/* ============================================================ */

export function KbmKilatPage() {
  const [searchParams] = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [_teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<LessonSession | null>(null);

  // Data
  const [_roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, Status>>(new Map());
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [journalInput, setJournalInput] = useState({ actualMaterialTitle: "", note: "" });

  // Step flow
  const [presensiStep, setPresensiStep] = useState<StepState>("active");
  const [jurnalStep, setJurnalStep] = useState<StepState>("pending");
  const [nilaiStep, setNilaiStep] = useState<StepState>("pending");
  const [showBottomBar, setShowBottomBar] = useState(false);

  // Optional nilai
  const [showNilaiSheet, setShowNilaiSheet] = useState(false);
  const [nilaiMap, setNilaiMap] = useState<Map<string, number>>(new Map());

  // Status
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Init ---- */
  useEffect(() => {
    void (async () => {
      try {
        const activeYear = await getActiveAcademicYear();
        const profile = await getTeacherProfile();
        setYear(activeYear ?? null);
        setTeacher(profile);

        if (activeYear && profile) {
          const todaySessions = await getLessonSessionsByDate(profile.id, todayISODate());
          setSessions(todaySessions);

          const sid = searchParams.get("sessionId");
          if (sid) {
            setSelectedSessionId(sid);
          } else if (todaySessions.length > 0) {
            setSelectedSessionId(todaySessions[0].id);
          }
        }
      } catch (err) {
        console.error("[KbmKilat] Gagal init:", err);
        setNotice("Gagal memuat data. Coba muat ulang.");
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  /* ---- Load session data ---- */
  useEffect(() => {
    if (!selectedSessionId || !year) return;
    void (async () => {
      try {
        const session = await getLessonSession(selectedSessionId);
        if (!session) return;
        setSelectedSession(session);

        const r = await findClassRoster(year.id, session.classId);
        setRoster(r ?? null);

        const attRecords = await initAttendanceForSession({
          sessionId: session.id,
          date: session.date,
          roster: r ?? null,
        });
        setRecords(attRecords);
        setChanges(new Map()); // reset changes

        // Init journal
        const j = await initJournalForSession({
          session,
          attendanceRecords: attRecords,
        });
        setJournal(j);
        setJournalInput({
          actualMaterialTitle: j.actualMaterialTitle ?? "",
          note: j.note ?? "",
        });

        // Reset step flow
        setPresensiStep("active");
        setJurnalStep("pending");
        setNilaiStep("pending");
        setShowBottomBar(false);
        setShowNilaiSheet(false);
      } catch (err) {
        console.error("[KbmKilat] Gagal memuat sesi:", err);
      }
    })();
  }, [selectedSessionId, year]);

  /* ---- Computed ---- */
  const effectiveRecords = useMemo(() => {
    return records.map((r) => ({
      ...r,
      status: changes.get(r.studentId) ?? r.status,
    }));
  }, [records, changes]);

  const summary = useMemo(() => summarizeAttendance(effectiveRecords), [effectiveRecords]);

  const absentList = useMemo(() => {
    return effectiveRecords
      .filter((r) => r.status !== "present" && r.status !== "late")
      .map((r) => {
        const opt = STATUS_OPTIONS.find((o) => o.value === r.status);
        return `${r.studentName} (${opt?.short ?? "?"})`;
      });
  }, [effectiveRecords]);

  /* ---- Actions ---- */
  function setStatus(studentId: string, status: Status) {
    const next = new Map(changes);
    next.set(studentId, status);
    setChanges(next);
  }

  function donePresensi() {
    setPresensiStep("done");
    setJurnalStep("active");
  }

  function doneJurnal() {
    setJurnalStep("done");
    setNilaiStep("active");
    setShowBottomBar(true);
  }

  const saveAll = useCallback(async () => {
    if (!selectedSessionId || !journal) return;
    setSaving(true);
    try {
      // 1. Save attendance changes
      if (changes.size > 0) {
        const payload = Array.from(changes.entries()).map(([studentId, status]) => ({
          studentId,
          status,
        }));
        const updated = await updateAttendance(selectedSessionId, payload);
        setRecords(updated);
        setChanges(new Map());
      }

      // 2. Save journal
      await updateJournal(journal.id, {
        actualMaterialTitle: journalInput.actualMaterialTitle || undefined,
        note: journalInput.note || undefined,
      });

      // 3. Save nilai (if any)
      if (nilaiMap.size > 0) {
        // TODO: integrate with grade-repo when available
        console.log("[KbmKilat] Nilai saved:", Object.fromEntries(nilaiMap));
      }

      setNotice("KBM berhasil disimpan!");
    } catch (err) {
      console.error("[KbmKilat] Gagal simpan:", err);
      setNotice("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }, [selectedSessionId, journal, changes, journalInput, nilaiMap]);

  /* ---- Render ---- */
  if (loading) return <LoadingState />;
  if (!year) return <EmptyState title="Belum ada tahun pelajaran aktif" />;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-1">
          <span className="bg-blue-800/80 text-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-400/30">
            Mode KBM Kilat
          </span>
          <span className="text-xs text-blue-100 font-medium">
            {formatLongDateID(todayISODate())}
          </span>
        </div>

        {/* Session selector */}
        {sessions.length > 0 ? (
          <select
            value={selectedSessionId ?? ""}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full bg-blue-800/50 text-white text-sm font-bold rounded-xl p-2 mt-2 border border-blue-400/30 outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="text-slate-800">
                {s.classLabel} — {s.subject} (Jam {s.startPeriod}{s.durationJP > 1 ? ` - ${s.startPeriod + s.durationJP - 1}` : ""})
              </option>
            ))}
          </select>
        ) : (
          <h1 className="text-lg font-bold leading-tight mt-1">Tidak ada sesi hari ini</h1>
        )}

        {selectedSession && (
          <p className="text-xs text-blue-100/90 mt-1">
            Jam Ke: <span className="font-semibold text-white">
              {selectedSession.startPeriod}{selectedSession.durationJP > 1 ? ` - ${selectedSession.startPeriod + selectedSession.durationJP - 1}` : ""}
            </span>
          </p>
        )}
      </div>

      {/* Notice */}
      {notice && (
        <div className={`p-3 rounded-xl text-xs font-bold text-center ${
          notice.includes("berhasil") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {notice}
          <button onClick={() => setNotice(null)} className="ml-2 opacity-60">✕</button>
        </div>
      )}

      {/* No session */}
      {!selectedSession && (
        <EmptyState title="Tidak ada sesi mengajar hari ini" description="Buat jadwal terlebih dahulu dari menu Jadwal." />
      )}

      {selectedSession && (
        <>
          {/* STEP 1: PRESENSI */}
          <AccordionCard
            step={1}
            title="Presensi Siswa"
            subtitle={presensiStep === "done" ? "Presensi selesai diisi" : "Klik untuk isi presensi (Default Hadir)"}
            state={presensiStep}
            defaultOpen={presensiStep === "active"}
          >
            {/* Summary stats */}
            <div className="grid grid-cols-5 gap-2 mb-3 text-center">
              <MiniStat label="H" value={summary.present} color="text-emerald-600" />
              <MiniStat label="S" value={summary.sick} color="text-amber-600" />
              <MiniStat label="I" value={summary.excused} color="text-blue-600" />
              <MiniStat label="T" value={summary.late} color="text-orange-600" />
              <MiniStat label="A" value={summary.absent} color="text-rose-600" />
            </div>

            {/* Student rows */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {effectiveRecords.map((record, idx) => {
                const currentStatus = record.status;
                return (
                  <div key={record.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-700 truncate w-32">
                      {idx + 1}. {record.studentName}
                    </span>
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setStatus(record.studentId, opt.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            currentStatus === opt.value ? opt.color : INACTIVE_BTN
                          }`}
                        >
                          {opt.short}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {records.length > 0 && (
              <button
                onClick={donePresensi}
                className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl mt-3 active:scale-[0.98] transition-transform"
              >
                Selesai Presensi (Lanjut Jurnal)
              </button>
            )}
          </AccordionCard>

          {/* STEP 2: JURNAL MENGAJAR */}
          <AccordionCard
            step={2}
            title="Jurnal Mengajar"
            subtitle={jurnalStep === "done" ? "Jurnal selesai diisi" : "Isi materi & kegiatan pembelajaran"}
            state={jurnalStep}
            defaultOpen={jurnalStep === "active"}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Materi / Tujuan Pembelajaran
                </label>
                <textarea
                  value={journalInput.actualMaterialTitle}
                  onChange={(e) => setJournalInput((prev) => ({ ...prev, actualMaterialTitle: e.target.value }))}
                  placeholder="Tulis materi yang diajarkan..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Catatan / Kegiatan
                </label>
                <textarea
                  value={journalInput.note}
                  onChange={(e) => setJournalInput((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Catatan tambahan (opsional)..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Tidak Hadir (Auto-Sync)
                </label>
                <input
                  type="text"
                  readOnly
                  value={absentList.length > 0 ? absentList.join(", ") : "Nihil (-)"}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl p-2 text-xs outline-none"
                />
              </div>

              <button
                onClick={doneJurnal}
                className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl mt-1 active:scale-[0.98] transition-transform"
              >
                Selesai Isi Jurnal
              </button>
            </div>
          </AccordionCard>

          {/* STEP 3: NILAI OPSIONAL */}
          {nilaiStep === "active" && (
            <div>
              <button
                onClick={() => setShowNilaiSheet(true)}
                className="w-full active:scale-[0.98] transition-transform bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📝</span>
                  <div className="text-left">
                    <p className="font-bold">Input Nilai Ulangan Hari Ini?</p>
                    <p className="text-[10px] text-amber-600 font-normal">Klik jika ada pengambilan nilai (Opsional)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  nilaiMap.size > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-200 text-amber-900"
                }`}>
                  {nilaiMap.size > 0 ? "Nilai Terisi" : "+ Isi Nilai"}
                </span>
              </button>
            </div>
          )}

          {/* BOTTOM BAR: SIMPAN */}
          {showBottomBar && (
            <div className="sticky bottom-4 z-10 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-lg">
              <button
                onClick={saveAll}
                disabled={saving}
                className={`w-full font-bold py-3.5 px-4 rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-[0.98] ${
                  saving
                    ? "bg-slate-400 text-white cursor-wait"
                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
                }`}
              >
                {saving ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Menyimpan...
                  </>
                ) : (
                  <>SIMPAN SEMUA DATA KBM</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Bottom Sheet: Nilai Input */}
      {showNilaiSheet && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 z-40"
            onClick={() => setShowNilaiSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[28px] z-50 p-4 pb-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3" />
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Form Nilai Ulangan</h3>
              <button
                onClick={() => setShowNilaiSheet(false)}
                className="text-slate-400 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1 my-2">
              {effectiveRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700">{record.studentName}</span>
                  <input
                    type="number"
                    placeholder="0-100"
                    min={0}
                    max={100}
                    value={nilaiMap.get(record.studentId) ?? ""}
                    onChange={(e) => {
                      const next = new Map(nilaiMap);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 0 && val <= 100) {
                        next.set(record.studentId, val);
                      } else if (e.target.value === "") {
                        next.delete(record.studentId);
                      }
                      setNilaiMap(next);
                    }}
                    className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowNilaiSheet(false)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-xs mt-2"
            >
              Selesai Isi Nilai
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================ */
/*  Sub-components                                               */
/* ============================================================ */

/** Accordion card with step indicator */
function AccordionCard({
  step,
  title,
  subtitle,
  state,
  defaultOpen = false,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  state: StepState;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Auto-open when state becomes active
  useEffect(() => {
    if (state === "active") setOpen(true);
  }, [state]);

  const isDone = state === "done";
  const isPending = state === "pending";

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
      isPending ? "border-slate-100 opacity-60" : "border-slate-200"
    }`}>
      {/* Header */}
      <button
        onClick={() => !isPending && setOpen(!open)}
        disabled={isPending}
        className={`w-full p-4 text-left flex justify-between items-center bg-white active:scale-[0.99] transition-transform ${
          isPending ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center ${
            isDone
              ? "bg-emerald-100 text-emerald-700"
              : isPending
                ? "bg-slate-100 text-slate-400"
                : "bg-blue-100 text-blue-700"
          }`}>
            {isDone ? "✓" : step}
          </span>
          <div>
            <h2 className="text-xs font-bold text-slate-800">{title}</h2>
            <p className={`text-[10px] ${isDone ? "text-emerald-600" : "text-slate-500"}`}>
              {subtitle}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {open && !isPending && (
        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
          {children}
        </div>
      )}
    </div>
  );
}

/** Mini stat badge */
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-[9px] font-extrabold text-slate-500">{label}</div>
    </div>
  );
}

/** Empty state placeholder */
function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3">📋</div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

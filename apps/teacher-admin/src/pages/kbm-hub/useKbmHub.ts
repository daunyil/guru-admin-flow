/**
 * useKbmHub — Unified state hook for KBM Hub (Clean Break module).
 *
 * STRATEGI CLEAN BREAK: Modul baru terisolasi dari UI legacy.
 *   - TIDAK mengedit komponen UI legacy (AttendancePage, JournalPage, dll).
 *   - Mengimpor fungsi DB/services yang SUDAH ADA di project.
 *   - Tidak membuat fungsi DB baru dari nol.
 *
 * UNIFIED UX: 1 halaman KBM untuk semua kebutuhan guru:
 *   - Dashboard sesi hari ini (status overview)
 *   - Editor KBM (Presensi → Jurnal → Nilai → Simpan/Finalisasi)
 *
 * Data flow:
 *   1. Init: load year, teacher, assignments (ALWAYS available)
 *   2. Dashboard: today's sessions with status (done/partial/unfilled)
 *   3. Select session → initAttendance + initJournal
 *   4. Presensi: changes Map → donePresensi
 *   5. Jurnal: structured note (4 categories) + narasi → doneJurnal
 *   6. Nilai (optional): toggle ON → nilaiMap
 *   7. saveAll → attendance-repo + journal-repo + gradebook-repo
 *   8. No lock/finalize — everything stays editable after save
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getLessonSessionsByDate,
  getLessonSession,
  findOrCreateManualSession,
  listLessonSessions,
  updateLessonSession,
} from "@shared/db/lesson-session-repo";
import {
  initAttendanceForSession,
  updateAttendance,
  getAttendanceBySession,
} from "@shared/db/attendance-repo";
import {
  initJournalForSession,
  updateJournal,
  getJournalBySession,
} from "@shared/db/journal-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
} from "@shared/db/gradebook-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import {
  getActiveAcademicYear,
  getTeacherProfile,
} from "@shared/db/profile-repo";
import { listAssignments } from "@shared/db/teaching-assignment-repo";
import {
  summarizeAttendance,
  buildJournalNarrative,
  packStructuredNote,
  unpackStructuredNote,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceRecord,
  AttendanceStatus,
  ClassRoster,
  GradeBook,
  GradeEntry,
  LessonSession,
  TeachingAssignment,
  TeachingJournal,
  TeacherProfile,
  JournalRealizationStatus,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

export type ClassOption = {
  classId: string;
  classLabel: string;
};

export type SubjectOption = {
  subject: string;
  classId: string;
};

export type SessionOption = {
  session: LessonSession;
  meetingNumber: number;
  statusLabel: string;
  statusIcon: string;
  isToday: boolean;
  isDone: boolean;
  isUnfilled: boolean;
};

/** Structured note categories — 4 tabs for progressive disclosure */
export const STRUCTURED_NOTE_CATEGORIES = [
  { key: "activities", label: "Aktivitas", icon: "🎯" },
  { key: "studentResponse", label: "Respons", icon: "💡" },
  { key: "obstacle", label: "Hambatan", icon: "⚠️" },
  { key: "followUp", label: "Tindak Lanjut", icon: "🚀" },
] as const;

export type StructuredNoteCategory = (typeof STRUCTURED_NOTE_CATEGORIES)[number]["key"];

/** Quick choices for each structured note category */
export const STRUCTURED_CHIPS: Record<StructuredNoteCategory, readonly string[]> = {
  activities: [
    "Diskusi Kelompok", "Presentasi", "Ceramah", "Latihan",
    "Kuis", "Tanya Jawab", "Praktik", "Project",
  ] as const,
  studentResponse: [
    "Aktif", "Cukup aktif", "Masih pasif", "Perlu bimbingan", "Antusias",
  ] as const,
  obstacle: [
    "Sebagian siswa belum memahami materi", "Waktu pembelajaran terbatas",
    "Sebagian siswa belum aktif", "Tidak ada kendala berarti",
  ] as const,
  followUp: [
    "Penguatan materi", "Latihan tambahan", "Bimbingan individu",
    "Remedial ringan", "Dilanjutkan pertemuan berikutnya",
  ] as const,
};

/** Realization status options */
export const REALIZATION_STATUS_OPTIONS = [
  { value: "done" as const, label: "Terlaksana", color: "emerald" },
  { value: "continued" as const, label: "Diganti", color: "amber" },
  { value: "cancelled" as const, label: "Tidak Terlaksana", color: "rose" },
] as const;

/** Nilai type options */
export const NILAI_TYPE_OPTIONS = [
  { value: "uh1", label: "Ulangan Harian 1 (UH-1)" },
  { value: "uh2", label: "Ulangan Harian 2 (UH-2)" },
  { value: "uh3", label: "Ulangan Harian 3 (UH-3)" },
  { value: "pts", label: "Penilaian Tengah Semester (PTS)" },
  { value: "pas", label: "Penilaian Akhir Semester (PAS)" },
] as const;

/** Step flow state — re-exported from shared for backward compat */
export type { StepState } from "@shared/ui/mobile/AccordionCard";
import type { StepState as StepStateLocal } from "@shared/ui/mobile/AccordionCard";

/* ============================================================ */
/*  Dashboard Types                                              */
/* ============================================================ */

export type SessionStatus = "done" | "partial" | "unfilled";

export type DashboardCard = {
  session: LessonSession;
  status: SessionStatus;
  statusLabel: string;
  statusIcon: string;
  attendanceSummary: string;
  hasJournal: boolean;
  journalLocked: boolean;
  realizationStatus: string;
  meetingNumber: number;
};

export type DashboardClassGroup = {
  classId: string;
  classLabel: string;
  cards: DashboardCard[];
};

export type DaySummary = {
  total: number;
  done: number;
  partial: number;
  unfilled: number;
};

/* ============================================================ */
/*  Hook                                                         */
/* ============================================================ */

export function useKbmHub() {
  const [searchParams] = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);

  // Dashboard state
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Cascading selector — driven by ASSIGNMENTS
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Attendance data
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, AttendanceStatus>>(new Map());
  const [noteMap, setNoteMap] = useState<Map<string, string>>(new Map());

  // Journal data
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [journalInput, setJournalInput] = useState({
    actualMaterialTitle: "",
    note: "",
  });
  const [realizationStatus, setRealizationStatus] = useState<JournalRealizationStatus>("done");
  const [realizationReason, setRealizationReason] = useState("");
  const [structuredNote, setStructuredNote] = useState({
    activities: [] as string[],
    studentResponse: [] as string[],
    obstacle: [] as string[],
    followUp: [] as string[],
  });
  const [activeCategoryTab, setActiveCategoryTab] = useState<StructuredNoteCategory>("activities");
  // No lock/finalize — removed isFinalized state

  // Nilai data
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [nilaiMap, setNilaiMap] = useState<Map<string, number>>(new Map());
  const [nilaiToggle, setNilaiToggle] = useState(false);
  const [nilaiType, setNilaiType] = useState("uh1");

  // Step flow — jurnal & nilai never locked, always accessible from the start
  const [presensiStep, setPresensiStep] = useState<StepStateLocal>("active");
  const [jurnalStep, setJurnalStep] = useState<StepStateLocal>("active");
  const [nilaiStep, setNilaiStep] = useState<StepStateLocal>("active");

  // Status
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dirty tracking — any unsaved edits?
  const isDirty = useMemo(() => {
    if (changes.size > 0) return true;
    if (noteMap.size > 0) return true;
    if (journalInput.actualMaterialTitle || journalInput.note) return true;
    if (structuredNote.activities.length > 0 || structuredNote.studentResponse.length > 0 ||
        structuredNote.obstacle.length > 0 || structuredNote.followUp.length > 0) return true;
    if (realizationStatus !== "done") return true;
    if (realizationReason) return true;
    if (nilaiMap.size > 0) return true;
    return false;
  }, [changes, noteMap, journalInput, structuredNote, realizationStatus, realizationReason, nilaiMap]);

  /* ================================================================ */
  /*  Computed: Dashboard — today's sessions grouped by class         */
  /* ================================================================ */

  const dashboardClassGroups = useMemo<DashboardClassGroup[]>(() => {
    const groupMap = new Map<string, DashboardCard[]>();
    for (const card of dashboardCards) {
      const existing = groupMap.get(card.session.classId) ?? [];
      existing.push(card);
      groupMap.set(card.session.classId, existing);
    }
    const entries = Array.from(groupMap.entries());
    entries.sort((a, b) => {
      const labelA = a[1][0]?.session.classLabel ?? "";
      const labelB = b[1][0]?.session.classLabel ?? "";
      return labelA.localeCompare(labelB);
    });
    return entries.map(([classId, cards]) => ({
      classId,
      classLabel: cards[0]?.session.classLabel ?? classId,
      cards: cards.sort((a, b) => a.session.startPeriod - b.session.startPeriod),
    }));
  }, [dashboardCards]);

  const daySummary = useMemo<DaySummary>(() => {
    const done = dashboardCards.filter((s) => s.status === "done").length;
    const partial = dashboardCards.filter((s) => s.status === "partial").length;
    const unfilled = dashboardCards.filter((s) => s.status === "unfilled").length;
    return { total: dashboardCards.length, done, partial, unfilled };
  }, [dashboardCards]);

  const progressPercent = useMemo(() => {
    if (daySummary.total === 0) return 0;
    return Math.round((daySummary.done / daySummary.total) * 100);
  }, [daySummary]);

  /* ================================================================ */
  /*  Computed: Cascading selector — PRIMARY SOURCE = ASSIGNMENTS     */
  /* ================================================================ */

  const classOptions = useMemo<ClassOption[]>(() => {
    const seen = new Map<string, string>();
    for (const a of assignments) {
      if (!seen.has(a.classId)) seen.set(a.classId, a.classLabel);
    }
    return Array.from(seen.entries())
      .map(([classId, classLabel]) => ({ classId, classLabel }))
      .sort((a, b) => a.classLabel.localeCompare(b.classLabel));
  }, [assignments]);

  const subjectOptions = useMemo<SubjectOption[]>(() => {
    if (!selectedClassId) return [];
    const filtered = assignments.filter((a) => a.classId === selectedClassId);
    const seen = new Set<string>();
    const result: SubjectOption[] = [];
    for (const a of filtered) {
      if (!seen.has(a.subject)) {
        seen.add(a.subject);
        result.push({ subject: a.subject, classId: a.classId });
      }
    }
    return result.sort((a, b) => a.subject.localeCompare(b.subject));
  }, [assignments, selectedClassId]);

  const filteredSessions = useMemo<SessionOption[]>(() => {
    if (!selectedClassId || !selectedSubject) return [];
    const filtered = sessions
      .filter((s) => s.classId === selectedClassId && s.subject === selectedSubject)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);
    const today = todayISODate();
    let meetingNumber = 0;
    return filtered.map((s) => {
      meetingNumber++;
      const isToday = s.date === today;
      const isDone = s.status === "done";
      const isUnfilled = s.status === "planned" && !isToday;
      let statusIcon = "⚠️";
      let statusLabel = "Belum Diisi";
      if (isDone) { statusIcon = "✓"; statusLabel = "Selesai"; }
      else if (isToday) { statusIcon = "⭐"; statusLabel = "Hari Ini"; }
      return { session: s, meetingNumber, statusLabel, statusIcon, isToday, isDone, isUnfilled };
    });
  }, [sessions, selectedClassId, selectedSubject]);

  const hasNoSessions = useMemo(() => {
    if (!selectedClassId || !selectedSubject) return false;
    return filteredSessions.length === 0;
  }, [filteredSessions, selectedClassId, selectedSubject]);

  /* ---- Computed: Attendance ---- */

  const effectiveRecords = useMemo(() => {
    return records.map((r) => ({ ...r, status: changes.get(r.studentId) ?? r.status }));
  }, [records, changes]);

  const summary = useMemo(() => summarizeAttendance(effectiveRecords), [effectiveRecords]);

  const absentList = useMemo(() => {
    return effectiveRecords
      .filter((r) => r.status !== "present" && r.status !== "late")
      .map((r) => {
        const opt = ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === r.status);
        return `${r.studentName} (${opt?.short ?? "?"})`;
      });
  }, [effectiveRecords]);

  /* ---- Computed: Auto-generated narasi ---- */

  const autoNarasi = useMemo(() => {
    const result = buildJournalNarrative({
      material: journalInput.actualMaterialTitle || undefined,
      activities: structuredNote.activities,
      studentResponse: structuredNote.studentResponse.join(", ") || undefined,
      obstacle: structuredNote.obstacle.join(", ") || undefined,
      followUp: structuredNote.followUp.join(", ") || undefined,
      freeNote: journalInput.note || undefined,
    });
    return [result.activityNarrative, result.noteNarrative, result.followUpNarrative]
      .filter(Boolean).join(" ");
  }, [journalInput.actualMaterialTitle, journalInput.note, structuredNote]);

  const isReadyToStart = useMemo(() => {
    return !!(selectedClassId && selectedSubject && selectedSessionId);
  }, [selectedClassId, selectedSubject, selectedSessionId]);

  /* ================================================================ */
  /*  Build Dashboard Cards — check attendance + journal status       */
  /* ================================================================ */

  const buildDashboardCards = useCallback(async (
    todaySessions: LessonSession[]
  ): Promise<DashboardCard[]> => {
    const cards: DashboardCard[] = [];
    const meetingCounter: Record<string, number> = {};

    const sorted = [...todaySessions].sort(
      (a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod
    );

    for (const session of sorted) {
      const key = `${session.classId}-${session.subject}`;
      meetingCounter[key] = (meetingCounter[key] ?? 0) + 1;
      const meetingNumber = meetingCounter[key];

      // Check attendance
      const attRecords = await getAttendanceBySession(session.id);
      const hasAttendance = attRecords.length > 0;
      const attSummary = hasAttendance ? summarizeAttendance(attRecords) : null;

      // Check journal
      const journal = await getJournalBySession(session.id);
      const hasJournal = !!journal;
      const journalLocked = journal?.locked ?? false;

      // Determine status
      let status: SessionStatus;
      let statusLabel: string;
      let statusIcon: string;

      if (session.status === "done" || journalLocked) {
        status = "done";
        statusLabel = "Selesai";
        statusIcon = "✓";
      } else if (hasAttendance && hasJournal) {
        status = "done";
        statusLabel = "Selesai";
        statusIcon = "✓";
      } else if (hasAttendance) {
        status = "partial";
        statusLabel = "Presensi OK";
        statusIcon = "◐";
      } else {
        status = "unfilled";
        statusLabel = "Belum Diisi";
        statusIcon = "○";
      }

      // Build attendance summary string
      let attendanceSummary = "";
      if (attSummary) {
        const parts: string[] = [];
        if (attSummary.present > 0) parts.push(`H:${attSummary.present}`);
        if (attSummary.sick > 0) parts.push(`S:${attSummary.sick}`);
        if (attSummary.excused > 0) parts.push(`I:${attSummary.excused}`);
        if (attSummary.late > 0) parts.push(`T:${attSummary.late}`);
        if (attSummary.absent > 0) parts.push(`A:${attSummary.absent}`);
        attendanceSummary = parts.join(" ");
      }

      cards.push({
        session,
        status,
        statusLabel,
        statusIcon,
        attendanceSummary,
        hasJournal,
        journalLocked,
        realizationStatus: journal?.realizationStatus ?? "done",
        meetingNumber,
      });
    }

    return cards;
  }, []);

  /* ================================================================ */
  /*  Init                                                            */
  /* ================================================================ */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const activeYear = await getActiveAcademicYear();
        const profile = await getTeacherProfile();
        if (cancelled) return;
        setYear(activeYear ?? null);
        setTeacher(profile);

        if (activeYear && profile) {
          const teacherAssignments = await listAssignments(activeYear.id);
          const myAssignments = teacherAssignments.filter(
            (a) => a.teacherId === profile.id && !a.deletedAt
          );
          if (cancelled) return;
          setAssignments(myAssignments);

          // Load today's sessions for dashboard
          const todaySess = await getLessonSessionsByDate(profile.id, todayISODate());
          if (cancelled) return;
          setSessions(todaySess);

          // Build dashboard cards
          const cards = await buildDashboardCards(todaySess);
          if (cancelled) return;
          setDashboardCards(cards);

          // Auto-select from URL param or first available
          const sid = searchParams.get("sessionId");
          const stepParam = searchParams.get("step");

          if (stepParam === "presensi") { setPresensiStep("active"); }
          else if (stepParam === "jurnal") { setPresensiStep("done"); setJurnalStep("active"); }
          else if (stepParam === "nilai") { setPresensiStep("done"); setNilaiStep("active"); }

          if (sid) {
            setSelectedSessionId(sid);
            const targetSession = todaySess.find((s) => s.id === sid);
            if (targetSession) {
              setSelectedClassId(targetSession.classId);
              setSelectedSubject(targetSession.subject);
            }
          } else if (myAssignments.length > 0) {
            const first = myAssignments[0];
            setSelectedClassId(first.classId);
            setSelectedSubject(first.subject);
            const matching = todaySess.find(
              (s) => s.classId === first.classId && s.subject === first.subject && s.status === "planned"
            );
            if (matching) setSelectedSessionId(matching.id);
          }
        }
      } catch (err) {
        console.error("[useKbmHub] Gagal init:", err);
        setNotice("Gagal memuat data. Coba muat ulang.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, buildDashboardCards]);

  /* ---- Load sessions for selected class+subject ---- */

  useEffect(() => {
    if (!year || !selectedClassId || !selectedSubject) return;
    void (async () => {
      try {
        const allSessions = await listLessonSessions(year.id);
        const relevant = allSessions.filter(
          (s) => s.classId === selectedClassId && s.subject === selectedSubject
        );
        setSessions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = relevant.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newOnes];
        });
      } catch (err) {
        console.error("[useKbmHub] Gagal memuat sesi:", err);
      }
    })();
  }, [year, selectedClassId, selectedSubject]);

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
          sessionId: session.id, date: session.date, roster: r ?? null,
        });
        setRecords(attRecords);
        // 2a FIX: Load saved attendance into changes Map so UI reflects actual data,
        // not default "Hadir". Only set non-present statuses (the interesting ones).
        const savedChanges = new Map<string, AttendanceStatus>();
        for (const rec of attRecords) {
          if (rec.status !== "present") savedChanges.set(rec.studentId, rec.status);
        }
        setChanges(savedChanges);
        setNoteMap(new Map());
        const j = await initJournalForSession({ session, attendanceRecords: attRecords });
        setJournal(j);
        const unpacked = unpackStructuredNote(j.note);
        setJournalInput({ actualMaterialTitle: j.actualMaterialTitle ?? "", note: unpacked.freeNote });
        setRealizationStatus(j.realizationStatus ?? "done");
        setRealizationReason("");
        setStructuredNote({
          activities: unpacked.activities,
          studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : [],
          obstacle: unpacked.obstacle ? [unpacked.obstacle] : [],
          followUp: j.followUp ? [j.followUp] : [],
        });
        // No lock/finalize — removed isFinalized
        setActiveCategoryTab("activities");
        const assignment = await findAssignmentForSession(session, year);
        if (assignment) {
          const existingBook = await findGradeBook({
            academicYearId: year.id, teacherId: session.teacherId,
            classId: session.classId, semester: session.semester, subject: session.subject,
          });
          setGradeBook(existingBook ?? null);
        } else { setGradeBook(null); }
        // Auto-detect: if session already saved, skip to jurnal/nilai
        // Jurnal & Nilai never locked — always 'active' (or 'done' if already filled)
        const sessionAlreadyDone = session.status === "done";
        const hasJournalContent = !!j.actualMaterialTitle;
        setPresensiStep(sessionAlreadyDone ? "done" : "active");
        setJurnalStep(hasJournalContent ? "done" : "active");
        setNilaiStep("active");
        setNilaiMap(new Map());
        setNilaiToggle(false);
      } catch (err) {
        console.error("[useKbmHub] Gagal memuat sesi:", err);
      }
    })();
  }, [selectedSessionId, year]);

  /* ================================================================ */
  /*  Actions                                                         */
  /* ================================================================ */

  function setStatus(studentId: string, status: AttendanceStatus) {
    const next = new Map(changes);
    next.set(studentId, status);
    setChanges(next);
  }

  function setAllPresent() {
    const next = new Map<string, AttendanceStatus>();
    for (const r of records) next.set(r.studentId, "present");
    setChanges(next);
    setNoteMap(new Map());
  }

  function setStudentNote(studentId: string, note: string) {
    const next = new Map(noteMap);
    if (note) next.set(studentId, note); else next.delete(studentId);
    setNoteMap(next);
  }

  function toggleStructuredChip(category: StructuredNoteCategory, chip: string) {
    setStructuredNote((prev) => {
      const current = prev[category];
      const next = current.includes(chip) ? current.filter((c) => c !== chip) : [...current, chip];
      return { ...prev, [category]: next };
    });
  }

  function donePresensi() { setPresensiStep("done"); }
  // No doneJurnal — jurnal & nilai stay editable, no lock needed

  function setNilai(studentId: string, value: number | null) {
    const next = new Map(nilaiMap);
    if (value !== null && value >= 0 && value <= 100) next.set(studentId, value);
    else next.delete(studentId);
    setNilaiMap(next);
  }

  /** Select a session from dashboard card */
  function selectDashboardSession(sessionId: string) {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setSelectedClassId(session.classId);
      setSelectedSubject(session.subject);
    }
    setSelectedSessionId(sessionId);
  }

  /** Back to dashboard from editor */
  function backToDashboard() {
    setSelectedSessionId(null);
    setSelectedSession(null);
    // Refresh dashboard cards
    void refreshDashboard();
  }

  const handlePertemuanTambahan = useCallback(async () => {
    if (!year || !teacher || !selectedClassId || !selectedSubject) return;
    const r = await findClassRoster(year.id, selectedClassId);
    if (!r) { setNotice("Roster kelas tidak ditemukan."); return; }
    try {
      const { session, created } = await findOrCreateManualSession({
        mode: "manual", academicYear: year, teacherId: teacher.id,
        roster: r, subject: selectedSubject, date: todayISODate(),
      });
      if (created) setSessions((prev) => [...prev, session]);
      setSelectedSessionId(session.id);
    } catch (err) {
      console.error("[useKbmHub] Gagal buat sesi tambahan:", err);
      setNotice("Gagal membuat sesi tambahan.");
    }
  }, [year, teacher, selectedClassId, selectedSubject]);

  const handleCopyPreviousJournal = useCallback(async () => {
    if (!year || !selectedClassId || !selectedSubject || !selectedSession) return;
    try {
      const allSessions = await listLessonSessions(year.id);
      const relevant = allSessions
        .filter((s) => s.classId === selectedClassId && s.subject === selectedSubject && s.id !== selectedSession.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (relevant.length === 0) { setNotice("Tidak ada jurnal sebelumnya."); return; }
      for (const prevSession of relevant) {
        const prevJournal = await getJournalBySession(prevSession.id);
        if (prevJournal && prevJournal.actualMaterialTitle) {
          setJournalInput((prev) => ({
            ...prev, actualMaterialTitle: prevJournal.actualMaterialTitle ?? prev.actualMaterialTitle,
          }));
          const unpacked = unpackStructuredNote(prevJournal.note);
          setStructuredNote((prev) => ({
            activities: unpacked.activities.length > 0 ? unpacked.activities : prev.activities,
            studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : prev.studentResponse,
            obstacle: unpacked.obstacle ? [unpacked.obstacle] : prev.obstacle,
            followUp: prevJournal.followUp ? [prevJournal.followUp] : prev.followUp,
          }));
          setNotice("Jurnal sebelumnya berhasil disalin!"); return;
        }
      }
      setNotice("Tidak ada jurnal sebelumnya yang berisi materi.");
    } catch (err) {
      console.error("[useKbmHub] Gagal salin jurnal:", err);
      setNotice("Gagal menyalin jurnal sebelumnya.");
    }
  }, [year, selectedClassId, selectedSubject, selectedSession]);

  // No finalize/unlock — removed handleFinalize & handleUnlock

  const saveAll = useCallback(async () => {
    if (!selectedSessionId || !journal || !year || !teacher) return;
    // 3a: Validate materi — warn if empty
    if (!journalInput.actualMaterialTitle.trim()) {
      const confirmed = window.confirm("Materi / Tujuan Pembelajaran masih kosong. Yakin ingin menyimpan?");
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      // Only send attendance changes that differ from the saved records
      if (changes.size > 0) {
        const payload = Array.from(changes.entries()).map(([studentId, status]) => ({ studentId, status }));
        const updated = await updateAttendance(selectedSessionId, payload);
        setRecords(updated);
        // Rebuild changes from saved data (only non-present)
        const savedChanges = new Map<string, AttendanceStatus>();
        for (const rec of updated) {
          if (rec.status !== "present") savedChanges.set(rec.studentId, rec.status);
        }
        setChanges(savedChanges);
      }
      const packedNote = packStructuredNote({
        activities: structuredNote.activities,
        studentResponse: structuredNote.studentResponse.join(", "),
        obstacle: structuredNote.obstacle.join(", "),
        freeNote: journalInput.note || "",
      });
      await updateJournal(journal.id, {
        actualMaterialTitle: journalInput.actualMaterialTitle || undefined,
        note: packedNote,
        followUp: structuredNote.followUp.join(", ") || undefined,
        realizationStatus,
      });
      if (nilaiToggle && nilaiMap.size > 0 && selectedSession) {
        await saveNilaiToGradeBook(year, teacher, selectedSession, roster, gradeBook, nilaiMap);
      }
      if (selectedSession) {
        await updateLessonSession(selectedSession.id, { status: "done" });
        setSelectedSession((prev) => prev ? { ...prev, status: "done" } : null);
        setSessions((prev) =>
          prev.map((s) => s.id === selectedSession.id ? { ...s, status: "done" as const } : s)
        );
      }
      setNotice("KBM Sesi Berhasil Disimpan!");
      // Refresh dashboard after save
      void refreshDashboard();
    } catch (err) {
      console.error("[useKbmHub] Gagal simpan:", err);
      setNotice("Gagal menyimpan. Coba lagi.");
    } finally { setSaving(false); }
  }, [selectedSessionId, journal, changes, journalInput, structuredNote, realizationStatus, nilaiToggle, nilaiMap, year, teacher, selectedSession, roster, gradeBook]);

  /* ---- Refresh dashboard ---- */
  const refreshDashboard = useCallback(async () => {
    if (!teacher) return;
    setDashboardLoading(true);
    try {
      const todaySess = await getLessonSessionsByDate(teacher.id, todayISODate());
      setSessions(todaySess);
      const cards = await buildDashboardCards(todaySess);
      setDashboardCards(cards);
    } catch (err) {
      console.error("[useKbmHub] Gagal refresh dashboard:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, [teacher, buildDashboardCards]);

  /* ---- Cascading selector handlers ---- */

  function handleClassChange(classId: string) {
    setSelectedClassId(classId); setSelectedSubject(null); setSelectedSessionId(null); setSelectedSession(null);
  }
  function handleSubjectChange(subject: string) {
    setSelectedSubject(subject);
    if (!selectedClassId) return;
    const matching = sessions
      .filter((s) => s.classId === selectedClassId && s.subject === subject)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);
    const firstUnfilled = matching.find((s) => s.status !== "done");
    if (firstUnfilled) setSelectedSessionId(firstUnfilled.id);
    else { setSelectedSessionId(null); setSelectedSession(null); }
  }

  /* ---- Return ---- */
  return {
    // Loading & core
    loading, year, teacher, sessions, assignments,
    selectedSessionId, setSelectedSessionId, selectedSession, roster,

    // Dashboard
    dashboardCards, dashboardClassGroups, daySummary, progressPercent,
    dashboardLoading, selectDashboardSession, backToDashboard, refreshDashboard,

    // Cascading selector (assignment-driven)
    selectedClassId, setSelectedClassId: handleClassChange,
    selectedSubject, setSelectedSubject: handleSubjectChange,
    classOptions, subjectOptions, filteredSessions, hasNoSessions, handlePertemuanTambahan, isReadyToStart,

    // Attendance
    records, changes, effectiveRecords, summary, absentList,
    noteMap, setStatus, setAllPresent, setStudentNote, donePresensi,

    // Journal
    journal, journalInput, setJournalInput,
    realizationStatus, setRealizationStatus, realizationReason, setRealizationReason,
    structuredNote, setStructuredNote, toggleStructuredChip, activeCategoryTab, setActiveCategoryTab,
    autoNarasi, handleCopyPreviousJournal,

    // No finalize/lock
    // isFinalized, handleFinalize, handleUnlock removed,

    // Nilai
    gradeBook, nilaiMap, setNilai, nilaiToggle, setNilaiToggle, nilaiType, setNilaiType,

    // Step flow
    presensiStep, jurnalStep, nilaiStep,
    // Re-open presensi (for editing after done)
    reopenPresensi: () => { setPresensiStep("active"); },

    // Status
    notice, setNotice, saving, saveAll, isDirty,

    // Utility
    todayDate: formatLongDateID(todayISODate()),
  };
}

/* ============================================================ */
/*  Helpers                                                      */
/* ============================================================ */

async function findAssignmentForSession(session: LessonSession, year: AcademicYear) {
  const teacherAssignments = await listAssignments(year.id);
  return teacherAssignments.find(
    (a) => a.teacherId === session.teacherId && a.classId === session.classId &&
      a.subject === session.subject && a.semester === session.semester && !a.deletedAt
  );
}

async function saveNilaiToGradeBook(
  year: AcademicYear, teacher: TeacherProfile, session: LessonSession,
  roster: ClassRoster | null, existingBook: GradeBook | null, nilaiMap: Map<string, number>
): Promise<void> {
  if (!roster || nilaiMap.size === 0) return;
  const baseEntries: GradeEntry[] = roster.students.sort((a, b) => a.number - b.number).map((s) => {
    const nilai = nilaiMap.get(s.id) ?? null;
    const existingEntry = existingBook?.entries.find((e) => e.studentId === s.id);
    if (existingEntry) return { ...existingEntry, uh1: nilai ?? existingEntry.uh1 };
    return {
      studentId: s.id, studentName: s.name, studentNumber: s.number, nis: s.nis,
      kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
      kd7: null, kd8: null, kd9: null, kd10: null,
      uh1: nilai, uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
      uh7: null, uh8: null, uh9: null, uh10: null,
      pts: null, pas: null, uts: null, uas: null,
      finalScore: null, averageKd: null,
      dailyScore: null, assignmentScore: null, summativeScore: null,
      remedialScore: null, averageScore: null,
      status: nilai !== null ? "complete" as const : "incomplete" as const,
    } as GradeEntry;
  });
  if (existingBook) {
    await updateGradeBook(existingBook.id, {
      entries: baseEntries, passingScore: existingBook.passingScore,
      gradeModel: existingBook.gradeModel ?? "uh", uhCount: existingBook.uhCount ?? 2,
      kdCount: existingBook.kdCount ?? 6, weightUH: existingBook.weightUH ?? 25,
      weightUTS: existingBook.weightUTS ?? 25, weightUAS: existingBook.weightUAS ?? 50,
    });
  } else {
    await saveGradeBook({
      academicYearId: year.id, teacherId: teacher.id, classId: session.classId,
      classLabel: session.classLabel, subject: session.subject, semester: session.semester,
      passingScore: 75, entries: baseEntries, status: "draft", gradeModel: "uh",
      uhCount: 2, kdCount: 6, weightUH: 25, weightUTS: 25, weightUAS: 50,
    });
  }
}

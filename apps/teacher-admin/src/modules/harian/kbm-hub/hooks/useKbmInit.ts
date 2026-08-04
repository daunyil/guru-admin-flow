/**
 * useKbmInit — Initialization, cascading selector, and dashboard state.
 *
 * Responsibilities:
 *   - loading, year, teacher, assignments, sessions, roster
 *   - selectedClassId, selectedSubject, selectedSessionId, selectedSession
 *   - classOptions, subjectOptions, filteredSessions (useMemo)
 *   - Dashboard: dashboardCards, dashboardClassGroups, daySummary, progressPercent
 *   - Init effect, session load effect
 *   - setSelectedClassId, setSelectedSubject, setSelectedSessionId
 *   - handlePertemuanTambahan, selectDashboardSession, backToDashboard
 *   - hasNoSessions, isReadyToStart
 *   - todayDate
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getLessonSessionsByDate,
  findOrCreateManualSession,
  listLessonSessions,
} from "@shared/db/lesson-session-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import {
  getActiveAcademicYear,
  getTeacherProfile,
} from "@shared/db/profile-repo";
import { listAssignments } from "@shared/db/teaching-assignment-repo";
import { summarizeAttendance } from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceStatus,
  ClassRoster,
  LessonSession,
  TeachingAssignment,
  TeacherProfile,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { getAttendanceBySession } from "@shared/db/attendance-repo";
import { getJournalBySession } from "@shared/db/journal-repo";
import type {
  ClassOption,
  SubjectOption,
  SessionOption,
  DashboardCard,
  DashboardClassGroup,
  DaySummary,
  StructuredNoteState,
} from "../types";
import type { StepState as StepStateLocal } from "@shared/ui/mobile/AccordionCard";

export interface UseKbmInitReturn {
  // Core state
  loading: boolean;
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  assignments: TeachingAssignment[];
  sessions: LessonSession[];
  roster: ClassRoster | null;
  setSessions: React.Dispatch<React.SetStateAction<LessonSession[]>>;
  setSelectedSession: React.Dispatch<React.SetStateAction<LessonSession | null>>;
  setRoster: React.Dispatch<React.SetStateAction<ClassRoster | null>>;

  // Selection state
  selectedClassId: string | null;
  selectedSubject: string | null;
  selectedSessionId: string | null;
  selectedSession: LessonSession | null;
  setSelectedSessionId: (id: string | null) => void;

  // Cascading selector
  classOptions: ClassOption[];
  subjectOptions: SubjectOption[];
  filteredSessions: SessionOption[];
  hasNoSessions: boolean;
  isReadyToStart: boolean;

  // Dashboard
  dashboardCards: DashboardCard[];
  dashboardClassGroups: DashboardClassGroup[];
  daySummary: DaySummary;
  progressPercent: number;
  dashboardLoading: boolean;

  // Actions
  setSelectedClassId: (classId: string) => void;
  setSelectedSubject: (subject: string) => void;
  handlePertemuanTambahan: () => void;
  selectDashboardSession: (sessionId: string) => void;
  backToDashboard: () => void;
  refreshDashboard: () => Promise<void>;

  // Step setters (for init & sub-hooks to coordinate)
  setPresensiStep: React.Dispatch<React.SetStateAction<StepStateLocal>>;
  setJurnalStep: React.Dispatch<React.SetStateAction<StepStateLocal>>;
  setNilaiStep: React.Dispatch<React.SetStateAction<StepStateLocal>>;

  // Utility
  todayDate: string;

  // Notice
  notice: string | null;
  setNotice: React.Dispatch<React.SetStateAction<string | null>>;
}

/** Data returned from loading a session, consumed by sub-hooks */
export interface SessionLoadData {
  savedChanges: Map<string, AttendanceStatus>;
  journalActualMaterialTitle: string;
  journalFreeNote: string;
  journalRealizationStatus: string;
  structuredNote: StructuredNoteState;
  loadedNilaiMap: Map<string, number>;
  sessionAlreadyDone: boolean;
  hasJournalContent: boolean;
}

export function useKbmInit() {
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

  // Cascading selector
  const [selectedClassId, setSelectedClassIdRaw] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubjectRaw] = useState<string | null>(null);

  // Step flow
  const [presensiStep, setPresensiStep] = useState<StepStateLocal>("active");
  const [jurnalStep, setJurnalStep] = useState<StepStateLocal>("active");
  const [nilaiStep, setNilaiStep] = useState<StepStateLocal>("active");

  // Notice
  const [notice, setNotice] = useState<string | null>(null);

  /* ================================================================ */
  /*  Computed: Dashboard                                             */
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
  /*  Computed: Cascading selector                                    */
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

  const isReadyToStart = useMemo(() => {
    return !!(selectedClassId && selectedSubject && selectedSessionId);
  }, [selectedClassId, selectedSubject, selectedSessionId]);

  /* ================================================================ */
  /*  Build Dashboard Cards                                           */
  /* ================================================================ */

  const buildDashboardCards = useCallback(async (
    todaySessions: LessonSession[]
  ): Promise<DashboardCard[]> => {
    const meetingCounter: Record<string, number> = {};
    const sorted = [...todaySessions].sort(
      (a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod
    );

    // B4-08: Parallel queries
    const enriched = await Promise.all(sorted.map(async (session) => {
      const key = `${session.classId}-${session.subject}`;
      meetingCounter[key] = (meetingCounter[key] ?? 0) + 1;
      const meetingNumber = meetingCounter[key];

      const [attRecords, journal] = await Promise.all([
        getAttendanceBySession(session.id),
        getJournalBySession(session.id),
      ]);

      const hasAttendance = attRecords.length > 0;
      const attSummary = hasAttendance ? summarizeAttendance(attRecords) : null;
      const hasJournal = !!journal;
      const journalLocked = journal?.locked ?? false;

      let status: "done" | "partial" | "unfilled";
      let statusLabel: string;
      let statusIcon: string;

      if (session.status === "done" || journalLocked) {
        status = "done"; statusLabel = "Selesai"; statusIcon = "✓";
      } else if (hasAttendance && hasJournal) {
        status = "done"; statusLabel = "Selesai"; statusIcon = "✓";
      } else if (hasAttendance) {
        status = "partial"; statusLabel = "Presensi OK"; statusIcon = "◐";
      } else {
        status = "unfilled"; statusLabel = "Belum Diisi"; statusIcon = "○";
      }

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

      return {
        session,
        status,
        statusLabel,
        statusIcon,
        attendanceSummary,
        hasJournal,
        journalLocked,
        realizationStatus: journal?.realizationStatus ?? "done",
        meetingNumber,
      };
    }));

    return enriched;
  }, []);

  /* ================================================================ */
  /*  Refresh dashboard                                               */
  /* ================================================================ */

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

  /* ================================================================ */
  /*  Init effect                                                     */
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

          const todaySess = await getLessonSessionsByDate(profile.id, todayISODate());
          if (cancelled) return;
          setSessions(todaySess);

          const cards = await buildDashboardCards(todaySess);
          if (cancelled) return;
          setDashboardCards(cards);

          const sid = searchParams.get("sessionId");
          const stepParam = searchParams.get("step");

          if (stepParam === "presensi") { setPresensiStep("active"); }
          else if (stepParam === "jurnal") { setPresensiStep("done"); setJurnalStep("active"); }
          else if (stepParam === "nilai") { setPresensiStep("done"); setNilaiStep("active"); }

          if (sid) {
            setSelectedSessionId(sid);
            const targetSession = todaySess.find((s) => s.id === sid);
            if (targetSession) {
              setSelectedClassIdRaw(targetSession.classId);
              setSelectedSubjectRaw(targetSession.subject);
              setSelectedSession(targetSession);
            }
          } else if (myAssignments.length > 0) {
            const first = myAssignments[0];
            setSelectedClassIdRaw(first.classId);
            setSelectedSubjectRaw(first.subject);
            const matching = todaySess.find(
              (s) => s.classId === first.classId && s.subject === first.subject && s.status === "planned"
            );
            if (matching) { setSelectedSessionId(matching.id); setSelectedSession(matching); }
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
    // B4-03: Only depend on specific param values, not the entire searchParams object
  }, [searchParams.get("sessionId"), searchParams.get("step"), buildDashboardCards]);

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

  /* ---- Cascading selector handlers ---- */

  function setSelectedClassId(classId: string) {
    setSelectedClassIdRaw(classId); setSelectedSubjectRaw(null); setSelectedSessionId(null); setSelectedSession(null);
  }
  function setSelectedSubject(subject: string) {
    setSelectedSubjectRaw(subject);
    if (!selectedClassId) return;
    const matching = sessions
      .filter((s) => s.classId === selectedClassId && s.subject === subject)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);
    const firstUnfilled = matching.find((s) => s.status !== "done");
    if (firstUnfilled) { setSelectedSessionId(firstUnfilled.id); setSelectedSession(firstUnfilled); }
    else { setSelectedSessionId(null); setSelectedSession(null); }
  }

  /* ---- Actions ---- */

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
      setSelectedSession(session);
    } catch (err) {
      console.error("[useKbmHub] Gagal buat sesi tambahan:", err);
      setNotice("Gagal membuat sesi tambahan.");
    }
  }, [year, teacher, selectedClassId, selectedSubject]);

  function selectDashboardSession(sessionId: string) {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setSelectedClassIdRaw(session.classId);
      setSelectedSubjectRaw(session.subject);
      setSelectedSession(session);
    }
    setSelectedSessionId(sessionId);
  }

  function backToDashboard() {
    setSelectedSessionId(null);
    setSelectedSession(null);
    void refreshDashboard();
  }

  return {
    loading, year, teacher, assignments, sessions, roster,
    setSessions, setSelectedSession, setRoster,

    selectedClassId, selectedSubject, selectedSessionId, selectedSession,
    setSelectedSessionId,

    classOptions, subjectOptions, filteredSessions,
    hasNoSessions, isReadyToStart,

    dashboardCards, dashboardClassGroups, daySummary, progressPercent,
    dashboardLoading,

    setSelectedClassId, setSelectedSubject,
    handlePertemuanTambahan, selectDashboardSession, backToDashboard,
    refreshDashboard,

    presensiStep, setPresensiStep,
    jurnalStep, setJurnalStep,
    nilaiStep, setNilaiStep,

    notice, setNotice,

    todayDate: formatLongDateID(todayISODate()),
  };
}

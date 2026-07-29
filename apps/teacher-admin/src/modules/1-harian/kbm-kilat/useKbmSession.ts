/**
 * useKbmSession — Unified state hook for KBM Kilat flow.
 *
 * Manages the entire Presensi → Jurnal → (Opsional) Nilai → Simpan flow
 * in a single hook, replacing 15+ scattered useState in KbmKilatPage.
 *
 * Data flow:
 *   1. Init: load year, teacher, sessions, roster
 *   2. Select session → initAttendance + initJournal
 *   3. Presensi: changes Map → donePresensi
 *   4. Jurnal: journalInput → doneJurnal
 *   5. Nilai (optional): nilaiMap → openBottomSheet
 *   6. saveAll → attendance-repo + journal-repo + gradebook-repo
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation hook only.
 * Import dari @shared/db dan @guru-admin/domain saja.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getLessonSessionsByDate,
  getLessonSession,
} from "@shared/db/lesson-session-repo";
import {
  initAttendanceForSession,
  updateAttendance,
} from "@shared/db/attendance-repo";
import {
  initJournalForSession,
  updateJournal,
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
import { summarizeAttendance } from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceRecord,
  AttendanceStatus,
  ClassRoster,
  GradeBook,
  GradeEntry,
  LessonSession,
  TeachingJournal,
  TeacherProfile,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";
import type { StepState } from "@shared/ui/mobile/AccordionCard";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

export type KbmSessionState = {
  // Loading & core data
  loading: boolean;
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  sessions: LessonSession[];
  selectedSessionId: string | null;
  selectedSession: LessonSession | null;
  roster: ClassRoster | null;

  // Attendance
  records: AttendanceRecord[];
  changes: Map<string, AttendanceStatus>;
  effectiveRecords: AttendanceRecord[];
  summary: ReturnType<typeof summarizeAttendance>;
  absentList: string[];

  // Journal
  journal: TeachingJournal | null;
  journalInput: { actualMaterialTitle: string; note: string };

  // Nilai (optional)
  gradeBook: GradeBook | null;
  nilaiMap: Map<string, number>;
  showNilaiSheet: boolean;

  // Step flow
  presensiStep: StepState;
  jurnalStep: StepState;
  nilaiStep: StepState;
  showBottomBar: boolean;

  // Status
  notice: string | null;
  saving: boolean;
};

/* ============================================================ */
/*  Hook                                                         */
/* ============================================================ */

export function useKbmSession() {
  const [searchParams] = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);

  // Attendance data
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, AttendanceStatus>>(new Map());

  // Journal data
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [journalInput, setJournalInput] = useState({
    actualMaterialTitle: "",
    note: "",
  });

  // Nilai data
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [nilaiMap, setNilaiMap] = useState<Map<string, number>>(new Map());

  // Step flow
  const [presensiStep, setPresensiStep] = useState<StepState>("active");
  const [jurnalStep, setJurnalStep] = useState<StepState>("pending");
  const [nilaiStep, setNilaiStep] = useState<StepState>("pending");
  const [showBottomBar, setShowBottomBar] = useState(false);

  // Nilai UI
  const [showNilaiSheet, setShowNilaiSheet] = useState(false);

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
          const todaySessions = await getLessonSessionsByDate(
            profile.id,
            todayISODate()
          );
          setSessions(todaySessions);

          const sid = searchParams.get("sessionId");
          if (sid) {
            setSelectedSessionId(sid);
          } else if (todaySessions.length > 0) {
            setSelectedSessionId(todaySessions[0].id);
          }
        }
      } catch (err) {
        console.error("[useKbmSession] Gagal init:", err);
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

        // Init attendance
        const attRecords = await initAttendanceForSession({
          sessionId: session.id,
          date: session.date,
          roster: r ?? null,
        });
        setRecords(attRecords);
        setChanges(new Map());

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

        // Init gradebook (find existing or prepare nil)
        const assignment = await findAssignmentForSession(session, year);
        if (assignment) {
          const existingBook = await findGradeBook({
            academicYearId: year.id,
            teacherId: session.teacherId,
            classId: session.classId,
            semester: session.semester,
            subject: session.subject,
          });
          setGradeBook(existingBook ?? null);
        } else {
          setGradeBook(null);
        }

        // Reset step flow
        setPresensiStep("active");
        setJurnalStep("pending");
        setNilaiStep("pending");
        setShowBottomBar(false);
        setShowNilaiSheet(false);
        setNilaiMap(new Map());
      } catch (err) {
        console.error("[useKbmSession] Gagal memuat sesi:", err);
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

  const summary = useMemo(
    () => summarizeAttendance(effectiveRecords),
    [effectiveRecords]
  );

  const absentList = useMemo(() => {
    return effectiveRecords
      .filter((r) => r.status !== "present" && r.status !== "late")
      .map((r) => {
        const opt = ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === r.status);
        return `${r.studentName} (${opt?.short ?? "?"})`;
      });
  }, [effectiveRecords]);

  /* ---- Actions ---- */
  function setStatus(studentId: string, status: AttendanceStatus) {
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

  function setNilai(studentId: string, value: number | null) {
    const next = new Map(nilaiMap);
    if (value !== null && value >= 0 && value <= 100) {
      next.set(studentId, value);
    } else {
      next.delete(studentId);
    }
    setNilaiMap(next);
  }

  /**
   * saveAll — Save all KBM data to Dexie.
   *
   * 1. Attendance → updateAttendance()
   * 2. Journal → updateJournal()
   * 3. Nilai → findGradeBook() / updateGradeBook() or saveGradeBook()
   *    Maps nilaiMap to uh1 field in GradeEntry (simple quick-input model).
   */
  const saveAll = useCallback(async () => {
    if (!selectedSessionId || !journal || !year || !teacher) return;
    setSaving(true);
    try {
      // 1. Save attendance changes
      if (changes.size > 0) {
        const payload = Array.from(changes.entries()).map(
          ([studentId, status]) => ({ studentId, status })
        );
        const updated = await updateAttendance(selectedSessionId, payload);
        setRecords(updated);
        setChanges(new Map());
      }

      // 2. Save journal
      await updateJournal(journal.id, {
        actualMaterialTitle: journalInput.actualMaterialTitle || undefined,
        note: journalInput.note || undefined,
      });

      // 3. Save nilai — integrate with gradebook-repo
      if (nilaiMap.size > 0 && selectedSession) {
        await saveNilaiToGradeBook(
          year,
          teacher,
          selectedSession,
          roster,
          gradeBook,
          nilaiMap
        );
      }

      setNotice("KBM berhasil disimpan!");
    } catch (err) {
      console.error("[useKbmSession] Gagal simpan:", err);
      setNotice("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }, [selectedSessionId, journal, changes, journalInput, nilaiMap, year, teacher, selectedSession, roster, gradeBook]);

  /* ---- Return ---- */
  return {
    // Loading & core
    loading, year, teacher, sessions,
    selectedSessionId, setSelectedSessionId,
    selectedSession, roster,

    // Attendance
    records, changes, effectiveRecords, summary, absentList,
    setStatus, donePresensi,

    // Journal
    journal, journalInput, setJournalInput,
    doneJurnal,

    // Nilai
    gradeBook, nilaiMap, showNilaiSheet, setShowNilaiSheet,
    setNilai,

    // Step flow
    presensiStep, jurnalStep, nilaiStep,
    showBottomBar,

    // Status
    notice, setNotice, saving, saveAll,

    // Utility
    todayDate: formatLongDateID(todayISODate()),
  };
}

/* ============================================================ */
/*  Helper: Find assignment for session                          */
/* ============================================================ */

async function findAssignmentForSession(
  session: LessonSession,
  year: AcademicYear
) {
  // Import teaching-assignment-repo dynamically to avoid circular deps
  const { listAssignments } = await import("@shared/db/teaching-assignment-repo");
  const assignments = await listAssignments(year.id);
  return assignments.find(
    (a) =>
      a.teacherId === session.teacherId &&
      a.classId === session.classId &&
      a.subject === session.subject &&
      a.semester === session.semester &&
      !a.deletedAt
  );
}

/* ============================================================ */
/*  Helper: Save Nilai to GradeBook                             */
/* ============================================================ */

/**
 * saveNilaiToGradeBook — Persist nilai from KBM Kilat into gradebook.
 *
 * Strategy:
 *   - If GradeBook exists → update entries with uh1 (first Ulangan Harian)
 *   - If no GradeBook → create new one with uh1 filled
 *   - Uses gradeModel="uh" (simplest model for quick input)
 *
 * This fixes the critical bug where nilaiMap was only console.log.
 */
async function saveNilaiToGradeBook(
  year: AcademicYear,
  teacher: TeacherProfile,
  session: LessonSession,
  roster: ClassRoster | null,
  existingBook: GradeBook | null,
  nilaiMap: Map<string, number>
): Promise<void> {
  if (!roster || nilaiMap.size === 0) return;

  // Build entries from roster + nilai
  const baseEntries: GradeEntry[] = roster.students
    .sort((a, b) => a.number - b.number)
    .map((s) => {
      const nilai = nilaiMap.get(s.id) ?? null;
      // If existing book, start from existing entries
      const existingEntry = existingBook?.entries.find(
        (e) => e.studentId === s.id
      );

      if (existingEntry) {
        // Update uh1 with new nilai, keep other scores
        return {
          ...existingEntry,
          uh1: nilai ?? existingEntry.uh1,
        };
      }

      // New entry — fill uh1 only, rest null
      return {
        studentId: s.id,
        studentName: s.name,
        studentNumber: s.number,
        nis: s.nis,
        kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
        kd7: null, kd8: null, kd9: null, kd10: null,
        uh1: nilai,
        uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
        uh7: null, uh8: null, uh9: null, uh10: null,
        pts: null, pas: null, uts: null, uas: null,
        finalScore: null, averageKd: null,
        dailyScore: null, assignmentScore: null, summativeScore: null,
        remedialScore: null, averageScore: null,
        status: nilai !== null ? "complete" as const : "incomplete" as const,
      } as GradeEntry;
    });

  if (existingBook) {
    // Update existing GradeBook with new entries
    await updateGradeBook(existingBook.id, {
      entries: baseEntries,
      passingScore: existingBook.passingScore,
      gradeModel: existingBook.gradeModel ?? "uh",
      uhCount: existingBook.uhCount ?? 2,
      kdCount: existingBook.kdCount ?? 6,
      weightUH: existingBook.weightUH ?? 25,
      weightUTS: existingBook.weightUTS ?? 25,
      weightUAS: existingBook.weightUAS ?? 50,
    });
  } else {
    // Create new GradeBook
    await saveGradeBook({
      academicYearId: year.id,
      teacherId: teacher.id,
      classId: session.classId,
      classLabel: session.classLabel,
      subject: session.subject,
      semester: session.semester,
      passingScore: 75,
      entries: baseEntries,
      status: "draft",
      gradeModel: "uh",
      uhCount: 2,
      kdCount: 6,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });
  }
}

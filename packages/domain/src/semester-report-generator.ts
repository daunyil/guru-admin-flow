/**
 * Generator Laporan Akhir Semester — pure function.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M08), docs/DATA_MODEL_DRAFT.md §10
 *
 * Rekap dari:
 *   - LessonSession[] (rencana vs terlaksana)
 *   - TeachingJournal[] (realisasi + catatan)
 *   - AttendanceRecord[] (kehadiran)
 *   - ProtaUnit[] (materi selesai/belum)
 *
 * Output: SemesterReportDraft (siap simpan ke Dexie, caller assign id + base fields)
 */

import type {
  LessonSession,
  TeachingJournal,
  AttendanceRecord,
  ProtaProfile,
  AcademicYear,
  SemesterReport,
  ClassAbsenceSummary,
} from "./index";
import { summarizeAttendance, type AttendanceSummary } from "./attendance-helpers";

/** Input untuk generateSemesterReport.
 *
 * APP-USABLE-RC1B: assignment context wajib (classId + classLabel).
 * Generator filter sessions/journals/attendance by 5-tuple assignment:
 *   teacherId + subject + classId + semester + academicYearId.
 */
export type GenerateSemesterReportInput = {
  academicYear: AcademicYear;
  protaProfile: ProtaProfile | null;
  /** APP-USABLE-RC1B: assignment context untuk filter data. */
  assignment: {
    teacherId: string;
    subject: string;
    classId: string;
    classLabel: string;
    semester: 1 | 2;
  };
  sessions: LessonSession[];
  journals: TeachingJournal[];
  attendanceRecords: AttendanceRecord[];
  /** Legacy: bila assignment tidak diberikan, fallback ke teacherId+semester saja
   *  (untuk backward compat dengan test lama). */
  semester?: 1 | 2;
  teacherId?: string;
};

/** Hasil generate — draft laporan + summary untuk UI. */
export type GenerateSemesterReportResult = {
  report: Omit<
    SemesterReport,
    "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"
  >;
  summary: {
    totalSessions: number;
    doneSessions: number;
    continuedSessions: number;
    cancelledSessions: number;
    plannedSessions: number;
    journalsFinalized: number;
    journalsPending: number;
    attendanceTotals: AttendanceSummary;
    unitsCompleted: number;
    unitsPartial: number;
    unitsNotStarted: number;
    completenessScore: number; // 0-100
    completenessIssues: string[];
  };
  warnings: string[];
  errors: string[];
};

/**
 * Generate draft Laporan Akhir Semester dari data existing.
 * Pure function. Caller simpan ke Dexie.
 *
 * APP-USABLE-RC1B: filter data by assignment 5-tuple (teacherId + subject +
 * classId + semester). Tidak lagi ambil semua sessions/journals semester.
 */
export function generateSemesterReport(
  input: GenerateSemesterReportInput
): GenerateSemesterReportResult {
  const { academicYear, protaProfile, assignment, sessions, journals, attendanceRecords } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  const semester = assignment.semester;
  const teacherId = assignment.teacherId;

  // APP-USABLE-RC1B: filter by assignment 5-tuple
  const assignmentSessions = sessions.filter(
    (s) =>
      s.semester === semester &&
      s.teacherId === teacherId &&
      s.subject === assignment.subject &&
      s.classId === assignment.classId
  );
  const assignmentJournals = journals.filter(
    (j) =>
      j.semester === semester &&
      j.teacherId === teacherId &&
      j.subject === assignment.subject &&
      j.classId === assignment.classId
  );
  const assignmentSessionIds = new Set(assignmentSessions.map((s) => s.id));
  const assignmentAttendance = attendanceRecords.filter(
    (a) => assignmentSessionIds.has(a.sessionId)
  );

  // Rekap sesi
  const plannedSessions = assignmentSessions.filter((s) => s.status === "planned").length;
  const doneSessions = assignmentJournals.filter((j) => j.realizationStatus === "done").length;
  const continuedSessions = assignmentJournals.filter((j) => j.realizationStatus === "continued").length;
  const cancelledSessions = assignmentJournals.filter((j) => j.realizationStatus === "cancelled").length;

  // Rekap jurnal
  const journalsFinalized = assignmentJournals.filter((j) => j.status === "final" || j.locked).length;
  const journalsPending = assignmentJournals.filter((j) => j.status === "draft" && !j.locked).length;

  // Rekap absensi
  const attendanceTotals = summarizeAttendance(assignmentAttendance);

  // Rekap materi (dari ProtaUnit + plannedUnitId di sessions/journals)
  const semesterUnits = protaProfile?.units.filter((u) => u.semester === semester) ?? [];
  const completedUnitIds: string[] = [];
  const partialUnitIds: string[] = [];
  const notStartedUnitIds: string[] = [];

  for (const unit of semesterUnits) {
    const doneJournalsForUnit = assignmentJournals.filter(
      (j) => j.plannedUnitId === unit.id && j.realizationStatus === "done"
    );
    const allJournalsForUnit = assignmentJournals.filter(
      (j) => j.plannedUnitId === unit.id
    );

    if (doneJournalsForUnit.length > 0 && allJournalsForUnit.every((j) => j.realizationStatus === "done")) {
      completedUnitIds.push(unit.id);
    } else if (allJournalsForUnit.length > 0) {
      partialUnitIds.push(unit.id);
    } else {
      notStartedUnitIds.push(unit.id);
    }
  }

  // Rekap absensi per kelas (hanya 1 kelas karena filter by classId)
  const perClassAbsence: ClassAbsenceSummary[] = [{
    classId: assignment.classId,
    classLabel: assignment.classLabel,
    presentCount: attendanceTotals.present,
    sickCount: attendanceTotals.sick,
    excusedCount: attendanceTotals.excused,
    lateCount: attendanceTotals.late,
    absentCount: attendanceTotals.absent,
    totalSessions: assignmentSessions.length,
  }];

  // Pending journal dates
  const pendingJournalDates = assignmentJournals
    .filter((j) => j.status === "draft" && !j.locked)
    .map((j) => j.date)
    .sort();

  // Completeness check
  const completenessIssues: string[] = [];
  if (!protaProfile) {
    completenessIssues.push("Prota belum dipilih");
  }
  if (assignmentSessions.length === 0) {
    completenessIssues.push("Belum ada pertemuan untuk assignment ini");
  }
  if (assignmentJournals.length === 0) {
    completenessIssues.push("Belum ada jurnal untuk assignment ini");
  }
  if (journalsPending > 0) {
    completenessIssues.push(`${journalsPending} jurnal belum difinalisasi`);
  }
  if (notStartedUnitIds.length > 0) {
    completenessIssues.push(`${notStartedUnitIds.length} materi belum dimulai`);
  }

  // Completeness score (sederhana: 100 - 20 per issue, min 0)
  const completenessScore = Math.max(0, 100 - completenessIssues.length * 20);

  // Build report draft
  const subject = protaProfile?.subject ?? assignment.subject;
  const grade = protaProfile?.grade ?? "?";
  const phase = protaProfile?.phase ?? "?";

  const report: Omit<SemesterReport, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"> = {
    academicYearId: academicYear.id,
    teacherId,
    subject,
    grade,
    phase,
    classId: assignment.classId,
    classLabel: assignment.classLabel,
    semester,

    totalPlannedSessions: assignmentSessions.length,
    totalDoneSessions: doneSessions,
    totalContinuedSessions: continuedSessions,
    totalCancelledSessions: cancelledSessions,

    totalPlannedUnits: semesterUnits.length,
    totalCompletedUnits: completedUnitIds.length,
    totalPartialUnits: partialUnitIds.length,
    totalNotStartedUnits: notStartedUnitIds.length,
    completedUnitIds,
    partialUnitIds,
    notStartedUnitIds,

    totalPresent: attendanceTotals.present,
    totalSick: attendanceTotals.sick,
    totalExcused: attendanceTotals.excused,
    totalLate: attendanceTotals.late,
    totalAbsent: attendanceTotals.absent,
    perClassAbsence,

    journalsFinalized,
    journalsPending,
    pendingJournalDates,

    status: "draft",
    finalizedAt: null,
    snapshotId: null,
  };

  // Warnings
  if (journalsPending > 0) {
    warnings.push(`${journalsPending} jurnal belum difinalisasi. Sebaiknya finalize semua sebelum laporan final.`);
  }
  if (notStartedUnitIds.length > 0) {
    warnings.push(`${notStartedUnitIds.length} materi belum dimulai. Pastikan ini disengaja atau tambah catatan.`);
  }

  return {
    report,
    summary: {
      totalSessions: assignmentSessions.length,
      doneSessions,
      continuedSessions,
      cancelledSessions,
      plannedSessions,
      journalsFinalized,
      journalsPending,
      attendanceTotals,
      unitsCompleted: completedUnitIds.length,
      unitsPartial: partialUnitIds.length,
      unitsNotStarted: notStartedUnitIds.length,
      completenessScore,
      completenessIssues,
    },
    warnings,
    errors,
  };
}

/**
 * Validasi: laporan bisa difinalisasi?
 * Syarat: tidak ada jurnal pending, completenessScore >= 60.
 */
export function canFinalizeSemesterReport(
  result: GenerateSemesterReportResult
): { canFinalize: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (result.summary.journalsPending > 0) {
    reasons.push(`${result.summary.journalsPending} jurnal belum difinalisasi`);
  }
  if (result.summary.completenessScore < 60) {
    reasons.push(`Completeness score ${result.summary.completenessScore}% (minimal 60%)`);
  }

  return {
    canFinalize: reasons.length === 0,
    reasons,
  };
}

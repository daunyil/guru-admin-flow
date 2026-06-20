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

/** Input untuk generateSemesterReport. */
export type GenerateSemesterReportInput = {
  academicYear: AcademicYear;
  protaProfile: ProtaProfile | null;
  sessions: LessonSession[];
  journals: TeachingJournal[];
  attendanceRecords: AttendanceRecord[];
  semester: 1 | 2;
  teacherId: string;
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
 */
export function generateSemesterReport(
  input: GenerateSemesterReportInput
): GenerateSemesterReportResult {
  const { academicYear, protaProfile, sessions, journals, attendanceRecords, semester, teacherId } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Filter data untuk semester ini
  const semesterSessions = sessions.filter((s) => s.semester === semester);
  const semesterJournals = journals.filter((j) => j.semester === semester);
  const semesterAttendance = attendanceRecords.filter((a) => {
    // Cek apakah attendance ada di sesi semester ini
    return semesterSessions.some((s) => s.id === a.sessionId);
  });

  // Rekap sesi
  const plannedSessions = semesterSessions.filter((s) => s.status === "planned").length;
  const doneSessions = semesterJournals.filter((j) => j.realizationStatus === "done").length;
  const continuedSessions = semesterJournals.filter((j) => j.realizationStatus === "continued").length;
  const cancelledSessions = semesterJournals.filter((j) => j.realizationStatus === "cancelled").length;

  // Rekap jurnal
  const journalsFinalized = semesterJournals.filter((j) => j.status === "final" || j.locked).length;
  const journalsPending = semesterJournals.filter((j) => j.status === "draft" && !j.locked).length;

  // Rekap absensi
  const attendanceTotals = summarizeAttendance(semesterAttendance);

  // Rekap materi (dari ProtaUnit + plannedUnitId di sessions/journals)
  const semesterUnits = protaProfile?.units.filter((u) => u.semester === semester) ?? [];
  const completedUnitIds: string[] = [];
  const partialUnitIds: string[] = [];
  const notStartedUnitIds: string[] = [];

  for (const unit of semesterUnits) {
    // Cari journals yang plannedUnitId = unit.id DAN realizationStatus = "done"
    const doneJournalsForUnit = semesterJournals.filter(
      (j) => j.plannedUnitId === unit.id && j.realizationStatus === "done"
    );
    // Cari journals yang plannedUnitId = unit.id (any status)
    const allJournalsForUnit = semesterJournals.filter(
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

  // Rekap absensi per kelas
  const classMap = new Map<string, { classId: string; classLabel: string; records: AttendanceRecord[]; totalSessions: number }>();
  for (const session of semesterSessions) {
    if (!classMap.has(session.classId)) {
      classMap.set(session.classId, {
        classId: session.classId,
        classLabel: session.classLabel,
        records: [],
        totalSessions: 0,
      });
    }
    classMap.get(session.classId)!.totalSessions++;
  }
  for (const att of semesterAttendance) {
    const session = semesterSessions.find((s) => s.id === att.sessionId);
    if (!session) continue;
    const entry = classMap.get(session.classId);
    if (entry) entry.records.push(att);
  }
  const perClassAbsence: ClassAbsenceSummary[] = Array.from(classMap.values()).map((c) => {
    const sum = summarizeAttendance(c.records);
    return {
      classId: c.classId,
      classLabel: c.classLabel,
      presentCount: sum.present,
      sickCount: sum.sick,
      excusedCount: sum.excused,
      absentCount: sum.absent,
      totalSessions: c.totalSessions,
    };
  });

  // Pending journal dates
  const pendingJournalDates = semesterJournals
    .filter((j) => j.status === "draft" && !j.locked)
    .map((j) => j.date)
    .sort();

  // Completeness check
  const completenessIssues: string[] = [];
  if (!protaProfile) {
    completenessIssues.push("ProtaProfile belum dipilih");
  }
  if (semesterSessions.length === 0) {
    completenessIssues.push("Belum ada LessonSession untuk semester ini");
  }
  if (semesterJournals.length === 0) {
    completenessIssues.push("Belum ada TeachingJournal untuk semester ini");
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
  const subject = protaProfile?.subject ?? "(tidak ada Prota)";
  const grade = protaProfile?.grade ?? "?";
  const phase = protaProfile?.phase ?? "?";

  const report: Omit<SemesterReport, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"> = {
    academicYearId: academicYear.id,
    teacherId,
    subject,
    grade,
    phase,
    semester,

    totalPlannedSessions: semesterSessions.length,
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
      totalSessions: semesterSessions.length,
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

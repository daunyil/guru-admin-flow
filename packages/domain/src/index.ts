/**
 * @guru-admin/domain
 *
 * Tipe data + validasi Zod + business rules untuk Guru Admin Flow.
 * Sumber otoritas: docs/DATA_MODEL_DRAFT.md
 *
 * Aturan paket (lihat docs/TECHNICAL_PLAN.md §3.1):
 *  - Boleh mengimpor dari @guru-admin/shared
 *  - Tidak boleh mengimpor dari apps/*
 *  - Tidak boleh mengimpor Dexie, React, Supabase
 *  - Semua tipe wajib punya Zod schema + parse + safeParse
 */

/* Base & status */
export {
  baseEntitySchema,
  syncStatusSchema,
  documentStatusSchema,
  makeBaseEntityFields,
  type BaseEntity,
  type SyncStatus,
  type DocumentStatus,
} from "./base";

/* Entitas inti */
export {
  academicYearSchema,
  validateAcademicYearLogic,
  parseAcademicYear,
  safeParseAcademicYear,
  type AcademicYear,
} from "./academic-year";

export {
  schoolProfileSchema,
  SCHOOL_PROFILE_ID,
  parseSchoolProfile,
  safeParseSchoolProfile,
  type SchoolProfile,
} from "./school-profile";

export {
  teacherProfileSchema,
  teacherSubjectSchema,
  TEACHER_PROFILE_ID,
  parseTeacherProfile,
  safeParseTeacherProfile,
  type TeacherProfile,
  type TeacherSubject,
} from "./teacher-profile";

export {
  calendarEventSchema,
  calendarEventTypeSchema,
  calendarScopeSchema,
  parseCalendarEvent,
  safeParseCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarScope,
} from "./calendar-event";

export {
  protaProfileSchema,
  protaUnitSchema,
  parseProtaProfile,
  safeParseProtaProfile,
  parseProtaUnit,
  safeParseProtaUnit,
  type ProtaProfile,
  type ProtaUnit,
} from "./prota";

export {
  teachingScheduleSchema,
  parseTeachingSchedule,
  safeParseTeachingSchedule,
  type TeachingSchedule,
} from "./teaching-schedule";

/* PATCH-FLOW-RC2C — TeachingAssignment (Data Mengajar) */
export {
  teachingAssignmentSchema,
  parseTeachingAssignment,
  safeParseTeachingAssignment,
  assignmentCompositeKey,
  isSameAssignmentContext,
  assignmentLabel,
  assignmentShortLabel,
  type TeachingAssignment,
} from "./teaching-assignment";

export {
  lessonSessionSchema,
  lessonSessionStatusSchema,
  parseLessonSession,
  safeParseLessonSession,
  type LessonSession,
  type LessonSessionStatus,
} from "./lesson-session";

export {
  attendanceRecordSchema,
  attendanceStatusSchema,
  studentEntrySchema,
  classRosterSchema,
  parseAttendanceRecord,
  safeParseAttendanceRecord,
  parseClassRoster,
  safeParseClassRoster,
  type AttendanceRecord,
  type AttendanceStatus,
  type StudentEntry,
  type ClassRoster,
} from "./attendance";

export {
  teachingJournalSchema,
  journalRealizationStatusSchema,
  parseTeachingJournal,
  safeParseTeachingJournal,
  type TeachingJournal,
  type JournalRealizationStatus,
} from "./teaching-journal";

export {
  semesterReportSchema,
  classAbsenceSummarySchema,
  parseSemesterReport,
  safeParseSemesterReport,
  type SemesterReport,
  type ClassAbsenceSummary,
} from "./semester-report";

export {
  gradeBookSchema,
  gradeEntrySchema,
  gradeEntryStatusSchema,
  calculateGradeEntry,
  calculateGradeBookEntries,
  summarizeGradeBook,
  parseGradeBook,
  safeParseGradeBook,
  type GradeBook,
  type GradeEntry,
  type GradeEntryStatus,
  type GradeBookSummary,
} from "./gradebook";

/* Entitas pendukung */
export {
  documentSnapshotSchema,
  syncQueueItemSchema,
  parseDocumentSnapshot,
  parseSyncQueueItem,
  type DocumentSnapshot,
  type SyncQueueItem,
} from "./snapshot-sync";

/* Backup */
export {
  backupFileSchema,
  validateBackup,
  type BackupFile,
  type BackupSummary,
} from "./backup";

/* Business rules */
export {
  ensureSingleActiveYear,
  planNewYearFromPrevious,
} from "./rules";

/* Sprint 2 — Calendar import */
export {
  calendarImportSchema,
  calendarImportEventSchema,
  validateCalendarImport,
  calendarImportToEvents,
  type CalendarImport,
  type CalendarImportEvent,
  type CalendarImportValidation,
} from "./calendar-import";

/* Sprint 2 — Prota import */
export {
  protaImportSchema,
  protaImportUnitSchema,
  validateProtaImport,
  protaImportToProfile,
  type ProtaImport,
  type ProtaImportUnit,
  type ProtaImportValidation,
} from "./prota-import";

/* Sprint 2 — Promes engine + types */
export {
  generatePromes,
} from "./promes-engine";

export {
  type PromesOptions,
  type PromesResult,
  type PromesWeek,
  type KORow,
  type KOMode,
  type UnitDistribution,
  type PromesSummary,
  type GeneratePromesInput,
} from "./promes-types";

/* Sprint 3 — Teaching Schedule import (Smart Roster → aplikasi) */
export {
  scheduleImportSchema,
  scheduleImportEntrySchema,
  validateScheduleImport,
  scheduleImportToSchedules,
  type ScheduleImport,
  type ScheduleImportEntry,
  type ScheduleImportValidation,
} from "./teaching-schedule-import";

/* Sprint 3 — LessonSession generator (Jadwal + Kalender → Sesi) */
export {
  generateLessonSessions,
  type GenerateLessonSessionsInput,
  type GenerateLessonSessionsResult,
} from "./lesson-session-generator";

/* Sprint 3 — Promes-Lesson linker (Sesi + ProtaUnit → plannedUnitId per sesi) */
export {
  linkPromesToLessons,
  type LinkPromesToLessonsInput,
  type LinkPromesToLessonsResult,
} from "./promes-lesson-linker";

/* Sprint 4 — Attendance helpers (default hadir, summary, apply changes) */
export {
  generateDefaultAttendance,
  summarizeAttendance,
  applyAttendanceChanges,
  isAllPresent,
  validateAttendanceConsistency,
  backfillNisInRecords,
  type AttendanceSummary,
} from "./attendance-helpers";

/* PATCH-FLOW-RC1 — Manual LessonSession helper (absensi/jurnal manual & susulan) */
export {
  createManualLessonSession,
  isMatchingManualSession,
  semesterForDate,
  type ManualSessionMode,
  type CreateManualLessonSessionInput,
} from "./manual-session";

/* Sprint 4 — Journal helpers (auto-fill dari sesi + Prota + absensi) */
export {
  generateJournalFromSession,
  applyJournalInput,
  resyncJournalAttendance,
  isJournalComplete,
  finalizeJournal,
} from "./journal-helpers";

/* Sprint 5 — Semester Report generator (rekap lengkap) */
export {
  generateSemesterReport,
  canFinalizeSemesterReport,
  type GenerateSemesterReportInput,
  type GenerateSemesterReportResult,
} from "./semester-report-generator";

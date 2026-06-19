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

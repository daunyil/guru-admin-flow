/**
 * Skema Dexie (IndexedDB) untuk Guru Admin Flow.
 * Sumber: docs/TECHNICAL_PLAN.md §4.3
 */

import Dexie, { type Table } from "dexie";
import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  CalendarEvent,
  ProtaProfile,
  ProtaUnit,
  TeachingSchedule,
  TeachingAssignment,
  LessonSession,
  AttendanceRecord,
  ClassRoster,
  TeachingJournal,
  SemesterReport,
  GradeBook,
  ATPEntry,
  LKPD,
  DocumentSnapshot,
  SyncQueueItem,
} from "@guru-admin/domain";

export class GuruAdminDB extends Dexie {
  academicYears!: Table<AcademicYear, string>;
  schoolProfile!: Table<SchoolProfile, string>;
  teacherProfile!: Table<TeacherProfile, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  protaProfiles!: Table<ProtaProfile, string>;
  protaUnits!: Table<ProtaUnit, string>;
  teachingSchedules!: Table<TeachingSchedule, string>;
  teachingAssignments!: Table<TeachingAssignment, string>;
  lessonSessions!: Table<LessonSession, string>;
  attendanceRecords!: Table<AttendanceRecord, string>;
  classRosters!: Table<ClassRoster, string>;
  teachingJournals!: Table<TeachingJournal, string>;
  semesterReports!: Table<SemesterReport, string>;
  gradeBooks!: Table<GradeBook, string>;
  atpEntries!: Table<ATPEntry, string>;
  lkpds!: Table<LKPD, string>;
  documentSnapshots!: Table<DocumentSnapshot, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("guru-admin-flow");

    this.version(1).stores({
      academicYears: "id, label, active",
      schoolProfile: "id",
      teacherProfile: "id",
      calendarEvents: "id, academicYearId, startDate, type, blocksLearning",
      protaProfiles: "id, academicYearId, subject, grade, phase, teacherId",
      protaUnits: "id, protaProfileId, semester, order",
      teachingSchedules: "id, academicYearId, teacherId, classId, dayOfWeek, semester, [academicYearId+teacherId+dayOfWeek+semester]",
      lessonSessions: "id, academicYearId, teacherId, classId, date, status, [classId+date+startPeriod]",
      attendanceRecords: "id, sessionId, studentId, classId, date, status, [sessionId+studentId]",
      classRosters: "id, classId, academicYearId",
      teachingJournals: "id, sessionId, academicYearId, teacherId, classId, date, status, realizationStatus",
      semesterReports: "id, academicYearId, teacherId, subject, grade, semester, status",
      documentSnapshots: "id, entityType, entityId, snapshotAt",
      syncQueue: "id, entityType, entityId, status, createdAt",
    });

    this.version(2).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    });

    // PATCH-FLOW-RC2C: add teachingAssignments table.
    this.version(3).stores({
      teachingAssignments: "id, academicYearId, semester, teacherId, subject, classId, [academicYearId+semester+teacherId+classId+subject]",
    });

    // APP-USABLE-RC1: add atpEntries + lkpds tables.
    this.version(4).stores({
      atpEntries: "id, academicYearId, teacherId, subject, grade, classId, atpEntryId",
      lkpds: "id, academicYearId, teacherId, subject, classId, atpEntryId, status",
    });
  }
}

export const db = new GuruAdminDB();

export async function ensureDBOpen(): Promise<void> {
  if (!db.isOpen()) {
    await db.open();
  }
}

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
  LessonSession,
  AttendanceRecord,
  ClassRoster,
  TeachingJournal,
  SemesterReport,
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
  lessonSessions!: Table<LessonSession, string>;
  attendanceRecords!: Table<AttendanceRecord, string>;
  classRosters!: Table<ClassRoster, string>;
  teachingJournals!: Table<TeachingJournal, string>;
  semesterReports!: Table<SemesterReport, string>;
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
  }
}

export const db = new GuruAdminDB();

export async function ensureDBOpen(): Promise<void> {
  if (!db.isOpen()) {
    await db.open();
  }
}

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
  RppDocument,
  RemedialProgram,
  EnrichmentProgram,
  DocumentSnapshot,
  SyncQueueItem,
  DutyRule,
  DutyReport,
  DutyRecord,
  SchoolDocument,
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
  rppDocuments!: Table<RppDocument, string>;
  remedialPrograms!: Table<RemedialProgram, string>;
  enrichmentPrograms!: Table<EnrichmentProgram, string>;
  documentSnapshots!: Table<DocumentSnapshot, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  // PIKET-HARIAN-MOBILE-01: tabel Piket Harian (terisolasi)
  dailyDutyRules!: Table<DutyRule, string>;
  dailyDutyReports!: Table<DutyReport, string>;
  dailyDutyRecords!: Table<DutyRecord, string>;

  // WYSIWYG-DOC-01: tabel dokumen sekolah generik
  schoolDocuments!: Table<SchoolDocument, string>;

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

    this.version(3).stores({
      teachingAssignments: "id, academicYearId, semester, teacherId, subject, classId, [academicYearId+semester+teacherId+classId+subject]",
    });

    this.version(4).stores({
      atpEntries: "id, academicYearId, teacherId, subject, grade, classId, atpEntryId",
      lkpds: "id, academicYearId, teacherId, subject, classId, atpEntryId, status",
    });

    this.version(5).stores({
      semesterReports: "id, academicYearId, teacherId, subject, classId, grade, semester, status, [academicYearId+teacherId+subject+classId+semester]",
    });

    // GENERATOR-COMPLETION-RC1: add rppDocuments + remedialPrograms + enrichmentPrograms.
    this.version(6).stores({
      rppDocuments: "id, academicYearId, teacherId, subject, classLabel, semester, status, source",
      remedialPrograms: "id, academicYearId, teacherId, subject, classId, semester, status, [academicYearId+teacherId+subject+classId+semester]",
      enrichmentPrograms: "id, academicYearId, teacherId, subject, classId, semester, status, [academicYearId+teacherId+subject+classId+semester]",
    });

    // GRADEBOOK-V2: bump version for KD1-KD6 + PTS + PAS fields in GradeEntry.
    this.version(7).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    });

    // PIKET-HARIAN-MOBILE-01: tambah tabel Piket Harian (terisolasi dari app utama)
    this.version(8).stores({
      dailyDutyRules: "id, category, type, active",
      dailyDutyReports: "id, academicYearId, date, dutyTeacherId, finalized",
      dailyDutyRecords: "id, dutyReportId, academicYearId, date, studentId, classId, category, type",
    });

    // WYSIWYG-DOC-01: tabel ke-15 — dokumen sekolah generik untuk infrastruktur WYSIWYG
    this.version(9).stores({
      schoolDocuments:
        "id, docType, semester, tahunAjaran, kodeMapel, kodeKelas, status, teacherId, academicYearId, updatedAt",
    });

    // GRADEBOOK-V3-UH-UTS-UAS: new GradeBook fields (gradeModel, uhCount, weightUH/UTS/UAS).
    // No index changes needed — these are data fields, not indexed columns.
    // Bump version so Dexie opens the DB with the updated schema.
    this.version(10).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    });

    // SB-01: Add separate UH/UTS/UAS fields (uh1-uh6, uts, uas) to GradeEntry.
    // SB-05: Migration backfills V3 defaults (gradeModel, uhCount, weights) on existing data.
    this.version(11).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    }).upgrade((tx) => {
      // SB-05: Backfill V3 fields on existing GradeBook data
      return tx.table("gradeBooks").toCollection().modify((book: Record<string, unknown>) => {
        // Backfill V3 top-level fields with safe defaults
        if (book.gradeModel === undefined) book.gradeModel = "uh";
        if (book.uhCount === undefined) book.uhCount = 2;
        if (book.weightUH === undefined) book.weightUH = 25;
        if (book.weightUTS === undefined) book.weightUTS = 25;
        if (book.weightUAS === undefined) book.weightUAS = 50;

        // SB-01: Migrate existing KD data in UH model → copy kd1-kdN to uh1-uhN
        // Only if uh1 is still empty (first migration)
        if (book.gradeModel === "uh" && Array.isArray(book.entries)) {
          for (const entry of book.entries as Array<Record<string, unknown>>) {
            if (entry.uh1 === undefined) {
              const uhCount = (book.uhCount as number) ?? 2;
              for (let i = 1; i <= Math.min(uhCount, 6); i++) {
                const kdKey = `kd${i}`;
                const uhKey = `uh${i}`;
                if (entry[kdKey] != null && entry[uhKey] == null) {
                  entry[uhKey] = entry[kdKey];
                }
              }
            }
            // SB-01: Copy pts→uts, pas→uas if not already set
            if (entry.uts === undefined && entry.pts != null) {
              entry.uts = entry.pts;
            }
            if (entry.uas === undefined && entry.pas != null) {
              entry.uas = entry.pas;
            }
          }
        }
      });
    });

    // GRADEBOOK-V4-PA-SPLIT: Extend KD/UH to 10 columns, add kdCount, add kdDetails.
    // No index changes needed — these are data fields in entries array, not indexed columns.
    // Bump version so Dexie opens DB with updated schema and runs backfill.
    this.version(12).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    }).upgrade((tx) => {
      // V4: Backfill kdCount default on existing GradeBook data
      return tx.table("gradeBooks").toCollection().modify((book: Record<string, unknown>) => {
        if (book.kdCount === undefined) book.kdCount = 6;
      });
    });
  }
}

export const db = new GuruAdminDB();

export async function ensureDBOpen(): Promise<void> {
  if (!db.isOpen()) {
    await db.open();
  }
}

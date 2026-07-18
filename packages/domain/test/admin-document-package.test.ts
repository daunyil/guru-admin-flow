/**
 * Tests untuk admin-document-package.ts (AUTO-DOCUMENT-ENGINE-RC1)
 */
import { describe, it, expect } from "vitest";
import { generateAdminDocumentPackage, type GeneratePackageInput } from "../src/admin-document-package";
import type {
  TeachingAssignment,
  LessonSession,
  AttendanceRecord,
  TeachingJournal,
  GradeBook,
  ATPEntry,
  LKPD,
  RppDocument,
  RemedialProgram,
  EnrichmentProgram,
  SemesterReport,
  ClassRoster,
  ProtaProfile,
} from "../src";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeAssignment(): TeachingAssignment {
  return {
    id: "asg-1",
    academicYearId: "ay-2025",
    semester: 1,
    teacherId: "t1",
    teacherName: "Siti Aminah",
    subject: "PPKn",
    classId: "VII A",
    classLabel: "VII A",
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

function makeRoster(studentCount = 10): ClassRoster {
  return {
    id: "roster-1",
    classId: "VII A",
    classLabel: "VII A",
    academicYearId: "ay-2025",
    students: Array.from({ length: studentCount }, (_, i) => ({
      id: `s${i + 1}`,
      name: `Siswa ${i + 1}`,
      number: i + 1,
    })),
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

function makeSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: "sess-1",
    academicYearId: "ay-2025",
    teachingScheduleId: "sched-1",
    teacherId: "t1",
    classId: "VII A",
    classLabel: "VII A",
    subject: "PPKn",
    date: "2025-07-21",
    startPeriod: 1,
    durationJP: 2,
    startTime: "07:00",
    endTime: "08:20",
    semester: 1,
    plannedUnitId: null,
    status: "planned",
    calendarEventId: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeEmptyInput(overrides: Partial<GeneratePackageInput> = {}): GeneratePackageInput {
  return {
    assignment: makeAssignment(),
    prota: null,
    roster: null,
    sessions: [],
    attendanceRecords: [],
    journals: [],
    gradeBook: null,
    atpEntries: [],
    lkpds: [],
    rppDocuments: [],
    remedialProgram: null,
    enrichmentProgram: null,
    semesterReport: null,
    ...overrides,
  };
}

describe("admin-document-package — generateAdminDocumentPackage", () => {
  it("empty input → semua dokumen not_available, score 0", () => {
    const pkg = generateAdminDocumentPackage(makeEmptyInput());
    expect(pkg.documents.length).toBe(12);
    expect(pkg.summary.totalDocs).toBe(12);
    expect(pkg.summary.availableDocs).toBe(0);
    expect(pkg.summary.notAvailableDocs).toBe(12);
    expect(pkg.summary.completenessScore).toBe(0);
  });

  it("dengan Prota + Roster → 2 dokumen available", () => {
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({
        prota: {
          id: "prota-1",
          academicYearId: "ay-2025",
          subject: "PPKn",
          grade: "VII",
          phase: "D",
          teacherId: "t1",
          annualIntraJP: 72,
          semester1IntraJP: 36,
          semester2IntraJP: 36,
          units: [],
          status: "draft",
          sourceYearId: null,
          createdAt: baseTimestamp,
          updatedAt: baseTimestamp,
          deletedAt: null,
          syncStatus: "local_only",
        } as ProtaProfile,
        roster: makeRoster(10),
      })
    );
    expect(pkg.summary.availableDocs).toBe(2); // Prota + Roster
    expect(pkg.summary.totalStudents).toBe(10);
  });

  it("dengan sessions + attendance → dokumen absensi available", () => {
    const sessions = [makeSession({ id: "s1" }), makeSession({ id: "s2" })];
    const attendance = [
      { id: "a1", sessionId: "s1", studentId: "s1", studentName: "A", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2025-07-21", status: "present" as const, createdAt: baseTimestamp, updatedAt: baseTimestamp, deletedAt: null, syncStatus: "local_only" as const },
    ] as AttendanceRecord[];
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({ sessions, attendanceRecords: attendance })
    );
    expect(pkg.summary.totalSessions).toBe(2);
    expect(pkg.summary.totalAttendanceRecords).toBe(1);
    const attDoc = pkg.documents.find((d) => d.key === "attendance")!;
    expect(attDoc.status).toBe("available");
    // Promes juga available karena ada sesi
    const promesDoc = pkg.documents.find((d) => d.key === "promes")!;
    expect(promesDoc.status).toBe("available");
  });

  it("dengan journals — semua final → available", () => {
    const journals = [
      { id: "j1", sessionId: "s1", academicYearId: "ay-2025", teacherId: "t1", classId: "VII A", classLabel: "VII A", subject: "PPKn", date: "2025-07-21", semester: 1, plannedUnitId: null, plannedMaterialTitle: null, plannedLearningOutcome: null, presentCount: 10, sickCount: 0, excusedCount: 0, lateCount: 0, absentCount: 0, totalStudents: 10, realizationStatus: "done" as const, status: "final" as const, locked: true, finalizedAt: baseTimestamp, createdAt: baseTimestamp, updatedAt: baseTimestamp, deletedAt: null, syncStatus: "local_only" as const },
    ] as unknown as TeachingJournal[];
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({ journals })
    );
    expect(pkg.summary.totalJournals).toBe(1);
    expect(pkg.summary.totalJournalsFinal).toBe(1);
    const jDoc = pkg.documents.find((d) => d.key === "journal")!;
    expect(jDoc.status).toBe("available");
  });

  it("dengan journals — draft only → status draft", () => {
    const journals = [
      { id: "j1", sessionId: "s1", academicYearId: "ay-2025", teacherId: "t1", classId: "VII A", classLabel: "VII A", subject: "PPKn", date: "2025-07-21", semester: 1, plannedUnitId: null, plannedMaterialTitle: null, plannedLearningOutcome: null, presentCount: 0, sickCount: 0, excusedCount: 0, lateCount: 0, absentCount: 0, totalStudents: 0, realizationStatus: "done" as const, status: "draft" as const, locked: false, finalizedAt: null, createdAt: baseTimestamp, updatedAt: baseTimestamp, deletedAt: null, syncStatus: "local_only" as const },
    ] as unknown as TeachingJournal[];
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({ journals })
    );
    const jDoc = pkg.documents.find((d) => d.key === "journal")!;
    expect(jDoc.status).toBe("draft");
  });

  it("dengan gradeBook → dokumen nilai available/draft", () => {
    const gradeBook = {
      id: "gb-1",
      academicYearId: "ay-2025",
      teacherId: "t1",
      classId: "VII A",
      classLabel: "VII A",
      subject: "PPKn",
      semester: 1,
      passingScore: 75,
      entries: [
        { studentId: "s1", studentName: "A", dailyScore: 80, assignmentScore: null, summativeScore: null, remedialScore: null, averageScore: null, finalScore: 80, status: "complete" as const },
      ],
      status: "draft",
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    } as unknown as GradeBook;
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({ gradeBook })
    );
    expect(pkg.summary.totalGradeEntries).toBe(1);
    const gDoc = pkg.documents.find((d) => d.key === "grades")!;
    expect(gDoc.status).toBe("available"); // finalScore !== null
  });

  it("dengan remedialProgram → status draft/available", () => {
    const remedial = {
      id: "rem-1",
      academicYearId: "ay-2025",
      teacherId: "t1",
      teacherName: "Siti Aminah",
      subject: "PPKn",
      classId: "VII A",
      classLabel: "VII A",
      semester: 1,
      kktp: 75,
      students: [{ studentId: "s1", studentName: "A", finalScore: 60, remedialScore: null }],
      status: "draft",
      finalizedAt: null,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    } as unknown as RemedialProgram;
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({ remedialProgram: remedial })
    );
    expect(pkg.summary.remedialStudents).toBe(1);
    const rDoc = pkg.documents.find((d) => d.key === "remedial")!;
    expect(rDoc.status).toBe("draft");
  });

  it("dengan enrichmentProgram → status available bila final", () => {
    const enrichment = {
      id: "enr-1",
      academicYearId: "ay-2025",
      teacherId: "t1",
      teacherName: "Siti Aminah",
      subject: "PPKn",
      classId: "VII A",
      classLabel: "VII A",
      semester: 1,
      threshold: 90,
      students: [{ studentId: "s1", studentName: "A", finalScore: 95 }],
      status: "final",
      finalizedAt: baseTimestamp,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    } as unknown as EnrichmentProgram;
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({ enrichmentProgram: enrichment })
    );
    expect(pkg.summary.enrichmentStudents).toBe(1);
    const eDoc = pkg.documents.find((d) => d.key === "pengayaan")!;
    expect(eDoc.status).toBe("available");
  });

  it("completenessScore = (available + draft*0.5) / total * 100", () => {
    // 2 available + 1 draft + 9 not_available = 12 total
    // score = (2 + 0.5) / 12 * 100 = 20.83 → round = 21
    const pkg = generateAdminDocumentPackage(
      makeEmptyInput({
        prota: { id: "p", academicYearId: "ay-2025", subject: "PPKn", grade: "VII", phase: "D", teacherId: "t1", annualIntraJP: 72, semester1IntraJP: 36, semester2IntraJP: 36, units: [], status: "draft", sourceYearId: null, createdAt: baseTimestamp, updatedAt: baseTimestamp, deletedAt: null, syncStatus: "local_only" } as ProtaProfile,
        roster: makeRoster(5),
        journals: [
          { id: "j1", sessionId: "s1", academicYearId: "ay-2025", teacherId: "t1", classId: "VII A", classLabel: "VII A", subject: "PPKn", date: "2025-07-21", semester: 1, plannedUnitId: null, plannedMaterialTitle: null, plannedLearningOutcome: null, presentCount: 0, sickCount: 0, excusedCount: 0, lateCount: 0, absentCount: 0, totalStudents: 0, realizationStatus: "done" as const, status: "draft" as const, locked: false, finalizedAt: null, createdAt: baseTimestamp, updatedAt: baseTimestamp, deletedAt: null, syncStatus: "local_only" as const },
        ] as unknown as TeachingJournal[],
      })
    );
    expect(pkg.summary.availableDocs).toBe(2); // Prota + Roster
    expect(pkg.summary.draftDocs).toBe(1); // Journal draft
    expect(pkg.summary.completenessScore).toBe(21);
  });

  it("setiap dokumen punya route yang valid", () => {
    const pkg = generateAdminDocumentPackage(makeEmptyInput());
    for (const doc of pkg.documents) {
      expect(doc.route).toMatch(/^\//);
      expect(doc.route.length).toBeGreaterThan(1);
    }
  });

  it("data tidak bercampur — assignment context di paket", () => {
    const pkg = generateAdminDocumentPackage(makeEmptyInput());
    expect(pkg.assignment.teacherId).toBe("t1");
    expect(pkg.assignment.subject).toBe("PPKn");
    expect(pkg.assignment.classId).toBe("VII A");
    expect(pkg.assignment.semester).toBe(1);
  });
});

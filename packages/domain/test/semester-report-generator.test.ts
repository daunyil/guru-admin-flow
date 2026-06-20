/**
 * Test untuk semester-report-generator.ts
 */
import { describe, it, expect } from "vitest";
import { generateSemesterReport, canFinalizeSemesterReport } from "../src/semester-report-generator";
import type {
  AcademicYear,
  ProtaProfile,
  ProtaUnit,
  LessonSession,
  TeachingJournal,
  AttendanceRecord,
} from "../src";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeAcademicYear(): AcademicYear {
  return {
    id: "ay-2025",
    label: "2025/2026",
    startDate: "2025-07-14",
    endDate: "2026-06-13",
    semester1Start: "2025-07-14",
    semester1End: "2025-11-16",
    semester2Start: "2026-01-05",
    semester2End: "2026-05-17",
    active: true,
    sourceYearId: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

function makeProtaProfile(units: ProtaUnit[] = []): ProtaProfile {
  return {
    id: "prota-1",
    academicYearId: "ay-2025",
    subject: "Pendidikan Pancasila",
    grade: "VII",
    phase: "D",
    teacherId: "teacher-1",
    annualIntraJP: 36,
    semester1IntraJP: 36,
    semester2IntraJP: 36,
    units,
    status: "draft",
    sourceYearId: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

function makeProtaUnit(overrides: Partial<ProtaUnit> = {}): ProtaUnit {
  return {
    id: "unit-1",
    protaProfileId: "prota-1",
    semester: 1,
    title: "Budaya Demokrasi",
    jp: 12,
    order: 1,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: "session-" + Math.random().toString(36).slice(2, 9),
    academicYearId: "ay-2025",
    teachingScheduleId: "sched-1",
    teacherId: "teacher-1",
    classId: "VII A",
    classLabel: "VII A",
    subject: "Pendidikan Pancasila",
    date: "2025-07-14",
    startPeriod: 1,
    durationJP: 2,
    startTime: "07:00",
    endTime: "08:20",
    semester: 1,
    plannedUnitId: "unit-1",
    status: "planned",
    calendarEventId: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeJournal(overrides: Partial<TeachingJournal> = {}): TeachingJournal {
  return {
    id: "journal-" + Math.random().toString(36).slice(2, 9),
    sessionId: "session-1",
    academicYearId: "ay-2025",
    teacherId: "teacher-1",
    classId: "VII A",
    classLabel: "VII A",
    subject: "Pendidikan Pancasila",
    date: "2025-07-14",
    semester: 1,
    plannedUnitId: "unit-1",
    plannedMaterialTitle: "Budaya Demokrasi",
    plannedLearningOutcome: null,
    presentCount: 5,
    sickCount: 0,
    excusedCount: 0,
    absentCount: 0,
    totalStudents: 5,
    realizationStatus: "done",
    actualMaterialTitle: undefined,
    note: undefined,
    followUp: undefined,
    status: "final",
    locked: true,
    finalizedAt: baseTimestamp,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeAttendance(sessionId: string, status: AttendanceRecord["status"] = "present"): AttendanceRecord {
  return {
    id: "att-" + Math.random().toString(36).slice(2, 9),
    sessionId,
    studentId: "student-1",
    studentName: "Siswa 1",
    studentNumber: 1,
    classId: "VII A",
    classLabel: "VII A",
    date: "2025-07-14",
    status,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

describe("semester-report-generator — Test #1: Happy path", () => {
  it("10 sesi + 10 jurnal final + 10 attendance + 1 unit selesai", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({ id: `session-${i + 1}`, date: `2025-07-${String(14 + i).padStart(2, "0")}` })
    );
    const journals = sessions.map((s) =>
      makeJournal({ sessionId: s.id, date: s.date, status: "final", locked: true, realizationStatus: "done" })
    );
    const attendance = sessions.map((s) => makeAttendance(s.id));
    const unit = makeProtaUnit({ id: "unit-1" });
    const prota = makeProtaProfile([unit]);

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: prota,
      sessions,
      journals,
      attendanceRecords: attendance,
      semester: 1,
      teacherId: "teacher-1",
    });

    expect(result.errors).toEqual([]);
    expect(result.report.totalPlannedSessions).toBe(10);
    expect(result.report.totalDoneSessions).toBe(10);
    expect(result.report.totalContinuedSessions).toBe(0);
    expect(result.report.totalCancelledSessions).toBe(0);
    expect(result.report.totalPlannedUnits).toBe(1);
    expect(result.report.totalCompletedUnits).toBe(1);
    expect(result.report.totalNotStartedUnits).toBe(0);
    expect(result.report.journalsFinalized).toBe(10);
    expect(result.report.journalsPending).toBe(0);
    expect(result.summary.completenessScore).toBe(100);
  });
});

describe("semester-report-generator — Test #2: Jurnal pending", () => {
  it("5 jurnal final + 5 jurnal draft → journalsPending=5", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({ id: `session-${i + 1}`, date: `2025-07-${String(14 + i).padStart(2, "0")}` })
    );
    const journals = sessions.map((s, i) =>
      makeJournal({
        sessionId: s.id,
        date: s.date,
        status: i < 5 ? "final" : "draft",
        locked: i < 5,
        realizationStatus: "done",
      })
    );
    const attendance = sessions.map((s) => makeAttendance(s.id));

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: makeProtaProfile([makeProtaUnit()]),
      sessions,
      journals,
      attendanceRecords: attendance,
      semester: 1,
      teacherId: "teacher-1",
    });

    expect(result.report.journalsFinalized).toBe(5);
    expect(result.report.journalsPending).toBe(5);
    expect(result.summary.completenessIssues).toContain("5 jurnal belum difinalisasi");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("semester-report-generator — Test #3: Tanpa ProtaProfile", () => {
  it("protaProfile=null → completeness issue + subject default", () => {
    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: null,
      sessions: [],
      journals: [],
      attendanceRecords: [],
      semester: 1,
      teacherId: "teacher-1",
    });

    expect(result.report.subject).toBe("(tidak ada Prota)");
    expect(result.summary.completenessIssues).toContain("ProtaProfile belum dipilih");
  });
});

describe("semester-report-generator — Test #4: Rekap absensi per kelas", () => {
  it("2 kelas, masing-masing 5 sesi → perClassAbsence 2 entry", () => {
    const sessions1 = Array.from({ length: 5 }, (_, i) =>
      makeSession({
        id: `s1-${i}`,
        classId: "VII A",
        classLabel: "VII A",
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
      })
    );
    const sessions2 = Array.from({ length: 5 }, (_, i) =>
      makeSession({
        id: `s2-${i}`,
        classId: "VIII B",
        classLabel: "VIII B",
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
      })
    );
    const sessions = [...sessions1, ...sessions2];
    const attendance = sessions.map((s) => makeAttendance(s.id));

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: makeProtaProfile([makeProtaUnit()]),
      sessions,
      journals: [],
      attendanceRecords: attendance,
      semester: 1,
      teacherId: "teacher-1",
    });

    expect(result.report.perClassAbsence.length).toBe(2);
    expect(result.report.perClassAbsence[0].classLabel).toBe("VII A");
    expect(result.report.perClassAbsence[1].classLabel).toBe("VIII B");
    expect(result.report.perClassAbsence[0].totalSessions).toBe(5);
  });
});

describe("semester-report-generator — Test #5: Materi selesai vs belum", () => {
  it("3 unit: 1 selesai (all done), 1 partial (mixed), 1 not started", () => {
    const unit1 = makeProtaUnit({ id: "unit-1", order: 1 });
    const unit2 = makeProtaUnit({ id: "unit-2", order: 2, title: "Keadilan" });
    const unit3 = makeProtaUnit({ id: "unit-3", order: 3, title: "Persatuan" });

    // 2 sesi untuk unit-1 (all done)
    const s1 = makeSession({ id: "s1", plannedUnitId: "unit-1", date: "2025-07-14" });
    const s2 = makeSession({ id: "s2", plannedUnitId: "unit-1", date: "2025-07-21" });
    // 2 sesi untuk unit-2 (1 done, 1 continued → partial)
    const s3 = makeSession({ id: "s3", plannedUnitId: "unit-2", date: "2025-07-28" });
    const s4 = makeSession({ id: "s4", plannedUnitId: "unit-2", date: "2025-08-04" });
    // unit-3 tidak ada sesi → not started

    const journals = [
      makeJournal({ sessionId: "s1", plannedUnitId: "unit-1", realizationStatus: "done", status: "final", locked: true }),
      makeJournal({ sessionId: "s2", plannedUnitId: "unit-1", realizationStatus: "done", status: "final", locked: true }),
      makeJournal({ sessionId: "s3", plannedUnitId: "unit-2", realizationStatus: "done", status: "final", locked: true }),
      makeJournal({ sessionId: "s4", plannedUnitId: "unit-2", realizationStatus: "continued", status: "final", locked: true }),
    ];

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: makeProtaProfile([unit1, unit2, unit3]),
      sessions: [s1, s2, s3, s4],
      journals,
      attendanceRecords: [],
      semester: 1,
      teacherId: "teacher-1",
    });

    expect(result.report.totalPlannedUnits).toBe(3);
    expect(result.report.totalCompletedUnits).toBe(1); // unit-1
    expect(result.report.totalPartialUnits).toBe(1); // unit-2
    expect(result.report.totalNotStartedUnits).toBe(1); // unit-3
    expect(result.report.completedUnitIds).toContain("unit-1");
    expect(result.report.partialUnitIds).toContain("unit-2");
    expect(result.report.notStartedUnitIds).toContain("unit-3");
  });
});

describe("semester-report-generator — Test #6: canFinalizeSemesterReport", () => {
  it("bisa finalize bila tidak ada jurnal pending + score >= 60", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession({ id: `s${i}`, date: `2025-07-${14 + i}` })
    );
    const journals = sessions.map((s) =>
      makeJournal({ sessionId: s.id, date: s.date, status: "final", locked: true })
    );

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: makeProtaProfile([makeProtaUnit()]),
      sessions,
      journals,
      attendanceRecords: [],
      semester: 1,
      teacherId: "teacher-1",
    });

    const check = canFinalizeSemesterReport(result);
    expect(check.canFinalize).toBe(true);
    expect(check.reasons).toEqual([]);
  });

  it("tidak bisa finalize bila ada jurnal pending", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession({ id: `s${i}`, date: `2025-07-${14 + i}` })
    );
    const journals = sessions.map((s, i) =>
      makeJournal({
        sessionId: s.id,
        date: s.date,
        status: i < 3 ? "final" : "draft",
        locked: i < 3,
      })
    );

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: makeProtaProfile([makeProtaUnit()]),
      sessions,
      journals,
      attendanceRecords: [],
      semester: 1,
      teacherId: "teacher-1",
    });

    const check = canFinalizeSemesterReport(result);
    expect(check.canFinalize).toBe(false);
    expect(check.reasons.some((r) => r.includes("2 jurnal belum difinalisasi"))).toBe(true);
  });
});

describe("semester-report-generator — Test #7: Semester filter", () => {
  it("data semester 2 tidak masuk ke laporan semester 1", () => {
    const s1 = makeSession({ id: "s1", semester: 1, date: "2025-07-14" });
    const s2 = makeSession({ id: "s2", semester: 2, date: "2026-01-05" });
    const j1 = makeJournal({ sessionId: "s1", semester: 1, date: "2025-07-14" });
    const j2 = makeJournal({ sessionId: "s2", semester: 2, date: "2026-01-05" });

    const result = generateSemesterReport({
      academicYear: makeAcademicYear(),
      protaProfile: makeProtaProfile([makeProtaUnit({ semester: 1 })]),
      sessions: [s1, s2],
      journals: [j1, j2],
      attendanceRecords: [],
      semester: 1,
      teacherId: "teacher-1",
    });

    expect(result.report.totalPlannedSessions).toBe(1); // hanya s1
    expect(result.report.totalDoneSessions).toBe(1); // hanya j1
  });
});

/**
 * Tests for catchup-helpers.ts (PATCH-FLOW-RC2D)
 */
import { describe, it, expect } from "vitest";
import {
  filterSessionsForAssignment,
  recapAttendanceForAssignment,
  recapJournalsForAssignment,
} from "../src/catchup-helpers";
import type {
  LessonSession,
  AttendanceRecord,
  TeachingJournal,
  TeachingAssignment,
} from "../src/index";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeAssignment(overrides: Partial<TeachingAssignment> = {}): TeachingAssignment {
  return {
    id: "asg-1",
    academicYearId: "ay-2025",
    semester: 1,
    teacherId: "t1",
    teacherName: "Emi Ramdani",
    subject: "PPKn",
    classId: "VII A",
    classLabel: "VII A",
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: "s-" + Math.random().toString(36).slice(2, 8),
    academicYearId: "ay-2025",
    teachingScheduleId: "sched-1",
    teacherId: "t1",
    classId: "VII A",
    classLabel: "VII A",
    subject: "PPKn",
    date: "2025-08-15",
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

function makeAttendance(sessionId: string): AttendanceRecord {
  return {
    id: "att-" + sessionId,
    sessionId,
    studentId: "s1",
    studentName: "Andi",
    studentNumber: 1,
    classId: "VII A",
    classLabel: "VII A",
    date: "2025-08-15",
    status: "present",
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

function makeJournal(sessionId: string): TeachingJournal {
  return {
    id: "jr-" + sessionId,
    sessionId,
    academicYearId: "ay-2025",
    teacherId: "t1",
    classId: "VII A",
    classLabel: "VII A",
    subject: "PPKn",
    date: "2025-08-15",
    semester: 1,
    plannedUnitId: null,
    plannedMaterialTitle: null,
    plannedLearningOutcome: null,
    presentCount: 1,
    sickCount: 0,
    excusedCount: 0,
    lateCount: 0,
    absentCount: 0,
    totalStudents: 1,
    realizationStatus: "done",
    status: "draft",
    locked: false,
    finalizedAt: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

describe("catchup-helpers — filterSessionsForAssignment", () => {
  it("filter by classId + subject + teacherId", () => {
    const assignment = makeAssignment();
    const sessions = [
      makeSession({ id: "s1", classId: "VII A", subject: "PPKn", teacherId: "t1" }),
      makeSession({ id: "s2", classId: "VII A", subject: "PPKn", teacherId: "t2" }), // beda guru
      makeSession({ id: "s3", classId: "VII B", subject: "PPKn", teacherId: "t1" }), // beda kelas
      makeSession({ id: "s4", classId: "VII A", subject: "IPA", teacherId: "t1" }), // beda mapel
    ];
    const filtered = filterSessionsForAssignment(sessions, assignment);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("s1");
  });

  it("exclude soft-deleted sessions", () => {
    const assignment = makeAssignment();
    const sessions = [
      makeSession({ id: "s1" }),
      makeSession({ id: "s2", deletedAt: baseTimestamp }),
    ];
    const filtered = filterSessionsForAssignment(sessions, assignment);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("s1");
  });
});

describe("catchup-helpers — recapAttendanceForAssignment", () => {
  it("5 sesi, 2 sudah absen, 1 cancelled → total=5, done=2, pending=2, cancelled=1", () => {
    const assignment = makeAssignment();
    const sessions = [
      makeSession({ id: "s1", date: "2025-08-01" }),
      makeSession({ id: "s2", date: "2025-08-08" }),
      makeSession({ id: "s3", date: "2025-08-15" }),
      makeSession({ id: "s4", date: "2025-08-22" }),
      makeSession({ id: "s5", date: "2025-08-29", status: "cancelled" }),
    ];
    const attendance = [
      makeAttendance("s1"),
      makeAttendance("s2"),
    ];
    const recap = recapAttendanceForAssignment({ sessions, attendanceRecords: attendance, assignment });
    expect(recap.total).toBe(5);
    expect(recap.done).toBe(2);
    expect(recap.pending).toBe(2);
    expect(recap.cancelled).toBe(1);
    expect(recap.pendingMeetings.map((m) => m.id)).toEqual(["s3", "s4"]);
    expect(recap.doneMeetings.map((m) => m.id)).toEqual(["s1", "s2"]);
  });

  it("empty sessions → total=0, done=0, pending=0", () => {
    const assignment = makeAssignment();
    const recap = recapAttendanceForAssignment({
      sessions: [],
      attendanceRecords: [],
      assignment,
    });
    expect(recap.total).toBe(0);
    expect(recap.done).toBe(0);
    expect(recap.pending).toBe(0);
    expect(recap.pendingMeetings.length).toBe(0);
  });

  it("pendingMeetings sorted ascending by date", () => {
    const assignment = makeAssignment();
    const sessions = [
      makeSession({ id: "s-late", date: "2025-09-15" }),
      makeSession({ id: "s-early", date: "2025-08-01" }),
      makeSession({ id: "s-mid", date: "2025-08-22" }),
    ];
    const recap = recapAttendanceForAssignment({
      sessions,
      attendanceRecords: [],
      assignment,
    });
    expect(recap.pendingMeetings.map((m) => m.id)).toEqual(["s-early", "s-mid", "s-late"]);
  });
});

describe("catchup-helpers — recapJournalsForAssignment", () => {
  it("4 sesi, 1 sudah jurnal, 1 cancelled → total=4, done=1, pending=2, cancelled=1", () => {
    const assignment = makeAssignment();
    const sessions = [
      makeSession({ id: "s1", date: "2025-08-01" }),
      makeSession({ id: "s2", date: "2025-08-08" }),
      makeSession({ id: "s3", date: "2025-08-15" }),
      makeSession({ id: "s4", date: "2025-08-22", status: "cancelled" }),
    ];
    const journals = [makeJournal("s1")];
    const recap = recapJournalsForAssignment({ sessions, journals, assignment });
    expect(recap.total).toBe(4);
    expect(recap.done).toBe(1);
    expect(recap.pending).toBe(2);
    expect(recap.cancelled).toBe(1);
    expect(recap.pendingMeetings.map((m) => m.id)).toEqual(["s2", "s3"]);
  });

  it("empty journals → all pending (no cancelled)", () => {
    const assignment = makeAssignment();
    const sessions = [
      makeSession({ id: "s1" }),
      makeSession({ id: "s2" }),
    ];
    const recap = recapJournalsForAssignment({ sessions, journals: [], assignment });
    expect(recap.total).toBe(2);
    expect(recap.done).toBe(0);
    expect(recap.pending).toBe(2);
  });
});

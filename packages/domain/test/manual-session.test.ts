/**
 * Tests for manual-session.ts (PATCH-FLOW-RC1)
 */
import { describe, it, expect } from "vitest";
import {
  createManualLessonSession,
  isMatchingManualSession,
  semesterForDate,
  type ManualSessionMode,
} from "../src/manual-session";
import type { AcademicYear, ClassRoster } from "../src/attendance";
import type { LessonSession } from "../src/lesson-session";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeAcademicYear(): AcademicYear {
  return {
    id: "ay-2025",
    label: "2025/2026",
    startDate: "2025-07-14",
    endDate: "2026-06-13",
    semester1Start: "2025-07-14",
    semester1End: "2025-12-19",
    semester2Start: "2026-01-06",
    semester2End: "2026-06-13",
    active: true,
    sourceYearId: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

function makeRoster(): ClassRoster {
  return {
    id: "roster-1",
    classId: "VII A",
    classLabel: "VII A",
    academicYearId: "ay-2025",
    students: [
      { id: "s1", name: "Andi", number: 1, nis: "12345" },
      { id: "s2", name: "Budi", number: 2, nis: "12346" },
    ],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

describe("manual-session — semesterForDate", () => {
  it("tanggal di semester 1 → return 1", () => {
    const ay = makeAcademicYear();
    expect(semesterForDate(ay, "2025-08-15")).toBe(1);
  });

  it("tanggal di semester 2 → return 2", () => {
    const ay = makeAcademicYear();
    expect(semesterForDate(ay, "2026-02-10")).toBe(2);
  });

  it("tanggal di luar rentang → default 1", () => {
    const ay = makeAcademicYear();
    expect(semesterForDate(ay, "2024-01-01")).toBe(1);
  });
});

describe("manual-session — createManualLessonSession", () => {
  it("membuat session dengan field wajib terisi", () => {
    const ay = makeAcademicYear();
    const roster = makeRoster();
    const session = createManualLessonSession({
      mode: "manual",
      academicYear: ay,
      teacherId: "teacher-1",
      roster,
      subject: "Pendidikan Pancasila",
      date: "2025-08-15",
    });

    expect(session.id).toBeTruthy();
    expect(session.academicYearId).toBe("ay-2025");
    expect(session.teacherId).toBe("teacher-1");
    expect(session.classId).toBe("VII A");
    expect(session.classLabel).toBe("VII A");
    expect(session.subject).toBe("Pendidikan Pancasila");
    expect(session.date).toBe("2025-08-15");
    expect(session.teachingScheduleId).toBe("manual");
    expect(session.status).toBe("planned");
    expect(session.semester).toBe(1);
    expect(session.startPeriod).toBe(1);
    expect(session.durationJP).toBe(1);
    expect(session.startTime).toBe("00:00");
    expect(session.endTime).toBe("00:00");
    expect(session.plannedUnitId).toBeNull();
    expect(session.calendarEventId).toBeNull();
    expect(session.syncStatus).toBe("local_only");
  });

  it("mode susulan → teachingScheduleId = 'susulan'", () => {
    const ay = makeAcademicYear();
    const roster = makeRoster();
    const session = createManualLessonSession({
      mode: "susulan",
      academicYear: ay,
      teacherId: "teacher-1",
      roster,
      subject: "PPKn",
      date: "2025-08-15",
    });
    expect(session.teachingScheduleId).toBe("susulan");
  });

  it("tanggal semester 2 → semester field = 2", () => {
    const ay = makeAcademicYear();
    const roster = makeRoster();
    const session = createManualLessonSession({
      mode: "manual",
      academicYear: ay,
      teacherId: "teacher-1",
      roster,
      subject: "PPKn",
      date: "2026-02-10",
    });
    expect(session.semester).toBe(2);
  });

  it("setiap call menghasilkan id unik", () => {
    const ay = makeAcademicYear();
    const roster = makeRoster();
    const s1 = createManualLessonSession({
      mode: "manual",
      academicYear: ay,
      teacherId: "teacher-1",
      roster,
      subject: "PPKn",
      date: "2025-08-15",
    });
    const s2 = createManualLessonSession({
      mode: "manual",
      academicYear: ay,
      teacherId: "teacher-1",
      roster,
      subject: "PPKn",
      date: "2025-08-15",
    });
    expect(s1.id).not.toBe(s2.id);
  });
});

describe("manual-session — isMatchingManualSession", () => {
  it("match bila classId+subject+date sama dan teachingScheduleId manual/susulan", () => {
    const session: LessonSession = {
      id: "s1",
      academicYearId: "ay-2025",
      teachingScheduleId: "manual",
      teacherId: "t1",
      classId: "VII A",
      classLabel: "VII A",
      subject: "PPKn",
      date: "2025-08-15",
      startPeriod: 1,
      durationJP: 1,
      startTime: "00:00",
      endTime: "00:00",
      semester: 1,
      plannedUnitId: null,
      status: "planned",
      calendarEventId: null,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    };
    expect(
      isMatchingManualSession(session, {
        classId: "VII A",
        subject: "PPKn",
        date: "2025-08-15",
      })
    ).toBe(true);
  });

  it("tidak match bila classId berbeda", () => {
    const session: LessonSession = {
      id: "s1",
      academicYearId: "ay-2025",
      teachingScheduleId: "manual",
      teacherId: "t1",
      classId: "VII A",
      classLabel: "VII A",
      subject: "PPKn",
      date: "2025-08-15",
      startPeriod: 1,
      durationJP: 1,
      startTime: "00:00",
      endTime: "00:00",
      semester: 1,
      plannedUnitId: null,
      status: "planned",
      calendarEventId: null,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    };
    expect(
      isMatchingManualSession(session, {
        classId: "VII B",
        subject: "PPKn",
        date: "2025-08-15",
      })
    ).toBe(false);
  });

  it("tidak match bila teachingScheduleId bukan manual/susulan (sesi jadwal)", () => {
    const session: LessonSession = {
      id: "s1",
      academicYearId: "ay-2025",
      teachingScheduleId: "sched-1",
      teacherId: "t1",
      classId: "VII A",
      classLabel: "VII A",
      subject: "PPKn",
      date: "2025-08-15",
      startPeriod: 1,
      durationJP: 1,
      startTime: "07:00",
      endTime: "07:40",
      semester: 1,
      plannedUnitId: null,
      status: "planned",
      calendarEventId: null,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    };
    expect(
      isMatchingManualSession(session, {
        classId: "VII A",
        subject: "PPKn",
        date: "2025-08-15",
      })
    ).toBe(false);
  });

  it("mode susulan juga match", () => {
    const session: LessonSession = {
      id: "s1",
      academicYearId: "ay-2025",
      teachingScheduleId: "susulan",
      teacherId: "t1",
      classId: "VII A",
      classLabel: "VII A",
      subject: "PPKn",
      date: "2025-08-15",
      startPeriod: 1,
      durationJP: 1,
      startTime: "00:00",
      endTime: "00:00",
      semester: 1,
      plannedUnitId: null,
      status: "planned",
      calendarEventId: null,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    };
    expect(
      isMatchingManualSession(session, {
        classId: "VII A",
        subject: "PPKn",
        date: "2025-08-15",
      })
    ).toBe(true);
  });
});

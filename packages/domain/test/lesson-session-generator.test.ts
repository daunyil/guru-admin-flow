/**
 * Test untuk lesson-session-generator.ts
 */
import { describe, it, expect } from "vitest";
import { generateLessonSessions } from "../src/lesson-session-generator";
import { makeAcademicYear, makeSchedule, makeCalendar } from "./sprint3-fixtures";

describe("lesson-session-generator — Test #1: Happy path", () => {
  it("1 jadwal Senin 2 JP, 18 minggu semester 1 → 18 sesi planned", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ dayOfWeek: 1, durationJP: 2, semester: 1 })]; // Senin
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    expect(result.errors).toEqual([]);
    expect(result.summary.totalSessions).toBe(18); // 18 Senin dalam semester
    expect(result.summary.plannedSessions).toBe(18);
    expect(result.summary.cancelledSessions).toBe(0);
    expect(result.summary.byClass.length).toBe(1);
    expect(result.summary.byClass[0].count).toBe(18);
    expect(result.summary.bySubject.length).toBe(1);
  });
});

describe("lesson-session-generator — Test #2: Holiday membatalkan sesi", () => {
  it("holiday 1 hari Senin → sesi itu cancelled", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ dayOfWeek: 1, durationJP: 2, semester: 1 })];
    const calendar = makeCalendar({
      holidays: [{ start: "2025-08-18", end: "2025-08-18", label: "Libur Nasional" }],
    });

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    // 18 Senin total, 1 diantaranya tanggal 18 Agustus → cancelled
    expect(result.summary.totalSessions).toBe(18);
    expect(result.summary.cancelledSessions).toBe(1);
    expect(result.summary.plannedSessions).toBe(17);

    const cancelled = result.sessions.find((s) => s.status === "cancelled");
    expect(cancelled).toBeDefined();
    expect(cancelled?.date).toBe("2025-08-18");
    expect(cancelled?.calendarEventId).toBeDefined();
  });
});

describe("lesson-session-generator — Test #3: Multi jadwal per hari", () => {
  it("2 jadwal di hari sama (Senin pagi + Senin siang) → 2 sesi per Senin", () => {
    const academicYear = makeAcademicYear();
    const schedules = [
      makeSchedule({ dayOfWeek: 1, startPeriod: 1, durationJP: 2, semester: 1, classId: "VII A" }),
      makeSchedule({ dayOfWeek: 1, startPeriod: 4, durationJP: 2, semester: 1, classId: "VIII B" }),
    ];
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    // 18 Senin × 2 jadwal = 36 sesi
    expect(result.summary.totalSessions).toBe(36);
    expect(result.summary.plannedSessions).toBe(36);
    expect(result.summary.byClass.length).toBe(2);
    expect(result.summary.byClass[0].count).toBe(18);
    expect(result.summary.byClass[1].count).toBe(18);
  });
});

describe("lesson-session-generator — Test #4: Semester 2 dengan jadwal semester 1 → error", () => {
  it("jadwal semester 1, generate semester 2 → error", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ semester: 1 })];
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 2,
      teacherId: "teacher-profile",
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Tidak ada TeachingSchedule untuk semester 2");
    expect(result.sessions.length).toBe(0);
  });
});

describe("lesson-session-generator — Test #5: Jadwal kosong → error", () => {
  it("schedules=[], return error", () => {
    const academicYear = makeAcademicYear();
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules: [],
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Tidak ada TeachingSchedule");
  });
});

describe("lesson-session-generator — Test #6: Kalender kosong → warning, sesi tetap planned", () => {
  it("calendar=[], warning + semua sesi planned", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ dayOfWeek: 1, semester: 1 })];
    const calendar: never[] = [];

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Kalender kosong");
    expect(result.summary.totalSessions).toBe(18);
    expect(result.summary.plannedSessions).toBe(18);
    expect(result.summary.cancelledSessions).toBe(0);
  });
});

describe("lesson-session-generator — Test #7: Holiday range (1 minggu)", () => {
  it("holiday 1 minggu penuh, semua sesi minggu itu cancelled", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ dayOfWeek: 1, semester: 1 })]; // Senin
    const calendar = makeCalendar({
      holidays: [
        // 18-24 Agustus 2025 (minggu ke-6 semester, Senin-Minggu)
        { start: "2025-08-18", end: "2025-08-24", label: "Libur Semester" },
      ],
    });

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    expect(result.summary.cancelledSessions).toBe(1);
    expect(result.summary.plannedSessions).toBe(17);
  });
});

describe("lesson-session-generator — Test #8: Multi hari", () => {
  it("jadwal Senin + Selasa → sesi di hari Senin & Selasa", () => {
    const academicYear = makeAcademicYear();
    const schedules = [
      makeSchedule({ dayOfWeek: 1, semester: 1, classId: "VII A" }), // Senin
      makeSchedule({ dayOfWeek: 2, semester: 1, classId: "VII A" }), // Selasa
    ];
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    // 18 Senin + 18 Selasa = 36 sesi
    expect(result.summary.totalSessions).toBe(36);
    expect(result.summary.plannedSessions).toBe(36);
  });
});

describe("lesson-session-generator — Test #9: Verifikasi field sesi", () => {
  it("setiap sesi punya field lengkap (id, academicYearId, teacherId, dll)", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ dayOfWeek: 1, semester: 1 })];
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    const session = result.sessions[0];
    expect(session.id).toBeDefined();
    expect(session.academicYearId).toBe("ay-2025");
    expect(session.teacherId).toBe("teacher-profile");
    expect(session.teachingScheduleId).toBe(schedules[0].id);
    expect(session.classId).toBe("VII A");
    expect(session.classLabel).toBe("VII A");
    expect(session.subject).toBe("Pendidikan Pancasila");
    expect(session.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(session.startPeriod).toBe(1);
    expect(session.durationJP).toBe(2);
    expect(session.startTime).toBe("07:00");
    expect(session.endTime).toBe("08:20");
    expect(session.semester).toBe(1);
    expect(session.plannedUnitId).toBeNull();
    expect(session.status).toBe("planned");
    expect(session.syncStatus).toBe("local_only");
  });
});

describe("lesson-session-generator — Test #10: CalendarEventId ter-assign", () => {
  it("sesi planned dapat calendarEventId dari learning event", () => {
    const academicYear = makeAcademicYear();
    const schedules = [makeSchedule({ dayOfWeek: 1, semester: 1 })];
    const calendar = makeCalendar();

    const result = generateLessonSessions({
      academicYear,
      schedules,
      calendar,
      semester: 1,
      teacherId: "teacher-profile",
    });

    const plannedSession = result.sessions.find((s) => s.status === "planned");
    expect(plannedSession?.calendarEventId).toBe("cal-learning-s1");
  });
});

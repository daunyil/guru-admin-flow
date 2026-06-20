/**
 * Helper fixture untuk test Sprint 3 (Jadwal + Sesi + Linker).
 */
import type {
  AcademicYear,
  TeachingSchedule,
  CalendarEvent,
  LessonSession,
  ProtaUnit,
} from "../src";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

export function makeAcademicYear(overrides: Partial<AcademicYear> = {}): AcademicYear {
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
    ...overrides,
  };
}

export function makeSchedule(overrides: Partial<TeachingSchedule> = {}): TeachingSchedule {
  return {
    id: "sched-" + Math.random().toString(36).slice(2, 9),
    academicYearId: "ay-2025",
    teacherId: "teacher-profile",
    subject: "Pendidikan Pancasila",
    classId: "VII A",
    classLabel: "VII A",
    dayOfWeek: 1,
    startPeriod: 1,
    durationJP: 2,
    startTime: "07:00",
    endTime: "08:20",
    semester: 1,
    source: "manual",
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

export function makeCalendar(
  options: { holidays?: Array<{ start: string; end: string; label: string }> } = {}
): CalendarEvent[] {
  const { holidays = [] } = options;
  const events: CalendarEvent[] = [];

  events.push({
    id: "cal-learning-s1",
    academicYearId: "ay-2025",
    startDate: "2025-07-14",
    endDate: "2025-11-16",
    type: "learning",
    label: "KBM Semester 1",
    scope: "ALL",
    blocksLearning: false,
    source: "manual",
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  });

  holidays.forEach((h, idx) => {
    events.push({
      id: `cal-holiday-${idx}`,
      academicYearId: "ay-2025",
      startDate: h.start,
      endDate: h.end,
      type: "holiday",
      label: h.label,
      scope: "ALL",
      blocksLearning: true,
      source: "manual",
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    });
  });

  return events;
}

export function makeProtaUnit(overrides: Partial<ProtaUnit> = {}): ProtaUnit {
  return {
    id: "unit-" + Math.random().toString(36).slice(2, 9),
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

export function makeLessonSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: "session-" + Math.random().toString(36).slice(2, 9),
    academicYearId: "ay-2025",
    teachingScheduleId: "sched-1",
    teacherId: "teacher-profile",
    classId: "VII A",
    classLabel: "VII A",
    subject: "Pendidikan Pancasila",
    date: "2025-07-14",
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

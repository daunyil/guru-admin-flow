/**
 * Helper untuk test Promes engine — fixture data valid.
 */
import type { AcademicYear, ProtaProfile, ProtaUnit, CalendarEvent } from "../src";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

export function makeAcademicYear(overrides: Partial<AcademicYear> = {}): AcademicYear {
  return {
    id: "ay-2025",
    label: "2025/2026",
    startDate: "2025-07-14",
    endDate: "2026-06-13",
    // Semester 1: 14 Jul 2025 (Sen) - 16 Nov 2025 (Sun) = tepat 18 minggu
    semester1Start: "2025-07-14",
    semester1End: "2025-11-16",
    // Semester 2: 5 Jan 2026 (Sen) - 17 May 2026 (Sun) = tepat 18 minggu
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

export function makeProtaProfile(overrides: Partial<ProtaProfile> = {}): ProtaProfile {
  return {
    id: "prota-1",
    academicYearId: "ay-2025",
    subject: "Pendidikan Pancasila",
    grade: "VII",
    phase: "D",
    teacherId: "teacher-profile",
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
    ...overrides,
  };
}

export type CalendarEventInput = {
  startDate: string;
  endDate: string;
  type?: CalendarEvent["type"];
  label?: string;
  blocksLearning?: boolean;
};

/**
 * Buat kalender dengan N minggu efektif + opsional holiday di tengah.
 * Default: 18 minggu efektif semester 1 (14 Jul - 20 Des 2025).
 */
export function makeCalendar(
  options: { effectiveWeeks?: number; holidays?: Array<{ start: string; end: string; label: string }> } = {}
): CalendarEvent[] {
  const { effectiveWeeks = 18, holidays = [] } = options;
  const events: CalendarEvent[] = [];

  // Satu event "learning" yang mencakup seluruh semester 1 (14 Jul - 16 Nov 2025)
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

  // Tambahkan holiday events
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

  // effectiveWeeks hanya untuk dokumentasi test — actual week count ditentukan oleh rentang tanggal
  void effectiveWeeks;

  return events;
}

/** Opsi default PPKn untuk generate Promes. */
export const defaultPPKnOptions = {
  intraJpPerWeek: 2,
  koJpPerWeek: 1,
  cadanganJP: 6,
  reserveFromEnd: true,
  koMode: "daily_block" as const,
};

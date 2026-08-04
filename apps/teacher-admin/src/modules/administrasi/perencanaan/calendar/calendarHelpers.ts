/**
 * Calendar helpers — constants, interfaces, and utility functions
 * extracted from CalendarPage.tsx for reuse and separation of concerns.
 */

import type { CalendarEvent, CalendarEventType } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

export const MONTH_FULL_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Semester months: Semester 1 = Jul–Dec, Semester 2 = Jan–Jun */
export const SEMESTER_MONTHS: Record<1 | 2, number[]> = {
  1: [7, 8, 9, 10, 11, 12],
  2: [1, 2, 3, 4, 5, 6],
};

/* ------------------------------------------------------------------ */
/*  Week computation helpers                                          */
/* ------------------------------------------------------------------ */

export interface CalendarWeek {
  /** 1-indexed week number within the semester. */
  weekNumber: number;
  /** ISO date string of Monday. */
  startDate: string;
  /** ISO date string of Sunday (or Saturday for school). */
  endDate: string;
  /** Whether this week has no blocking events (blocksLearning). */
  isEffective: boolean;
  /** Events that fall within this week. */
  events: CalendarEvent[];
  /** Human-readable label of blocking reason, if any. */
  blockReason: string;
}

/**
 * Build semester weeks from calendar events.
 * Iterates each week (Monday–Sunday) from semester start month to end month,
 * checks against calendar events for blocking.
 */
export function buildSemesterWeeks(
  tahunAjaran: string,
  semester: 1 | 2,
  events: CalendarEvent[],
): CalendarWeek[] {
  const [startYearStr] = tahunAjaran.split("/");
  const startYear = Number(startYearStr);
  const months = SEMESTER_MONTHS[semester];

  // Determine the actual year for each month.
  // Semester 1: July–Dec of startYear. Semester 2: Jan–June of (startYear+1).
  const monthYear = (_month: number): number => {
    if (semester === 1) return startYear;
    return startYear + 1;
  };

  // First day of semester = first Monday on or after the 1st of the first month
  const firstMonth = months[0];
  const fy = monthYear(firstMonth);
  const firstDay = new Date(fy, firstMonth - 1, 1);
  // Find first Monday
  const firstMonday = new Date(firstDay);
  const dayOfWeek = firstMonday.getDay(); // 0=Sun
  const offsetToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  firstMonday.setDate(firstMonday.getDate() + offsetToMonday);

  // Last day of semester = last day of the last month
  const lastMonth = months[months.length - 1];
  const ly = monthYear(lastMonth);
  const lastDay = new Date(ly, lastMonth, 0); // day 0 of next month = last day

  const weeks: CalendarWeek[] = [];
  let current = new Date(firstMonday);
  let weekNum = 1;

  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    const startISO = dateToISO(weekStart);
    const endISO = dateToISO(weekEnd);

    // Check events that overlap this week and block learning
    const weekEvents = events.filter((e) => {
      return e.startDate <= endISO && e.endDate >= startISO;
    });

    const blockingEvents = weekEvents.filter((e) => e.blocksLearning);
    const isEffective = blockingEvents.length === 0;
    const blockReason = !isEffective
      ? blockingEvents.map((e) => e.label).join("; ")
      : "";

    weeks.push({
      weekNumber: weekNum,
      startDate: startISO,
      endDate: endISO,
      isEffective,
      events: weekEvents,
      blockReason,
    });

    weekNum++;
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/** Format Date to ISO date string (YYYY-MM-DD). */
export function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Map CalendarEventType to Badge variant for sidebar display. */
export function badgeForType(type: CalendarEventType): "success" | "warning" | "error" | "neutral" {
  switch (type) {
    case "learning": return "success";
    case "assessment": return "warning";
    case "holiday": return "error";
    case "school_activity": return "neutral";
    case "remedial": return "warning";
    case "report": return "neutral";
    case "cocurricular": return "neutral";
    default: return "neutral";
  }
}

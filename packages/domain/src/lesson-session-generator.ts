/**
 * Generator LessonSession dari TeachingSchedule + CalendarEvent.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M05), docs/DATA_MODEL_DRAFT.md §7
 *
 * Pure function: tidak baca dari Dexie, tidak ada side effect.
 *
 * Algoritma:
 *   1. Enumerasi tanggal dalam rentang semester
 *   2. Untuk setiap tanggal, cek apakah diblokir kalender (holiday/school_activity blocksLearning=true)
 *   3. Bila tidak diblokir, cari TeachingSchedule yang dayOfWeek cocok + semester cocok
 *   4. Untuk setiap TeachingSchedule yang cocok, buat LessonSession dengan status:
 *      - "planned" bila tidak diblokir
 *      - "cancelled" bila diblokir (holiday/school_activity)
 *   5. Assign calendarEventId bila ada event yang overlap (untuk info)
 */

import type {
  TeachingSchedule,
  CalendarEvent,
  LessonSession,
  AcademicYear,
} from "./index";
import {
  parseISODate,
  toISODate,
  getDayOfWeek,
  dateRangesOverlap,
  uuid,
  nowTimestamp,
} from "@guru-admin/shared";

/** Input untuk generateLessonSessions. */
export type GenerateLessonSessionsInput = {
  academicYear: AcademicYear;
  schedules: TeachingSchedule[];
  calendar: CalendarEvent[];
  semester: 1 | 2;
  /** teacherId untuk LessonSession (dari TeacherProfile). */
  teacherId: string;
};

/** Hasil generate LessonSession. */
export type GenerateLessonSessionsResult = {
  sessions: LessonSession[];
  summary: {
    totalSessions: number;
    plannedSessions: number;
    cancelledSessions: number;
    byClass: Array<{ classId: string; classLabel: string; count: number }>;
    bySubject: Array<{ subject: string; count: number }>;
  };
  warnings: string[];
  errors: string[];
};

/**
 * Generate LessonSession[] dari TeachingSchedule + CalendarEvent untuk satu semester.
 *
 * Pure function. Caller wajib simpan hasil ke Dexie.
 */
export function generateLessonSessions(
  input: GenerateLessonSessionsInput
): GenerateLessonSessionsResult {
  const { academicYear, schedules, calendar, semester, teacherId } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validasi input
  if (schedules.length === 0) {
    errors.push("Tidak ada TeachingSchedule. Tambahkan jadwal guru dulu.");
    return emptyResult(warnings, errors);
  }

  // Filter schedule untuk semester ini
  const semesterSchedules = schedules.filter((s) => s.semester === semester);
  if (semesterSchedules.length === 0) {
    errors.push(
      `Tidak ada TeachingSchedule untuk semester ${semester}. Tambahkan jadwal untuk semester ini.`
    );
    return emptyResult(warnings, errors);
  }

  // Tentukan rentang semester
  const semesterStart =
    semester === 1 ? academicYear.semester1Start : academicYear.semester2Start;
  const semesterEnd =
    semester === 1 ? academicYear.semester1End : academicYear.semester2End;

  // Enumerasi tanggal dalam semester
  const dates = enumerateDates(semesterStart, semesterEnd);
  if (dates.length === 0) {
    errors.push(`Rentang semester ${semester} tidak valid (start > end atau kosong).`);
    return emptyResult(warnings, errors);
  }

  // Filter calendar events yang overlap dengan semester
  const semesterCalendar = calendar.filter((e) =>
    dateRangesOverlap(e.startDate, e.endDate, semesterStart, semesterEnd)
  );

  if (semesterCalendar.length === 0) {
    warnings.push(
      `Kalender kosong untuk semester ${semester}. Semua sesi akan berstatus "planned" tanpa pembatalan kalender.`
    );
  }

  const sessions: LessonSession[] = [];
  const now = nowTimestamp();

  // Untuk setiap tanggal dalam semester
  for (const dateISO of dates) {
    const dow = getDayOfWeek(dateISO);

    // Cari event yang overlap dengan tanggal ini
    const dateEvents = semesterCalendar.filter(
      (e) => e.startDate <= dateISO && e.endDate >= dateISO
    );

    // Cari blocking event (blocksLearning=true)
    const blockingEvent = dateEvents.find((e) => e.blocksLearning);
    const isBlocked = !!blockingEvent;

    // Cari schedule untuk hari ini
    const daySchedules = semesterSchedules.filter((s) => s.dayOfWeek === dow);

    for (const schedule of daySchedules) {
      // Cari calendarEvent learning yang overlap (untuk info)
      const learningEvent = dateEvents.find((e) => e.type === "learning");

      // Tentukan status sesi
      let status: LessonSession["status"];
      if (isBlocked) {
        status = "cancelled";
      } else {
        status = "planned";
      }

      const session: LessonSession = {
        id: uuid(),
        academicYearId: academicYear.id,
        teachingScheduleId: schedule.id,
        teacherId,
        classId: schedule.classId,
        classLabel: schedule.classLabel,
        subject: schedule.subject,
        date: dateISO,
        startPeriod: schedule.startPeriod,
        durationJP: schedule.durationJP,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        semester,
        plannedUnitId: null,
        status,
        calendarEventId: blockingEvent?.id ?? learningEvent?.id ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local_only",
      };
      sessions.push(session);
    }
  }

  // Build summary
  const byClassMap = new Map<string, { classLabel: string; count: number }>();
  const bySubjectMap = new Map<string, number>();

  for (const s of sessions) {
    const existing = byClassMap.get(s.classId);
    if (existing) {
      existing.count++;
    } else {
      byClassMap.set(s.classId, { classLabel: s.classLabel, count: 1 });
    }
    bySubjectMap.set(s.subject, (bySubjectMap.get(s.subject) ?? 0) + 1);
  }

  const summary: GenerateLessonSessionsResult["summary"] = {
    totalSessions: sessions.length,
    plannedSessions: sessions.filter((s) => s.status === "planned").length,
    cancelledSessions: sessions.filter((s) => s.status === "cancelled").length,
    byClass: Array.from(byClassMap.entries()).map(([classId, v]) => ({
      classId,
      classLabel: v.classLabel,
      count: v.count,
    })),
    bySubject: Array.from(bySubjectMap.entries()).map(([subject, count]) => ({ subject, count })),
  };

  return {
    sessions,
    summary,
    warnings,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper functions (internal)                                       */
/* ------------------------------------------------------------------ */

function emptyResult(warnings: string[], errors: string[]): GenerateLessonSessionsResult {
  return {
    sessions: [],
    summary: {
      totalSessions: 0,
      plannedSessions: 0,
      cancelledSessions: 0,
      byClass: [],
      bySubject: [],
    },
    warnings,
    errors,
  };
}

/** Enumerasi tanggal (YYYY-MM-DD) dalam rentang [start, end] inklusif. */
function enumerateDates(startISO: string, endISO: string): string[] {
  const result: string[] = [];
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (start > end) return result;

  const cursor = new Date(start);
  while (cursor <= end) {
    result.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

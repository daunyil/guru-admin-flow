/**
 * LessonSession — Sesi mengajar konkret pada tanggal tertentu.
 * Sumber: docs/DATA_MODEL_DRAFT.md §7
 *
 * Sprint 1: schema + parse only. Generator dari Schedule + Calendar
 * akan dikerjakan di Sprint 3.
 */

import { z } from "zod";
import { LESSON_SESSION_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema } from "./base";

export const lessonSessionStatusSchema = z.enum(LESSON_SESSION_STATUSES);

export const lessonSessionSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teachingScheduleId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  date: z.string(),
  startPeriod: z.number().int().positive(),
  durationJP: z.number().int().positive(),
  startTime: z.string(),
  endTime: z.string(),
  semester: z.union([z.literal(1), z.literal(2)]),
  plannedUnitId: z.string().nullable().optional(),
  status: lessonSessionStatusSchema,
  calendarEventId: z.string().nullable().optional(),
});

export type LessonSession = z.infer<typeof lessonSessionSchema>;
export type LessonSessionStatus = z.infer<typeof lessonSessionStatusSchema>;

export function parseLessonSession(input: unknown): LessonSession {
  return lessonSessionSchema.parse(input);
}

export function safeParseLessonSession(input: unknown) {
  const result = lessonSessionSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

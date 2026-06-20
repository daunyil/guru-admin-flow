/**
 * TeachingSchedule — Jadwal mengajar guru.
 * Sumber: docs/DATA_MODEL_DRAFT.md §6
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const teachingScheduleSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  dayOfWeek: z.number().int().min(1).max(7),
  startPeriod: z.number().int().positive(),
  durationJP: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime wajib format HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime wajib format HH:mm"),
  semester: z.union([z.literal(1), z.literal(2)]),
  source: z.enum(["manual", "smart_roster_import"]),
  notes: z.string().optional(),
});

export type TeachingSchedule = z.infer<typeof teachingScheduleSchema>;

export function parseTeachingSchedule(input: unknown): TeachingSchedule {
  return teachingScheduleSchema.parse(input);
}

export function safeParseTeachingSchedule(input: unknown) {
  const result = teachingScheduleSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  if (result.data.startTime >= result.data.endTime) {
    return {
      success: false as const,
      error: new Error("startTime wajib lebih awal dari endTime"),
    };
  }
  return { success: true as const, data: result.data };
}

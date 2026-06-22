/**
 * Attendance — AttendanceRecord + ClassRoster + StudentEntry.
 * Sumber: docs/DATA_MODEL_DRAFT.md §8
 */

import { z } from "zod";
import { ATTENDANCE_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema } from "./base";

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);

export const attendanceRecordSchema = baseEntitySchema.extend({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  date: z.string(),
  status: attendanceStatusSchema,
  note: z.string().optional(),
});

export const studentEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  number: z.number().int().positive(),
  nis: z.string().optional(),
});

export const classRosterSchema = baseEntitySchema.extend({
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  academicYearId: z.string().min(1),
  students: z.array(studentEntrySchema),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type StudentEntry = z.infer<typeof studentEntrySchema>;
export type ClassRoster = z.infer<typeof classRosterSchema>;

export function parseAttendanceRecord(input: unknown): AttendanceRecord {
  return attendanceRecordSchema.parse(input);
}

export function safeParseAttendanceRecord(input: unknown) {
  const result = attendanceRecordSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

export function parseClassRoster(input: unknown): ClassRoster {
  return classRosterSchema.parse(input);
}

export function safeParseClassRoster(input: unknown) {
  const result = classRosterSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

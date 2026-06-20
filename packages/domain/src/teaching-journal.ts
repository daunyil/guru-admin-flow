/**
 * TeachingJournal — Jurnal mengajar per sesi.
 * Sumber: docs/DATA_MODEL_DRAFT.md §9
 *
 * Sprint 1: schema + parse only. Auto-fill dari LessonSession + ProtaUnit +
 * AttendanceRecord akan dikerjakan di Sprint 4.
 */

import { z } from "zod";
import { JOURNAL_REALIZATION_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const journalRealizationStatusSchema = z.enum(JOURNAL_REALIZATION_STATUSES);

export const teachingJournalSchema = baseEntitySchema.extend({
  sessionId: z.string().min(1),
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  date: z.string(),
  semester: z.union([z.literal(1), z.literal(2)]),

  // Auto-filled dari Promes + LessonSession
  plannedUnitId: z.string().nullable().optional(),
  plannedMaterialTitle: z.string().nullable().optional(),
  plannedLearningOutcome: z.string().nullable().optional(),

  // Auto-filled dari AttendanceRecord
  presentCount: z.number().int().nonnegative(),
  sickCount: z.number().int().nonnegative(),
  excusedCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),

  // Input guru
  realizationStatus: journalRealizationStatusSchema,
  actualMaterialTitle: z.string().optional(),
  note: z.string().optional(),
  followUp: z.string().optional(),

  // Status dokumen
  status: documentStatusSchema,
  locked: z.boolean(),
  finalizedAt: z.string().nullable().optional(),
});

export type TeachingJournal = z.infer<typeof teachingJournalSchema>;
export type JournalRealizationStatus = z.infer<typeof journalRealizationStatusSchema>;

export function parseTeachingJournal(input: unknown): TeachingJournal {
  return teachingJournalSchema.parse(input);
}

export function safeParseTeachingJournal(input: unknown) {
  const result = teachingJournalSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  // Validasi jumlah siswa
  const { presentCount, sickCount, excusedCount, absentCount, totalStudents } = result.data;
  if (presentCount + sickCount + excusedCount + absentCount !== totalStudents) {
    return {
      success: false as const,
      error: new Error(
        `Jumlah siswa tidak konsisten: present(${presentCount}) + sick(${sickCount}) + excused(${excusedCount}) + absent(${absentCount}) ≠ total(${totalStudents})`
      ),
    };
  }
  return { success: true as const, data: result.data };
}

/**
 * SemesterReport — Laporan akhir semester.
 * Sumber: docs/DATA_MODEL_DRAFT.md §10
 *
 * Sprint 1: schema + parse only. Generator dari jurnal + absensi akan
 * dikerjakan di Sprint 5.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const classAbsenceSummarySchema = z.object({
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  presentCount: z.number().int().nonnegative(),
  sickCount: z.number().int().nonnegative(),
  excusedCount: z.number().int().nonnegative(),
  lateCount: z.number().int().nonnegative().optional(),
  absentCount: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
});

export const semesterReportSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  phase: z.string().min(1),
  /**
   * APP-USABLE-RC1B: classId + classLabel wajib, supaya laporan terikat
   * ke Data Mengajar spesifik (bukan hanya grade). Bila backup lama tidak
   * punya, default "" (akan di-backfill saat generate berikutnya).
   */
  classId: z.string().default(""),
  classLabel: z.string().default(""),
  semester: z.union([z.literal(1), z.literal(2)]),

  // Rekap pertemuan
  totalPlannedSessions: z.number().int().nonnegative(),
  totalDoneSessions: z.number().int().nonnegative(),
  totalContinuedSessions: z.number().int().nonnegative(),
  totalCancelledSessions: z.number().int().nonnegative(),

  // Rekap materi
  totalPlannedUnits: z.number().int().nonnegative(),
  totalCompletedUnits: z.number().int().nonnegative(),
  totalPartialUnits: z.number().int().nonnegative(),
  totalNotStartedUnits: z.number().int().nonnegative(),
  completedUnitIds: z.array(z.string()),
  partialUnitIds: z.array(z.string()),
  notStartedUnitIds: z.array(z.string()),

  // Rekap absensi
  totalPresent: z.number().int().nonnegative(),
  totalSick: z.number().int().nonnegative(),
  totalExcused: z.number().int().nonnegative(),
  totalLate: z.number().int().nonnegative().optional(),
  totalAbsent: z.number().int().nonnegative(),
  perClassAbsence: z.array(classAbsenceSummarySchema),

  // Rekap jurnal
  journalsFinalized: z.number().int().nonnegative(),
  journalsPending: z.number().int().nonnegative(),
  pendingJournalDates: z.array(z.string()),

  // Catatan
  teacherNotes: z.string().optional(),
  followUpNotes: z.string().optional(),
  materialAdjustments: z.string().optional(),

  // Status dokumen
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
  snapshotId: z.string().nullable().optional(),
});

export type SemesterReport = z.infer<typeof semesterReportSchema>;
export type ClassAbsenceSummary = z.infer<typeof classAbsenceSummarySchema>;

export function parseSemesterReport(input: unknown): SemesterReport {
  return semesterReportSchema.parse(input);
}

export function safeParseSemesterReport(input: unknown) {
  const result = semesterReportSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

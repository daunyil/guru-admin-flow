/**
 * GradeBook — Nilai ringan per kelas.
 *
 * v0.6: bukan raport penuh. Modul ini hanya menyimpan nilai kerja guru
 * untuk Harian, Tugas, Sumatif, Remedial, rata-rata, status, dan catatan.
 */

import { z } from "zod";
import { GRADE_ENTRY_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const gradeEntryStatusSchema = z.enum(GRADE_ENTRY_STATUSES);

const scoreSchema = z.number().min(0).max(100).nullable().optional();

export const gradeEntrySchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  dailyScore: scoreSchema,
  assignmentScore: scoreSchema,
  summativeScore: scoreSchema,
  remedialScore: scoreSchema,
  averageScore: scoreSchema,
  finalScore: scoreSchema,
  status: gradeEntryStatusSchema,
  note: z.string().optional(),
});

export const gradeBookSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  passingScore: z.number().min(0).max(100),
  entries: z.array(gradeEntrySchema),
  status: documentStatusSchema,
});

export type GradeEntryStatus = z.infer<typeof gradeEntryStatusSchema>;
export type GradeEntry = z.infer<typeof gradeEntrySchema>;
export type GradeBook = z.infer<typeof gradeBookSchema>;

export type GradeBookSummary = {
  totalStudents: number;
  completeCount: number;
  remedialCount: number;
  incompleteCount: number;
  classAverage: number | null;
};

function normalizeScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function calculateGradeEntry(
  entry: GradeEntry,
  passingScore: number
): GradeEntry {
  const dailyScore = normalizeScore(entry.dailyScore);
  const assignmentScore = normalizeScore(entry.assignmentScore);
  const summativeScore = normalizeScore(entry.summativeScore);
  const remedialScore = normalizeScore(entry.remedialScore);
  const baseScores = [dailyScore, assignmentScore, summativeScore].filter(
    (score): score is number => score !== null
  );

  if (baseScores.length === 0) {
    return {
      ...entry,
      dailyScore,
      assignmentScore,
      summativeScore,
      remedialScore,
      averageScore: null,
      finalScore: remedialScore,
      status: "incomplete",
    };
  }

  const averageScore = Math.round((baseScores.reduce((sum, score) => sum + score, 0) / baseScores.length) * 100) / 100;
  const finalScore = remedialScore !== null ? Math.max(averageScore, remedialScore) : averageScore;
  const status: GradeEntryStatus = finalScore >= passingScore ? "complete" : "remedial";

  return {
    ...entry,
    dailyScore,
    assignmentScore,
    summativeScore,
    remedialScore,
    averageScore,
    finalScore,
    status,
  };
}

export function calculateGradeBookEntries(
  entries: GradeEntry[],
  passingScore: number
): GradeEntry[] {
  return entries.map((entry) => calculateGradeEntry(entry, passingScore));
}

export function summarizeGradeBook(gradeBook: GradeBook): GradeBookSummary {
  const entries = calculateGradeBookEntries(gradeBook.entries, gradeBook.passingScore);
  const finalScores = entries
    .map((entry) => entry.finalScore)
    .filter((score): score is number => typeof score === "number");

  return {
    totalStudents: entries.length,
    completeCount: entries.filter((entry) => entry.status === "complete").length,
    remedialCount: entries.filter((entry) => entry.status === "remedial").length,
    incompleteCount: entries.filter((entry) => entry.status === "incomplete").length,
    classAverage: finalScores.length > 0
      ? Math.round((finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length) * 100) / 100
      : null,
  };
}

export function parseGradeBook(input: unknown): GradeBook {
  return gradeBookSchema.parse(input);
}

export function safeParseGradeBook(input: unknown) {
  const result = gradeBookSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

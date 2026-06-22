/**
 * RemedialProgram — Program Remedial otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 2: siswa dengan nilai akhir < KKTP
 * otomatis masuk daftar remedial.
 *
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 * Output: dokumen program remedial siap cetak.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const remedialStudentSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  nis: z.string().optional(),
  /** Nilai akhir sebelum remedial. */
  finalScore: z.number().min(0).max(100),
  /** Nilai setelah remedial (diisi guru setelah pelaksanaan). */
  remedialScore: z.number().min(0).max(100).nullable().optional(),
  /** TP/materi yang perlu diperbaiki. */
  tpToImprove: z.string().optional(),
  /** Bentuk remedial: tutor sebaya, pengulangan, tugas ulang, dll. */
  method: z.string().optional(),
  /** Jadwal remedial. */
  schedule: z.string().optional(),
  /** Catatan guru. */
  note: z.string().optional(),
});
export type RemedialStudent = z.infer<typeof remedialStudentSchema>;

export const remedialProgramSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  /** KKTP yang dipakai untuk filter. */
  kktp: z.number().int().min(0).max(100),
  /** Daftar siswa remedial. */
  students: z.array(remedialStudentSchema),
  /** Rencana remedial umum. */
  plan: z.string().optional(),
  /** Tanggal mulai remedial. */
  startDate: z.string().optional(),
  /** Tanggal selesai remedial. */
  endDate: z.string().optional(),

  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});
export type RemedialProgram = z.infer<typeof remedialProgramSchema>;

export function parseRemedialProgram(input: unknown): RemedialProgram {
  return remedialProgramSchema.parse(input);
}

export function safeParseRemedialProgram(input: unknown) {
  const result = remedialProgramSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Filter siswa dari GradeBook entries yang nilai akhirnya < KKTP.
 * Pure function.
 */
export function filterRemedialStudents(
  entries: Array<{
    studentId: string;
    studentName: string;
    studentNumber?: number;
    nis?: string;
    finalScore: number | null;
  }>,
  kktp: number
): RemedialStudent[] {
  return entries
    .filter((e) => e.finalScore !== null && e.finalScore < kktp)
    .map((e) => ({
      studentId: e.studentId,
      studentName: e.studentName,
      studentNumber: e.studentNumber,
      nis: e.nis,
      finalScore: e.finalScore as number,
      remedialScore: null,
      tpToImprove: undefined,
      method: undefined,
      schedule: undefined,
      note: undefined,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/**
 * Cek apakah program remedial lengkap (bisa difinalkan).
 */
export function isRemedialProgramComplete(program: RemedialProgram): {
  complete: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];
  if (program.students.length === 0) {
    missing.push("Belum ada siswa remedial (semua siswa tuntas atau belum ada nilai)");
  }
  return { complete: missing.length === 0, missingFields: missing };
}

/**
 * Finalize: set status "final" + finalizedAt.
 */
export function finalizeRemedialProgram(program: RemedialProgram): {
  success: boolean;
  program?: RemedialProgram;
  errors: string[];
} {
  const check = isRemedialProgramComplete(program);
  if (!check.complete) {
    return {
      success: false,
      errors: [`Program remedial belum lengkap: ${check.missingFields.join(", ")}`],
    };
  }
  const now = new Date().toISOString();
  return {
    success: true,
    program: {
      ...program,
      status: "final",
      finalizedAt: now,
      updatedAt: now,
    },
    errors: [],
  };
}

/**
 * EnrichmentProgram — Program Pengayaan otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 3: siswa dengan nilai akhir >= threshold
 * (default 90) otomatis masuk daftar pengayaan.
 *
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 * Output: dokumen program pengayaan siap cetak.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

/** Default threshold pengayaan. */
export const DEFAULT_ENRICHMENT_THRESHOLD = 90;

export const enrichmentStudentSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  nis: z.string().optional(),
  /** Nilai akhir siswa. */
  finalScore: z.number().min(0).max(100),
  /** Aktivitas pengayaan. */
  activity: z.string().optional(),
  /** Materi lanjutan. */
  material: z.string().optional(),
  /** Catatan guru. */
  note: z.string().optional(),
});
export type EnrichmentStudent = z.infer<typeof enrichmentStudentSchema>;

export const enrichmentProgramSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  /** Threshold pengayaan (default 90). */
  threshold: z.number().int().min(0).max(100),
  /** Daftar siswa pengayaan. */
  students: z.array(enrichmentStudentSchema),
  /** Rencana pengayaan umum. */
  plan: z.string().optional(),

  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});
export type EnrichmentProgram = z.infer<typeof enrichmentProgramSchema>;

export function parseEnrichmentProgram(input: unknown): EnrichmentProgram {
  return enrichmentProgramSchema.parse(input);
}

export function safeParseEnrichmentProgram(input: unknown) {
  const result = enrichmentProgramSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Filter siswa dari GradeBook entries yang nilai akhirnya >= threshold.
 * Pure function.
 */
export function filterEnrichmentStudents(
  entries: Array<{
    studentId: string;
    studentName: string;
    studentNumber?: number;
    nis?: string;
    finalScore: number | null;
  }>,
  threshold: number = DEFAULT_ENRICHMENT_THRESHOLD
): EnrichmentStudent[] {
  return entries
    .filter((e) => e.finalScore !== null && e.finalScore >= threshold)
    .map((e) => ({
      studentId: e.studentId,
      studentName: e.studentName,
      studentNumber: e.studentNumber,
      nis: e.nis,
      finalScore: e.finalScore as number,
      activity: undefined,
      material: undefined,
      note: undefined,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/**
 * Cek apakah program pengayaan lengkap.
 *
 * RC1-PATCH-1: 0 siswa pengayaan = TETAP lengkap (boleh final).
 * Dokumen cetak keterangan "Tidak ada siswa pengayaan".
 */
export function isEnrichmentProgramComplete(_program: EnrichmentProgram): {
  complete: boolean;
  missingFields: string[];
} {
  // 0 siswa bukan error — itu kondisi valid (belum ada siswa mencapai threshold)
  void _program;
  return { complete: true, missingFields: [] };
}

/**
 * Finalize: set status "final" + finalizedAt.
 */
export function finalizeEnrichmentProgram(program: EnrichmentProgram): {
  success: boolean;
  program?: EnrichmentProgram;
  errors: string[];
} {
  const check = isEnrichmentProgramComplete(program);
  if (!check.complete) {
    return {
      success: false,
      errors: [`Program pengayaan belum lengkap: ${check.missingFields.join(", ")}`],
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

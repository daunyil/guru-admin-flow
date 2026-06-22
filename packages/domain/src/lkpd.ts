/**
 * LKPD — Lembar Kerja Peserta Didik.
 *
 * APP-USABLE-RC1: modul nyata, bukan cuma prompt AI.
 *
 * LKPD wajib terikat ke ATPEntry (TP). Struktur mengikuti standar
 * Kurikulum Merdeka: tujuan, alat/bahan, langkah kegiatan, pertanyaan
 * pemandu, penilaian.
 *
 * Setiap LKPD terikat ke (academicYearId, teacherId, subject, classId?)
 * + atpEntryId. Bisa draft atau final. Bisa di-preview/cetak.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const lkpdSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  grade: z.string().min(1),
  classId: z.string().optional(), // opsional: LKPD bisa umum untuk grade atau khusus kelas
  classLabel: z.string().optional(),
  atpEntryId: z.string().min(1), // wajib terikat ke TP
  tp: z.string().min(1), // snapshot TP (untuk display bila ATP berubah)
  title: z.string().min(1),
  objective: z.string().min(1), // tujuan
  materials: z.string().optional(), // alat dan bahan
  steps: z.string().min(1), // langkah kegiatan
  guidingQuestions: z.string().optional(), // pertanyaan pemandu
  assessment: z.string().optional(), // penilaian
  notes: z.string().optional(),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});

export type LKPD = z.infer<typeof lkpdSchema>;

export function parseLKPD(input: unknown): LKPD {
  return lkpdSchema.parse(input);
}

export function safeParseLKPD(input: unknown) {
  const result = lkpdSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Cek apakah LKPD lengkap (bisa di-finalize).
 */
export function isLKPDComplete(lkpd: LKPD): {
  complete: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];
  if (!lkpd.title) missing.push("Judul");
  if (!lkpd.objective) missing.push("Tujuan");
  if (!lkpd.steps) missing.push("Langkah Kegiatan");
  if (!lkpd.atpEntryId) missing.push("TP (Tujuan Pembelajaran)");
  return { complete: missing.length === 0, missingFields: missing };
}

/**
 * Finalize LKPD: set status "final" + finalizedAt.
 */
export function finalizeLKPD(lkpd: LKPD): {
  success: boolean;
  lkpd?: LKPD;
  errors: string[];
} {
  const check = isLKPDComplete(lkpd);
  if (!check.complete) {
    return {
      success: false,
      errors: [`LKPD belum lengkap: ${check.missingFields.join(", ")}`],
    };
  }
  const now = new Date().toISOString();
  return {
    success: true,
    lkpd: {
      ...lkpd,
      status: "final",
      finalizedAt: now,
      updatedAt: now,
    },
    errors: [],
  };
}

/**
 * Label user-friendly.
 * Contoh: "LKPD Norma dalam Masyarakat — VII A · PPKn"
 */
export function lkpdLabel(l: {
  title: string;
  classLabel?: string;
  subject: string;
}): string {
  const parts = [l.title];
  if (l.classLabel) parts.push(l.classLabel);
  parts.push(l.subject);
  return parts.join(" · ");
}

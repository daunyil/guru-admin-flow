/**
 * ATPEntry — Bank ATP/TP per guru per mapel per kelas.
 *
 * APP-USABLE-RC1: formalisasi schema. Sebelumnya ATP/TP pakai
 * db.table("atp_entries") dynamic tanpa schema resmi. Sekarang jadi
 * entitas first-class dengan Zod + Dexie + Backup.
 *
 * Field mengikuti standar Kurikulum Merdeka:
 *   - CP (Capaian Pembelajaran)
 *   - TP (Tujuan Pembelajaran)
 *   - Elemen (elemen mata pelajaran)
 *   - Profil Pelajar Pancasila
 *   - Kata kunci
 *   - Alokasi JP
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const atpEntrySchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  grade: z.string().min(1), // contoh: "VII"
  phase: z.string().min(1), // contoh: "D"
  classId: z.string().optional(), // opsional:绑定 ke kelas tertentu, atau umum untuk grade
  bab: z.string().optional(),
  elemen: z.string().min(1),
  cp: z.string().min(1), // Capaian Pembelajaran
  tp: z.string().min(1), // Tujuan Pembelajaran
  profilPelajar: z.string().optional(),
  kataKunci: z.string().optional(),
  alokasiJP: z.number().int().positive(),
  status: documentStatusSchema,
});

export type ATPEntry = z.infer<typeof atpEntrySchema>;

export function parseATPEntry(input: unknown): ATPEntry {
  return atpEntrySchema.parse(input);
}

export function safeParseATPEntry(input: unknown) {
  const result = atpEntrySchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Label user-friendly untuk ATPEntry.
 * Contoh: "PPKn — VII · Bab 1 · 2 JP"
 */
export function atpEntryLabel(a: {
  subject: string;
  grade: string;
  bab?: string;
  alokasiJP: number;
}): string {
  const parts = [`${a.subject} — ${a.grade}`];
  if (a.bab) parts.push(`Bab ${a.bab}`);
  parts.push(`${a.alokasiJP} JP`);
  return parts.join(" · ");
}

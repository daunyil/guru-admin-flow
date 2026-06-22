/**
 * RppDocument — arsip dokumen RPP/Modul Ajar hasil bulk identity replacement.
 *
 * GENERATOR-COMPLETION-RC1 Phase 1: bulk ganti identitas RPP lama.
 * GENERATOR-COMPLETION-RC1-PATCH-1: + literal text replacement
 *   (identitas lama → identitas baru), bukan hanya placeholder.
 *
 * Filosofi: RPP-nya sudah jadi. Guru punya banyak file RPP lama yang masih
 * memakai identitas sekolah/guru lain. Modul ini mengganti identitas
 * (sekolah, kepala sekolah, guru, mapel, kelas, semester, tahun pelajaran,
 * fase, tempat, tanggal) secara massal tanpa mengubah isi materi/langkah
 * pembelajaran.
 *
 * Dua mode replace:
 *   1. Placeholder: ganti {{NAMA_SEKOLAH}} dll dengan value dari context.
 *   2. Literal: ganti teks "SMA Negeri 1" → "SMPN 8 Bantan" (input guru).
 *
 * Sumber dokumen lama: upload file (.txt/.html/.md) atau paste teks.
 * Output: processedContent dengan placeholder + literal terisi + tersimpan
 * sebagai arsip untuk preview/cetak ulang.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

/** Konteks identitas yang dipakai untuk replace placeholder. */
export const rppIdentityContextSchema = z.object({
  schoolName: z.string(),
  schoolAddress: z.string(),
  headmasterName: z.string(),
  headmasterNip: z.string(),
  teacherName: z.string(),
  teacherNip: z.string(),
  subject: z.string(),
  classLabel: z.string(),
  semester: z.string(), // "Ganjil" / "Genap"
  academicYearLabel: z.string(),
  fase: z.string(),
  place: z.string(),
  date: z.string(),
});
export type RppIdentityContext = z.infer<typeof rppIdentityContextSchema>;

/** Pasangan literal text replacement (identitas lama → baru). */
export const literalReplacementSchema = z.object({
  /** Teks lama yang akan diganti (case-sensitive). */
  oldText: z.string().min(1),
  /** Teks pengganti. */
  newText: z.string(),
});
export type LiteralReplacement = z.infer<typeof literalReplacementSchema>;

/** Mapping placeholder -> value (turunan dari RppIdentityContext). */
export const RPP_IDENTITY_PLACEHOLDERS = [
  "{{NAMA_SEKOLAH}}",
  "{{ALAMAT_SEKOLAH}}",
  "{{NAMA_KEPALA_SEKOLAH}}",
  "{{NIP_KEPALA_SEKOLAH}}",
  "{{NAMA_GURU}}",
  "{{NIP_GURU}}",
  "{{MAPEL}}",
  "{{KELAS}}",
  "{{SEMESTER}}",
  "{{TAHUN_PELAJARAN}}",
  "{{FASE}}",
  "{{TEMPAT}}",
  "{{TANGGAL}}",
] as const;

export const rppDocumentSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  /** Opsional: link ke TeachingAssignment spesifik. */
  assignmentId: z.string().nullable().optional(),
  subject: z.string().optional(),
  classLabel: z.string().optional(),
  semester: z.union([z.literal(1), z.literal(2)]).optional(),

  /** Konten asli RPP lama (sebelum replace). */
  originalContent: z.string(),
  /** Konten hasil replace placeholder + literal. */
  processedContent: z.string(),
  /** Sumber dokumen. */
  source: z.enum(["upload", "paste"]),
  /** Nama file asli bila upload. */
  filename: z.string().nullable().optional(),

  /** Snapshot konteks identitas yang dipakai untuk replace placeholder. */
  contextSnapshot: rppIdentityContextSchema,
  /**
   * Snapshot pasangan literal replacement yang dipakai (RC1-PATCH-1).
   * Default [] bila tidak ada (backward compat dengan backup v6 lama).
   */
  literalReplacements: z.array(literalReplacementSchema).default([]),

  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});

export type RppDocument = z.infer<typeof rppDocumentSchema>;

export function parseRppDocument(input: unknown): RppDocument {
  return rppDocumentSchema.parse(input);
}

export function safeParseRppDocument(input: unknown) {
  const result = rppDocumentSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Build mapping placeholder -> value dari RppIdentityContext.
 */
export function buildPlaceholderMap(ctx: RppIdentityContext): Record<string, string> {
  return {
    "{{NAMA_SEKOLAH}}": ctx.schoolName,
    "{{ALAMAT_SEKOLAH}}": ctx.schoolAddress,
    "{{NAMA_KEPALA_SEKOLAH}}": ctx.headmasterName,
    "{{NIP_KEPALA_SEKOLAH}}": ctx.headmasterNip,
    "{{NAMA_GURU}}": ctx.teacherName,
    "{{NIP_GURU}}": ctx.teacherNip,
    "{{MAPEL}}": ctx.subject,
    "{{KELAS}}": ctx.classLabel,
    "{{SEMESTER}}": ctx.semester,
    "{{TAHUN_PELAJARAN}}": ctx.academicYearLabel,
    "{{FASE}}": ctx.fase,
    "{{TEMPAT}}": ctx.place,
    "{{TANGGAL}}": ctx.date,
  };
}

/**
 * Replace semua placeholder di content dengan value dari context.
 * Pure function. Tidak mengubah teks di luar placeholder.
 */
export function replaceRppIdentityPlaceholders(
  content: string,
  ctx: RppIdentityContext
): string {
  const map = buildPlaceholderMap(ctx);
  let result = content;
  for (const [placeholder, value] of Object.entries(map)) {
    if (!value) continue;
    // Replace global, case-sensitive (placeholder sudah uppercase)
    result = result.split(placeholder).join(value);
  }
  return result;
}

/**
 * Replace literal text pairs (identitas lama → identitas baru).
 *
 * GENERATOR-COMPLETION-RC1-PATCH-1: untuk RPP lama yang identitasnya
 * ditulis langsung sebagai teks (bukan placeholder), guru input
 * pasangan "teks lama → teks baru". Function ini ganti semua
 * kemunculan oldText dengan newText (case-sensitive, global).
 *
 * Pure function.
 *
 * Catatan: urutan replacement penting. oldText yang lebih panjang
 * sebaiknya diproses dulu supaya tidak konflik dengan substring.
 * Tapi untuk simplicity, kita proses sesuai urutan input.
 */
export function replaceLiteralText(
  content: string,
  replacements: LiteralReplacement[]
): string {
  let result = content;
  for (const { oldText, newText } of replacements) {
    if (!oldText) continue;
    result = result.split(oldText).join(newText);
  }
  return result;
}

/**
 * Apply placeholder + literal replacement sekaligus.
 * Placeholder dulu, lalu literal (supaya literal bisa ganti teks
 * yang muncul dari placeholder bila perlu).
 */
export function applyAllReplacements(
  content: string,
  ctx: RppIdentityContext,
  literalReplacements: LiteralReplacement[] = []
): string {
  let result = replaceRppIdentityPlaceholders(content, ctx);
  result = replaceLiteralText(result, literalReplacements);
  return result;
}

/**
 * Hitung berapa placeholder yang ada di content.
 * Dipakai untuk preview sebelum replace.
 */
export function countPlaceholders(content: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ph of RPP_IDENTITY_PLACEHOLDERS) {
    const count = content.split(ph).length - 1;
    if (count > 0) result[ph] = count;
  }
  return result;
}

/**
 * Cek apakah dokumen punya minimal 1 placeholder.
 */
export function hasAnyPlaceholder(content: string): boolean {
  return RPP_IDENTITY_PLACEHOLDERS.some((ph) => content.includes(ph));
}

/**
 * Hitung berapa kali oldText muncul di content (untuk preview literal replacement).
 */
export function countLiteralOccurrences(
  content: string,
  oldText: string
): number {
  if (!oldText) return 0;
  return content.split(oldText).length - 1;
}


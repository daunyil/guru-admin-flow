/**
 * SchoolDocument — dokumen sekolah generik untuk infrastruktur WYSIWYG.
 *
 * WYSIWYG-DOC-01: tabel ke-15 di Dexie v9.
 *
 * Filosofi: setiap dokumen administrasi guru (Promes, Prota, ATP, Absen,
 * Jurnal, Daftar Nilai, Rapor, Remedial, Pengayaan, Kalender Minggu Efektif,
 * dll.) disimpan sebagai satu record dengan field `data` berisi JSON bebas
 * (structuredClone native Dexie). Layout/orientasi disimpan terpisah supaya
 * render engine bisa toggle portrait/landscape tanpa rewrite data.
 *
 * Status lifecycle: draft → ready_for_review → final (atau revised → final).
 *   - draft           : masih diedit, auto-save aktif.
 *   - ready_for_review: sudah diajukan, lock edit.
 *   - final           : disetujui, bisa cetak.
 *   - revised         : perlu revisi, kembali ke edit.
 *   - locked          : dikunci permanen, tidak bisa diedit.
 *
 * `data` simpan objek apa adanya — Dexie 4 native structuredClone mendukung
 * objek bersarang tanpa serialisasi manual.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

/* ------------------------------------------------------------------ */
/*  DocType — jenis dokumen sekolah yang didukung                     */
/* ------------------------------------------------------------------ */

export const SCHOOL_DOC_TYPES = [
  "kalender-minggu-efektif",
  "promes",
  "prota",
  "atp",
  "absen-semester",
  "jurnal-semester",
  "daftar-nilai",
  "rapor-semester",
  "remedial",
  "pengayaan",
  "lainnya",
] as const;

export const schoolDocTypeSchema = z.enum(SCHOOL_DOC_TYPES);
export type SchoolDocType = z.infer<typeof schoolDocTypeSchema>;

/** Label yang bisa ditampilkan di UI untuk setiap docType. */
export const SCHOOL_DOC_TYPE_LABELS: Record<SchoolDocType, string> = {
  "kalender-minggu-efektif": "Kalender Minggu Efektif",
  promes: "Program Semester",
  prota: "Program Tahunan",
  atp: "ATP / Tujuan Pembelajaran",
  "absen-semester": "Absensi Semester",
  "jurnal-semester": "Jurnal Semester",
  "daftar-nilai": "Daftar Nilai",
  "rapor-semester": "Rapor Semester",
  remedial: "Program Remedial",
  pengayaan: "Program Pengayaan",
  lainnya: "Dokumen Lainnya",
};

/* ------------------------------------------------------------------ */
/*  Orientation                                                        */
/* ------------------------------------------------------------------ */

export const schoolDocOrientationSchema = z.enum(["portrait", "landscape"]);
export type SchoolDocOrientation = z.infer<typeof schoolDocOrientationSchema>;

/* ------------------------------------------------------------------ */
/*  SchoolDocument schema                                              */
/* ------------------------------------------------------------------ */

export const schoolDocumentSchema = baseEntitySchema.extend({
  /** Jenis dokumen. */
  docType: schoolDocTypeSchema,

  /** Semester 1 (Ganjil) atau 2 (Genap). */
  semester: z.union([z.literal(1), z.literal(2)]),

  /** Tahun ajaran label, mis. "2024/2025". */
  tahunAjaran: z.string().min(1),

  /** Kode mata pelajaran (mis. "PPKn", "MTK"). */
  kodeMapel: z.string().optional().default(""),

  /** Kode kelas (mis. "VII-A", "X-2"). */
  kodeKelas: z.string().optional().default(""),

  /** Status dokumen: draft → review → final. */
  status: documentStatusSchema,

  /** ID guru pemilik dokumen. */
  teacherId: z.string().min(1),

  /** ID tahun ajaran aktif (FK ke academicYears). */
  academicYearId: z.string().min(1),

  /** Data dokumen bebas — Dexie 4 structuredClone. */
  data: z.record(z.unknown()).optional().default({}),

  /** Layout / orientation override. */
  orientation: schoolDocOrientationSchema.optional().default("portrait"),

  /** Tambahan meta untuk display (judul kustom, catatan, dll). */
  meta: z.record(z.unknown()).optional().default({}),

  /** Flag cetak. */
  printedAt: z.string().nullable().optional(),
});
export type SchoolDocument = z.infer<typeof schoolDocumentSchema>;

/* ------------------------------------------------------------------ */
/*  Parse helpers                                                      */
/* ------------------------------------------------------------------ */

export function parseSchoolDocument(input: unknown): SchoolDocument {
  return schoolDocumentSchema.parse(input);
}

export function safeParseSchoolDocument(input: unknown) {
  return schoolDocumentSchema.safeParse(input);
}

/* ------------------------------------------------------------------ */
/*  Composite key helper                                               */
/* ------------------------------------------------------------------ */

/**
 * Bangun composite key untuk lookup unik dokumen.
 * Format: docType:semester:tahunAjaran:kodeMapel:kodeKelas:teacherId
 */
export function schoolDocumentCompositeKey(doc: {
  docType: SchoolDocType;
  semester: 1 | 2;
  tahunAjaran: string;
  kodeMapel?: string;
  kodeKelas?: string;
  teacherId: string;
}): string {
  return [
    doc.docType,
    doc.semester,
    doc.tahunAjaran,
    doc.kodeMapel ?? "",
    doc.kodeKelas ?? "",
    doc.teacherId,
  ].join(":");
}

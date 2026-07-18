/**
 * ATP Import — schema JSON untuk impor Bank TP dari AI eksternal + parser
 * Excel paste.
 *
 * IMPORT-BANK-TP-PROTA-RC1: Plan Kerja Bapak item #5.
 *
 * Format JSON (guru-admin-flow/atp/v1):
 *   {
 *     "$schema": "guru-admin-flow/atp/v1",
 *     "subject": "PPKn",
 *     "grade": "VII",
 *     "phase": "D",
 *     "teacherName": "Budi Santoso, S.Pd.",
 *     "entries": [
 *       {
 *         "bab": "1",
 *         "elemen": "Norma",
 *         "cp": "Memahami norma...",
 *         "tp": "Peserta didik mampu menjelaskan...",
 *         "profilPelajar": "Beriman, Bernalar Kritis",
 *         "kataKunci": "norma, aturan, kesepakatan",
 *         "alokasiJP": 2
 *       }
 *     ]
 *   }
 *
 * Format Excel paste (tab-separated, header wajib):
 *   Bab | Elemen | CP | TP | Profil Pelajar | Kata Kunci | Alokasi JP
 *   1   | Norma  | Memahami... | Peserta... | Bernalar | norma | 2
 */

import { z } from "zod";
import { ATP_IMPORT_SCHEMA } from "@guru-admin/shared";
import type { ATPEntry } from "./atp-entry";

/** Schema entry dalam JSON impor ATP. */
export const atpImportEntrySchema = z.object({
  bab: z.string().optional(),
  elemen: z.string().min(1, "elemen wajib diisi"),
  cp: z.string().min(1, "CP wajib diisi"),
  tp: z.string().min(1, "TP wajib diisi"),
  profilPelajar: z.string().optional(),
  kataKunci: z.string().optional(),
  alokasiJP: z.number().int().positive("alokasiJP wajib bilangan bulat positif"),
});
export type AtpImportEntry = z.infer<typeof atpImportEntrySchema>;

/** Schema JSON impor ATP lengkap. */
export const atpImportSchema = z.object({
  $schema: z.literal(ATP_IMPORT_SCHEMA),
  subject: z.string().min(1, "subject wajib diisi"),
  grade: z.string().min(1, "grade wajib diisi"),
  phase: z.string().min(1, "phase wajib diisi"),
  teacherName: z.string().optional(),
  entries: z.array(atpImportEntrySchema).min(1, "Minimal 1 entry TP wajib diisi"),
});
export type AtpImport = z.infer<typeof atpImportSchema>;

/** Hasil validasi impor ATP. */
export type AtpImportValidation =
  | { success: true; data: AtpImport }
  | { success: false; errors: string[] };

/**
 * Validasi JSON impor ATP.
 */
export function validateAtpImport(input: unknown): AtpImportValidation {
  const result = atpImportSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}

/**
 * Konversi AtpImport menjadi array ATPEntry siap simpan (tanpa id/academicYearId/teacherId/status).
 * Caller wajib assign field BaseEntity.
 */
export function atpImportToEntries(imp: AtpImport): Array<
  Omit<ATPEntry, "id" | "academicYearId" | "teacherId" | "teacherName" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "status">
> {
  return imp.entries.map((e) => ({
    subject: imp.subject,
    grade: imp.grade,
    phase: imp.phase,
    bab: e.bab,
    elemen: e.elemen,
    cp: e.cp,
    tp: e.tp,
    profilPelajar: e.profilPelajar,
    kataKunci: e.kataKunci,
    alokasiJP: e.alokasiJP,
    classId: undefined,
  }));
}

/* ------------------------------------------------------------------ */
/*  Excel Paste Parser                                                 */
/* ------------------------------------------------------------------ */

/** Metadata default untuk Excel paste ATP (subject, grade, phase tidak ada di tabel). */
export type AtpPasteMeta = {
  subject: string;
  grade: string;
  phase: string;
};

/** Hasil parse Excel paste ATP. */
export type AtpExcelParseResult = {
  /** Entry yang berhasil diparse (belum di-merge dengan meta). */
  rows: Array<{
    bab?: string;
    elemen: string;
    cp: string;
    tp: string;
    profilPelajar?: string;
    kataKunci?: string;
    alokasiJP: number;
  }>;
  /** Baris yang gagal diparse (dengan alasan). */
  skippedRows: Array<{ lineNumber: number; raw: string; reason: string }>;
};

/**
 * Normalisasi header: lowercase, hapus spasi/underscore, agar fleksibel
 * terhadap variasi penulisan guru.
 *
 * Contoh yang dikenali:
 *   "Bab" → "bab"
 *   "ALOKASI JP" → "alokasijp"
 *   "Profil_Pelajar" → "profilpelajar"
 *   "Kata Kunci" → "katakunci"
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-]+/g, "");
}

/** Mapping variasi header → canonical key. */
const HEADER_ALIASES: Record<string, keyof AtpExcelParseResult["rows"][number]> = {
  bab: "bab",
  elemen: "elemen",
  cp: "cp",
  capaianpembelajaran: "cp",
  tp: "tp",
  tujuanpembelajaran: "tp",
  profilpelajar: "profilPelajar",
  profil: "profilPelajar",
  katakunci: "kataKunci",
  kata: "kataKunci",
  alokasijp: "alokasiJP",
  alokasi: "alokasiJP",
  jp: "alokasiJP",
};

/**
 * Parse teks Excel paste untuk ATP.
 *
 * Format: baris pertama = header (Bab, Elemen, CP, TP, Profil Pelajar, Kata Kunci, Alokasi JP).
 * Baris berikutnya = data, separator tab/koma/titik koma.
 *
 * Field wajib: Elemen, CP, TP, Alokasi JP.
 * Field opsional: Bab, Profil Pelajar, Kata Kunci.
 */
export function parseAtpExcelPaste(text: string): AtpExcelParseResult {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: AtpExcelParseResult["rows"] = [];
  const skippedRows: AtpExcelParseResult["skippedRows"] = [];

  if (lines.length === 0) {
    return { rows, skippedRows };
  }

  // Detect separator: tab > koma > titik koma
  const firstLine = lines[0];
  let sep = "\t";
  if (!firstLine.includes("\t")) {
    if (firstLine.includes(";")) sep = ";";
    else if (firstLine.includes(",")) sep = ",";
  }

  // Parse header
  const headerRaw = firstLine.split(sep).map((h) => h.trim());
  const headerMap: number[] = []; // index per canonical field
  const canonicalFields: Array<keyof AtpExcelParseResult["rows"][number]> = [];
  headerRaw.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    const canonical = HEADER_ALIASES[norm];
    if (canonical && !canonicalFields.includes(canonical)) {
      headerMap[idx] = canonicalFields.length;
      canonicalFields.push(canonical);
    } else {
      headerMap[idx] = -1; // unknown column
    }
  });

  // Validasi: minimal Elemen, CP, TP, Alokasi JP
  const required: Array<keyof AtpExcelParseResult["rows"][number]> = ["elemen", "cp", "tp", "alokasiJP"];

  // Jika tidak ada header valid sama sekali (semua unknown), coba mode tanpa-header:
  // Asumsi kolom = [Elemen, CP, TP, Alokasi JP, Bab, Profil, Kata Kunci] berurutan.
  // Field wajib di depan, field opsional di belakang — supaya 4 kolom minimal
  // tetap bisa diparse sebagai [Elemen, CP, TP, JP].
  const hasValidHeader = canonicalFields.length > 0;
  if (!hasValidHeader) {
    // Mode tanpa header: asumsi urutan fixed
    const fallbackOrder: Array<keyof AtpExcelParseResult["rows"][number]> = [
      "elemen", "cp", "tp", "alokasiJP", "bab", "profilPelajar", "kataKunci",
    ];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.trim());
      if (parts.length < 4) {
        skippedRows.push({
          lineNumber: i + 1,
          raw: lines[i],
          reason: "Minimal 4 kolom diperlukan (Elemen, CP, TP, Alokasi JP).",
        });
        continue;
      }
      const row: Partial<AtpExcelParseResult["rows"][number]> = {};
      fallbackOrder.forEach((field, idx) => {
        if (idx < parts.length && parts[idx]) {
          if (field === "alokasiJP") {
            const n = Number(parts[idx]);
            if (!isNaN(n) && n > 0) row.alokasiJP = n;
          } else {
            (row as Record<string, unknown>)[field as string] = parts[idx];
          }
        }
      });
      if (!row.elemen || !row.cp || !row.tp || !row.alokasiJP) {
        skippedRows.push({
          lineNumber: i + 1,
          raw: lines[i],
          reason: "Field wajib kosong (Elemen/CP/TP/Alokasi JP).",
        });
        continue;
      }
      rows.push(row as AtpExcelParseResult["rows"][number]);
    }
    return { rows, skippedRows };
  }

  // Header ada tapi tidak lengkap → error
  const missing = required.filter((f) => !canonicalFields.includes(f));
  if (missing.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      skippedRows.push({
        lineNumber: i + 1,
        raw: lines[i],
        reason: `Header tidak lengkap. Kolom wajib hilang: ${missing.join(", ")}. Header ditemukan: ${headerRaw.join(", ")}`,
      });
    }
    return { rows, skippedRows };
  }

  // Mode dengan header: parse data lines
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim());
    const row: Partial<AtpExcelParseResult["rows"][number]> = {};
    parts.forEach((val, idx) => {
      if (idx >= headerMap.length) return;
      const canonicalIdx = headerMap[idx];
      if (canonicalIdx === -1) return;
      const field = canonicalFields[canonicalIdx];
      if (!field) return;
      if (field === "alokasiJP") {
        const n = Number(val);
        if (!isNaN(n) && n > 0) row.alokasiJP = n;
      } else {
        (row as Record<string, unknown>)[field as string] = val;
      }
    });

    // Validasi field wajib
    if (!row.elemen || !row.cp || !row.tp || !row.alokasiJP) {
      skippedRows.push({
        lineNumber: i + 1,
        raw: lines[i],
        reason: "Field wajib kosong (Elemen/CP/TP/Alokasi JP).",
      });
      continue;
    }
    rows.push(row as AtpExcelParseResult["rows"][number]);
  }

  return { rows, skippedRows };
}

/**
 * Konversi hasil Excel paste + meta → ATPEntry siap simpan.
 */
export function atpPasteRowsToEntries(
  rows: AtpExcelParseResult["rows"],
  meta: AtpPasteMeta
): Array<
  Omit<ATPEntry, "id" | "academicYearId" | "teacherId" | "teacherName" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "status">
> {
  return rows.map((r) => ({
    subject: meta.subject,
    grade: meta.grade,
    phase: meta.phase,
    bab: r.bab,
    elemen: r.elemen,
    cp: r.cp,
    tp: r.tp,
    profilPelajar: r.profilPelajar,
    kataKunci: r.kataKunci,
    alokasiJP: r.alokasiJP,
    classId: undefined,
  }));
}

/**
 * Schema impor JSON Prota dari AI eksternal.
 * Sumber: docs/SPRINT_2_DESIGN.md §4
 *
 * Format: guru-admin-flow/prota/v1
 */

import { z } from "zod";
import { PROTA_IMPORT_SCHEMA } from "@guru-admin/shared";

/** Schema unit dalam JSON impor Prota. */
export const protaImportUnitSchema = z.object({
  semester: z.union([z.literal(1), z.literal(2)]),
  title: z.string().min(1, "title unit wajib diisi"),
  learningOutcome: z.string().optional(),
  jp: z.number().int().positive("JP wajib bilangan bulat positif"),
  order: z.number().int().nonnegative(),
  code: z.string().optional(),
});

/** Schema JSON impor Prota lengkap. */
export const protaImportSchema = z.object({
  $schema: z.literal(PROTA_IMPORT_SCHEMA),
  subject: z.string().min(1, "subject wajib diisi"),
  grade: z.string().min(1, "grade wajib diisi"),
  phase: z.string().min(1, "phase wajib diisi"),
  annualIntraJP: z.number().int().nonnegative(),
  semester1IntraJP: z.number().int().nonnegative(),
  semester2IntraJP: z.number().int().nonnegative(),
  annualCocurricularJP: z.number().int().nonnegative().optional(),
  semester1CocurricularJP: z.number().int().nonnegative().optional(),
  semester2CocurricularJP: z.number().int().nonnegative().optional(),
  units: z.array(protaImportUnitSchema).min(1, "Minimal 1 unit wajib diisi"),
});

export type ProtaImport = z.infer<typeof protaImportSchema>;
export type ProtaImportUnit = z.infer<typeof protaImportUnitSchema>;

/** Hasil validasi impor Prota. */
export type ProtaImportValidation =
  | { success: true; data: ProtaImport }
  | { success: false; errors: string[] };

/**
 * Validasi JSON impor Prota.
 */
export function validateProtaImport(input: unknown): ProtaImportValidation {
  const result = protaImportSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors };
  }

  // Validasi logic tambahan
  const data = result.data;
  const logicErrors: string[] = [];

  // Warning: konsistensi semester1+semester2 = annual
  if (data.semester1IntraJP + data.semester2IntraJP !== data.annualIntraJP) {
    logicErrors.push(
      `Warning: semester1IntraJP (${data.semester1IntraJP}) + semester2IntraJP (${data.semester2IntraJP}) ` +
        `≠ annualIntraJP (${data.annualIntraJP}). Aplikasi tetap menerima, tapi sebaiknya konsisten.`
    );
  }

  // Cek duplikat order per semester
  const ordersBySemester = new Map<number, Set<number>>();
  data.units.forEach((u, idx) => {
    if (!ordersBySemester.has(u.semester)) {
      ordersBySemester.set(u.semester, new Set());
    }
    const orders = ordersBySemester.get(u.semester)!;
    if (orders.has(u.order)) {
      logicErrors.push(
        `units[${idx}]: duplikat order ${u.order} untuk semester ${u.semester}`
      );
    }
    orders.add(u.order);
  });

  if (logicErrors.length > 0) {
    return { success: false, errors: logicErrors };
  }

  return { success: true, data };
}

/**
 * Konversi ProtaImport menjadi ProtaProfile + ProtaUnit[] (siap simpan ke Dexie).
 * Caller wajib assign id, academicYearId, teacherId, createdAt, updatedAt, syncStatus,
 * dan id untuk setiap unit.
 */
export function protaImportToProfile(
  imp: ProtaImport
): {
  profile: Omit<
    import("./prota").ProtaProfile,
    "id" | "academicYearId" | "teacherId" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"
  >;
  units: Array<
    Omit<import("./prota").ProtaUnit, "id" | "protaProfileId" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
  >;
} {
  return {
    profile: {
      subject: imp.subject,
      grade: imp.grade,
      phase: imp.phase,
      annualIntraJP: imp.annualIntraJP,
      semester1IntraJP: imp.semester1IntraJP,
      semester2IntraJP: imp.semester2IntraJP,
      annualCocurricularJP: imp.annualCocurricularJP,
      semester1CocurricularJP: imp.semester1CocurricularJP,
      semester2CocurricularJP: imp.semester2CocurricularJP,
      units: [], // akan diisi terpisah
      status: "draft",
      sourceYearId: null,
      notes: undefined,
    },
    units: imp.units.map((u) => ({
      semester: u.semester,
      title: u.title,
      learningOutcome: u.learningOutcome,
      jp: u.jp,
      order: u.order,
      code: u.code,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Excel Paste Parser (IMPORT-BANK-TP-PROTA-RC1)                     */
/* ------------------------------------------------------------------ */

/** Hasil parse Excel paste Prota. */
export type ProtaExcelParseResult = {
  /** Unit yang berhasil diparse. */
  units: Array<{
    semester: 1 | 2;
    title: string;
    learningOutcome?: string;
    jp: number;
    order: number;
    code?: string;
  }>;
  /** Baris yang gagal diparse (dengan alasan). */
  skippedRows: Array<{ lineNumber: number; raw: string; reason: string }>;
};

/** Normalisasi header: lowercase, hapus spasi/underscore. */
function normalizeProtaHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-]+/g, "");
}

/** Mapping variasi header → canonical key. */
const PROTA_HEADER_ALIASES: Record<string, keyof ProtaExcelParseResult["units"][number]> = {
  semester: "semester",
  sem: "semester",
  title: "title",
  judul: "title",
  materi: "title",
  learningoutcome: "learningOutcome",
  lo: "learningOutcome",
  jp: "jp",
  alokasijp: "jp",
  alokasi: "jp",
  order: "order",
  urutan: "order",
  no: "order",
  code: "code",
  kode: "code",
};

/**
 * Parse teks Excel paste untuk Prota.
 *
 * Format: baris pertama = header (Semester, Materi/Title, JP, Order, Code, LO).
 * Baris berikutnya = data, separator tab/koma/titik koma.
 *
 * Field wajib: Semester, Materi (Title), JP, Order.
 * Field opsional: Learning Outcome, Code.
 *
 * Semester: 1, 2, "Ganjil", "Genap" diterima.
 */
export function parseProtaExcelPaste(text: string): ProtaExcelParseResult {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const units: ProtaExcelParseResult["units"] = [];
  const skippedRows: ProtaExcelParseResult["skippedRows"] = [];

  if (lines.length === 0) {
    return { units, skippedRows };
  }

  // Detect separator
  const firstLine = lines[0];
  let sep = "\t";
  if (!firstLine.includes("\t")) {
    if (firstLine.includes(";")) sep = ";";
    else if (firstLine.includes(",")) sep = ",";
  }

  // Parse header
  const headerRaw = firstLine.split(sep).map((h) => h.trim());
  const headerMap: number[] = [];
  const canonicalFields: Array<keyof ProtaExcelParseResult["units"][number]> = [];
  headerRaw.forEach((h, idx) => {
    const norm = normalizeProtaHeader(h);
    const canonical = PROTA_HEADER_ALIASES[norm];
    if (canonical && !canonicalFields.includes(canonical)) {
      headerMap[idx] = canonicalFields.length;
      canonicalFields.push(canonical);
    } else {
      headerMap[idx] = -1;
    }
  });

  const required: Array<keyof ProtaExcelParseResult["units"][number]> = ["semester", "title", "jp", "order"];
  const missing = required.filter((f) => !canonicalFields.includes(f));

  // Mode fallback tanpa header valid
  if (canonicalFields.length === 0 || missing.length > 0) {
    // Asumsi urutan: Semester, Title, JP, Order, Code, LO
    const fallbackOrder: Array<keyof ProtaExcelParseResult["units"][number]> = [
      "semester", "title", "jp", "order", "code", "learningOutcome",
    ];
    const startIdx = canonicalFields.length === 0 ? 0 : 1;
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.trim());
      if (parts.length < 4) {
        skippedRows.push({
          lineNumber: i + 1,
          raw: lines[i],
          reason: "Minimal 4 kolom diperlukan (Semester, Materi, JP, Order).",
        });
        continue;
      }
      const unit: Partial<ProtaExcelParseResult["units"][number]> = {};
      fallbackOrder.forEach((field, idx) => {
        if (idx >= parts.length || !parts[idx]) return;
        if (field === "semester") {
          const s = parseSemester(parts[idx]);
          if (s !== null) unit.semester = s;
        } else if (field === "jp") {
          const n = Number(parts[idx]);
          if (!isNaN(n) && n > 0) unit.jp = n; // positive (schema: int().positive())
        } else if (field === "order") {
          const n = Number(parts[idx]);
          if (!isNaN(n) && n >= 0) unit.order = n; // nonnegative (schema: int().nonnegative())
        } else {
          (unit as Record<string, unknown>)[field] = parts[idx];
        }
      });
      if (unit.semester === undefined || !unit.title || unit.jp === undefined || unit.order === undefined) {
        skippedRows.push({
          lineNumber: i + 1,
          raw: lines[i],
          reason: "Field wajib kosong (Semester/Materi/JP/Order).",
        });
        continue;
      }
      units.push(unit as ProtaExcelParseResult["units"][number]);
    }
    if (missing.length > 0 && canonicalFields.length > 0) {
      // Header ada tapi tidak lengkap → tambahkan warning di skippedRows[0]
      skippedRows.unshift({
        lineNumber: 0,
        raw: firstLine,
        reason: `Header tidak lengkap. Kolom wajib hilang: ${missing.join(", ")}. Mencoba mode fallback.`,
      });
    }
    return { units, skippedRows };
  }

  // Mode dengan header valid
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim());
    const unit: Partial<ProtaExcelParseResult["units"][number]> = {};
    parts.forEach((val, idx) => {
      if (idx >= headerMap.length) return;
      const canonicalIdx = headerMap[idx];
      if (canonicalIdx === -1) return;
      const field = canonicalFields[canonicalIdx];
      if (!field) return;
      if (field === "semester") {
        const s = parseSemester(val);
        if (s !== null) unit.semester = s;
      } else if (field === "jp") {
        const n = Number(val);
        if (!isNaN(n) && n > 0) unit.jp = n; // positive
      } else if (field === "order") {
        const n = Number(val);
        if (!isNaN(n) && n >= 0) unit.order = n; // nonnegative
      } else {
        (unit as Record<string, unknown>)[field] = val;
      }
    });
    if (unit.semester === undefined || !unit.title || unit.jp === undefined || unit.order === undefined) {
      skippedRows.push({
        lineNumber: i + 1,
        raw: lines[i],
        reason: "Field wajib kosong (Semester/Materi/JP/Order).",
      });
      continue;
    }
    units.push(unit as ProtaExcelParseResult["units"][number]);
  }

  return { units, skippedRows };
}

/** Parse semester: 1, 2, "Ganjil", "Genap" → 1 | 2 | null. */
function parseSemester(val: string): 1 | 2 | null {
  const lower = val.toLowerCase().trim();
  if (lower === "1" || lower === "ganjil") return 1;
  if (lower === "2" || lower === "genap") return 2;
  return null;
}

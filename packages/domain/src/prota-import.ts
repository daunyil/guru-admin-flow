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

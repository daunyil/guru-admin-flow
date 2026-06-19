/**
 * AcademicYear — Tahun pelajaran.
 * Sumber: docs/DATA_MODEL_DRAFT.md §1
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const academicYearSchema = baseEntitySchema.extend({
  label: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "Label wajib format YYYY/YYYY, contoh: 2025/2026"),
  startDate: z.string(), // ISO date
  endDate: z.string(),
  semester1Start: z.string(),
  semester1End: z.string(),
  semester2Start: z.string(),
  semester2End: z.string(),
  active: z.boolean(),
  sourceYearId: z.string().nullable().optional(),
});

export type AcademicYear = z.infer<typeof academicYearSchema>;

/**
 * Validasi tambahan yang tidak bisa di-Zod:
 *   - startDate < endDate
 *   - semester1Start < semester1End < semester2Start < semester2End
 *   - (validasi "hanya satu active=true" dilakukan di rules lintas entitas)
 */
export function validateAcademicYearLogic(y: AcademicYear): string[] {
  const errors: string[] = [];

  if (y.startDate >= y.endDate) {
    errors.push("startDate wajib lebih awal dari endDate");
  }
  if (y.semester1Start >= y.semester1End) {
    errors.push("semester1Start wajib lebih awal dari semester1End");
  }
  if (y.semester2Start >= y.semester2End) {
    errors.push("semester2Start wajib lebih awal dari semester2End");
  }
  if (y.semester1End >= y.semester2Start) {
    errors.push("semester1End wajib lebih awal dari semester2Start");
  }
  return errors;
}

export function parseAcademicYear(input: unknown): AcademicYear {
  return academicYearSchema.parse(input);
}

export function safeParseAcademicYear(input: unknown) {
  const result = academicYearSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  const logicErrors = validateAcademicYearLogic(result.data);
  if (logicErrors.length > 0) {
    return {
      success: false as const,
      error: new Error(logicErrors.join("; ")),
    };
  }
  return { success: true as const, data: result.data };
}

/**
 * Prota — Program Tahunan (ProtaProfile + ProtaUnit).
 * Sumber: docs/DATA_MODEL_DRAFT.md §5
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";
import { documentStatusSchema } from "./base";

export const protaUnitSchema = baseEntitySchema.extend({
  protaProfileId: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  title: z.string().min(1, "Judul materi wajib diisi"),
  learningOutcome: z.string().optional(),
  jp: z.number().int().positive("JP wajib bilangan bulat positif"),
  order: z.number().int().nonnegative(),
  code: z.string().optional(),
});

export const protaProfileSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  phase: z.string().min(1),
  teacherId: z.string().min(1),
  annualIntraJP: z.number().int().nonnegative(),
  semester1IntraJP: z.number().int().nonnegative(),
  semester2IntraJP: z.number().int().nonnegative(),
  annualCocurricularJP: z.number().int().nonnegative().optional(),
  semester1CocurricularJP: z.number().int().nonnegative().optional(),
  semester2CocurricularJP: z.number().int().nonnegative().optional(),
  units: z.array(protaUnitSchema),
  status: documentStatusSchema,
  sourceYearId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export type ProtaUnit = z.infer<typeof protaUnitSchema>;
export type ProtaProfile = z.infer<typeof protaProfileSchema>;

export function parseProtaProfile(input: unknown): ProtaProfile {
  return protaProfileSchema.parse(input);
}

export function safeParseProtaProfile(input: unknown) {
  const result = protaProfileSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

export function parseProtaUnit(input: unknown): ProtaUnit {
  return protaUnitSchema.parse(input);
}

export function safeParseProtaUnit(input: unknown) {
  const result = protaUnitSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

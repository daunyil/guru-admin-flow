/**
 * TeacherProfile — Profil guru (single row di MVP v1).
 * Sumber: docs/DATA_MODEL_DRAFT.md §3
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const TEACHER_PROFILE_ID = "teacher-profile";

export const teacherSubjectSchema = z.object({
  subject: z.string().min(1, "Mapel wajib diisi"),
  grades: z.array(z.string()).min(1, "Minimal 1 kelas wajib diisi"),
  phases: z.array(z.string()).min(1, "Minimal 1 fase wajib diisi"),
});

export const teacherProfileSchema = baseEntitySchema.extend({
  name: z.string().min(1, "Nama guru wajib diisi"),
  nip: z
    .string()
    .regex(/^\d{18}$/, "NIP wajib 18 digit numerik")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeStatus: z.enum([
    "pns",
    "pppk",
    "honorer",
    "gtt",
    "gty",
    "other",
  ]),
  subjects: z.array(teacherSubjectSchema).min(1, "Minimal 1 mapel wajib diisi"),
  homeroomClassId: z.string().optional(),
  signature: z.string().optional(),
  photo: z.string().optional(),
});

export type TeacherSubject = z.infer<typeof teacherSubjectSchema>;
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;

export function parseTeacherProfile(input: unknown): TeacherProfile {
  return teacherProfileSchema.parse(input);
}

export function safeParseTeacherProfile(input: unknown) {
  const result = teacherProfileSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

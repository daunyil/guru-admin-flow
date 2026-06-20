/**
 * SchoolProfile — Profil sekolah (single row di MVP v1).
 * Sumber: docs/DATA_MODEL_DRAFT.md §2
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const SCHOOL_PROFILE_ID = "school-profile";

export const schoolProfileSchema = baseEntitySchema.extend({
  name: z.string().min(1, "Nama sekolah wajib diisi"),
  npsn: z
    .string()
    .regex(/^\d{8}$/, "NPSN wajib 8 digit numerik"),
  nss: z.string().optional(),
  address: z.string().min(1, "Alamat wajib diisi"),
  village: z.string().min(1, "Desa/Kelurahan wajib diisi"),
  district: z.string().min(1, "Kecamatan wajib diisi"),
  regency: z.string().min(1, "Kabupaten/Kota wajib diisi"),
  province: z.string().min(1, "Provinsi wajib diisi"),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  website: z.string().optional(),
  headmasterName: z.string().min(1, "Nama kepala sekolah wajib diisi"),
  headmasterNip: z
    .string()
    .regex(/^\d{18}$/, "NIP kepala sekolah wajib 18 digit numerik")
    .optional()
    .or(z.literal("")),
  headmasterSignature: z.string().optional(),
  logo: z.string().optional(),
});

export type SchoolProfile = z.infer<typeof schoolProfileSchema>;

export function parseSchoolProfile(input: unknown): SchoolProfile {
  return schoolProfileSchema.parse(input);
}

export function safeParseSchoolProfile(input: unknown) {
  const result = schoolProfileSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

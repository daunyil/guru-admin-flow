/**
 * Modul M01 Profil: Type definitions for SchoolProfile & TeacherProfile forms.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M01)
 */

import type { TeacherProfile } from "@guru-admin/domain";

/** Field yang diedit di form SchoolProfile (semua string untuk konsistensi input). */
export type SchoolProfileFormFields = {
  name: string;
  npsn: string;
  nss: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  headmasterName: string;
  headmasterNip: string;
  headmasterSignature: string;
  logo: string;
};

/** Field yang diedit di form TeacherProfile (optional → wajib string). */
export type TeacherProfileFormFields = {
  name: string;
  nip: string;
  email: string;
  phone: string;
  employeeStatus: TeacherProfile["employeeStatus"];
  subjects: TeacherProfile["subjects"];
  homeroomClassId: string;
  signature: string;
  photo: string;
};

/**
 * @guru-admin/shared
 *
 * Paket util dan konstanta shared lintas aplikasi (teacher-admin, dan nanti smart-roster).
 * Sprint 0: placeholder. Implementasi nyata dimulai Sprint 1.
 *
 * Aturan paket (lihat docs/TECHNICAL_PLAN.md §3.1):
 *  - Tidak boleh mengimpor dari packages/domain atau apps/*
 *  - Tidak boleh mengimpor library berat (Dexie, React, Supabase)
 *  - Wajib pure TypeScript, side-effect free
 */

// Placeholder konstanta — akan diisi di Sprint 1
export const APP_NAME = "Guru Admin Flow";
export const APP_VERSION = "0.0.0-sprint0";
export const SCHEMA_VERSION = 1;

export const DAY_OF_WEEK = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6,
  MINGGU: 7,
} as const;

export const DAY_LABELS_ID: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

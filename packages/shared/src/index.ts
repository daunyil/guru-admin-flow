/**
 * @guru-admin/shared
 *
 * Paket util dan konstanta shared lintas aplikasi (teacher-admin, dan nanti smart-roster).
 *
 * Aturan paket (lihat docs/TECHNICAL_PLAN.md §3.1):
 *  - Tidak boleh mengimpor dari packages/domain atau apps/*
 *  - Tidak boleh mengimpor library berat (Dexie, React, Supabase)
 *  - Wajib pure TypeScript, side-effect free
 */

export * from "./constants";
export * from "./date";
export * from "./jp";
export * from "./slug";
export * from "./id";

/**
 * @guru-admin/domain
 *
 * Paket tipe data + validasi Zod + business rules untuk Guru Admin Flow.
 * Sprint 0: stub. Implementasi nyata dimulai Sprint 1.
 *
 * Sumber otoritas: docs/DATA_MODEL_DRAFT.md
 *
 * Aturan paket (lihat docs/TECHNICAL_PLAN.md §3.1):
 *  - Boleh mengimpor dari @guru-admin/shared
 *  - Tidak boleh mengimpor dari apps/*
 *  - Tidak boleh mengimpor Dexie, React, Supabase (domain wajib pure & framework-agnostic)
 *  - Semua tipe wajib punya Zod schema + parse + safeParse
 */

// Sprint 0: stub exports. Akan diisi di Sprint 1 sesuai docs/DATA_MODEL_DRAFT.md.
export const DOMAIN_SCHEMA_VERSION = 1;

export type Placeholder = {
  /** Marker bahwa paket ini masih stub di Sprint 0. */
  __sprint0Stub: true;
};

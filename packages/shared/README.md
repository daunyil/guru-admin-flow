# @guru-admin/shared

Paket util dan konstanta shared lintas aplikasi.

**Sprint 0 status:** Placeholder. Implementasi nyata dimulai di Sprint 1.

## Yang akan diisi di Sprint 1+

- `src/constants.ts` — konstanta global (SCHEMA_VERSION, tipe kalender, status sync, dll.)
- `src/date.ts` — util tanggal (minggu efektif, format Indonesia, dst.)
- `src/jp.ts` — util hitung JP (jam pelajaran)
- `src/slug.ts` — util slug dari string Indonesia
- `src/id.ts` — generator UUID v4

## Aturan paket

Lihat `docs/TECHNICAL_PLAN.md` §3.1. Singkatnya:

- Tidak boleh mengimpor dari `packages/domain` atau `apps/*`.
- Tidak boleh mengimpor library berat (Dexie, React, Supabase).
- Wajib pure TypeScript, side-effect free.

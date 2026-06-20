# Guru Admin Flow

Asisten administrasi guru SMP — local-first PWA. Mengurangi pekerjaan berulang setiap semester: kalender, Prota, Promes, absensi, jurnal, dan laporan akhir semester.

> **Filosofi:** *Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.*

## Status: v0.5.1 — MVP Lokal Closed (UAT)

Sprint 0–6B selesai. Aplikasi punya 13 modul fungsional + Document Preview + Print CSS.

**Belum ada**: Supabase sync (ditunda ke v1.1).

## Baca Dulu

1. `docs/GURU_ADMIN_FLOW_REFERENCE.md` — sumber otoritas produk.
2. `docs/PROJECT_CONTRACT.md` — kontrak produk.
3. `docs/TECHNICAL_PLAN.md` — keputusan teknis (§1.4: npm workspaces).
4. `docs/DATA_MODEL_DRAFT.md` — 11 entitas inti.

## Stack

| Lapisan | Teknologi |
|---|---|
| Bahasa | TypeScript (strict) |
| Build | Vite 5+ |
| Frontend | React 18+ |
| Local DB | Dexie.js (IndexedDB) |
| Cloud | Supabase — ditunda (v1.1) |
| Monorepo | npm workspaces |
| Testing | Vitest |

## Cara Menjalankan

```bash
npm install
npm run dev
npm run typecheck
npm run test:run
cd apps/teacher-admin && npx vite build
```

## Roadmap

| Versi | Output Utama | Status |
|---|---|---|
| Sprint 0–5 | MVP inti (Profil→Kalender→Prota→Promes→Jadwal→Absensi→Jurnal→Laporan) | ✅ selesai |
| Sprint 6A–6B | Audit fix + UI polish + Document Preview + data contoh | ✅ selesai |
| v0.5.1 | Closure hotfix (print CSS, lateCount, version metadata) | ✅ selesai |
| v0.6 | Template dokumen lebih mirip Word/Excel sekolah | ⏳ menunggu UAT |
| v1.1 | Supabase Sync | ⏳ ditunda |

## Aturan untuk Dev/AI

1. Baca dokumen di `docs/` sebelum menulis kode.
2. Package manager: **npm workspaces** (bukan pnpm).
3. Engine Promes wajib pakai `intraJpPerWeek` + `koJpPerWeek`, BUKAN `jpPerWeek`.
4. Catat pekerjaan di `worklog.md`.

## Lisensi

Internal SMPN 8 Bantan. Tidak untuk distribusi publik.

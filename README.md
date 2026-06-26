# Guru Admin Flow

Asisten administrasi guru SMP — **local-first PWA** untuk mengurangi pekerjaan berulang: profil sekolah/guru, kalender, Prota, Promes, jadwal, absensi, jurnal, LKPD, RPP bulk, remedial, pengayaan, laporan semester, backup/restore, dan paket administrasi.

> **Filosofi:** *Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.*

## Status: v1.0.0 — Stable Baseline

**Guru Admin Flow v1.0 sudah dikunci sebagai baseline stabil untuk pemakaian harian.**

Baseline fungsional terakhir:

- Commit baseline audit/fixpack: `411390d3da974a52efd6b5f59318a7d2f9b8b0cd`
- Gate baseline: typecheck hijau, test `524/524 PASS`, build PASS, CI hijau sesuai laporan MV-POLISH-FIXPACK-02.
- Release lock: metadata aplikasi dikunci ke `APP_VERSION = "1.0.0"` tanpa perubahan schema data.
- `DATA_SCHEMA_VERSION` tetap `7`.

Catatan: Supabase/cloud sync tetap **ditunda**. Aplikasi v1.0 dipakai sebagai PWA lokal/offline-first dengan backup JSON.

## Baca Dulu

1. `docs/RELEASE_V1_FINAL.md` — status final, scope, gate, dan keputusan release.
2. `docs/OPERATIONS_GUIDE_V1.md` — panduan penggunaan harian agar app bisa ditinggal tanpa audit ulang.
3. `docs/GURU_ADMIN_FLOW_REFERENCE.md` — sumber otoritas produk.
4. `docs/PROJECT_CONTRACT.md` — kontrak produk.
5. `docs/TECHNICAL_PLAN.md` — keputusan teknis.
6. `docs/DATA_MODEL_DRAFT.md` — model data dan schema.

## Stack

| Lapisan | Teknologi |
|---|---|
| Bahasa | TypeScript strict |
| Build | Vite |
| Frontend | React 18 |
| Local DB | Dexie.js / IndexedDB |
| Cloud | Supabase — ditunda setelah v1.0 |
| Monorepo | npm workspaces |
| Testing | Vitest |

## Cara Menjalankan

```bash
npm install
npm run dev
npm run typecheck
npm run test:run
npm run build
```

## Modul v1.0

| Area | Status |
|---|---|
| Profil sekolah/guru | ✅ siap |
| Tahun pelajaran | ✅ siap |
| Kalender | ✅ siap |
| Prota/Promes | ✅ siap |
| Jadwal/sesi mengajar | ✅ siap |
| Absensi cepat HP | ✅ siap |
| Absen susulan | ✅ siap |
| Jurnal otomatis | ✅ siap |
| Jurnal susulan | ✅ siap |
| LKPD | ✅ siap |
| RPP bulk replace | ✅ siap |
| Remedial | ✅ siap |
| Pengayaan | ✅ siap |
| Laporan semester | ✅ siap |
| Paket administrasi | ✅ siap |
| Backup/restore JSON | ✅ wajib dipakai |

## Aturan Maintenance Setelah v1.0

Tidak ada audit ulang besar kecuali ada P0/P1 nyata.

| Jenis masalah | Tindakan |
|---|---|
| Data hilang / app crash / tidak bisa simpan | Hotfix langsung |
| Absen/jurnal salah sesi | Hotfix langsung |
| Dokumen utama gagal dibuat | Hotfix langsung |
| Tampilan kurang cantik | Tunda |
| Bundle size | Tunda |
| Integrasi cloud | v1.1, bukan v1.0 |
| Fitur baru | Backlog, bukan hotfix |

## Roadmap Setelah Release

| Versi | Output Utama | Status |
|---|---|---|
| v1.0.0 | Local-first stable baseline untuk pemakaian harian | ✅ locked |
| v1.0.x | Hanya hotfix P0/P1/P2 nyata | opsional |
| v1.1 | Supabase/cloud sync atau integrasi Apps Script | ditunda |

## Lisensi

Internal SMPN 8 Bantan. Tidak untuk distribusi publik.

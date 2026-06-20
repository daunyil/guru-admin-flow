# Guru Admin Flow

Asisten administrasi guru SMP — local-first PWA. Mengurangi pekerjaan berulang setiap semester: kalender, Prota, Promes, absensi, jurnal, dan laporan akhir semester.

> **Filosofi:** *Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.*

## Status: Sprint 5 — MVP v1 Lengkap (Local-First)

Sprint 0–5 selesai. Aplikasi punya 13 modul fungsional:

- Profil sekolah/guru/tahun pelajaran
- Kalender pendidikan (impor JSON + editor)
- Prota (input + validasi JP + status dokumen)
- Promes (engine pure function, KO row terpisah, print CSS)
- Jadwal guru (input manual + impor Smart Roster)
- Sesi mengajar (generator dari jadwal + kalender)
- Daftar siswa (roster per kelas, impor massal)
- Absensi HP (default semua hadir, 4+1 tombol status)
- Jurnal otomatis (auto-fill dari sesi+Prota+absensi)
- Laporan akhir semester (rekap lengkap + Document Preview)
- Halaman kelengkapan (completeness check)
- Backup/restore JSON
- Wizard tahun baru (salin profil+Prota, kosongkan realisasi)

**Belum ada**: Supabase sync (Sprint 6/7 — ditunda sampai smoke test lolos).

## Baca Dulu

Wajib dibaca sebelum menulis kode:

1. `docs/GURU_ADMIN_FLOW_REFERENCE.md` — sumber otoritas produk.
2. `docs/PROJECT_CONTRACT.md` — kontrak produk.
3. `docs/TECHNICAL_PLAN.md` — keputusan teknis (§1.4: npm workspaces, bukan pnpm).
4. `docs/DATA_MODEL_DRAFT.md` — 11 entitas inti.

## Struktur Repo

```text
guru-admin-flow/
├── apps/
│   └── teacher-admin/         # aplikasi guru (Vite + React + TS)
├── packages/
│   ├── domain/                # tipe data + Zod + business rules + pure functions
│   └── shared/                # util + konstanta shared
├── docs/                      # dokumen kontrak + design docs
├── worklog.md                 # log kerja lintas sprint
├── package.json               # root workspace (npm workspaces)
└── README.md
```

## Stack

| Lapisan | Teknologi |
|---|---|
| Bahasa | TypeScript (strict) |
| Build | Vite 5+ |
| Frontend | React 18+ |
| Local DB | Dexie.js (IndexedDB) |
| Cloud | Supabase — ditunda (Sprint 6/7) |
| Monorepo | npm workspaces (bukan pnpm) |
| Testing | Vitest |

## Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan aplikasi
npm run dev

# Typecheck semua paket
npm run typecheck

# Test
npm run test:run

# Build
cd apps/teacher-admin && npx vite build
```

## Roadmap

| Sprint | Output Utama | Status |
|---|---|---|
| Sprint 0 | Kontrak & fondasi | ✅ selesai |
| Sprint 1 | Profil + Backup/Restore + Wizard + CI/CD | ✅ selesai |
| Sprint 2 | Kalender + Prota + Promes (CRITICAL PROMES RULE) | ✅ selesai |
| Sprint 3 | Jadwal Guru + Sesi Mengajar + Dashboard | ✅ selesai |
| Sprint 4 | Absensi HP + Jurnal Otomatis + Document Preview | ✅ selesai |
| Sprint 5 | Laporan Akhir Semester + Linker + Kelengkapan | ✅ selesai |
| Sprint 6A | Audit Fix + Polish Dokumen + Data Contoh | 🔄 sedang dikerjakan |
| Sprint 6/7 | Supabase Sync | ⏳ ditunda |

## Aturan untuk Dev/AI

1. **Baca dokumen di `docs/` sebelum menulis kode.**
2. Jangan memperluas scope sebelum MVP v1 selesai.
3. Package manager resmi: **npm workspaces** (bukan pnpm). Lihat `docs/TECHNICAL_PLAN.md` §1.4.
4. Engine Promes wajib pakai `intraJpPerWeek` + `koJpPerWeek`, BUKAN `jpPerWeek`. Lihat `docs/SPRINT_2_DESIGN.md` §0.
5. Catat pekerjaan di `worklog.md`.

## Lisensi

Internal SMPN 8 Bantan. Tidak untuk distribusi publik.

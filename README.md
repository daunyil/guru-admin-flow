# Guru Admin Flow

Asisten administrasi guru SMP — local-first PWA. Mengurangi pekerjaan berulang setiap semester: kalender, Prota, Promes, absensi, jurnal, dan laporan akhir semester.

> **Filosofi:** *Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.*

## Status: Sprint 0 — Product Contract & Technical Foundation

Repo ini berada pada Sprint 0. Yang sudah ada:

- 3 dokumen kontrak di `docs/` (PROJECT_CONTRACT, TECHNICAL_PLAN, DATA_MODEL_DRAFT).
- Sumber otoritas produk di `docs/GURU_ADMIN_FLOW_REFERENCE.md`.
- Struktur monorepo (pnpm workspace): `apps/teacher-admin`, `packages/domain`, `packages/shared`.
- Scaffold minimal Vite + React + TS (tanpa UI besar, tanpa Supabase).

Yang **belum** ada (sesuai acceptance criteria Sprint 0):

- Tidak ada modul fitur (Prota, Promes, absensi, dst.).
- Tidak ada skema Dexie.
- Tidak ada Supabase (ditunda ke Sprint 6).
- Tidak ada UI layout besar.

## Baca Dulu

Wajib dibaca sebelum menulis kode apa pun, berurutan:

1. `docs/GURU_ADMIN_FLOW_REFERENCE.md` — sumber otoritas produk (read-only).
2. `docs/PROJECT_CONTRACT.md` — kontrak produk: visi, scope MVP v1, non-goals, AC.
3. `docs/TECHNICAL_PLAN.md` — keputusan teknis: stack, struktur folder, strategi local-first & sync.
4. `docs/DATA_MODEL_DRAFT.md` — 11 entitas inti + 2 entitas pendukung.

## Struktur Repo

```text
guru-admin-flow/
├── apps/
│   └── teacher-admin/         # aplikasi guru (PWA, Sprint 1+)
├── packages/
│   ├── domain/                # tipe data + Zod + business rules (Sprint 1+)
│   └── shared/                # util + konstanta shared (Sprint 1+)
├── docs/                      # dokumen kontrak
├── scripts/                   # skrip build/util
├── worklog.md                 # log kerja lintas sprint
├── package.json               # root workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md                  # dokumen ini
```

## Stack (Sprint 0)

| Lapisan | Teknologi |
|---|---|
| Bahasa | TypeScript (strict) |
| Build | Vite 5+ |
| Frontend | React 18+ |
| Local DB | Dexie.js (IndexedDB) — pasang di Sprint 1 |
| Cloud | Supabase — pasang di Sprint 6, **bukan sebelumnya** |
| Monorepo | pnpm workspaces |

Detail di `docs/TECHNICAL_PLAN.md` §1.

## Cara Menjalankan (Sprint 0)

```bash
# Install dependencies
pnpm install

# Jalankan aplikasi (scaffold only)
pnpm dev

# Typecheck semua paket
pnpm typecheck
```

## Roadmap Singkat

| Sprint | Output Utama |
|---|---|
| Sprint 0 | Kontrak & fondasi (status: selesai) |
| Sprint 1 | Fondasi lokal: shell, Dexie, modul Profil, modul Backup/Restore |
| Sprint 2 | Kalender + Prota + Promes |
| Sprint 3 | Jadwal Guru + Sesi Mengajar |
| Sprint 4 | Absensi HP + Jurnal Otomatis |
| Sprint 5 | Laporan Akhir Semester |
| Sprint 6 | Supabase Sync |

Detail per sprint di `docs/TECHNICAL_PLAN.md` §9.

## Aturan untuk Dev/AI Berikutnya

1. **Baca ke-4 dokumen di `docs/` sebelum menulis kode.**
2. Jangan memperluas scope sebelum MVP v1 selesai (lihat `docs/PROJECT_CONTRACT.md` §5 non-goals).
3. Setiap perubahan tipe data wajib memperbarui `docs/DATA_MODEL_DRAFT.md` **terlebih dahulu**, baru kode.
4. Setiap perubahan stack/struktur wajib memperbarui `docs/TECHNICAL_PLAN.md` **terlebih dahulu**, baru kode.
5. Setiap perubahan UX wajib konsisten dengan `docs/PROJECT_CONTRACT.md` §8.
6. Catat pekerjaan di `worklog.md` setelah selesai (lihat format di file tersebut).

## Lisensi

Internal SMPN 8 Bantan. Tidak untuk distribusi publik pada tahap ini.

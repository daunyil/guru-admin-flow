# Sprint 1: Local Foundation

> **Branch**: `sprint-1-local-foundation` → `main`
> **Commits**: 3 (Sprint 1 + audit fix + worklog)
> **Status**: LOCAL PASS + AUDIT PASS, siap merge setelah review

## Ringkasan

Sprint 1 membangun fondasi aplikasi lokal Guru Admin Flow sesuai `docs/TECHNICAL_PLAN.md` §9.1. Tidak ada Supabase, tidak ada login, tidak ada modul di luar scope Sprint 1.

**Filosofi yang dipatuhi**: *Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.*

## Scope yang dikerjakan (10 item)

| # | Scope | Bukti |
|---|---|---|
| 1 | Setup dependency lokal | npm workspaces, 252 packages. **Tidak ada Supabase.** |
| 2 | Schema domain Zod | 11 entitas inti + 2 pendukung di `packages/domain/src/`. Setiap entitas: schema + parse + safeParse + validasi logic. |
| 3 | Helper shared | `packages/shared/src/`: constants, date, jp, slug, id. |
| 4 | Dexie DB | 14 tabel, version(1), compound indices. CRUD + repo profil + repo backup. |
| 5 | Shell aplikasi | AppShell responsive mobile + desktop. Tailwind tema emerald/teal. |
| 6 | Modul M01 Profil | 3 tab (Sekolah/Guru/Tahun Pelajaran). Persist ke Dexie. |
| 7 | Modul M09 Backup/Restore | Export JSON download, Import dengan validasi Zod + schemaVersion check + konfirmasi eksplisit. |
| 8 | Wizard Tahun Baru | 3-step wizard. Salin Profil+Prota+Schedule, **kosongkan realisasi**. |
| 9 | Dashboard Hari Ini | Default route. Status profil, tahun aktif, placeholder Sprint 2+. |
| 10 | Unit test dasar | **61 test PASS** (38 domain + 23 shared). |

## Non-goals yang dipatuhi

Berikut adalah non-goals Sprint 1 yang **TIDAK** dikerjakan (sesuai instruksi senior dev):

- ❌ Supabase (Sprint 6)
- ❌ Login (Sprint 6)
- ❌ Kalender editor lengkap (Sprint 2)
- ❌ Prota editor lengkap (Sprint 2)
- ❌ Promes generator (Sprint 2)
- ❌ Absensi HP (Sprint 4)
- ❌ Jurnal otomatis (Sprint 4)
- ❌ Laporan semester (Sprint 5)
- ❌ Nilai
- ❌ Bank soal
- ❌ Parser PDF/DOCX/XLSX
- ❌ AI API

## Test result

```
> @guru-admin/domain@0.1.0-sprint1 test:run
> vitest run --config vitest.config.ts

 RUN  v2.1.9 /home/z/my-project/sprint0-push/packages/domain

 ✓ test/rules.test.ts (8 tests) — planNewYearFromPrevious tidak salin realisasi
 ✓ test/academic-year.test.ts (9 tests) — schema + logic validation
 ✓ test/backup.test.ts (5 tests) — schemaVersion check
 ✓ test/prota.test.ts (8 tests) — JP positive, semester enum, status dokumen
 ✓ test/school-profile.test.ts (8 tests) — NPSN 8 digit, NIP 18 digit

 Test Files  5 passed (5)
      Tests  38 passed (38)

> @guru-admin/shared@0.1.0-sprint1 test:run
> vitest run --config vitest.config.ts

 RUN  v2.1.9 /home/z/my-project/sprint0-push/packages/shared

 ✓ test/jp.test.ts (9 tests) — sumJP, validateJPTotal, jpPerWeek
 ✓ test/shared.test.ts (14 tests) — slug, date, dayOfWeek, range overlap, ISO week

 Test Files  2 passed (2)
      Tests  23 passed (23)
```

**Total: 61/61 test PASS** (diverifikasi di clone bersih)

## Build result

```
> vite build

vite v5.4.21 building for production...
✓ 79 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-DcIc0JrA.css    1.48 kB │ gzip:   0.57 kB
dist/assets/index-DvJ-ctls.js   373.74 kB │ gzip: 113.16 kB
✓ built in 1.88s
```

(diverifikasi di clone bersih — identik dengan repo asal)

## Bukti tidak ada Supabase

```bash
$ grep -rni "supabase" --include="package.json" . | grep -v node_modules | grep -v package-lock.json
# (tidak ada output)

$ grep -rni "@supabase" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
# (tidak ada output)
```

Hanya 3 mention "supabase" di seluruh repo, semuanya di komentar/string non-eksekusi:
1. `apps/teacher-admin/src/routes/TodayPage.tsx:147` — placeholder "Supabase sync (Sprint 6)" di checklist status sprint
2. `packages/shared/src/index.ts:8` — komentar aturan paket "Tidak boleh mengimpor library berat (Dexie, React, Supabase)"
3. `packages/domain/src/index.ts:10` — komentar aturan paket serupa

**Tidak ada dependency, tidak ada import, tidak ada konfigurasi Supabase di mana pun.**

## Audit clone bersih (post-fix)

Sprint 1 diaudit dari clone bersih ke `/tmp/audit-clone`:

```bash
git clone /home/z/my-project/sprint0-push /tmp/audit-clone
cd /tmp/audit-clone
git checkout sprint-1-local-foundation
npm install                              # ✅ 252 packages
npm run typecheck                        # ✅ 3 workspace, 0 error
npm run test:run                         # ✅ 61/61 PASS
npx vite build                           # ✅ 1.88s, 373KB JS
```

Verifikasi tambahan:
- ✅ Tidak ada `dist/` atau `node_modules/` ter-track
- ✅ Tidak ada token/credential (grep pattern `ghp_`, `api_key`, `password`)
- ✅ `DATA_SCHEMA_VERSION = 1` terverifikasi
- ✅ Wizard tahun baru: 8 test rules PASS, termasuk verifikasi field BaseEntity tidak disalin

## Bug yang ditemukan & di-fix selama audit

### `.gitignore` meng-ignore folder `test/` (KRITIS)

Sprint 1 mewarisi `.gitignore` dari template Next.js yang punya pola `test` (tanpa slash) — ini meng-ignore **semua folder `test/`** di seluruh repo, termasuk 7 file test Sprint 1.

**Akibatnya**: 61 test PASS lokal, tapi 0 test file ter-commit. Clone bersih akan gagal `npm test`.

**Fix** (commit `dab0632`):
- Hapus pola `test` dari `.gitignore`
- Tambahkan 7 file test yang sebelumnya untracked
- Re-clone & re-audit: 61/61 test PASS di clone bersih

### Package manager resmi: pnpm → npm workspaces

Sprint 0 menetapkan pnpm workspaces. Sprint 1 beralih ke **npm workspaces** karena pnpm tidak tersedia di sandbox dev.

**Fix** (commit `dab0632`):
- Update `docs/TECHNICAL_PLAN.md` §1.1 + §1.4 baru: penjelasan keputusan package manager
- Aturan: jangan buat `pnpm-workspace.yaml`, jangan pakai `workspace:*` protocol
- Lockfile resmi: `package-lock.json`

## Manual smoke test checklist (untuk reviewer)

Setelah clone & install, jalankan manual test berikut sebelum approve merge:

```bash
git clone https://github.com/daunyil/guru-admin-flow.git
cd guru-admin-flow
git checkout sprint-1-local-foundation
npm install
npm run dev   # atau: cd apps/teacher-admin && npx vite
```

Buka http://localhost:5173, lalu:

```text
1. Buka app lokal.                                         → [ ] app jalan
2. Isi profil sekolah (menu Profil → tab Sekolah).         → [ ] tersimpan
3. Isi profil guru (menu Profil → tab Guru).               → [ ] tersimpan
4. Buat tahun pelajaran aktif (menu Profil → tab Tahun).   → [ ] tersimpan & aktif
5. Refresh browser.                                        → [ ] data tetap ada
6. Buka DevTools → Application → IndexedDB → guru-admin-flow → [ ] 3 entitas tersimpan
7. Export backup JSON (menu Backup → Export).              → [ ] file terdownload
8. Hapus/ubah data profil di IndexedDB via DevTools.       → [ ] data hilang
9. Import backup JSON (menu Backup → Import → confirm).    → [ ] data kembali
10. Buka wizard Tahun Baru (menu Tahun Baru).              → [ ] wizard jalan
11. Pilih tahun sumber, isi tanggal baru, submit.          → [ ] tahun baru aktif
12. Cek IndexedDB: ProtaProfile + TeachingSchedule tersalin, → [ ] realisasi kosong
    LessonSession/Attendance/Journal tetap kosong.
```

## Commits di PR ini

| Commit | Deskripsi | File | Insertions |
|---|---|---|---|
| `dd52dfe` | Sprint 1: Fondasi Aplikasi Lokal | 51 | 8.544 |
| `dab0632` | Audit fix: .gitignore bug + test files + TECHNICAL_PLAN package manager | 9 | 834 |
| `22869e9` | Audit: update worklog dengan entry audit pra-push | 1 | 62 |

**Total**: 61 file changed, ~9.440 insertions

## Acceptance criteria Sprint 1 — semua tercapai

- ✅ Aplikasi jalan lokal (vite build sukses 1.88s, 79 modules)
- ✅ TypeScript strict pass (3 workspace, 0 error)
- ✅ Test pass (61/61)
- ✅ Backup JSON bisa export/import (kode lengkap + validasi Zod)
- ✅ schemaVersion divalidasi (`validateBackup` menolak file dari versi lebih baru)
- ✅ Restore menolak backup invalid (`validateBackupFile` return error sebelum restore)
- ✅ Wizard tahun baru tidak menyalin realisasi lama (8 test case verifikasi)
- ✅ Tidak ada dependency Supabase (grep = 0 hasil)
- ✅ Worklog diperbarui (`worklog.md` Task ID 1 + 1-audit)

## Setelah merge

```text
Sprint 1: CLOSED
Mulai Sprint 2: Kalender + Prota + Promes
```

Lihat `docs/TECHNICAL_PLAN.md` §9.2 untuk scope Sprint 2.

---

**Reviewers**: mohon jalankan manual smoke test checklist di atas sebelum approve. Bila ada step yang gagal, blok merge dan catat di komentar PR.

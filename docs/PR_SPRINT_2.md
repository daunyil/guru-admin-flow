# Sprint 2: Kalender + Prota + Promes

> **Status**: Coding 100% selesai, typecheck/test/build PASS. Tinggal push ke GitHub.
> **Issue**: PR #1 (Sprint 1) belum merged di `main`. Branch Sprint 2 dibuat dari `sprint-1-local-foundation`.
> **Bundle**: `download/sprint-2-calendar-prota-promes.bundle` (58KB, 1 commit)

## Cara push (pilih salah satu)

### Opsi A — Pakai bundle (paling aman, tanpa share token)

```bash
# Di mesin lokal Anda:
git clone https://github.com/daunyil/guru-admin-flow.git
cd guru-admin-flow

# Verify bundle
git bundle verify /path/to/sprint-2-calendar-prota-promes.bundle

# Import branch dari bundle
git fetch /path/to/sprint-2-calendar-prota-promes.bundle \
  sprint-2-calendar-prota-promes:sprint-2-calendar-prota-promes

# Checkout branch Sprint 2
git checkout sprint-2-calendar-prota-promes

# (Optional) Rebase ke main bila PR #1 sudah merged
git fetch origin
git rebase origin/main  # skip bila PR #1 belum merged

# Push ke GitHub
gh auth login  # bila belum login
git push -u origin sprint-2-calendar-prota-promes
```

### Opsi B — Berikan token baru via file upload

Upload file `.env.sprint2-token.txt` berisi token GitHub baru (scope: `repo`). Saya akan pakai untuk push, lalu hapus file dari sandbox.

⚠️ Token yang pernah muncul di chat = COMPROMISED. Buat token baru, jangan reuse token lama.

## Ringkasan

### Scope Sprint 2 (8 items — semua selesai)

1. ✅ Kalender JSON import (`guru-admin-flow/calendar/v1`)
2. ✅ Editor kalender minimal (form + daftar + soft-delete + 7 jenis event)
3. ✅ Input Prota (identitas intra+KO, units per semester, status dokumen 5-level)
4. ✅ Validasi JP (real-time per semester vs target, status valid/perlu perbaikan)
5. ✅ Engine Promes pure function (9 langkah algoritma, sesuai §0 CRITICAL PROMES RULE)
6. ✅ Preview Promes (tabel 2 row per minggu: intra + KO terpisah)
7. ✅ Print CSS sederhana (`window.print()`)
8. ✅ Unit test engine (17 test + 11 calendar + 12 prota = **40 test baru**)

### CRITICAL PROMES RULE (locked)

```text
PPKn SMP = 108 JP/tahun = 72 intra + 36 KO
Per minggu: 2 JP intra (materi) + 1 JP KO (row terpisah)

Engine Sprint 2:
  - Pakai intraJpPerWeek=2 + koJpPerWeek=1 (BUKAN jpPerWeek=3)
  - materialCapacity = (mingguEfektif × intra) − cadangan
  - Cadangan dari INTRA capacity (bukan total 3 JP)
  - Cadangan > intra → ERROR (bukan warning)
  - KO row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP

Test #13 (KO row terpisah verification) PASS:
  materialCapacityJP = 30 (BUKAN 48 = 18×3−6)
  koTotalJP = 18 (TIDAK mengurangi materialCapacityJP)
```

### Files (21 total: 10 baru, 11 modifikasi)

**Baru:**
- `docs/SPRINT_2_DESIGN.md` (1.300 baris, v0.2 — design doc lengkap dengan §0 CRITICAL PROMES RULE)
- `packages/domain/src/promes-types.ts` (types: PromesOptions, PromesResult, PromesWeek, KORow, dll)
- `packages/domain/src/promes-engine.ts` (400 baris, pure function 9 langkah)
- `packages/domain/src/calendar-import.ts` (Zod schema + validasi + auto-fix)
- `packages/domain/src/prota-import.ts` (Zod schema + validasi + konversi)
- `packages/domain/test/promes-fixtures.ts` (helper fixture untuk test)
- `packages/domain/test/promes-engine.test.ts` (17 test, termasuk #13 KRITIS)
- `packages/domain/test/calendar-import.test.ts` (11 test)
- `packages/domain/test/prota-import.test.ts` (12 test)
- `apps/teacher-admin/src/shared/db/calendar-repo.ts` (CRUD + impor JSON)
- `apps/teacher-admin/src/shared/db/prota-repo.ts` (CRUD + snapshot + impor JSON)
- `apps/teacher-admin/src/modules/calendar/CalendarPage.tsx` (UI kalender lengkap)
- `apps/teacher-admin/src/modules/prota/ProtaPage.tsx` (UI Prota lengkap dengan 3 tab)
- `apps/teacher-admin/src/modules/promes/PromesPage.tsx` (UI Promes dengan 2 row per minggu)

**Modifikasi:**
- `packages/shared/src/constants.ts` (import schemas, defaults PPKn, KO modes, labels)
- `packages/domain/src/index.ts` (export modul Sprint 2)
- `apps/teacher-admin/src/shared/db/crud.ts` (relax constraint type)
- `apps/teacher-admin/src/App.tsx` (7 routes)
- `apps/teacher-admin/src/shared/layout/AppShell.tsx` (7 menu)
- `apps/teacher-admin/src/shared/layout/icons.tsx` (+ClipboardList, +FileText)
- `apps/teacher-admin/src/routes/TodayPage.tsx` (status Sprint 2 checked)

### Test result

```
> @guru-admin/domain@0.1.0-sprint1 test:run
> vitest run --config vitest.config.ts

 ✓ test/calendar-import.test.ts (11 tests) 8ms
 ✓ test/promes-engine.test.ts (17 tests) 93ms  ← termasuk test #13 KO row verification
 ✓ test/rules.test.ts (8 tests) 12ms
 ✓ test/prota-import.test.ts (12 tests) 6ms
 ✓ test/backup.test.ts (5 tests) 7ms
 ✓ test/academic-year.test.ts (9 tests) 13ms
 ✓ test/prota.test.ts (8 tests) 10ms
 ✓ test/school-profile.test.ts (8 tests) 9ms

 Test Files  8 passed (8)
      Tests  78 passed (78)


> @guru-admin/shared@0.1.0-sprint1 test:run
> vitest run --config vitest.config.ts

 ✓ test/jp.test.ts (9 tests) 3ms
 ✓ test/shared.test.ts (14 tests) 30ms

 Test Files  2 passed (2)
      Tests  23 passed (23)
```

**Total: 101/101 PASS** (Sprint 1: 61 + Sprint 2: 40 baru)

### Build result

```
vite v5.4.21 building for production...
✓ 87 modules transformed.    (+8 dari Sprint 1 yang 79)
dist/index.html                   0.46 kB
dist/assets/index-DcIc0JrA.css    1.48 kB
dist/assets/index-CYD0QwaS.js   422.56 kB │ gzip: 124.42 kB
✓ built in 2.07s
```

### Bukti tidak ada Supabase

```bash
$ grep -rni "supabase" --include="package.json" . | grep -v node_modules | grep -v package-lock.json
# (tidak ada output — hanya 3 mention di komentar/string non-eksekusi)
```

### Non-goals yang dipatuhi

- ❌ Tidak ada modul Sprint 3+ (jadwal, absensi, jurnal, laporan)
- ❌ Tidak ada Supabase (Sprint 6)
- ❌ Tidak ada solver KO (urusan Smart Roster)
- ❌ Tidak ada hardcode jpPerWeek untuk mapel selain PPKn
- ❌ Tidak ada multi-mapel per generate (1 mapel, 1 kelas, 1 semester)
- ❌ Tidak ada persist Promes (regenerasi on-demand)
- ❌ Tidak ada export PDF/DOCX (CSS `@media print` only)

### Manual smoke test checklist (untuk reviewer)

```bash
git clone https://github.com/daunyil/guru-admin-flow.git
cd guru-admin-flow
git checkout sprint-2-calendar-prota-promes  # setelah push
npm install
npm run dev   # di apps/teacher-admin
```

Buka http://localhost:5173, lalu:

```text
1. Buka menu Kalender → Impor JSON → paste calendar JSON → Impor
2. Verifikasi event tersimpan di IndexedDB (DevTools → Application → IndexedDB)
3. Buka menu Prota → Buat Prota Baru → isi identitas (PPKn, VII, 72/36/36)
4. Tambah unit: Budaya Demokrasi (12 JP, semester 1, order 1)
5. Tambah unit: Keadilan Sosial (24 JP, semester 1, order 2)
6. Verifikasi status validasi: subtotal 36 JP = target 36 JP ✓
7. Buka menu Promes → Generate Promes (default: intra=2, KO=1, cadangan=6)
8. Verifikasi: 18 minggu efektif, materialCapacity=30 JP, koTotalJP=18 JP
9. Verifikasi tabel distribusi: setiap minggu punya 2 row (intra + KO)
10. Verifikasi minggu 16-18 = cadangan (intra), KO tetap muncul
11. Refresh browser → data tetap ada (IndexedDB persist)
12. Cetak preview → window.print() → layout A4 rapi
```

### Issue yang perlu di-flag

1. **PR #1 (Sprint 1) belum merged di `main`**. Branch Sprint 2 dibuat dari `sprint-1-local-foundation` (yang berisi semua Sprint 1). Bila Anda merge PR #1 dulu, lalu rebase Sprint 2 ke `origin/main` sebelum push, PR #2 akan bersih (hanya diff Sprint 2). Bila tidak, PR #2 akan show diff Sprint 1 + Sprint 2.

2. **Token push**. Saya tidak punya token yang tidak compromised. Bundle file sudah disiapkan di `download/sprint-2-calendar-prota-promes.bundle` (58KB) supaya Anda bisa push sendiri via `gh auth login`. Atau upload token baru via file.

### Acceptance criteria Sprint 2 — semua tercapai

- ✅ Kalender JSON import + editor minimal
- ✅ Input Prota + validasi JP (72 intra + 36 KO)
- ✅ Engine Promes pure function (sesuai §0 CRITICAL PROMES RULE)
- ✅ Preview Promes dengan KO row terpisah
- ✅ Print CSS sederhana
- ✅ Unit test engine (40 test baru, total 101 test PASS)
- ✅ TypeScript strict pass (3 workspace)
- ✅ Build pass (87 modules, 422KB JS)
- ✅ Tidak ada Supabase
- ✅ Worklog diperbarui

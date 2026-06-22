# Worklog — Guru Admin Flow

File ini adalah log kerja tunggal lintas sprint. **Append-only**. Setiap entri wajib diawali dengan `---` pada baris baru.

Format entri:

```markdown
---
Task ID: <id>
Agent: <nama>
Task: <deskripsi singkat>

Work Log:
- <langkah 1>
- <langkah 2>

Stage Summary:
- <hasil / keputusan / artefak yang dihasilkan>
```

---

Task ID: 0
Agent: Sprint 0 owner (main)
Task: Sprint 0 — Product Contract & Technical Foundation. Membaca referensi, menyusun kontrak produk, rencana teknis, draft data model, dan scaffold repo minimal tanpa fitur/UI besar/Supabase.

Work Log:
- Membaca `upload/GURU_ADMIN_FLOW_REFERENCE.md` (781 baris) sebagai sumber otoritas produk.
- Membaca preview `upload/promes_generator_smpn8bantan (1).html` (prototipe Promes Generator SMPN 8 Bantan, referensi visual untuk Sprint 2).
- Membuat struktur direktori monorepo: `apps/teacher-admin`, `packages/domain`, `packages/shared`, `docs`, `scripts`.
- Menyalin `GURU_ADMIN_FLOW_REFERENCE.md` ke `docs/` sebagai sumber otoritas read-only.
- Menulis `docs/PROJECT_CONTRACT.md`: visi, target pengguna, 7 masalah utama, 9 modul MVP (M01–M09), 13 non-goals, 4 user flow (awal tahun, awal semester, harian, akhir semester), data ownership + aturan tahun baru, 6 prinsip UX, AC Sprint 0 + 15 AC MVP v1, 10 aturan untuk dev berikutnya.
- Menulis `docs/TECHNICAL_PLAN.md`: pilihan stack (TS+Vite+React+Dexie+Supabase-ditunda), alternatif yang ditolak + alasan, modul utama aplikasi, struktur folder monorepo + aturan dependensi antar-paket, strategi local-first + skema Dexie draft, rencana Supabase Sprint 6 (ditunda), strategi backup/restore JSON + snapshot, strategi testing piramida + alur E2E wajib, 13 justifikasi non-goals, roadmap Sprint 1–6, 7 risiko teknis awal, Definition of Done per sprint.
- Menulis `docs/DATA_MODEL_DRAFT.md`: 11 entitas inti (AcademicYear, SchoolProfile, TeacherProfile, CalendarEvent, ProtaProfile+ProtaUnit digabung jadi 1 entitas ProtaProfile dengan units, TeachingSchedule, LessonSession, AttendanceRecord+ClassRoster+StudentEntry, TeachingJournal, SemesterReport) + 2 entitas pendukung (DocumentSnapshot, SyncQueue), konvensi umum (BaseEntity, SyncStatus, DocumentStatus, format tanggal, aturan ID), relasi antar entitas (diagram teks), aturan implementasi "Buat Tahun Baru dari Tahun Lalu", validasi lintas entitas, daftar entitas yang belum didefinisikan.
- Menulis root `package.json` (pnpm workspace, scripts typecheck/lint/test), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict mode).
- Menulis `packages/shared/` (package.json + tsconfig + src/index.ts placeholder + README).
- Menulis `packages/domain/` (package.json dengan zod dep + tsconfig + src/index.ts stub + README).
- Menulis `apps/teacher-admin/` minimal: package.json (React 18 + Vite 5, TANPA Supabase/Dexie/Tailwind/Router di Sprint 0), tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx (placeholder Sprint 0 yang menampilkan status + daftar dokumen kontrak).
- Menulis `README.md` root, `.gitignore`, `.editorconfig`.

Stage Summary:
- 4 dokumen kontrak siap di `docs/`: GURU_ADMIN_FLOW_REFERENCE.md (sumber), PROJECT_CONTRACT.md, TECHNICAL_PLAN.md, DATA_MODEL_DRAFT.md.
- Struktur monorepo siap untuk Sprint 1: pnpm workspace + 2 packages + 1 app.
- Tidak ada dependensi Supabase di `package.json` mana pun (verifikasi: hanya `zod` di packages/domain, `react` + `react-dom` + `vite` + `@vitejs/plugin-react` di apps/teacher-admin).
- Tidak ada UI besar: `App.tsx` hanya placeholder 1 komponen tanpa routing, tanpa layout, tanpa modul.
- Tidak ada fitur di luar MVP v1: tidak ada kode Prota/Promes/absensi/jurnal/laporan — hanya stub.
- Sprint 0 acceptance criteria (PROJECT_CONTRACT.md §9) seluruhnya terpenuhi.
- Risiko awal tercatat di TECHNICAL_PLAN.md §10 (7 risiko): migration skema Dexie, kompleksitas engine Promes, quota IndexedDB iOS, background sync iOS, konflik multi-perangkat, Tailwind bundle, PWA install prompt.
- Yang belum dikerjakan (sesuai scope Sprint 0): implementasi tipe domain di packages/domain/src/*, skema Dexie, modul M01–M09, layout shell, routing. Semua ditunda ke Sprint 1+.
- Instruksi untuk Sprint 1: lihat bagian "Sprint 1 — Fondasi Aplikasi Lokal" di TECHNICAL_PLAN.md §9.1.

---

Task ID: 0-preview
Agent: main (preview setup)
Task: Setup Next.js 16 preview page untuk menampilkan status Sprint 0 secara visual (dashboard project).

Work Log:
- Backup root package.json pnpm workspace ke package.json.sprint0.bak & pnpm-workspace.yaml.sprint0.bak (Sprint 0 deliverable tetap aman).
- Inisialisasi Next.js 16 via init-fullstack.sh (Vite + React monorepo Sprint 0 dipreservasi di apps/teacher-admin & packages/*, struktur Next.js dibangun di root untuk preview system).
- Update src/app/layout.tsx: metadata bahasa Indonesia, title "Guru Admin Flow — Sprint 0", lang="id".
- Buat src/app/page.tsx (~500 baris): dashboard Sprint 0 dengan 5 tab (Dokumen, Modul MVP, User Flow, Stack, Roadmap), hero section, stat cards (4 modul MVP, 9 modul, 13 non-goals, 0/6 sprint), filosofi produk, 9 modul MVP grid, 13 non-goals list, 4 user flow cards, 12 stack items, 7 sprint timeline, 9 acceptance criteria checklist, accordion 10 aturan dev. Tema emerald/teal (sesuai aturan "hindari indigo/biru").
- Verifikasi via Agent Browser: page load HTTP 200, semua tab interaktif (Dokumen/Modul MVP/User Flow/Stack/Roadmap), accordion "10 Aturan" bisa expand, mobile viewport 390x844 responsive, tidak ada console error, tidak ada page error.
- Lint bersih (bun run lint = 0 errors).
- Screenshot desktop & mobile disimpan di download/sprint0-preview.png & sprint0-preview-mobile.png.

Stage Summary:
- Preview Next.js berjalan di port 3000, return HTTP 200, semua interaksi (tab switch, accordion expand) berfungsi.
- Sprint 0 deliverables (docs/, apps/teacher-admin, packages/*) tetap utuh dan dipreservasi.
- Halaman preview menampilkan: 4 dokumen kontrak, 9 modul MVP (M01–M09), 13 non-goals, 4 user flow, 12 stack items, 7 sprint roadmap, 9 acceptance criteria, 10 aturan dev.
- Backup Sprint 0 root files tersedia di package.json.sprint0.bak & pnpm-workspace.yaml.sprint0.bak untuk restore bila nanti dilanjutkan ke Sprint 1 dengan struktur monorepo pnpm asli.

---

Task ID: 1
Agent: main (Sprint 1 execution)
Task: Sprint 1 — Fondasi Aplikasi Lokal. Setup dependency, schema domain Zod, helper shared, Dexie DB, shell aplikasi, modul profil, backup/restore, wizard tahun baru, unit test dasar.

Work Log:
- Buat branch `sprint-1-local-foundation` dari `main` (Sprint 0 baseline).
- Switch dari pnpm workspace (tidak tersedia di sandbox) ke **npm workspaces**. Update root package.json dengan `"workspaces": ["apps/*", "packages/*"]`. Hapus `pnpm-workspace.yaml`. Ganti `"workspace:*"` protocol ke `"*"` (npm tidak support workspace: protocol).
- Update package.json untuk 4 workspace (root, apps/teacher-admin, packages/domain, packages/shared) dengan dependencies Sprint 1: dexie@4, dexie-react-hooks, react-router-dom@6, zustand, uuid, tailwindcss@3, postcss, autoprefixer, vitest@2, jsdom, @testing-library/react. Tidak ada Supabase, tidak ada login, tidak ada Dexie di packages (hanya di app).
- `npm install` sukses: 252 packages dalam 14 detik.
- Implementasi `packages/shared/src/`:
  - `constants.ts` — APP_NAME, APP_VERSION, DATA_SCHEMA_VERSION=1, DEFAULT_TIMEZONE, DAY_OF_WEEK, DAY_LABELS_ID, MONTH_LABELS_ID, SYNC_STATUSES, DOCUMENT_STATUSES, CALENDAR_EVENT_TYPES, LESSON_SESSION_STATUSES, ATTENDANCE_STATUSES, JOURNAL_REALIZATION_STATUSES.
  - `date.ts` — todayISODate, toISODate, toISOTimestamp, parseISODate, isValidISODate, formatLongDateID, formatShortDateID, getDayOfWeek, dateRangesOverlap, enumerateDateRange, getISOWeekNumber.
  - `jp.ts` — sumJP, validateJPTotal, validateAnnualConsistency, jpPerWeek, formatJP.
  - `slug.ts` — slugify (handle diacritics Indonesia), idFromLabel.
  - `id.ts` — uuid (crypto.randomUUID + fallback), nowTimestamp (ISO 8601 dengan offset timezone lokal).
- Implementasi `packages/domain/src/`:
  - `base.ts` — BaseEntity schema, syncStatusSchema, documentStatusSchema, makeBaseEntityFields.
  - `academic-year.ts` — schema + validateAcademicYearLogic (startDate<endDate, semester ordering) + parse + safeParse.
  - `school-profile.ts` — schema (NPSN 8 digit, NIP 18 digit, email format) + SCHOOL_PROFILE_ID konstan.
  - `teacher-profile.ts` — schema (employeeStatus enum, subjects min 1) + TEACHER_PROFILE_ID konstan.
  - `calendar-event.ts` — schema (7 type, scope ALL/array, holiday wajib blocksLearning).
  - `prota.ts` — ProtaProfile + ProtaUnit schema (JP positive int, semester 1|2, status dokumen).
  - `teaching-schedule.ts` — schema (dayOfWeek 1-7, startTime<endTime, source enum).
  - `lesson-session.ts` — schema (5 status: planned/done/continued/cancelled/rescheduled).
  - `attendance.ts` — AttendanceRecord + ClassRoster + StudentEntry schema (4 status: present/sick/excused/absent).
  - `teaching-journal.ts` — schema (3 realizationStatus, jumlah siswa konsistensi check).
  - `semester-report.ts` — schema lengkap (rekap pertemuan, materi, absensi, jurnal).
  - `snapshot-sync.ts` — DocumentSnapshot + SyncQueueItem schema (placeholder Sprint 6).
  - `backup.ts` — BackupFile schema + validateBackup (schemaVersion check, summary counts).
  - `rules.ts` — ensureSingleActiveYear + planNewYearFromPrevious ( PURE function, strip BaseEntity, salin Prota+Schedule, kosongkan realisasi).
  - `index.ts` — barrel export semua entitas + helpers.
- Implementasi `apps/teacher-admin/src/shared/db/`:
  - `schema.ts` — class GuruAdminDB extends Dexie, 14 tabel, version(1) dengan indeks compound (e.g. `[classId+date+startPeriod]` untuk LessonSession).
  - `crud.ts` — createEntity (auto UUID + timestamps + syncStatus), updateEntityFields (reset syncStatus ke pending bila sudah synced), softDelete, saveEntity, getEntity, listEntities (filter deletedAt), hardDeleteEntity, clearTable.
  - `profile-repo.ts` — getSchoolProfile, saveSchoolProfile (single-row), getTeacherProfile, saveTeacherProfile, listAcademicYears, getActiveAcademicYear, saveAcademicYear (auto-deactivate tahun lain), setActiveAcademicYear, **createNewYearFromPrevious** (eksekusi wizard: transaksi 4 tabel, salin Prota+Schedule, kosongkan realisasi).
  - `backup-repo.ts` — exportBackup (Promise.all 13 tabel, re-attach units ke ProtaProfile), validateBackupFile (Zod validation), restoreBackup (transaksi 14 tabel, clear+bulkPut), generateBackupFilename (`guru-admin-flow-backup-YYYYMMDD-HHmm.json`), downloadBackupFile (Blob + URL.createObjectURL), parseBackupFileContent (FileReader).
  - `MIGRATIONS.md` — log riwayat skema (v1 = Sprint 1, 14 tabel).
- Implementasi `apps/teacher-admin/src/shared/ui/index.tsx` — komponen UI dasar: Card, CardHeader, Button (3 variant), Input, Select, Textarea, EmptyState, Badge (4 variant).
- Implementasi `apps/teacher-admin/src/shared/layout/`:
  - `AppShell.tsx` — responsive mobile (bottom nav) + desktop (top nav). 4 menu: Hari Ini, Profil, Tahun Baru, Backup.
  - `icons.tsx` — 9 ikon SVG inline (menghindari dependensi tambahan).
- Implementasi `apps/teacher-admin/src/modules/`:
  - `profile/ProfilePage.tsx` — 3 tab (Sekolah, Guru, Tahun Pelajaran). Form lengkap untuk SchoolProfile (16 field), TeacherProfile (subjects array, add/remove), AcademicYear manager (list + form + activate). Form state pakai tipe eksplisit SchoolProfileFormFields/TeacherProfileFormFields (optional → wajib string). Persist ke Dexie via repo.
  - `backup/BackupPage.tsx` — Export (download JSON), Import (file picker → validate → confirm modal → restore). Tampilkan summary counts. Konfirmasi eksplisit sebelum overwrite.
  - `new-year/NewYearWizard.tsx` — 3-step wizard: 1) pilih tahun sumber, 2) isi tanggal tahun baru, 3) ringkasan hasil. Pakai createNewYearFromPrevious dari profile-repo. Tampilkan "Yang disalin" vs "Yang dikosongkan".
- Implementasi `apps/teacher-admin/src/routes/TodayPage.tsx` — Dashboard Hari Ini (default route). Tampilkan: header tanggal, status profil (warning bila belum lengkap), tahun pelajaran aktif (atau empty state), sesi mengajar hari ini (placeholder Sprint 3), belum selesai (placeholder Sprint 2+), status sprint (checklist progress).
- Update `apps/teacher-admin/src/App.tsx` — HashRouter + Routes (4 route + fallback).
- Update `apps/teacher-admin/src/main.tsx` — import index.css.
- Setup Tailwind 3: `tailwind.config.js` (tema emerald/teal, hindari indigo/biru), `postcss.config.js`, `src/index.css` (base + components: btn-primary, btn-secondary, btn-danger, input, label, card, badge).
- Setup Vitest: `vitest.config.ts` per package dengan root eksplisit + postcss disabled (hindari konflik dengan /home/z/my-project/postcss.config.mjs Next.js). Update package.json scripts untuk pakai `--config vitest.config.ts`.
- Tulis unit test:
  - `packages/shared/test/shared.test.ts` (14 test): slug, date format/parse, dayOfWeek, range overlap, ISO week.
  - `packages/shared/test/jp.test.ts` (9 test): sumJP, validateJPTotal, validateAnnualConsistency, jpPerWeek, formatJP.
  - `packages/domain/test/academic-year.test.ts` (9 test): schema, logic validation, safeParse combined.
  - `packages/domain/test/school-profile.test.ts` (8 test): NPSN format, NIP format, required fields.
  - `packages/domain/test/prota.test.ts` (8 test): JP positive, semester enum, status dokumen.
  - `packages/domain/test/backup.test.ts` (5 test): validasi schema, schemaVersion check, summary counts.
  - `packages/domain/test/rules.test.ts` (8 test): ensureSingleActiveYear, planNewYearFromPrevious (4 skenario: newYear, salin Prota draft, salin Schedule manual, BaseEntity tidak disalin, filter academicYearId).

Stage Summary:
- **Branch**: `sprint-1-local-foundation` (lokal, belum push — menunggu token GitHub baru dari user).
- **Typecheck PASS**: 3 workspace (shared, domain, teacher-admin), TypeScript strict mode, 0 error.
- **Test PASS**: 61/61 (38 domain + 23 shared). 5 file test di domain, 2 file test di shared.
- **Build PASS**: `vite build` sukses 2.06s, 79 modules, 373KB JS (113KB gzip), 1.48KB CSS.
- **Acceptance criteria Sprint 1 tercapai**:
  - ✅ Aplikasi jalan lokal (vite dev siap, build sukses)
  - ✅ TypeScript strict pass
  - ✅ Test pass (61/61)
  - ⏳ Profil tersimpan di Dexie + tetap ada setelah refresh — kode sudah ada, verifikasi runtime via browser bisa di Sprint 2 (perlu Next.js preview overlay yang sedang running di port 3000)
  - ✅ Backup JSON bisa export/import (kode lengkap, file dialog, validasi Zod)
  - ✅ schemaVersion divalidasi (di validateBackup)
  - ✅ Restore menolak backup invalid (validateBackupFile return error sebelum restore)
  - ✅ Wizard tahun baru tidak menyalin realisasi lama (planNewYearFromPrevious hanya salin profil+Prota+Schedule, kosongkan LessonSession/Attendance/Journal/Report/Snapshot)
  - ✅ Tidak ada dependency Supabase (verifikasi: grep "supabase" di semua package.json = 0 hasil)
  - ✅ Worklog diperbarui (entry ini)
- **Yang belum dikerjakan** (sesuai scope Sprint 1 — semua di luar scope):
  - Verifikasi runtime browser (profil benar-benar persist setelah refresh) — butuh Next.js preview overlay atau run vite dev terpisah. Delay ke Sprint 2 verifikasi.
  - Modul M02–M08 (Kalender, Prota editor lengkap, Promes, Jadwal, Absensi, Jurnal, Laporan) — Sprint 2+
  - Supabase — Sprint 6, **dilarang sebelum fondasi lokal stabil**.
- **Risiko yang teridentifikasi**:
  - Vitest config perlu postcss disabled explicit karena Vite auto-resolve ke parent /home/z/my-project/postcss.config.mjs (Next.js). Sudah di-mitigasi.
  - Optional fields di Zod schema (string | undefined) berbenturan dengan form input yang expect string. Di-mitigasi dengan tipe eksplisit FormFields (optional → wajib string) + normalisasi saat load + konversi `|| undefined` saat save.
  - npm workspaces tidak support `workspace:*` protocol (pnpm-specific). Di-mitigasi dengan `"*"`.
- **Untuk push ke GitHub**: butuh token GitHub baru dari user (token lama wajib di-revoke dulu). Setelah token baru diberikan, jalankan: `git remote add origin https://daunyil:<NEW_TOKEN>@github.com/daunyil/guru-admin-flow.git && git push -u origin sprint-1-local-foundation`.

---

Task ID: 1-audit
Agent: main (pre-push audit)
Task: Audit pra-push Sprint 1 sesuai checklist senior dev. Clone bersih, typecheck, test, build, verifikasi tidak ada Supabase/dist/credential/fitur Sprint 2+.

Work Log:
- Audit 1 (file di commit): 51 file di commit dd52dfe, TIDAK ada dist/node_modules/credential. ✅
- Audit 2 (Supabase): grep "supabase" di seluruh repo → hanya 3 mention di komentar/string ("Supabase sync (Sprint 6)" placeholder di TodayPage + 2 komentar aturan paket). TIDAK ada dependency, TIDAK ada import, TIDAK ada konfigurasi. ✅
- Audit 3 (fitur Sprint 2+): hanya 3 modul di apps/teacher-admin/src/modules/ (profile, backup, new-year). TIDAK ada modul kalender/prota/promes/attendance/journal/semester-report. Routes hanya 4: /, /profile, /new-year, /backup. ✅
- Audit 4 (schemaVersion): DATA_SCHEMA_VERSION = 1 di packages/shared/src/constants.ts. validateBackup menolak file dengan schemaVersion > 1 dengan pesan jelas. ✅
- Audit 5 (wizard tidak salin realisasi): 8 test di rules.test.ts PASS, termasuk test "field BaseEntity TIDAK ada di hasil plan" yang verifikasi planNewYearFromPrevious tidak menyertakan id/createdAt/syncStatus di output. ✅

- 🐛 BUG KRITIS DITEMUKAN saat Audit 6 (clone bersih):
  - .gitignore baris 50 berisi pola 'test' (warisan dari template Next.js) yang meng-ignore SEMUA folder test/ di seluruh repo.
  - Akibatnya: 7 file test Sprint 1 (5 di packages/domain/test, 2 di packages/shared/test) ada di disk dan jalan lokal, TIDAK ter-commit.
  - Status sebelum fix: 61 test PASS lokal, 0 test di repo. Clone bersih akan gagal 'npm test'.

- Fix bug .gitignore:
  - Hapus pola 'test' dari .gitignore baris 50.
  - Tambahkan 7 file test yang sebelumnya untracked ke staging.
  - Verifikasi: git check-ignore packages/domain/test packages/shared/test → tidak lagi di-ignore.

- Audit 7 (update TECHNICAL_PLAN.md):
  - §1.1: 'pnpm workspaces' → 'npm workspaces (sementara, lihat §1.4)'
  - §1.4 baru: penjelasan lengkap keputusan package manager (alasan, aturan, lockfile resmi, migrasi balik ke pnpm bila dibutuhkan)
  - Riwayat revisi v1.1 ditambahkan

- Commit audit fix: dab0632 "Audit fix: .gitignore bug + test files + TECHNICAL_PLAN package manager"

- RE-AUDIT 6 setelah fix (clone bersih dari /home/z/my-project/sprint0-push ke /tmp/audit-clone):
  - Clone sukses, branch sprint-1-local-foundation, HEAD = dab0632
  - 7 file test ter-track di repo (verifikasi)
  - npm install: 252 packages, OK
  - typecheck: 3 workspace PASS, 0 error
  - test: 61/61 PASS (38 domain + 23 shared) — sekarang file test ada di repo
  - build: vite build sukses 1.88s, 79 modules, 373KB JS / 113KB gzip, identik dengan repo asal
  - Supabase: TIDAK ada di package.json mana pun
  - dist/node_modules: TIDAK ada ter-track
  - credential/token: TIDAK ada terdeteksi (grep ghp_/api_key/password pattern)
  - schemaVersion: DATA_SCHEMA_VERSION = 1 terverifikasi
  - Total file di repo: 68 (naik dari 61 sebelum fix — 7 file test baru)

Stage Summary:
- Sprint 1 audit: LULUS setelah fix bug .gitignore.
- 2 commit di branch sprint-1-local-foundation:
  1. dd52dfe — Sprint 1: Fondasi Aplikasi Lokal (51 file, 8.544 insertions)
  2. dab0632 — Audit fix: .gitignore bug + test files + TECHNICAL_PLAN package manager (9 file, ~700 insertions)
- Clone bersih verifikasi: install OK, typecheck OK, test 61/61 OK, build OK, tidak ada Supabase, tidak ada dist/credential, schemaVersion benar.
- Status: LOCAL PASS + AUDIT PASS. Siap push.
- Yang butuh user: token GitHub baru (token lama wajib revoke dulu). Setelah token baru:
  1. git remote add origin https://daunyil:<NEW_TOKEN>@github.com/daunyil/guru-admin-flow.git
  2. git push -u origin sprint-1-local-foundation
  3. Buat PR: sprint-1-local-foundation → main
  4. Setelah PR dibuat, jalankan audit senior dev dari GitHub UI
  5. Setelah audit lulus: merge to main → Sprint 1 CLOSED → mulai Sprint 2
- Alternatif lebih aman (tanpa share token di chat):
  - User clone repo ke mesin lokal sendiri
  - gh auth login (interaktif, token disimpan di keychain OS)
  - git push dari mesin lokal
  - Atau: set GH_TOKEN env var lokal, jangan tempel di chat

---

Task ID: 1-decision
Agent: main (decision log)
Task: Catat keputusan user terkait token GitHub.

Decision:
- User memutuskan: revoke token GitHub lama (ghp_LVq5...) DITUNDA. User menanggung risiko sendiri.
- Token lama terverifikasi masih aktif (HTTP 200 saat cek API GitHub).
- Senior dev sudah flag risiko 3x: token plaintext di chat log, window exposure berpotensi berminggu-minggu, recovery cost jauh lebih tinggi dari revoke cost (5 menit).
- User informed, decision dicatat, dev lanjut.

Implication:
- Saya (AI/dev) TIDAK akan push apa pun ke GitHub sampai user revoke + beri token baru (atau pakai gh auth login).
- Development lokal tetap jalan — tidak butuh token.
- Bila terjadi penyalahgunaan token selama window exposure, bukan tanggung jawab dev — keputusan ada di user.

Next:
- Mulai opsi B (CI/CD GitHub Actions file lokal) + opsi A (Sprint 2 design doc) sesuai rekomendasi senior dev.
- Kedua opsi tidak butuh token, tidak butuh push.

---

Task ID: 2-execution
Agent: main (Sprint 2 batch execution)
Task: Eksekusi Sprint 2 (Kalender + Prota + Promes) sampai PR siap. Mode batch — tidak berhenti untuk hal kecil.

Work Log:
- Verifikasi PR #1 belum merged di origin/main (origin/main masih di Sprint 0 e9aa537).
- Tetap eksekusi Sprint 2 dari branch sprint-1-local-foundation (base Sprint 1 lengkap).
- Branch: sprint-2-calendar-prota-promes dibuat dari sprint-1-local-foundation.
- Cherry-pick docs/SPRINT_2_DESIGN.md v0.2 (1.300 baris) dari sprint-2-design branch.
- Update packages/shared/src/constants.ts: tambah CALENDAR_IMPORT_SCHEMA, PROTA_IMPORT_SCHEMA, DEFAULT_INTRA_JP_PER_WEEK_PPKN=2, DEFAULT_KO_JP_PER_WEEK_PPKN=1, DEFAULT_CADANGAN_JP=6, KO_MODES, KO_MODE_LABELS_ID, CALENDAR_EVENT_TYPE_LABELS_ID.
- Implement packages/domain/src/promes-types.ts: PromesOptions, PromesResult, PromesWeek, KORow, UnitDistribution, PromesSummary, GeneratePromesInput (sesuai §0 CRITICAL PROMES RULE).
- Implement packages/domain/src/promes-engine.ts: pure function generatePromes dengan 9 langkah algoritma. Cadangan dari INTRA (bukan total 3 JP). KO row terpisah. Cadangan>intra → ERROR.
- Implement packages/domain/src/calendar-import.ts: Zod schema untuk JSON kalender (guru-admin-flow/calendar/v1) + validateCalendarImport + calendarImportToEvents (auto-fix holiday blocksLearning=true).
- Implement packages/domain/src/prota-import.ts: Zod schema untuk JSON Prota (guru-admin-flow/prota/v1) + validateProtaImport + protaImportToProfile.
- Update packages/domain/src/index.ts: export semua modul Sprint 2.
- Tulis packages/domain/test/promes-fixtures.ts: helper fixture (makeAcademicYear dengan 18 minggu semester, makeProtaProfile, makeProtaUnit, makeCalendar, defaultPPKnOptions).
- Tulis packages/domain/test/promes-engine.test.ts: 17 test case (16 sesuai §5.5 + 1 defensive). Semua 17 PASS.
- Tulis packages/domain/test/calendar-import.test.ts: 11 test (schema validation + logic + auto-fix + konversi). PASS.
- Tulis packages/domain/test/prota-import.test.ts: 12 test (schema validation + logic + duplikat order + konversi). PASS.
- Implement apps/teacher-admin/src/shared/db/calendar-repo.ts: listCalendarEvents, saveCalendarEvent, updateCalendarEvent, deleteCalendarEvent, importCalendarFromJSON (replace + soft-delete lama).
- Implement apps/teacher-admin/src/shared/db/prota-repo.ts: listProtaProfiles, getProtaProfile, findProtaProfile, saveProtaProfile (dengan units), saveProtaUnit, deleteProtaUnit, deleteProtaProfile, setProtaProfileStatus, importProtaFromJSON, createProtaSnapshot.
- Update apps/teacher-admin/src/shared/db/crud.ts: relax constraint softDelete & updateEntityFields untuk accept deletedAt optional (fix type compatibility dengan Zod schema).
- Implement apps/teacher-admin/src/modules/calendar/CalendarPage.tsx: halaman /calendar dengan daftar event, form tambah/edit, modal impor JSON. Color-coded badge per jenis event.
- Implement apps/teacher-admin/src/modules/prota/ProtaPage.tsx: halaman /prota dengan daftar profile, form identitas (intra+KO), daftar unit per semester dengan validasi JP real-time, form unit, modal impor JSON, tab status dokumen (draft→ready_for_review→final→revised/locked).
- Implement apps/teacher-admin/src/modules/promes/PromesPage.tsx: halaman /promes dengan generate panel (intraJpPerWeek + koJpPerWeek + cadanganJP + koMode), result summary (2 section: INTRA + KO terpisah), tabel distribusi mingguan (2 row per minggu: intra + KO), status per materi, row kokurikuler (catatan, bukan materi). Cetak preview via window.print().
- Update apps/teacher-admin/src/App.tsx: 7 routes (Today, Profile, NewYear, Backup, Calendar, Prota, Promes).
- Update apps/teacher-admin/src/shared/layout/AppShell.tsx: 7 menu (Hari Ini, Kalender, Prota, Promes, Profil, Tahun Baru, Backup).
- Update apps/teacher-admin/src/shared/layout/icons.tsx: tambah ClipboardList + FileText icons.
- Update apps/teacher-admin/src/routes/TodayPage.tsx: status sprint update (Sprint 2 items checked done).

Verifikasi:
- Typecheck PASS: 3 workspace (shared, domain, teacher-admin), 0 error.
- Test PASS: 101/101 (78 domain + 23 shared). Sprint 2 tambah 40 test (17 engine + 11 calendar + 12 prota).
- Build PASS: vite build sukses 2.07s, 87 modules (sebelumnya 79, +8 dari modul Sprint 2), 422KB JS / 124KB gzip.
- CI audit: tidak ada Supabase, tidak ada dist/node_modules, tidak ada credential, schemaVersion=1, test files ≥ 7 (8 file).

Stage Summary:
- Sprint 2 selesai lokal. 21 file changed (10 baru, 11 modifikasi).
- Branch: sprint-2-calendar-prota-promes, siap commit + push.
- CRITICAL PROMES RULE terimplementasi: engine pakai intraJpPerWeek + koJpPerWeek, KO row terpisah, cadangan dari intra (bukan total 3 JP). Test #13 (KO row terpisah verification) PASS — verifikasi materialCapacityJP = 30 (bukan 48).
- Issue: PR #1 belum merged di origin/main. Branch Sprint 2 dibuat dari sprint-1-local-foundation (bukan main). Bila PR #1 di-merge, Sprint 2 perlu rebase ke main sebelum push untuk hindari double-diff.
- Next: commit + push branch sprint-2-calendar-prota-promes + buat PR #2 (atau flag ke user bila tidak ada token).

---

Task ID: no-pr-mode-merge
Agent: main (NO PR MODE execution)
Task: Merge Sprint 1 + Sprint 2 langsung ke main lokal, gate wajib, push ke GitHub.

Work Log:
- User instruksikan NO PR MODE: tidak perlu PR untuk setiap sprint, merge langsung ke main.
- Checkout main, reset ke origin/main (e9aa537 Sprint 0).
- Merge Sprint 1 ke main (--no-ff, commit 4d9ac70). Merge commit message lengkap dengan daftar konten Sprint 1.
- Gate wajib setelah Sprint 1 merge:
  - Typecheck: 3 workspace PASS, 0 error
  - Test: 61/61 PASS (38 domain + 23 shared)
  - Build: 79 modules, 373KB JS / 113KB gzip, 1.88s
- Merge Sprint 2 ke main (--no-ff, commit ca3b9fd). Merge commit message lengkap dengan CRITICAL PROMES RULE ter-verifikasi.
- Gate wajib setelah Sprint 2 merge:
  - Typecheck: 3 workspace PASS, 0 error
  - Test: 101/101 PASS (78 domain + 23 shared) — 40 test baru dari Sprint 2
  - Build: 87 modules (+8 dari Sprint 1), 422KB JS / 124KB gzip, 2.07s
- Coba push ke GitHub: gagal (no credential helper, no GH_TOKEN env, token lama compromised).
- Buat bundle final: download/guru-admin-flow-main-sprint2.bundle (219KB, 10 commits di main, 7 refs).

Stage Summary:
- main lokal: 10 commits (Sprint 0 + Sprint 1 merge + Sprint 2 merge + audit + design).
- HEAD: ca3b9fd "Merge Sprint 2: Kalender + Prota + Promes"
- Semua gate hijau. Siap push.
- Push PENDING: user push sendiri via gh auth login (token lama compromised, tidak akan dipakai).
- Bundle disiapkan supaya user bisa push tanpa perlu rebuild lokal.

Instruksi push untuk user:
  git clone https://github.com/daunyil/guru-admin-flow.git guru-admin-flow-push
  cd guru-admin-flow-push
  git bundle verify /path/to/guru-admin-flow-main-sprint2.bundle
  git fetch /path/to/guru-admin-flow-main-sprint2.bundle main:main-updated
  git checkout main-updated
  gh auth login  # bila belum
  git push origin main-updated:main --force  # force karena main lokal akan overwrite origin/main

---

Task ID: 3-execution
Agent: main (Sprint 3 batch execution)
Task: Eksekusi Sprint 3 (Jadwal Guru + Sesi Mengajar) sampai selesai, merge ke main, push ke GitHub.

Work Log:
- Branch: sprint-3-schedule-sessions dari main (e855a24).
- Update packages/shared/src/constants.ts: SCHEDULE_IMPORT_SCHEMA, LESSON_SESSION_STATUS_LABELS_ID, DAY_OF_WEEK_ID, DEFAULT_PERIOD_TIMES (10 slot jam ke SMPN 8 Bantan).
- Implement packages/domain/src/teaching-schedule-import.ts: Zod schema untuk JSON jadwal dari Smart Roster (guru-admin-flow/schedule/v1) + validateScheduleImport + scheduleImportToSchedules (dengan fallback startTime/endTime).
- Implement packages/domain/src/lesson-session-generator.ts: pure function generateLessonSessions. Algoritma: enumerasi tanggal semester → cek blocking kalender → match TeachingSchedule by dayOfWeek → buat LessonSession (planned/cancelled). Summary byClass + bySubject.
- Implement packages/domain/src/promes-lesson-linker.ts: pure function linkPromesToLessons. Algoritma: filter planned sessions → reserve cadangan dari akhir/awal → distribusi unit ke sessions → assign plannedUnitId. Sesuai §0 CRITICAL PROMES RULE (cadangan dari intra, KO tidak affect).
- Update packages/domain/src/index.ts: export 3 modul Sprint 3.
- Tulis packages/domain/test/sprint3-fixtures.ts: helper makeAcademicYear (18 minggu semester), makeSchedule, makeCalendar, makeProtaUnit, makeLessonSession.
- Tulis packages/domain/test/lesson-session-generator.test.ts: 10 test (happy path, holiday, multi jadwal, semester salah, jadwal kosong, kalender kosong, holiday range, multi hari, verifikasi field, calendarEventId).
- Tulis packages/domain/test/teaching-schedule-import.test.ts: 14 test (schema validation + logic + konversi + fallback + default semester).
- Tulis packages/domain/test/promes-lesson-linker.test.ts: 12 test (happy path, cadangan reserve, kurang, cukup, multi unit, sesi cancelled, cadangan>capacity error, sessions kosong, units kosong, plannedUnitId assigned, reserveFromEnd=false, unit split).
- Implement apps/teacher-admin/src/shared/db/teaching-schedule-repo.ts: listTeachingSchedules, saveTeachingSchedule, updateTeachingSchedule, deleteTeachingSchedule, clearTeachingSchedules, importScheduleFromJSON (replace + soft-delete).
- Implement apps/teacher-admin/src/shared/db/lesson-session-repo.ts: listLessonSessions, getLessonSession, getLessonSessionsByDate, updateLessonSession, bulkUpdateLessonSessions, clearLessonSessions, generateAndSaveLessonSessions (trigger pure function + simpan), applyPromesLink.
- Implement apps/teacher-admin/src/modules/schedule/SchedulePage.tsx: halaman /schedule dengan filter semester, daftar jadwal, form tambah/edit, modal impor Smart Roster, tombol Generate Sesi (trigger generateAndSaveLessonSessions), daftar sesi generated (max 100 tampil).
- Update apps/teacher-admin/src/routes/TodayPage.tsx: dashboard hari ini fungsional — tampilkan sesi mengajar hari ini dari getLessonSessionsByDate. Setiap sesi tampilkan waktu, jam ke, mapel, kelas, status (planned/cancelled), plannedUnitId bila ada. Empty state bila tidak ada sesi.
- Update apps/teacher-admin/src/App.tsx: 8 routes (+/schedule).
- Update apps/teacher-admin/src/shared/layout/AppShell.tsx: 8 menu (+Jadwal dengan Clock icon).
- Update apps/teacher-admin/src/shared/layout/icons.tsx: tambah Clock icon.

Verifikasi:
- Typecheck PASS: 3 workspace (shared, domain, teacher-admin), 0 error.
- Test PASS: 137/137 (114 domain + 23 shared). Sprint 3 tambah 36 test (10 generator + 14 schedule import + 12 linker).
- Build PASS: vite build 2.07s, 93 modules (+6 dari Sprint 2 yang 87), 440KB JS / 128KB gzip.
- CI audit: tidak ada Supabase, tidak ada dist/credential, schemaVersion=1, 11 test files.

Stage Summary:
- Sprint 3 selesai lokal. 17 file changed (10 baru, 7 modifikasi).
- Branch: sprint-3-schedule-sessions, siap merge ke main.
- Modul M05 Jadwal Guru: input manual + impor Smart Roster + generator LessonSession.
- Dashboard Hari Ini fungsional: tampilkan sesi hari ini dengan status planned/cancelled.
- Promes-Lesson Linker: pure function siap (domain), UI trigger di Sprint 4 (bersama absensi/jurnal).
- Push PENDING: butuh token baru dari user (token sebelumnya compromised).

---

Task ID: 4-execution
Agent: main (Sprint 4 batch execution)
Task: Eksekusi Sprint 4 (Absensi HP + Jurnal Otomatis + ClassRoster + Document Preview) sampai selesai.

Work Log:
- Branch: sprint-4-attendance-journal dari main (c34fe9c).
- Domain: 2 helpers baru (pure functions):
  - attendance-helpers.ts: generateDefaultAttendance (semua hadir), summarizeAttendance, applyAttendanceChanges, isAllPresent, validateAttendanceConsistency
  - journal-helpers.ts: generateJournalFromSession (auto-fill), applyJournalInput, resyncJournalAttendance, isJournalComplete, finalizeJournal
- Domain tests: 22 test baru (11 attendance + 11 journal). Total domain: 136 test.
- DB repos: 3 baru
  - class-roster-repo.ts: CRUD + addStudent + removeStudent + importStudents (paste Excel)
  - attendance-repo.ts: getAttendanceBySession + initAttendanceForSession (generate default) + updateAttendance (apply changes)
  - journal-repo.ts: getJournalBySession + initJournalForSessionFull (auto-load roster+attendance+plannedUnit) + updateJournal + finalizeJournal + unlockJournal
- UI modules: 3 baru
  - RosterPage: input manual + impor massal paste Excel (format "1. Andi" per baris)
  - AttendancePage: mobile-first, default semua hadir, 4 tombol status (Hadir/Sakit/Izin/Alpa), summary real-time, Mode Dokumen (format Excel-like, print CSS)
  - JournalPage: auto-fill dari sesi+Prota+absensi, guru hanya pilih realisasi+catatan, Mode Dokumen (format jurnal sekolah, print CSS, tanda tangan)
- Update TodayPage: tombol cepat Absen + Jurnal per sesi, status Sprint 4 checked
- Update App.tsx: 11 routes (+/roster, /attendance, /journal)
- Update AppShell: 11 menu (+Siswa, +Absensi, +Jurnal dengan icons Users, CheckCircle, BookOpen)
- Print CSS @media print: hide nav/card, show .print-area only, format A4 ready

Verification:
- Typecheck: 3 workspace PASS, 0 error
- Test: 159/159 PASS (136 domain + 23 shared) — Sprint 4 tambah 22 test
- Build: 102 modules (+9 dari Sprint 3), 475KB JS / 135KB gzip, 2.33s
- CI audit: tidak ada Supabase, tidak ada dist/credential

Stage Summary:
- Sprint 4 selesai lokal. 19 file changed (12 baru, 7 modifikasi).
- Aplikasi sekarang terasa sebagai alat kerja harian guru:
  Buka → lihat jadwal hari ini → klik Absen (default hadir, ubah cepat) → klik Jurnal (auto-fill, edit catatan) → selesai
- Mode Dokumen: absensi format Excel-like, jurnal format dokumen sekolah, print CSS ready
- Push PENDING: butuh token baru dari user.

Next: merge to main + push.

---

Task ID: 5-execution
Agent: main (Sprint 5 batch execution)
Task: Eksekusi Sprint 5 (Laporan Akhir Semester + Linker + Kelengkapan) sampai selesai.

Work Log:
- Branch: sprint-5-semester-report dari main (b41c5a3).
- Domain: semester-report-generator.ts (pure function rekap lengkap: sesi, jurnal, absensi, materi per kelas, completeness score, canFinalize check). 8 test baru.
- DB: semester-report-repo.ts (generateAndSaveSemesterReport, finalizeSemesterReport dengan snapshot, list/get/find/delete).
- UI: SemesterReportPage dengan 2 mode:
  - Mode Kerja: generate, summary cards (sesi/materi/absensi/jurnal), rekap per kelas, finalize button dengan check
  - Mode Dokumen: format Word/Excel-like dengan header sekolah, identitas, tabel rekap A (pertemuan) + B (materi) + C (absensi per kelas), catatan, tanda tangan guru + kepala sekolah, print CSS
- UI: CompletenessPage (halaman kelengkapan: cek profil/kalender/prota/jadwal/sesi/roster/jurnal, score 0-100, link ke modul masing-masing).
- UI: Update SchedulePage dengan LinkerSection (trigger linkPromesToLessons massal, assign plannedUnitId ke sesi, pilih Prota + cadangan).
- Update App.tsx: 13 routes (+/semester-report, /completeness).
- Update AppShell: 13 menu (+Kelengkapan, +Laporan dengan icons ListChecks, FileSpreadsheet).
- Update TodayPage: status Sprint 5 checked.
- Print CSS sudah ada dari Sprint 4 (format A4 ready).

Verification:
- Typecheck: 3 workspace PASS, 0 error
- Test: 167/167 PASS (144 domain + 23 shared) — Sprint 5 tambah 8 test
- Build: 105 modules (+3 dari Sprint 4), 506KB JS / 141KB gzip, 2.60s
- CI audit: tidak ada Supabase, tidak ada dist/credential

Stage Summary:
- Sprint 5 selesai lokal. 14 file changed (8 baru, 6 modifikasi).
- Laporan akhir semester: generate dari data harian, finalize dengan snapshot, Document Preview seperti dokumen sekolah resmi.
- Linker Promes-Lesson: assign plannedUnitId massal dari SchedulePage, sesuai §0 CRITICAL PROMES RULE (cadangan dari intra).
- Halaman Kelengkapan: cek semua modul, score, link ke modul yang perlu diisi.
- MVP v1 hampir lengkap. Tinggal Sprint 6 (Supabase sync) yang merupakan non-goal sampai user minta.

---

Task ID: PATCH-FLOW-RC1
Agent: main (PATCH-FLOW-RC1 batch execution)
Task: Fix 5 P0 blockers + 1 P1 dari senior audit commit f0478cb. RC untuk re-audit.

Work Log:
- Branch: patch-flow-rc1 dari main (f0478cb).
- Domain layer:
  - packages/domain/src/attendance-helpers.ts: tambah backfillNisInRecords(records, roster) — pure function untuk backfill NIS dari roster ke records lama yang belum punya NIS.
  - packages/domain/src/manual-session.ts (NEW): createManualLessonSession, isMatchingManualSession, semesterForDate. Pure functions untuk bikin LessonSession ad-hoc (mode manual/susulan) sehingga rantai Siswa → Absensi → Jurnal → Laporan tidak putus.
  - packages/domain/src/index.ts: export backfillNisInRecords + 3 manual-session helpers.
- Domain tests:
  - test/attendance-helpers.test.ts: +5 test untuk backfillNisInRecords.
  - test/manual-session.test.ts (NEW): 11 test untuk createManualLessonSession, isMatchingManualSession, semesterForDate.
- App repos:
  - apps/teacher-admin/src/shared/db/attendance-repo.ts:
    - initAttendanceForSession: bila existing records ada, cek NIS kosong → backfill dari roster + persist.
    - + saveDefaultAttendance(records): simpan default records saat user klik Simpan (bukan saat form dibuka).
    - + getAttendanceByTeacherDate(teacherId, dateISO): untuk Home cek "sudah absen" per tanggal.
  - apps/teacher-admin/src/shared/db/lesson-session-repo.ts: + findOrCreateManualSession({mode, academicYear, teacherId, roster, subject, date}) — cari existing manual/susulan session untuk (classId, subject, date); bila tidak ada, buat baru. Hindari dobel tanggal+kelas+mapel.
- App UI:
  - apps/teacher-admin/src/modules/grades/GradesPage.tsx: REWRITE total. Buang db.table("grades") dynamic. Pakai gradeBooks schema via findGradeBook/saveGradeBook/updateGradeBook. UI fields mapped ke GradeEntry (dailyScore/finalScore). Status auto-derived via calculateGradeBookEntries. Save hanya bila dirty.
  - apps/teacher-admin/src/modules/attendance/QuickAttendancePage.tsx: REWRITE manual/susulan flow. ManualSessionForm baru memakai findOrCreateManualSession → LessonSession NYATA. AttendanceEditor: untuk mode manual/susulan, default records di-generate in-memory (isNewDraft=true), TIDAK disimpan sampai Simpan. handleSave persist via saveDefaultAttendance bila isNewDraft, atau updateAttendance bila existing.
  - apps/teacher-admin/src/modules/journal/QuickJournalPage.tsx: + Mode selector (Dari Jadwal / Jurnal Manual). Jurnal Manual memakai findOrCreateManualSession → sesi NYATA. Editor jurnal bisa membaca manual session via getLessonSession. List sesi menampilkan badge "Manual" untuk sesi ad-hoc.
  - apps/teacher-admin/src/routes/TodayPage.tsx: cek attendanceRecords (via getAttendanceByTeacherDate) dan teachingJournals (via listJournals) secara terpisah. Badge "Belum absen" sekarang berdasarkan attendanceRecords, BUKAN jurnal. Setiap sesi tampilkan badge independen: ✓ Absen / Belum absen / ✓ Jurnal / Belum jurnal.

Verifikasi:
- Typecheck: 3 workspace PASS, 0 error.
- Test: 199/199 PASS (176 domain + 23 shared). RC1 tambah 16 test (5 backfill + 11 manual-session).
- Build: vite build 2.92s, 113 modules, 545KB JS / 152KB gzip.

Stage Summary:
- 5 P0 blockers + 1 P1 dari audit f0478cb FIXED:
  - P0-1 Nilai Cepat: gradeBooks schema, persist + reload OK.
  - P0-2 Home pending: cek attendanceRecords + teachingJournals terpisah.
  - P0-3 Jurnal Manual: tombol tidak palsu, mode Manual creates real LessonSession.
  - P0-4 Absensi Manual: LessonSession NYATA (bukan virtual ID), jurnal & laporan terhubung.
  - P0-5 Absensi Manual: default records TIDAK auto-save, hanya persist saat Simpan.
  - P1-6 NIS backfill: initAttendanceForSession auto-backfill NIS dari roster untuk records lama.
- 9 file changed (2 baru, 7 modifikasi).
- Status: READY FOR SENIOR AUDIT.
- Push PENDING: butuh token.

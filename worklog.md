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
- Menulis `docs/DATA_MODEL_DRAFT.md`: 11 entitas inti (AcademicYear, SchoolProfile, TeacherProfile, CalendarEvent, ProtaProfile+ProtaUnit digabung jadi 1 entitas ProtaProfile dengan units, TeachingSchedule, LessonSession, AttendanceRecord+ClassRoster+StudentEntry, TeachingJournal, SemesterReport) + 2 entitas pendukung (DocumentSnapshot, SyncQueueItem), konvensi umum (BaseEntity, SyncStatus, DocumentStatus, format tanggal, aturan ID), relasi antar entitas (diagram teks), aturan implementasi "Buat Tahun Baru dari Tahun Lalu", validasi lintas entitas, daftar entitas yang belum didefinisikan.
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

---
Task ID: RELEASE-V1-FINAL-LOCK
Agent: GPT-5.5 Thinking
Task: Mengunci Guru Admin Flow v1.0 sebagai stable baseline agar tidak perlu audit/coding berulang.

Work Log:
- Menetapkan baseline fungsional `MV-POLISH-FIXPACK-02` pada commit `411390d3da974a52efd6b5f59318a7d2f9b8b0cd` sebagai dasar release v1.0.
- Menaikkan metadata aplikasi `APP_VERSION` ke `1.0.0` tanpa mengubah `DATA_SCHEMA_VERSION`.
- Menaikkan versi package root dan app utama ke `1.0.0`.
- Memperbarui `README.md` dari status lama v0.5.1 menjadi v1.0.0 Stable Baseline.
- Menambahkan `docs/RELEASE_V1_FINAL.md` sebagai dokumen release lock.
- Menambahkan `docs/OPERATIONS_GUIDE_V1.md` sebagai panduan operasional singkat.
- Menetapkan aturan pasca-release: hanya hotfix bug nyata P0/P1/P2; UI kosmetik, bundle size, cloud sync, integrasi Apps Script, dan fitur baru ditunda.

Stage Summary:
- Guru Admin Flow v1.0 dikunci sebagai stable baseline untuk pemakaian harian.
- Tidak ada perubahan schema data; `DATA_SCHEMA_VERSION` tetap 7.
- Tidak ada fitur baru ditambahkan pada release lock.
- Dokumen release dan panduan operasional sudah tersedia untuk handover.

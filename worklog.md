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

---

Task ID: PIKET-QUICK-INPUT-LIST-02B
Agent: main (sprint owner)
Task: Polish form input Piket menjadi list-based smart search. Cari siswa → kelas otomatis mengikuti siswa. Cari pelanggaran → poin otomatis tampil. Simpan catatan. Bukan wizard, bukan chip kecil berantakan.

Work Log:
- Fetch origin main ke local sprint0-push (local sebelumnya di f2ccc3d, remote di 1741087 — fast-forward 12 sprint).
- Baca DailyDutyPage.tsx (catat tab lama: Select kelas + Select siswa + chip kecil jenis catatan + Textarea + Simpan), daily-duty.ts (domain), daily-duty-repo.ts, daily-duty.test.ts (27 test lama).
- Tambah helper di packages/domain/src/daily-duty.ts:
  - normalizeSearchText(): lowercase + NFD + hapus diakritik (\p{Diacritic}) + collapse whitespace + trim
  - matchSmartSearch(): tiap kata query (split " ") harus include di target (case-insensitive via normalize)
  - DUTY_RULE_SEARCH_KEYWORDS: Record<DutyRecordType, string[]> — sinonim per type (late: terlambat/telat/lambat; absent_without_notice: alpa/absen/tidak hadir/tidak masuk; incomplete_uniform: seragam/atribut/baju/topi/dasi/sepatu; class_disruption: ribut/gaduh/mengganggu; fight: berkelahi/kelahi/berantem/pukul; dll)
  - makeRuleSearchTarget(rule): gabungan label + category + type + points + keywords
  - searchDutyRules(rules, query): filter rule pakai matchSmartSearch
  - StudentSearchable interface: { id, name, number?, nis?, nisn?, classId, classLabel }
  - makeStudentSearchTarget(student): gabungan name + number + nis + nisn + classLabel
  - searchStudents<T extends StudentSearchable>(students, query): filter siswa
  - validateDutyRecordInput({ selectedStudent, selectedRule, note }): { ok: true } | { ok: false, message }
- Export helper baru dari packages/domain/src/index.ts.
- Tambah 27 test di packages/domain/test/daily-duty.test.ts dalam 4 describe block:
  - "Search siswa cerdas" (8 tests): case-insensitive, penggalan, nama tengah/belakang, beberapa kata "muh st", nomor "18", class mengikuti siswa, query kosong, NIS
  - "Search pelanggaran cerdas" (8 tests): case-insensitive, "telat"→Terlambat, "seragam"→Atribut, "tidak masuk"→Alpa, "10"→aturan 10 poin, sinonim berkelahi/berantem/kelahi, "gaduh"→Ribut, query kosong
  - "Poin otomatis & validasi" (5 tests): poin dari DutyRule.points, Lainnya wajib catatan, siswa wajib, pelanggaran wajib, rule non-Lainnya tidak wajib catatan
  - "Helper primitives" (6 tests): normalizeSearchText diakritik, normalizeSearchText whitespace, matchSmartSearch semua kata, DUTY_RULE_SEARCH_KEYWORDS lengkap untuk 10 type, makeRuleSearchTarget gabungan, makeStudentSearchTarget gabungan (pakai normalizeSearchText untuk assertion)
- Refactor DailyDutyPage.tsx tab "Catat":
  - State baru: catatClassFilter ("all" | classId), studentQuery, ruleQuery, selectedStudent (StudentSearchable | null), selectedRule (DutyRule | null). Catatan/tindakLanjut tetap.
  - State riwayat dipecah jadi riwayatClassId/riwayatStudentId (tidak ikut dirombak — out of scope).
  - allStudents = useMemo flatMap rosters → StudentSearchable[] (classId/classLabel dari roster siswa, bukan filter)
  - filteredStudents = useMemo searchStudents(byClass, studentQuery)
  - filteredRules = useMemo searchDutyRules(rules, ruleQuery)
  - handleCatat pakai validateDutyRecordInput, lalu addDutyRecord dengan classId/classLabel dari selectedStudent, points dari selectedRule
  - UI: filter kelas (chips Semua + rosters), search siswa (input + list 50 max dengan overflow hint), search pelanggaran (input + list), ringkasan (selectedStudent.name + classLabel, selectedRule.label + points), Textarea catatan (label dinamis: wajib untuk Lainnya), Textarea tindak lanjut, Button Simpan
  - Klik siswa reset pelanggaran + catatan (poin tergantung rule, harus konsisten)
  - Helper categoryLabel(category) → label Bahasa Indonesia (Kehadiran, Kedisiplinan, Kesehatan, Izin, Lainnya)
- Run gates di sprint0-push:
  - typecheck PASS (3 workspaces)
  - test PASS (559 tests, +27 baru untuk 02B)
  - build PASS (1,116 KB JS, 36 KB CSS — same as before, code-split deferred per non-goals)
- Commit ad0a911, push ke origin/main (1741087..ad0a911).

Stage Summary:
- Input Piket tidak lagi berupa chip kecil berantakan. Sekarang list-based smart search.
- Guru bisa mencari siswa dari semua kelas (filter kelas "Semua") atau persempit per kelas.
- Kelas otomatis mengikuti siswa: classId/classLabel di DutyRecord mengikuti roster siswa, BUKAN filter dropdown.
- Search siswa cerdas: case-insensitive, penggalan, nama tengah/belakang, beberapa kata ("muh st"), nomor siswa ("18"), NIS.
- Search pelanggaran cerdas: case-insensitive, sinonim ("telat"→Terlambat, "seragam"→Atribut, "tidak masuk"→Alpa, "berantem"→Berkelahi, "gaduh"→Ribut), bisa cari by poin ("10").
- Poin pelanggaran otomatis dari DutyRule.points. Tidak diketik manual.
- Ringkasan sebelum simpan: nama siswa + kelas + label pelanggaran + poin.
- Validasi terpusat di domain (validateDutyRecordInput): siswa wajib, pelanggaran wajib, "Lainnya" wajib catatan.
- Simpan tetap menghasilkan DutyRecord manual (source="manual", attendanceLinkType=null). Tidak ada perubahan schema database.
- Riwayat tab tidak dirombak (tetap Select-based — out of scope sprint ini).
- Schema Dexie TIDAK berubah. Tidak ada migrasi.
- File changed: 4 files, +681/-45 lines.
- Test count: 532 (lama) + 27 (baru) = 559 PASS.
- Commit: ad0a911 (pushed to origin/main).
- READY FOR SENIOR AUDIT.

---

Task ID: JOURNAL-REVIEW-NARRATIVE-03
Agent: main (sprint owner)
Task: Polish Jurnal Mengajar. (1) Review sebelum final — tombol final terkunci sampai review dibuka. (2) Narasi jurnal lebih mengalir — bukan chip mentah. (3) Mode Jurnal Manual dipindah ke Opsi Darurat. (4) Date Guard saat sedang mengisi draft. Tidak ada perubahan schema besar.

Work Log:
- Fetch origin main (ada commit baru 41c5721 fix(auth): persist Supabase login session on mobile — dari push Bapak/agent lain).
- Baca QuickJournalPage.tsx (874 baris, ada QuickJournalEditor di file yang sama), journal-helpers.ts, journal-helpers.test.ts.
- Buat packages/domain/src/journal-narrative.ts (NEW):
  - buildJournalNarrative(input): pure function, ubah input terstruktur → 3 narasi (activityNarrative, noteNarrative, followUpNarrative). Pattern: "Pembelajaran membahas <material> melalui <activities> untuk membantu siswa memahami materi." + "Siswa mengikuti kegiatan dengan <response>. Secara umum pembelajaran berjalan baik, namun <obstacle>." + "Tindak lanjut dilakukan melalui <followUp> pada pertemuan berikutnya." Bila input kosong → kalimat default aman.
  - joinActivities: 1='x', 2='x dan y', 3+='x, y, dan z'.
  - canFinalizeJournal({material, activities, reviewOpened}): validasi terpusat. Materi wajib, kegiatan wajib, review wajib dibuka. Return {ok:true} atau {ok:false,message}.
  - dateChangeRequiresConfirm({hasActiveDraft, isFinal}): Date Guard helper. true bila ada draft aktif atau jurnal final.
  - packStructuredNote / unpackStructuredNote: simpan {activities, studentResponse, obstacle, freeNote} sebagai JSON di field `note` yang sudah ada. Format: {"__v":1,...}. Backward compat: note lama plain text → unpack sebagai freeNote. Schema TIDAK berubah.
  - Constants: JOURNAL_ACTIVITY_CHOICES (7), JOURNAL_RESPONSE_CHOICES (5), JOURNAL_OBSTACLE_CHOICES (4), JOURNAL_FOLLOWUP_CHOICES (5).
- Export dari packages/domain/src/index.ts.
- Buat packages/domain/test/journal-narrative.test.ts (NEW): 26 tests dalam 4 describe block.
  - buildJournalNarrative wajib (12 tests)
  - Narasi berkualitas (3 tests)
  - Quick choices constants (4 tests)
  - canFinalizeJournal UI logic (7 tests): review wajib, materi wajib, kegiatan wajib, input berubah → review reset, default mode bukan manual, date change konfirmasi, final tidak bisa edit.
- Refactor QuickJournalPage.tsx (+335/-63 baris):
  - Mode selector: primary = Hari Ini + Jurnal Susulan. "Jurnal Manual" dipindah ke "Opsi Lainnya / Darurat" (collapsible, label jadi "Buat Jurnal di Luar Jadwal", warning kuning mode darurat).
  - Date Guard: handleDateChange() bungkus setDate dengan konfirmasi bila selectedSessionId aktif. Pesan: "Mengganti tanggal akan menutup draft jurnal yang sedang diisi. Lanjutkan?"
  - QuickJournalEditor refactor:
    - State baru: reviewOpened, activities[], studentResponse, obstacle, freeNote. State lama `note` dihapus.
    - invalidateReview(): reset reviewOpened=false saat input berubah.
    - Wrapped setters (setActualMaterial, setActivitiesList, setResponse, setObstacleVal, setFreeNoteVal, setFollowUpVal, setRealization) panggil invalidateReview.
    - narrative = useMemo(buildJournalNarrative(...))
    - finalizeCheck = canFinalizeJournal(...) — tombol "Setujui & Finalkan" disabled bila !ok. Hint warning tampilkan alasan.
    - Tombol "Lihat Review" → setReviewOpened(true) + setShowDocument(true). Setelah review, tombol jadi "✓ Review Dibuka".
    - Input terstruktur: Materi (Input) + Kegiatan Pembelajaran (chip toggle brand) + Realisasi (Select) + Respons Siswa (chip toggle emerald) + Kendala (chip toggle amber) + Catatan Tambahan (Textarea) + Tindak Lanjut (chip toggle sky).
    - Chip disabled saat isLocked.
    - handleSaveDraft: pack structured note → JSON → simpan ke field `note`.
    - handleApproveAndFinalize: cek finalizeCheck → pack → save → finalize.
    - handleCopyPrevious: unpack note jurnal sebelumnya, isi structured state.
    - handleUnlock: reset reviewOpened=false.
    - Saat load: unpack journal.note ke structured state. Bila jurnal.locked, reviewOpened=true.
    - Preview/cetak: kolom Materi, Kegiatan Pembelajaran (=narrative.activityNarrative), Catatan/Respons Siswa (=narrative.noteNarrative), Tindak Lanjut (=narrative.followUpNarrative). Bukan chip mentah.
    - Badge "✓ Review dibuka" muncul saat reviewOpened && !isLocked.
    - Label "Manual" di header diganti "Darurat".
- Run gates:
  - typecheck PASS (3 workspaces)
  - test PASS (585 tests, +26 baru untuk JOURNAL-REVIEW-NARRATIVE-03)
  - build PASS (1,123 KB JS, 37 KB CSS)
- Commit 5d1be5c (rebase di atas 41c5721 dari remote), push ke origin/main (41c5721..5d1be5c).

Stage Summary:
- Guru bisa melihat review jurnal sebelum final (tombol "Lihat Review" → Mode Dokumen).
- Tombol "Setujui & Finalkan" terkunci sampai review dibuka. Hint warning tampilkan alasan.
- Bila isi jurnal berubah setelah review, reviewOpened kembali false (invalidateReview di semua setter).
- Hasil jurnal menjadi kalimat naratif yang rapi: "Pembelajaran membahas norma dalam kehidupan melalui diskusi, tanya jawab, dan latihan untuk membantu siswa memahami materi." Bukan chip mentah "diskusi, tanya jawab, latihan".
- Quick choices tetap tersedia untuk 5 field: Kegiatan (7 chip), Respons Siswa (5 chip), Kendala (4 chip), Tindak Lanjut (5 chip), plus Catatan Tambahan bebas.
- Mode Jurnal Manual dipindah ke "Opsi Lainnya / Darurat" — collapsible, label "Buat Jurnal di Luar Jadwal", warning kuning. Mode primary tetap Hari Ini + Jurnal Susulan.
- Date Guard aktif: ganti tanggal saat draft aktif → konfirmasi "Mengganti tanggal akan menutup draft jurnal yang sedang diisi. Lanjutkan?"
- Final journal tidak bisa diedit tanpa buka revisi (chip disabled, tombol "Buka Kembali" untuk unlock).
- Schema database TIDAK berubah. Hanya encoding field `note` yang berubah (plain text → JSON __v:1). Backward compat dijaga.
- File changed: 4 files, +949/-63 lines (2 new files: journal-narrative.ts + test).
- Test count: 559 (lama) + 26 (baru) = 585 PASS.
- Commit: 5d1be5c (pushed to origin/main, rebased on 41c5721).
- READY FOR SENIOR AUDIT.

---

Task ID: PIKET-STUDENT-LEDGER-RECAP-04A
Agent: main (sprint owner)
Task: Tambahkan Rekap Poin Siswa untuk modul Guru Piket. Guru bisa melihat total poin per siswa, filter kelas/status, search siswa cerdas, dan buka riwayat pelanggaran. Persiapan data untuk sprint Surat Panggilan 04B.

Work Log:
- Fetch origin main (sudah up-to-date dari sprint JOURNAL-REVIEW-NARRATIVE-03).
- Baca DailyDutyPage.tsx (Tab structure, riwayat tab pattern), daily-duty.ts (getStudentDutyStatus lama), daily-duty-repo.ts.
- Update getStudentDutyStatus labels di packages/domain/src/daily-duty.ts sesuai spec 04A:
  - 0-24 = Aman (tetap)
  - 25-49 = "Pembinaan ringan" (sebelumnya "Perlu pembinaan ringan")
  - 50-74 = "Panggilan orang tua" (sebelumnya "Perlu perhatian wali kelas")
  - 75-99 = "Kesiswaan/BK" (sebelumnya "Panggilan orang tua")
  - 100+ = "Tindak lanjut khusus" (sebelumnya "Tindak lanjut kesiswaan/BK")
- Tambah getDutyStatusVariant(totalPoints): return "success"|"warning"|"neutral"|"error"|"errorStrong" sesuai threshold.
- Tambah StudentDutyLedgerItem interface: studentId, studentName, studentNumber?, classId, classLabel, totalRecords, totalPoints, attendanceCount, disciplineCount, healthCount, permissionCount, otherCount, lastRecordDate?, statusLabel.
- Tambah buildStudentDutyLedger(records): pure function. Filter deletedAt==null, group by studentId+classId, sum points, count records per kategori, lastRecordDate = max date, statusLabel dari getStudentDutyStatus, urut totalPoints desc.
- Tambah filterDutyRecordsByStudent(records, studentId, classId?): filter riwayat siswa, deletedAt==null, urut tanggal terbaru dulu, classId optional.
- Export dari packages/domain/src/index.ts: getDutyStatusVariant, buildStudentDutyLedger, filterDutyRecordsByStudent, StudentDutyLedgerItem, DutyStatusVariant.
- Update 5 test getStudentDutyStatus lama dengan label baru.
- Tambah 19 test baru di packages/domain/test/daily-duty.test.ts dalam 3 describe block:
  - getStudentDutyStatus + getDutyStatusVariant (6 tests): 5 threshold + variant bonus.
  - buildStudentDutyLedger (10 tests): group by studentId+classId, total poin, total records, count kategori, deletedAt tidak dihitung, lastRecordDate, urut totalPoints desc, statusLabel otomatis, input kosong, studentNumber dipertahankan.
  - filterDutyRecordsByStudent (3 tests): urut tanggal terbaru, filter classId optional, deletedAt tidak ikut.
- Tambah listDutyRecordsByAcademicYear(academicYearId) di daily-duty-repo.ts: ambil semua DutyRecord untuk academicYearId, filter deletedAt null, urut date desc. Read-only.
- Refactor DailyDutyPage.tsx:
  - Tab type: tambah "poin". Urutan final: Catat, Rekap, Catatan, Rekap Poin, Riwayat, Cetak.
  - State baru: ledgerRecords, ledgerClassFilter, ledgerStatusFilter, ledgerStudentQuery, ledgerDetailStudent, ledgerDetailRecords.
  - loadLedgerData(): load DutyRecord tahunan saat year berubah. Dipanggil useEffect [year].
  - ledger = useMemo(buildStudentDutyLedger(ledgerRecords)).
  - filteredLedger = useMemo: filter class + status + smart search via searchStudents helper (dari sprint 02B).
  - handleOpenLedgerDetail(item): set detail student + filterDutyRecordsByStudent untuk riwayat.
  - handleCloseLedgerDetail(): clear state.
  - statusVariantForLabel(label): UI mapping label -> badge variant.
  - Tab "Rekap Poin" UI:
    - Search siswa (input, smart search).
    - Filter kelas chips: Semua Kelas + rosters.
    - Filter status chips: Semua Status, Aman, Pembinaan ringan, Panggilan orang tua, Kesiswaan/BK, Tindak lanjut khusus.
    - List mobile-first per siswa: nama + nomor, kelas + total poin + jumlah kejadian + tanggal terakhir, badge status (warna sesuai variant), breakdown by kategori, tombol "Lihat Riwayat".
    - Detail riwayat (overlay state, bukan route baru): nama + kelas + total poin + status, list riwayat (tanggal, ruleLabel + poin, catatan, tindak lanjut), tombol "Tutup Riwayat".
    - Empty state bila belum ada catatan / tidak ada yang cocok filter.
  - Tab "Cetak" update: section baru "D. REKAP POIN SISWA" dengan kolom No, Nama, Kelas, Kejadian, Total Poin, Status. Tampilkan semua siswa di ledger. Section "TANDA TANGAN" bergeser jadi "E. TANDA TANGAN".
- Run gates:
  - typecheck PASS (3 workspaces)
  - test PASS (604 tests, +19 baru untuk 04A)
  - build PASS (1,131 KB JS, 37 KB CSS)
- Commit 40bed73, push ke origin/main (c9f2fbe..40bed73).

Stage Summary:
- Tab Rekap Poin tersedia di Guru Piket (urutan: Catat, Rekap, Catatan, Rekap Poin, Riwayat, Cetak).
- Guru bisa melihat total poin per siswa (ledger dihitung dari DutyRecord aktif tahunan).
- Guru bisa mencari siswa dengan smart search (case-insensitive, penggalan nama, nomor, NIS — pakai helper searchStudents dari sprint 02B).
- Guru bisa filter kelas (chips Semua Kelas + rosters).
- Guru bisa filter status (chips 5 status pembinaan + Semua Status).
- Guru bisa membuka riwayat pelanggaran siswa (overlay state, bukan route baru). Riwayat urut tanggal terbaru.
- Status pembinaan mengikuti ambang poin sesuai spec 04A (Aman 0-24, Pembinaan ringan 25-49, Panggilan orang tua 50-74, Kesiswaan/BK 75-99, Tindak lanjut khusus 100+).
- Cetak rekap poin sederhana tersedia di tab Cetak (section D. REKAP POIN SISWA).
- Surat panggilan BELUM dibuat (sesuai sprint scope — ditunda ke 04B).
- Schema database TIDAK berubah. Tidak ada tabel baru. Ledger dihitung dari DutyRecord yang sudah ada.
- File changed: 5 files, +728/-15 lines.
- Test count: 585 (lama) + 19 (baru) = 604 PASS.
- Commit: 40bed73 (pushed to origin/main).
- READY FOR SENIOR AUDIT.
- Next: 04B Surat Panggilan / Surat Pernyataan — data sudah punya dasar kuat (ledger + riwayat siswa).

---

Task ID: PIKET-LETTER-GENERATOR-04B-VERIFY
Agent: main (sprint owner — verifikasi CI)
Task: Verifikasi 3 commit Bapak di repo (8efa2b7, 50edb50, bcdc5dd) + 2 commit polish tambahan (4fb96da, 6f29988). Total 5 commit di origin/main sejak PATCH-1. Bapak tidak bisa cek CI dari connector (workflow_runs: []), jadi dev jalankan gates: typecheck + test + build.

Work Log:
- Fetch origin/main: dapat 5 commit baru (ce58c94..6f29988).
- Fast-forward local sprint0-push ke 6f29988 (clean, no conflict).
- File baru:
  - apps/teacher-admin/src/modules/daily-duty/piket-letter.ts (140 baris): buildPiketLetter, buildParentSummonsLetter, buildStudentStatementLetter, PiketLetterDocument, PiketLetterType, BuildPiketLetterInput, PiketLetterRecordRow, MAX_RECORD_ROWS=10, getActiveSortedRecords, buildRecordRows, buildAdditionalNote, buildStudentIdentity.
  - apps/teacher-admin/src/modules/daily-duty/__tests__/piket-letter.test.ts (8 tests): surat panggilan, surat pernyataan, identitas siswa, janji memperbaiki sikap, urut tanggal terbaru, max 10 + additionalNote, tanda tangan guru+kepsek, tanda tangan siswa+ortu+guru.
  - apps/teacher-admin/src/__tests__/piket-letter.test.ts (5 tests, polish): smoke tests tambahan.
- DailyDutyPage.tsx refactor besar (+783/-545 baris):
  - getSchoolProfile() di init.
  - state school: SchoolProfile | undefined.
  - state letterPreview: PiketLetterDocument | null.
  - refreshDutyData() = Promise.all([loadData(), loadLedgerData()]) — refactor PATCH-1 jadi helper bersama (lebih bersih dari void loadData() + void loadLedgerData() terpisah).
  - handleCatat / handleDeleteRecord / handleSyncAlpa: await refreshDutyData() (PATCH-1 masuk, versi Bapak).
  - handleBuildLetter(letterType): pakai buildPiketLetter dengan ledgerDetailStudent + ledgerDetailRecords + school + teacher. Guard bila school.name kosong → pesan "Lengkapi profil sekolah terlebih dahulu."
  - Tombol "Buat Surat Panggilan" + "Buat Surat Pernyataan" di detail Rekap Poin.
  - Komponen LetterPreview({ letter, onClose }) — render title, identitas, body, recordRows, additionalNote, closing, signatureBlocks.
- Verifikasi gates:
  - typecheck PASS (3 workspaces: teacher-admin, domain, shared)
  - test PASS — 661 tests total: 604 domain + 23 shared + 34 teacher-admin (+13 baru untuk 04B: 8 piket-letter module test + 5 piket-letter app test)
  - build PASS (1,138 KB JS, 37 KB CSS)
- Verifikasi integrasi cepat:
  - SchoolProfile fields (name, address, district, regency, headmasterName, headmasterNip) cocok dengan yang dipakai buildPiketLetter.
  - handleBuildLetter pakai ledgerDetailStudent + ledgerDetailRecords (dari PATCH-1 refresh).
  - LetterPreview render semua field PiketLetterDocument.

Stage Summary:
- PIKET-LETTER-GENERATOR-04B = CLOSED ✅
- Surat Panggilan Orang Tua/Wali + Surat Pernyataan Siswa tersedia di detail Rekap Poin.
- Surat memuat: identitas siswa, kelas, nomor absen, jumlah kejadian, total poin, status pembinaan, tabel riwayat (max 10, urut terbaru), additionalNote jika >10, body paragraf, closing, signatureBlocks (sesuai jenis surat).
- Data source: ledgerDetailStudent (totalPoints, totalRecords, statusLabel, studentName, classLabel, studentNumber) + ledgerDetailRecords (riwayat) + SchoolProfile (name, address, district, regency, headmasterName, headmasterNip) + TeacherProfile (name) + todayISODate.
- PATCH-1 (refresh ledger) sudah masuk versi lebih bersih: refreshDutyData() = Promise.all([loadData(), loadLedgerData()]).
- Schema database tidak berubah. Tidak ada tabel baru.
- Test count: 648 (sebelumnya) + 13 (baru untuk 04B) = 661 PASS.
- Commit terakhir di origin/main: 6f29988 (5 commit total untuk 04B + polish).
- READY FOR SENIOR AUDIT — status CLOSED.

---

Task ID: PIKET-AUDIT-05C
Agent: main (sprint owner — audit + fix batch)
Task: Audit menyeluruh modul Guru Piket (kode + UX) dan perbaiki sekali. Setelah 5 sprint (01, 02A, 02B, 03 journal, 04A ledger, 04B surat), modul sudah UX READY per docs/PIKET_UX_AUDIT_05B.md. Audit ini fokus kode robustness + UX polish yang belum tertangkap.

Work Log:
- Fetch origin/main: dapat 5 commit baru Bapak (1719f48..f6e9703) — docs audit + hapus tab Riwayat lama + polish piket-letter. Fast-forward.
- Baca DailyDutyPage.tsx (498 baris setelah hapus tab Riwayat), piket-letter.ts, daily-duty-repo.ts, daily-duty.ts, semua test files.
- Catat 9 issue (5 kode + 4 UX), semua fix dalam satu batch.

KODE FIXES:
1. Error handling try/catch di 5 handler async (handleCatat, handleDeleteRecord, handleFinalize, handleUnlock, handleSyncAlpa, handleSaveNote). Sebelumnya bila IndexedDB throw (quota, locked), user tidak lihat apa-apa. Sekarang notify('error', msg).
2. handleSaveNote guard teacher wajib. Sebelumnya: `teacher?.id ?? ''` bisa pass empty string ke findOrCreateDutyReport → buat DutyReport dengan teacher kosong. Sekarang: notify('error', 'Profil guru belum lengkap. Buka menu Profil.') + return early.
3. buildStudentDutyLedger secondary sort by studentName (localeCompare 'id'). Sebelumnya: `items.sort((a, b) => b.totalPoints - a.totalPoints)` — ties di totalPoints bisa urut acak antar render (JS sort stabil untuk primitif tapi tidak dijamin untuk object identity). Sekarang: stabil alfabetis untuk siswa dengan poin sama.

UX FIXES:
4. Message banner dibedakan success/error/warning. Sebelumnya: semua pakai `info-banner-success` (hijau) walau pesan error seperti 'Laporan sudah difinalisasi'. Sekarang: state `message: { type, text } | null`. success=hijau, warning=kuning, error=merah.
5. Message auto-dismiss setelah 4 detik. Sebelumnya: banner menetap sampai aksi berikutnya. Sekarang: useEffect setTimeout 4000ms + cleanup clearTimeout.
6. Catat tab: empty state saat rosters kosong. Sebelumnya: tampilkan chip kosong + list siswa kosong tanpa konteks. Sekarang: EmptyState 'Belum ada data kelas/siswa' + hint 'Buka menu Kelas dan Mapel atau import roster siswa dulu' + tombol 'Buka Roster'.
7. Poin tab: warning bila siswa Aman (<25 poin) dibuat surat. Sebelumnya: tombol surat selalu aktif walau siswa belum perlu surat. Sekarang: notify('warning', '...berstatus Aman... Surat biasanya untuk poin >= 25'). Tetap lanjut (guru boleh paksa bila ingin).
8. Poin tab: summary stats per status di header. Sebelumnya: tidak ada overview cepat. Sekarang: grid 5 kolom (Aman/Pembinaan/Panggilan/BK/Khusus) dengan jumlah siswa per status, warna konsisten dengan badge (emerald/amber/orange/rose/rose-strong).
9. Cetak tab: Mode Dokumen toggle + warning bila tidak ada data. Sebelumnya: `print-area hidden print:block` — hanya visible saat print. Sekarang: tombol 'Mode Dokumen' untuk preview on-screen (konsisten dengan modul Jurnal). Warning kuning bila records + attendanceDetail + ledger semua kosong. PrintDutyReport juga di-split jadi JSX readable (bukan satu baris lagi).

TESTS:
+1 test baru di packages/domain/test/daily-duty.test.ts:
- Test 7b (05C): ties di totalPoints diurutkan by studentName (stable).
  3 siswa dengan 30 poin (Zaki, Andi, Budi) + 1 siswa 50 poin.
  Hasil: 50p (Citra) di atas, lalu Andi, Budi, Zaki (alfabetis).

Run gates:
- typecheck PASS (3 workspaces: teacher-admin, domain, shared)
- test PASS — 662 tests total: 605 domain + 23 shared + 34 teacher-admin (+1 baru untuk secondary sort)
- build PASS (1,139 KB JS, 37 KB CSS — naik ~1 KB dari 1,138 sebelumnya, acceptable)

Stage Summary:
- Modul Piket sekarang lebih robust: semua handler async punya error handling, tidak ada lagi fallthrough empty string, urut ledger stabil.
- UX lebih konsisten: banner pesan dibedakan warna, auto-dismiss, empty state jelas, summary stats, Mode Dokumen di Cetak.
- 9 issue ditemukan, 9 diperbaiki dalam 1 batch (sesuai instruksi 'perbaiki sekali').
- File changed: 3 files, +247/-73 lines.
- Test count: 661 (sebelumnya) + 1 (baru) = 662 PASS.
- Commit: 7f9b8a9 (pushed to origin/main).
- READY FOR SENIOR AUDIT.

Tidak dikerjakan (P3, bukan blocker):
- Split DailyDutyPage jadi sub-komponen (DailyDutyInputCard, DailyDutyAttendanceRecap, DailyDutyLedgerCard, DailyDutyLetterPreview, DailyDutyPrintReport) — maintainability, bukan UX blocker.
- Custom modal daripada confirm() — aesthetic, bukan blocker.
- Keyboard shortcuts (Enter to submit catat) — nice-to-have.
- Performance: getAttendanceDetailForDate N+1 query (pre-existing dari sprint 02A, out of scope).

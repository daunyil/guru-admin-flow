# Technical Plan — Guru Admin Flow

**Status:** Sprint 0 — Locked (Draft v1.0)
**Sumber otoritas:** `docs/GURU_ADMIN_FLOW_REFERENCE.md` §9, §15
**Prinsip teknis:** *Local-first untuk HP guru, cloud sync sebagai lapisan tambahan, bukan keharusan.*

Dokumen ini mendefinisikan keputusan teknis untuk Sprint 1–6. Setiap perubahan stack, struktur folder, atau strategi sync wajib memperbarui dokumen ini terlebih dahulu.

---

## 1. Pilihan Stack

### 1.1 Keputusan Tetap (Sprint 0)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Bahasa | TypeScript (strict mode) | Tipe data eksplisit wajib untuk validasi data sekolah yang sensitif |
| Frontend framework | React 18+ | Ekosistem mature, dukungan PWA baik, familiar |
| Build tool | Vite 5+ | Fast HMR, build size kecil, dukungan PWA native via plugin |
| UI styling | Tailwind CSS 3+ | Utility-first cocok untuk layout mobile + desktop, dark mode opsional |
| Local DB | Dexie.js (wrapper IndexedDB) | API reaktif, dukungan hook React, transaksi aman |
| State management | Zustand + Dexie live queries | Hindari Redux overkill; Dexie `useLiveQuery` sudah reaktif |
| Routing | React Router 6+ | Standar, dukungan nested route untuk layout mobile/desktop |
| Form handling | React Hook Form + Zod | Validasi schema-first, sinkron dengan data model di `packages/domain` |
| Cloud backend (Sprint 6) | Supabase | PostgreSQL + Auth + Realtime; jangan dipasang sebelum Sprint 6 |
| Hosting | Cloudflare Pages atau Vercel | Build statis PWA, biaya rendah, edge caching |
| Testing | Vitest + Playwright | Unit/integration dengan Vitest, E2E dengan Playwright |
| Monorepo tool | **npm workspaces** (sementara, lihat §1.4) | Default Node.js, kompatibel sandbox dev, tidak butuh instalasi tambahan |

### 1.2 Yang TIDAK Dipilih (dan Alasannya)

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| Next.js / Remix | SSR tidak diperlukan untuk app local-first; menambah kompleksitas build |
| Redux Toolkit | Overkill untuk state yang sebagian besar hidup di Dexie |
| Prisma (client-side) | Tidak mendukung IndexedDB; hanya relevan untuk backend Supabase (Sprint 6+) |
| SQLite (via WASM) | Dexie lebih native untuk browser; SQLite WASM butuh inisialisasi berat |
| Firebase | Supabase lebih cocok karena PostgreSQL + skema relasional sekolah |
| Capacitor / Tauri | MVP v1 cukup PWA; native shell ditunda hingga ada kebutuhan kamera/offline push |

### 1.3 Yang Ditunda (Bukan Sprint 0–6)

- Native shell (Capacitor/Tauri) → setelah MVP v1 selesai dan ada permintaan install persisten.
- Service worker advanced (background sync) → Sprint 6+ jika diperlukan.
- Multi-language (i18n) → MVP v1 bahasa Indonesia saja.

### 1.4 Keputusan Package Manager (Sprint 1)

**Package manager resmi sementara: npm workspaces**

Sprint 0 awalnya menetapkan pnpm workspaces di `docs/TECHNICAL_PLAN.md` §1.1 dan `pnpm-workspace.yaml`. Sprint 1 beralih ke **npm workspaces** karena:

1. pnpm tidak tersedia di sandbox dev environment yang dipakai.
2. npm workspaces adalah fitur default Node.js (≥7), tidak butuh instalasi tambahan.
3. Struktur monorepo `apps/*` + `packages/*` kompatibel penuh dengan npm workspaces.

Konsekuensi yang harus dipatuhi dev/AI berikutnya:

- **Jangan buat `pnpm-workspace.yaml`** — sudah dihapus di Sprint 1.
- **Jangan pakai `workspace:*` protocol** di `package.json` — gunakan `"*"` saja. `workspace:*` adalah pnpm-specific dan akan ditolak npm.
- Root `package.json` memakai `"workspaces": ["apps/*", "packages/*"]` (npm workspaces format).
- `package-lock.json` (bukan `pnpm-lock.yaml`) adalah lockfile resmi.

Bila di masa depan tim memutuskan kembali ke pnpm:

1. Update dokumen ini terlebih dahulu.
2. Hapus `package-lock.json`.
3. Buat `pnpm-workspace.yaml`.
4. Ganti `"*"` kembali ke `"workspace:*"` di package.json.
5. Pastikan seluruh tim setuju — jangan campur pnpm dan npm di repo yang sama.

---

## 2. Modul Utama (Aplikasi)

Modul di sini adalah modul kode pada level aplikasi, bukan modul produk (M01–M09 di PROJECT_CONTRACT.md). Setiap modul kode memiliki pemetaan ke modul produk.

```text
apps/teacher-admin/src/
├── modules/
│   ├── profile/         → M01 Profil Sekolah & Guru
│   ├── calendar/        → M02 Kalender Pendidikan
│   ├── prota/           → M03 Prota
│   ├── promes/          → M04 Promes
│   ├── schedule/        → M05 Jadwal Guru
│   ├── attendance/      → M06 Absensi Cepat
│   ├── journal/         → M07 Jurnal Otomatis
│   ├── semester-report/ → M08 Laporan Akhir Semester
│   └── backup/          → M09 Backup / Restore
├── shared/
│   ├── db/              → skema Dexie, indeks, migration
│   ├── sync/            → placeholder Sprint 6, status sync UI
│   ├── ui/              → komponen presentasi shared (Button, Card, dst.)
│   ├── layout/          → shell mobile + desktop
│   └── utils/           → date, jp, slug, dll.
├── routes/
│   ├── today/           → dashboard hari ini (default route)
│   ├── pending/         → daftar "Belum selesai"
│   ├── settings/        → profil, tahun pelajaran, backup
│   └── module-routes/   → sub-route per modul
├── App.tsx
├── main.tsx
└── index.css
```

Setiap modul wajib memiliki struktur internal yang konsisten:

```text
modules/<name>/
├── components/   → komponen UI spesifik modul
├── hooks/        → hook React spesifik modul
├── api/          → wrapper Dexie + (nanti) Supabase
├── types.ts      → re-export dari packages/domain
└── index.ts      → barrel export
```

---

## 3. Struktur Folder Awal (Monorepo)

```text
guru-admin-flow/
├── apps/
│   └── teacher-admin/          # aplikasi guru (PWA)
│       ├── public/
│       ├── src/
│       │   ├── modules/
│       │   ├── shared/
│       │   ├── routes/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
├── packages/
│   ├── domain/                 # tipe data + validasi Zod + business rules
│   │   ├── src/
│   │   │   ├── academic-year.ts
│   │   │   ├── school-profile.ts
│   │   │   ├── teacher-profile.ts
│   │   │   ├── calendar-event.ts
│   │   │   ├── prota.ts
│   │   │   ├── teaching-schedule.ts
│   │   │   ├── lesson-session.ts
│   │   │   ├── attendance.ts
│   │   │   ├── teaching-journal.ts
│   │   │   ├── semester-report.ts
│   │   │   ├── document-status.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/                 # util, konstanta, tipe UI kecil
│       ├── src/
│       │   ├── constants.ts    → tipe kalender, status sync, dll.
│       │   ├── date.ts         → util tanggal (minggu efektif, dst.)
│       │   ├── jp.ts           → util hitung JP
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── GURU_ADMIN_FLOW_REFERENCE.md  # sumber otoritas (read-only)
│   ├── PROJECT_CONTRACT.md
│   ├── TECHNICAL_PLAN.md             # dokumen ini
│   └── DATA_MODEL_DRAFT.md
├── scripts/
│   └── (skrip build/util)
├── .gitignore
├── .editorconfig
├── package.json                 # root workspace (pnpm)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
└── worklog.md                   # log kerja lintas sprint
```

### 3.1 Aturan Ketergantungan Antar-Paket

```text
apps/teacher-admin  →  packages/domain, packages/shared
packages/domain     →  packages/shared  (boleh)
packages/shared     →  (tanpa dependensi internal)
```

Dilarang:

- `packages/domain` mengimpor dari `apps/*`.
- `packages/shared` mengimpor dari `packages/domain` atau `apps/*`.
- Komponen UI di `apps/teacher-admin/src/modules/<x>` mengimpor langsung dari `apps/teacher-admin/src/modules/<y>` (harus lewat `shared/` atau event/callback).

### 3.2 Aturan Naming

- File TypeScript: `kebab-case.ts` (contoh: `academic-year.ts`).
- Komponen React: `PascalCase.tsx` (contoh: `AttendanceGrid.tsx`).
- Hook: `useCamelCase.ts` (contoh: `useTodaySessions.ts`).
- Tipe/Interface: `PascalCase` (contoh: `type AcademicYear`).
- Konstanta: `UPPER_SNAKE_CASE`.

---

## 4. Strategi Local-First

### 4.1 Prinsip

Aplikasi harus berjalan penuh **tanpa koneksi internet** selama Sprint 1–5. Sprint 6 menambahkan Supabase sebagai lapisan sync, bukan keharusan fungsional.

### 4.2 Lapisan Data

```text
UI (React)
   ↕ Zustand store (state ephemeral: filter, UI state)
   ↕ Dexie live queries (state persisten lokal)
   ↕ IndexedDB (storage fisik)
   ↕ (Sprint 6) Supabase sync layer
```

### 4.3 Skema Dexie (Draft Awal)

```ts
// apps/teacher-admin/src/shared/db/schema.ts
db.version(1).stores({
  academicYears:     'id, label, active',
  schoolProfile:     'id',                          // single row
  teacherProfile:    'id',                          // single row (MVP v1)
  calendarEvents:    'id, academicYearId, startDate, type',
  protaProfiles:     'id, academicYearId, subject, grade',
  protaUnits:        'id, protaProfileId, semester, order',
  teachingSchedules: 'id, teacherId, dayOfWeek, classId',
  lessonSessions:    'id, classId, date, status, &[classId+date+startPeriod]',
  attendanceRecords: 'id, sessionId, studentId, &[sessionId+studentId]',
  teachingJournals:  'id, sessionId',
  semesterReports:   'id, academicYearId, semester',
  documentSnapshots: 'id, entityType, entityId, status, createdAt',
  syncQueue:         'id, entityType, entityId, operation, status, createdAt',
});
```

### 4.4 Aturan Penulisan ke Dexie

1. Setiap operasi tulis wajib transaksi (Dexie `db.transaction()`).
2. Setiap entitas wajib memiliki `id` (UUID v4) di sisi aplikasi.
3. Field `createdAt`, `updatedAt`, `syncStatus` wajib ada di setiap entitas persisten.
4. Field `deletedAt` (soft delete) wajib ada untuk entitas yang dapat dihapus oleh guru (CalendarEvent, ProtaUnit, TeachingSchedule).

### 4.5 Migration Strategy

Setiap perubahan skema wajib:

1. Naikkan `db.version(n)`.
2. Sediakan `upgrade()` function yang idempoten.
3. Catat di `apps/teacher-admin/src/shared/db/MIGRATIONS.md`.

---

## 5. Rencana Supabase Sync (Sprint 6, Bukan Sprint 0)

### 5.1 Mengapa Ditunda

- Local-first wajib stabil dulu sebelum sync ditambahkan. Bug sync yang terjadi sebelum lokal stabil akan merusak data.
- Skema data masih bisa berubah di Sprint 1–5.
- Auth Supabase menambah kompleksitas UI (login flow, session expiry) yang mengganggu validasi UX inti.

### 5.2 Model Sync (Direncanakan)

```text
Write path:
  UI action → Dexie write → syncQueue entry (status: pending)
                            ↓ (background, saat online)
                            Supabase upsert → syncQueue status: synced
                                              ↓
                                              Dexie update syncStatus

Read path:
  UI → Dexie live query (instant, dari lokal)
         ↑ (background, saat online)
         Supabase select → Dexie upsert
```

### 5.3 Aturan Sync (Direncanakan)

1. Satu arah di MVP v1: lokal → cloud. Cloud → lokal hanya untuk perangkat lain yang login akun sama.
2. Konflik: last-write-wins dengan timestamp server. Tidak ada merge otomatis di MVP v1.
3. Soft delete wajib di-sync (tidak boleh hard delete sebelum sync).
4. Status sync per item wajib tampil di UI (lihat PROJECT_CONTRACT.md §8.5).

### 5.4 Skema Supabase (Direncanakan, Bukan Sprint 0)

- Tabel `users`, `schools`, `school_memberships` (many-to-many).
- Tabel per entitas: `academic_years`, `calendar_events`, `prota_profiles`, dst.
- Row Level Security per `school_id`.
- Field `synced_at` di tabel cloud untuk tracking.

### 5.5 Yang TIDAK Dilakukan di Sprint 0

- Tidak ada `@supabase/supabase-js` di `package.json`.
- Tidak ada file `.env` berisi URL Supabase.
- Tidak ada skema SQL di repo.
- Tidak ada UI login.

---

## 6. Strategi Backup / Restore

### 6.1 Format Backup

Single file JSON dengan struktur:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2025-08-18T10:30:00+07:00",
  "appVersion": "0.1.0",
  "data": {
    "academicYears": [...],
    "schoolProfile": {...},
    "teacherProfile": {...},
    "calendarEvents": [...],
    "protaProfiles": [...],
    "protaUnits": [...],
    "teachingSchedules": [...],
    "lessonSessions": [...],
    "attendanceRecords": [...],
    "teachingJournals": [...],
    "semesterReports": [...],
    "documentSnapshots": [...]
  }
}
```

### 6.2 Nama File

```text
guru-admin-flow-backup-YYYYMMDD-HHmm.json
```

Contoh: `guru-admin-flow-backup-20250818-1030.json`.

### 6.3 Validasi Impor

Sebelum restore:

1. Validasi `schemaVersion` (harus ≤ versi aplikasi).
2. Validasi struktur dengan Zod schema dari `packages/domain`.
3. Tampilkan ringkasan: jumlah entitas per tipe, tahun pelajaran, tanggal backup.
4. Konfirmasi eksplisit dari guru sebelum overwrite.

### 6.4 Restore Behavior

- Mode default: **overwrite penuh** (semua data lokal diganti).
- Mode alternatif (Sprint 4+): **merge per tahun pelajaran** (hanya untuk kasus khusus, tidak di MVP v1 awal).
- Setelah restore, `syncQueue` dikosongkan dan semua entitas di-mark `syncStatus: pending` (untuk persiapan Sprint 6).

### 6.5 Snapshot Dokumen Final

Saat dokumen (Prota, Promes, SemesterReport) bertransisi ke status `Final` atau `Locked`:

1. Salin seluruh data dokumen + referensi ke `documentSnapshots`.
2. Snapshot tidak pernah dihapus (kecuali hard delete eksplisit oleh guru melalui menu khusus).
3. Restore snapshot = membuat dokumen baru dengan status `Revised`, bukan menimpa snapshot.

---

## 7. Strategi Testing

### 7.1 Pyramid

```text
        E2E (Playwright)        — alur kritis end-to-end
       ↑
     Integration (Vitest)       — interaksi modul + Dexie
    ↑
  Unit (Vitest)                 — packages/domain + utils
 ↑
Type-level (tsc --noEmit)       — seluruh repo
```

### 7.2 Coverage Target (Sprint 1+)

| Lapisan | Target Coverage | Wajib |
|---|---|---|
| `packages/domain` (Zod schema + business rules) | 90%+ | ya |
| `packages/shared` (utils) | 85%+ | ya |
| `apps/teacher-admin/src/shared/db` | 80%+ | ya |
| `apps/teacher-admin/src/modules/*` (hooks + api) | 70%+ | ya |
| `apps/teacher-admin/src/modules/*` (components) | 40%+ | opsional, fokus ke E2E |
| E2E (Playwright) | alur di PROJECT_CONTRACT.md §6 | semua alur kritis |

### 7.3 Alur Kritis yang Wajib Di-E2E

1. Buat tahun pelajaran baru dari tahun lalu → profil+Prota+template disalin, realisasi dikosongkan.
2. Impor kalender JSON → CalendarEvent tersimpan, validasi tumpang tindih jalan.
3. Input Prota + validasi total JP → status `Valid` atau `Perlu perbaikan`.
4. Generate Promes → distribusi materi, status `Valid`/`Perlu perbaikan`.
5. Buka sesi hari ini → semua siswa hadir → ubah 1 siswa → simpan → jurnal otomatis terbentuk.
6. Tandai jurnal `Selesai` → muncul di laporan semester.
7. Finalisasi laporan semester dengan data lengkap → status `Final` → snapshot dibuat.
8. Export backup → hapus data lokal → import backup → data kembali utuh.

### 7.4 Testing di Sprint 0

Sprint 0 tidak wajib memiliki test. Hanya scaffold Vitest + Playwright yang disiapkan, tanpa suite test.

---

## 8. Out of Scope Justification (Non-Goals)

| Non-Goal | Alasan Teknis |
|---|---|
| Bank soal | Memerlukan skema butir soal + relasi ke materi + parser format — terlalu besar untuk MVP v1 |
| Analisis butir | Memerlukan statistik + visualisasi — bergantung pada bank soal yang belum ada |
| Modul ajar AI penuh | Memerlukan integrasi LLM API — melanggar non-goal "AI wajib" |
| Penggantian identitas DOCX massal | Memerlukan parser DOCX (docxtemplater/mammoth) + template engine — kompleksitas tinggi |
| Supervisi kepala sekolah | Memerlukan akun multi-role + flow approval — di luar persona MVP v1 |
| Aplikasi wali kelas | Memerlukan entitas siswa lengkap + relasi wali-kelas — skala berbeda |
| Rapor penuh | Memerlukan entitas nilai per KD + KKM + deskripsi — terlalu besar |
| Parser DOCX/PDF otomatis | Memerlukan parsing tidak deterministik — risiko korupsi data tinggi |
| Integrasi AI API langsung | Memerlukan kunci API + biaya + latensi — melanggar prinsip local-first |
| KO per mapel | Melanggar keputusan produk: KO adalah kegiatan koordinator, bukan dibebankan ke guru mapel |
| Multi-sekolah per akun | Menambah kompleksitas RLS + UX pemilihan sekolah — MVP v1 fokus satu sekolah |
| Sinkronisasi real-time antar perangkat | Memerlukan konflik resolution yang kompleks — MVP v1 cukup satu arah |
| Modul nilai lengkap | Nilai hanya disimpan minimal jika diperlukan untuk laporan — remedial otomatis non-goal |

---

## 9. Roadmap Teknis Sprint 1–6

### Sprint 1 — Fondasi Aplikasi Lokal

- Setup `apps/teacher-admin` dengan Vite + React + TS + Tailwind.
- Setup pnpm workspace + `packages/domain` + `packages/shared`.
- Implementasi skema Dexie awal (§4.3).
- Modul M01 Profil (input + simpan + load).
- Modul M09 Backup/Restore (export/import JSON).
- Shell layout mobile + desktop (kosong, tanpa fitur).
- Dashboard hari ini placeholder (menampilkan "Belum ada tahun pelajaran aktif").

### Sprint 2 — Kalender + Prota + Promes

- Modul M02 Kalender: impor JSON, editor, validasi.
- Modul M03 Prota: input, validasi total JP, versi.
- Modul M04 Promes: engine generate dari Prota + Kalender + Jadwal (Jadwal masih kosong, fallback ke distribusi per minggu).
- Engine Promes di `packages/domain` (pure function, mudah di-test).

### Sprint 3 — Jadwal Guru + Sesi Mengajar

- Modul M05 Jadwal Guru: input manual + impor JSON Smart Roster.
- Generator LessonSession dari Jadwal + CalendarEvent.
- Hubungkan LessonSession dengan ProtaUnit (distribusi materi ke sesi).
- Dashboard hari ini fungsional.

### Sprint 4 — Absensi + Jurnal HP

- Modul M06 Absensi: mobile-first, default hadir.
- Modul M07 Jurnal: auto-fill dari LessonSession + ProtaUnit + Attendance.
- Status realisasi (`Selesai | Dilanjutkan | Tidak Terlaksana`).
- Daftar "Belum selesai" di dashboard.

### Sprint 5 — Laporan Semester

- Modul M08 Laporan Akhir Semester.
- Halaman kelengkapan.
- Generate laporan dari jurnal + absensi + progres materi.
- Status dokumen + snapshot.
- Preview + ekspor (PDF/HTML).

### Sprint 6 — Supabase Sync

- Tambah `@supabase/supabase-js`.
- Auth (login + session).
- Skema PostgreSQL + RLS.
- Sync layer (one-way lokal → cloud, dengan `syncQueue`).
- UI status sync per item.
- Multi-perangkat (cloud → lokal untuk perangkat lain).

---

## 10. Risiko Teknis Awal

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Skema Dexie berubah signifikan di Sprint 2–4 → migration rumit | Tinggi | Skema Sprint 0 dibuat conservative; field tambahan ditambah tanpa breaking; skrip migration wajib idempoten |
| Engine Promes (Sprint 2) kompleks dan rentan bug | Tinggi | Engine ditaruh di `packages/domain` sebagai pure function; unit test 90%+ sebelum dipakai UI |
| IndexedDB quota di iOS Safari (50MB default) | Sedang | Backup JSON wajib sebelum quota penuh; tampilkan estimasi ukuran data di Settings |
| Background sync tidak reliable di iOS PWA | Sedang | MVP v1 manual sync (guru tap tombol); background sync ditunda |
| Konflik data saat multi-perangkat (Sprint 6) | Sedang | MVP v1 one-way sync; konflik resolution ditunda; last-write-wins |
| Tailwind bundle size membengkak | Rendah | Purge + JIT aktif by default di Tailwind 3+; monitor dengan `vite-plugin-visualizer` |
| PWA install prompt berbeda antar browser | Rendah | Tampilkan instruksi manual install per browser; jangan andalkan prompt otomatis |

---

## 11. Definition of Done per Sprint

Sprint dianggap selesai jika:

1. Semua output yang tercantum di roadmap (§9) untuk sprint tersebut sudah ada.
2. Coverage target (§7.2) terpenuhi untuk kode baru.
3. Alur E2E kritis yang terdampak sudah lulus.
4. `docs/PROJECT_CONTRACT.md` dan `docs/DATA_MODEL_DRAFT.md` diperbarui bila ada perubahan.
5. `worklog.md` diperbarui dengan ringkasan sprint.
6. Tidak ada regresi pada acceptance criteria MVP v1 (lihat PROJECT_CONTRACT.md §9).

---

## 12. Riwayat Revisi

| Versi | Tanggal | Perubahan | Penanggung Jawab |
|---|---|---|---|
| v1.0 | Sprint 0 | Dokumen awal | Sprint 0 owner |
| v1.1 | Sprint 1 | Package manager resmi: pnpm → npm workspaces (§1.1, §1.4 baru). Alasan: pnpm tidak tersedia di sandbox dev. | Sprint 1 owner |

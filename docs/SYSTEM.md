# System Architecture — Guru Admin Flow v0.5.1

## Overview

Guru Admin Flow adalah aplikasi administrasi guru SMP yang bersifat **local-first**. Semua data disimpan di IndexedDB browser via Dexie. Tidak ada backend server di v0.5.

## Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Build | Vite 5+ |
| Framework | React 18+ |
| Router | React Router 6 (HashRouter) |
| Local DB | Dexie.js (IndexedDB) — database name: `guru-admin-flow` |
| Styling | Tailwind CSS 3 |
| Testing | Vitest |
| Monorepo | npm workspaces |

## Monorepo Structure

```text
guru-admin-flow/
├── apps/teacher-admin/          # Aplikasi guru (Vite + React)
├── packages/domain/             # Tipe data + Zod + pure functions
├── packages/shared/             # Konstanta + util shared
├── docs/                        # Dokumen kontrak + design
└── worklog.md                   # Log kerja lintas sprint
```

### Dependency Rules

```text
apps/teacher-admin  →  packages/domain, packages/shared
packages/domain     →  packages/shared
packages/shared     →  (no internal deps)
```

## Data Architecture

### IndexedDB Schema (Dexie)

Database: `guru-admin-flow`, version 1, 14 tables:

| Table | Purpose |
|---|---|
| academicYears | Tahun pelajaran |
| schoolProfile | Profil sekolah (single row) |
| teacherProfile | Profil guru (single row) |
| calendarEvents | Kalender pendidikan |
| protaProfiles | Program Tahunan |
| protaUnits | Unit materi Prota |
| teachingSchedules | Jadwal mengajar guru |
| lessonSessions | Sesi mengajar per tanggal |
| attendanceRecords | Absensi per siswa per sesi |
| classRosters | Daftar siswa per kelas |
| teachingJournals | Jurnal mengajar per sesi |
| semesterReports | Laporan akhir semester |
| documentSnapshots | Snapshot dokumen final |
| syncQueue | Antrian sync (placeholder untuk v1.1) |

### Domain Pure Functions

| Function | Location | Purpose |
|---|---|---|
| `generatePromes()` | promes-engine.ts | Generate distribusi materi ke minggu |
| `generateLessonSessions()` | lesson-session-generator.ts | Generate sesi dari jadwal + kalender |
| `linkPromesToLessons()` | promes-lesson-linker.ts | Assign plannedUnitId ke sesi |
| `generateDefaultAttendance()` | attendance-helpers.ts | Default semua hadir |
| `generateJournalFromSession()` | journal-helpers.ts | Auto-fill jurnal dari sesi+Prota+absensi |
| `generateSemesterReport()` | semester-report-generator.ts | Rekap lengkap laporan semester |
| `planNewYearFromPrevious()` | rules.ts | Salin profil+Prota untuk tahun baru |

## CRITICAL PROMES RULE

```text
PPKn SMP = 108 JP/tahun = 72 intra + 36 KO
Per minggu: 2 JP intra (materi) + 1 JP KO (row terpisah)

Engine pakai: intraJpPerWeek=2 + koJpPerWeek=1 (BUKAN jpPerWeek=3)
materialCapacity = (effectiveWeeks × intraJpPerWeek) - cadanganJP
Cadangan dari INTRA capacity (bukan total 3 JP)
KO row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP
```

## Attendance Statuses

```text
present  — Hadir (default)
sick     — Sakit
excused  — Izin
late     — Terlambat
absent   — Alpa
```

## Document Preview

Setiap dokumen punya 2 mode:
- **Mode Kerja**: UI interaktif untuk input
- **Mode Dokumen**: Format seperti Word/Excel untuk print

CSS classes:
- `.document-page` — container A4
- `.document-landscape` — A4 landscape (Promes)
- `.document-portrait` — A4 portrait (Jurnal, Laporan)
- `.document-table` — tabel border hitam
- `.signature-grid` — tanda tangan
- `.print-area` — area yang tampil saat print
- `.no-print` — hidden saat print

## Backup/Restore

- Export: JSON file dengan schemaVersion validation
- Import: validasi Zod + konfirmasi sebelum overwrite
- Format: `guru-admin-flow-backup-YYYYMMDD-HHmm.json`

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. Typecheck (3 workspace)
2. Test (Vitest)
3. Build (Vite)
4. Audit (security + scope check)

## Roadmap

| Version | Focus |
|---|---|
| v0.5.1 | Closure hotfix (current) |
| v0.6 | Template dokumen polish |
| v1.0 | Stabil lokal |
| v1.1 | Supabase sync |

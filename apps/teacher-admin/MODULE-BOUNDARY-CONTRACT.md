# MODULE-BOUNDARY-CONTRACT.md

> **Versi**: 1.0  
> **Tanggal**: 2026-07-26  
> **Status**: ACTIVE — enforced by code review, not automated yet

## Tujuan

Dokumen ini mendefinisikan **batas modul (module boundaries)** dan **aturan import** untuk aplikasi SIAKAD Guru. Tujuannya adalah mencegah **coupling** antar modul, menjaga **independensi** domain, dan memastikan setiap modul bisa di-refactor/di-replace tanpa mengganggu modul lain.

## Struktur Modul

```
src/modules/
├── 1-harian/           # Operasional harian guru per mapel
│   ├── attendance/     # Absensi (H/S/I/T/A per sesi, rekap bulanan)
│   ├── journal/        # Jurnal mengajar (per pertemuan)
│   ├── grades/         # Daftar nilai (per mapel, per semester)
│   └── rekap-semester/ # Rekap semester (Sprint 4 — matriks bulanan)
│
├── 2-piket/            # Supervisi harian per kelas/sekolah
│   └── daily-duty/     # Guru piket, pelanggaran, pembinaan
│
├── 3-administrasi/     # Document generator per semester
│   ├── _perencanaan/   # Kalender, Prota, Promes, Jadwal, ATP
│   ├── _dokumen-ajar/  # RPP, RPP-Bulk, LKPD
│   ├── _evaluasi/      # Perangkat Penilaian, Remedial, Pengayaan, Laporan Semester
│   └── _paket/         # AdminPackage gate page
│
├── 4-integrasi/        # Cross-cutting features
│   ├── apps-script-import/
│   ├── auto-document/
│   ├── completeness/
│   └── report-center/
│
├── 5-data-dasar/       # Master data / setup
│   ├── profile/
│   ├── roster/
│   ├── assignments/
│   ├── new-year/
│   └── backup/
│
└── auth/               # Cross-module auth gate
```

## Aturan Import (MANDATORY)

### Rule 1: Top-level modules TIDAK BOLEH import dari modul lain secara langsung

```
❌ FORBIDDEN: import dari @harian/ ke @piket/
❌ FORBIDDEN: import dari @piket/ ke @admin/
❌ FORBIDDEN: import dari @admin/ ke @harian/
❌ FORBIDDEN: import dari @harian/ ke @modules/5-data-dasar/
```

Modul level-1 (1-harian, 2-piket, 3-administrasi, 4-integrasi, 5-data-dasar) **tidak boleh** import dari modul level-1 lain secara langsung. Komunikasi antar modul HARUS melalui `@shared/`.

### Rule 2: Cross-module communication melalui @shared/ SAJA

Shared layer (`@shared/`) adalah **satu-satunya** channel komunikasi antar modul:

```
✅ ALLOWED: @harian/attendance → @shared/db/attendance-repo
✅ ALLOWED: @harian/grades → @shared/db/gradebook-repo
✅ ALLOWED: @piket/daily-duty → @shared/types/...
✅ ALLOWED: @admin/promes → @shared/documents/DocumentPreview
✅ ALLOWED: @integrasi/report-center → @shared/db/...
```

**@shared/ berisi:**
- `@shared/db/` — Database repos (Dexie/IndexedDB)
- `@shared/ui/` — Shared UI primitives (Card, Button, Input, Badge, etc.)
- `@shared/documents/` — DocumentPreview, DocumentLayout, ReportTemplates
- `@shared/layout/` — AppShell, navigation, icons
- `@shared/supabase/` — Cloud sync layer
- `@shared/types/` — Cross-module type definitions (future)
- `@shared/utils/` — Utility functions (future)

### Rule 3: Shared UI components HARUS dari @shared/ui

Modul tidak boleh membuat UI component primitive sendiri jika sudah ada di `@shared/ui`:

```
❌ FORBIDDEN: @harian/attendance membuat Button component sendiri
✅ ALLOWED: import { Button } from "@shared/ui"
❌ FORBIDDEN: @admin/promes membuat Card component sendiri
✅ ALLOWED: import { Card, CardHeader } from "@shared/ui"
```

**Pengecualian**: Modul BOLEH membuat **domain-specific** UI components (misal `AttendanceStatusButton`, `GradeCell`, `PromesWeekCell`) yang hanya digunakan di modul itu sendiri. Ini bukan "primitive" — ini domain component.

### Rule 4: Domain types dari @guru-admin/domain package

Semua domain types (AttendanceRecord, GradeBook, PromesWeek, etc.) didefinisikan di `packages/domain/` dan diakses via sub-path exports:

```
✅ ALLOWED: import { AttendanceStatus } from "@guru-admin/domain/attendance"
✅ ALLOWED: import { GradeBook } from "@guru-admin/domain/gradebook"
✅ ALLOWED: import { PromesWeek } from "@guru-admin/domain/promes"
```

Modul TIDAK BOLEH membuat type definitions sendiri yang duplikat dengan domain package.

### Rule 5: Sub-modul dalam group BOLEH import antar sesama

Sub-modul dalam satu group boleh import antar sesama, tapi sebaiknya minimal:

```
✅ ALLOWED: @harian/rekap-semester → @harian/attendance/types  (same group)
✅ ALLOWED: @admin/_perencanaan/promes → @admin/_perencanaan/calendar/types  (same group)
⚠️ CAUTION: Sebaiknya via @shared/ jika memungkinkan, untuk menjaga independensi sub-modul
```

### Rule 6: 4-integrasi dan 5-data-dasar adalah cross-cutting

Modul 4-integrasi dan 5-data-dasar bersifat **cross-cutting** — mereka BOLEH import dari `@shared/db/` dan `@shared/ui/` tapi TIDAK BOLEH import langsung dari modul domain (1/2/3):

```
✅ ALLOWED: @integrasi/report-center → @shared/db/attendance-repo (read-only)
✅ ALLOWED: @integrasi/report-center → @shared/db/gradebook-repo (read-only)
❌ FORBIDDEN: @integrasi/report-center → @harian/attendance/QuickAttendancePage
```

## Path Alias Reference

| Alias | Path | Scope |
|-------|------|-------|
| `@shared/*` | `src/shared/*` | ALL modules |
| `@harian/*` | `src/modules/1-harian/*` | Only 1-harian + 4-integrasi(read) |
| `@piket/*` | `src/modules/2-piket/*` | Only 2-piket + 4-integrasi(read) |
| `@admin/*` | `src/modules/3-administrasi/*` | Only 3-administrasi |
| `@modules/*` | `src/modules/*` | Only App.tsx (routing) |
| `@routes/*` | `src/routes/*` | Only App.tsx (routing) |
| `@guru-admin/domain/*` | `packages/domain/src/*` | ALL modules (types only) |

## Enforcement

### Current: Code Review
- Setiap PR harus diverifikasi bahwa tidak ada cross-module import yang melanggar Rule 1
- Reviewer menggunakan grep: `rg "@harian/" src/modules/2-piket/` untuk cek violation

### Future: Automated ESLint Rule
- Custom ESLint rule `no-cross-module-import` akan diimplementasi
- Configuration: `restricted-imports` per path pattern
- Target: Sprint 5+

## Violation Log

| Date | Module | Violation | Fix | Status |
|------|--------|-----------|-----|--------|
| — | — | — | — | N/A |

_Dokumen ini akan di-update saat aturan berubah atau violation ditemukan._

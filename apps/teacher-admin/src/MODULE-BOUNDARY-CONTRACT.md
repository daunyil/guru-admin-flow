# MODULE-BOUNDARY-CONTRACT.md

**Single Source of Truth — SIAKAD Guru Module Architecture**
**Version**: 2.0.0
**Last Updated**: 2026-08-04
**Authority**: All developers MUST follow this contract. Violations = revert + fix.

---

## 1. Module Groups

| Group | Directory | Domain | Purpose |
|-------|-----------|--------|---------|
| **home** | `modules/home/` | Landing page | TodayPage, pending work, session cards |
| **harian** | `modules/harian/` | Per mapel per hari | Absensi, Jurnal, Nilai, Rekap Semester |
| **piket** | `modules/piket/` | Per kelas per sekolah | Laporan Piket, Pelanggaran, Pembinaan |
| **administrasi** | `modules/administrasi/` | Per mapel per semester | Promes, Prota, RPP, Laporan Semester |
| **integrasi** | `modules/integrasi/` | Cross-cutting | Import, AutoDoc, Completeness, Report Center |
| **data-dasar** | `modules/data-dasar/` | Master data | Profile, Roster, Assignments, Backup |
| **auth** | `modules/auth/` | Auth gate | Login, role check |

### administrasi Sub-domains

| Sub-domain | Directory | Contents |
|------------|-----------|----------|
| perencanaan | `administrasi/perencanaan/` | calendar, prota, promes, schedule, atp |
| dokumen-ajar | `administrasi/dokumen-ajar/` | rpp, rpp-bulk, lkpd |
| evaluasi | `administrasi/evaluasi/` | evaluation-docs, remedial, pengayaan, semester-report, lainnya |
| paket | `administrasi/paket/` | admin-package (gate page) |

---

## 2. Path Aliases

| Alias | Resolves To | Usage |
|-------|-------------|-------|
| `@home/*` | `modules/home/*` | Home/landing page imports |
| `@harian/*` | `modules/harian/*` | Harian module internal imports |
| `@piket/*` | `modules/piket/*` | Piket module internal imports |
| `@admin/*` | `modules/administrasi/*` | Admin module internal imports |
| `@integrasi/*` | `modules/integrasi/*` | Integrasi module internal imports |
| `@data/*` | `modules/data-dasar/*` | Data dasar module internal imports |
| `@modules/*` | `modules/*` | Generic cross-module access (avoid if possible) |
| `@shared/*` | `shared/*` | Shared infrastructure (DB, UI, docs) |
| `@guru-admin/domain` | `packages/domain` | Business logic + types (Zod schemas) |
| `@guru-admin/shared` | `packages/shared` | Constants + utility functions |

---

## 3. RULES — Module Boundary Contract

### Rule #1: NO Cross-Module Direct Imports

**A module at top level (e.g. harian) MUST NOT import directly from another top-level module (e.g. piket).**

```
❌ FORBIDDEN:
  // In modules/harian/attendance/SomeFile.tsx
  import { useDailyDutyState } from "@piket/daily-duty/useDailyDutyState";

  // In modules/piket/daily-duty/SomeFile.tsx
  import { GradesPage } from "@harian/grades/GradesPage";
```

```
✅ ALLOWED:
  // In modules/harian/attendance/SomeFile.tsx
  import { listAttendanceRecords } from "@shared/db/attendance-repo";  // via shared
  import { AttendanceStatus } from "@guru-admin/domain";                // via domain package
```

**Why**: Direct cross-module imports create hidden coupling. When module A changes, module B breaks silently. Communication must go through the shared layer (DB repos, domain types, event system).

### Rule #2: Cross-Module Communication via @shared/ Only

**When modules need to share data or communicate, they MUST use @shared/ as the intermediary.**

Allowed communication channels:
1. **@shared/db/*-repo** — Read/write shared data (attendance-repo, journal-repo, etc.)
2. **@shared/db/rekap-types** — Shared type definitions for Rekap Semester matrices
3. **@guru-admin/domain** — Shared types and business logic (Zod schemas, engines)
4. **@guru-admin/shared** — Constants (FEATURE_FLAGS, MONTH_LABELS_ID, etc.)
5. **@shared/ui/** — Shared UI components (Card, Button, Select, etc.)
6. **@shared/documents/** — Document rendering infrastructure
7. **@shared/exporters/download-helpers** — Generic download utilities
8. **Event/Callback pattern** — Parent components can pass callbacks across module boundaries

### Rule #3: All Shared UI from @shared/ui

**UI components that are used by multiple modules MUST live in @shared/ui/. Module-specific UI stays within the module.**

```
✅ Shared UI (in @shared/ui/):
  Card, CardHeader, Button, Select, Input, Textarea, Badge, EmptyState, LoadingState
  ContextCard, PrintExportButtons, ErrorBoundary

❌ Module-specific UI (stays in module):
  PromesSidebar, AttendanceEditor, DailyDutyPage, JournalPage
  These are ONLY used by their own module — no reason to extract.
```

**Decision rule**: If a component is used by 2+ module groups → extract to @shared/ui. If used by only 1 module group → keep it local.

---

## 4. Forbidden Import Matrix

| From → To | @harian | @piket | @admin | @integrasi | @data | @shared | @domain | @shared-pkg |
|-----------|---------|--------|--------|------------|-------|---------|---------|-------------|
| **harian** | ✅ self | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **piket** | ❌ | ✅ self | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **administrasi** | ❌ | ❌ | ✅ self | ❌ | ❌ | ✅ | ✅ | ✅ |
| **integrasi** | ❌ | ❌ | ❌ | ✅ self | ❌ | ✅ | ✅ | ✅ |
| **data-dasar** | ❌ | ❌ | ❌ | ❌ | ✅ self | ✅ | ✅ | ✅ |
| **@shared** | ❌ all | ❌ all | ❌ all | ❌ all | ❌ all | ✅ self | ✅ | ✅ |
| **App.tsx** | ✅ lazy | ✅ lazy | ✅ lazy | ✅ lazy | ✅ lazy | ✅ direct | ✅ | ✅ |

**Note**: App.tsx is the ONLY file allowed to import from all module groups (via React.lazy). It's the router composition layer — not business logic.

**Note**: @shared/ is infrastructure (DB repos, UI primitives). It MUST NOT import from any module. Modules import from @shared/; @shared/ does NOT import from modules.

---

## 5. Data Layer Boundaries

### Dexie Tables — Shared, Not Module-Private

All Dexie tables live in `@shared/db/schema.ts`. They are shared infrastructure — any module can read/write through the repo layer.

**No module creates private Dexie tables.** If a module needs persistence, it adds a table to the shared schema with a versioned migration.

### Supabase — Optional Cloud Sync

Supabase is for cloud sync only. The sync bridge (`@shared/supabase/daily-bridge.ts`) is shared infrastructure — not owned by any module.

---

## 6. Workflow Standards

Every sub-domain that involves document generation or complex UI MUST have a WORKFLOW-STANDARDS.md file:

| Sub-domain | Standards File | Status |
|------------|---------------|--------|
| promes | `administrasi/perencanaan/promes/PROMES-WORKFLOW-STANDARDS.md` | ✅ Exists |
| harian (future) | `harian/HARIAN-WORKFLOW.md` | ⏳ To be created |
| piket (future) | `piket/PIKET-WORKFLOW.md` | ⏳ To be created |
| admin (future) | `administrasi/ADMIN-WORKFLOW.md` | ⏳ To be created |

---

## 7. Enforcement

### Pre-Commit Check (Manual)

Before committing code that adds imports, verify:
1. Does this import cross a module boundary? → If yes, route through @shared/ or @guru-admin/domain
2. Is this UI component used by 2+ modules? → If yes, extract to @shared/ui/
3. Am I creating a new Dexie table? → If yes, add to shared schema with migration

---

## 8. Change Management

Changes to this contract MUST follow the same ANALYZE → SPECIFY → UPDATE → CODE → QA → BUILD → COMMIT workflow as PROMES-WORKFLOW-STANDARDS.md.

**This document is the architectural constitution. No ad-hoc violations.**

---

## 9. Migration History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-26 | Initial contract with numbered folders (1-harian, 2-piket, etc.) |
| 2.0.0 | 2026-08-04 | Refactored: removed number/underscore prefixes, added @home/@integrasi/@data aliases, moved promes-docx-exporter to admin module, extracted rekap-types to @shared, fixed boundary violations |

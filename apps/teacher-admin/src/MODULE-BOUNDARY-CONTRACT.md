# MODULE-BOUNDARY-CONTRACT.md

**Single Source of Truth — SIAKAD Guru Module Architecture**
**Version**: 1.0.0
**Last Updated**: 2026-07-26
**Authority**: All developers MUST follow this contract. Violations = revert + fix.

---

## 1. Module Groups

| Group | Directory | Domain | Purpose |
|-------|-----------|--------|---------|
| **1-harian** | `modules/1-harian/` | Per mapel per hari | Absensi, Jurnal, Nilai, Rekap Semester |
| **2-piket** | `modules/2-piket/` | Per kelas per sekolah | Laporan Piket, Pelanggaran, Pembinaan |
| **3-administrasi** | `modules/3-administrasi/` | Per mapel per semester | Promes, Prota, RPP, Laporan Semester |
| **4-integrasi** | `modules/4-integrasi/` | Cross-cutting | Import, AutoDoc, Completeness, Report Center |
| **5-data-dasar** | `modules/5-data-dasar/` | Master data | Profile, Roster, Assignments, Backup |
| **auth** | `modules/auth/` | Auth gate | Login, role check |

### 3-administrasi Sub-domains

| Sub-domain | Directory | Contents |
|------------|-----------|----------|
| _perencanaan | `3-administrasi/_perencanaan/` | calendar, prota, promes, schedule, atp |
| _dokumen-ajar | `3-administrasi/_dokumen-ajar/` | rpp, rpp-bulk, lkpd |
| _evaluasi | `3-administrasi/_evaluasi/` | evaluation-docs, remedial, pengayaan, semester-report, lainnya |
| _paket | `3-administrasi/_paket/` | admin-package (gate page) |

---

## 2. Path Aliases

| Alias | Resolves To | Usage |
|-------|-------------|-------|
| `@harian/*` | `modules/1-harian/*` | Harian module internal imports |
| `@piket/*` | `modules/2-piket/*` | Piket module internal imports |
| `@admin/*` | `modules/3-administrasi/*` | Admin module internal imports |
| `@modules/*` | `modules/*` | Cross-module access (integrasi, data-dasar) |
| `@shared/*` | `shared/*` | Shared infrastructure (DB, UI, docs) |
| `@routes/*` | `routes/*` | Page routes |
| `@guru-admin/domain` | `packages/domain` | Business logic + types (Zod schemas) |
| `@guru-admin/shared` | `packages/shared` | Constants + utility functions |

---

## 3. RULES — Module Boundary Contract

### Rule #1: NO Cross-Module Direct Imports

**A module at top level (e.g. 1-harian) MUST NOT import directly from another top-level module (e.g. 2-piket).**

```
❌ FORBIDDEN:
  // In modules/1-harian/attendance/SomeFile.tsx
  import { useDailyDutyState } from "@piket/daily-duty/useDailyDutyState";

  // In modules/2-piket/daily-duty/SomeFile.tsx  
  import { GradesPage } from "@harian/grades/GradesPage";
```

```
✅ ALLOWED:
  // In modules/1-harian/attendance/SomeFile.tsx
  import { listAttendanceRecords } from "@shared/db/attendance-repo";  // via shared
  import { AttendanceStatus } from "@guru-admin/domain";                // via domain package
```

**Why**: Direct cross-module imports create hidden coupling. When module A changes, module B breaks silently. Communication must go through the shared layer (DB repos, domain types, event system).

### Rule #2: Cross-Module Communication via @shared/ Only

**When modules need to share data or communicate, they MUST use @shared/ as the intermediary.**

Allowed communication channels:
1. **@shared/db/*-repo** — Read/write shared data (attendance-repo, journal-repo, etc.)
2. **@guru-admin/domain** — Shared types and business logic (Zod schemas, engines)
3. **@guru-admin/shared** — Constants (FEATURE_FLAGS, MONTH_LABELS_ID, etc.)
4. **@shared/ui/** — Shared UI components (Card, Button, Select, etc.)
5. **@shared/documents/** — Document rendering infrastructure
6. **Event/Callback pattern** — Parent components can pass callbacks across module boundaries

```
✅ Example: Harian reading Piket data (for Report Center)
  // In modules/4-integrasi/report-center/PiketReportTab.tsx
  import { listDutyReports } from "@shared/db/daily-duty-repo";       // shared DB repo
  import { DutyReport } from "@guru-admin/domain";                     // shared type
```

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

| From → To | @harian | @piket | @admin | @modules/4-* | @modules/5-* | @shared | @domain | @shared-pkg |
|-----------|---------|--------|--------|--------------|--------------|---------|---------|-------------|
| **1-harian** | ✅ self | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **2-piket** | ❌ | ✅ self | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **3-administrasi** | ❌ | ❌ | ✅ self | ❌ | ❌ | ✅ | ✅ | ✅ |
| **4-integrasi** | ❌ | ❌ | ❌ | ✅ self | ❌ | ✅ | ✅ | ✅ |
| **5-data-dasar** | ❌ | ❌ | ❌ | ❌ | ✅ self | ✅ | ✅ | ✅ |
| **@shared** | ❌ all | ❌ all | ❌ all | ❌ all | ❌ all | ✅ self | ✅ | ✅ |
| **App.tsx** | ✅ lazy | ✅ lazy | ✅ lazy | ✅ lazy | ✅ lazy | ✅ direct | ✅ | ✅ |

**Note**: App.tsx is the ONLY file allowed to import from all module groups (via React.lazy). It's the router composition layer — not business logic.

**Note**: @shared/ is infrastructure (DB repos, UI primitives). It MUST NOT import from any module. Modules import from @shared/; @shared/ does NOT import from modules.

---

## 5. Data Layer Boundaries

### Dexie Tables — Shared, Not Module-Private

All 25 Dexie tables live in `@shared/db/schema.ts`. They are shared infrastructure — any module can read/write through the repo layer.

**No module creates private Dexie tables.** If a module needs persistence, it adds a table to the shared schema with a versioned migration.

### Supabase — Optional Cloud Sync

Supabase is for cloud sync only. The sync bridge (`@shared/supabase/daily-bridge.ts`) is shared infrastructure — not owned by any module.

---

## 6. Workflow Standards

Every sub-domain that involves document generation or complex UI MUST have a WORKFLOW-STANDARDS.md file:

| Sub-domain | Standards File | Status |
|------------|---------------|--------|
| promes | `3-administrasi/_perencanaan/promes/PROMES-WORKFLOW-STANDARDS.md` | ✅ Exists |
| harian (future) | `1-harian/HARIAN-WORKFLOW.md` | ⏳ To be created in Sprint 4 |
| piket (future) | `2-piket/PIKET-WORKFLOW.md` | ⏳ To be created |
| admin (future) | `3-administrasi/ADMIN-WORKFLOW.md` | ⏳ To be created |

---

## 7. Enforcement

### Pre-Commit Check (Manual)

Before committing code that adds imports, verify:
1. Does this import cross a module boundary? → If yes, route through @shared/ or @guru-admin/domain
2. Is this UI component used by 2+ modules? → If yes, extract to @shared/ui/
3. Am I creating a new Dexie table? → If yes, add to shared schema with migration

### ESLint Rule (Future)

Custom ESLint rule `no-cross-module-import` should be implemented to automatically flag violations:
```javascript
// Forbidden patterns:
import ... from "@harian/..."   // inside @piket/ files
import ... from "@piket/..."    // inside @harian/ files
import ... from "@admin/..."    // inside @harian/ or @piket/ files
```

---

## 8. Change Management

Changes to this contract MUST follow the same ANALYZE → SPECIFY → UPDATE → CODE → QA → BUILD → COMMIT workflow as PROMES-WORKFLOW-STANDARDS.md.

**This document is the architectural constitution. No ad-hoc violations.**

---

## 9. Git Commit History (Baseline)

| Commit | Description |
|--------|-------------|
| `a62eb2b` | Pre-Phase-0 safety checkpoint |
| `f104def` | Phase 0: cleanup (dead code, stale assets, types, domain barrel) |
| `f5a3704` | Option A: path aliases + 343 import rewrites |
| `2ec6dd9` | Phase 1: module reorg into 5 groups |
| `ba196ff` | Langkah 1: navigation.ts update |

**Rollback**: `git revert <commit-hash>` for any step.

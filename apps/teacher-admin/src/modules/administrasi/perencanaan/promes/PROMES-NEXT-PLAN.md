# PROMES Next Development Plan — Sprint 5

> **Berbasis**: PROMES-WORKFLOW-STANDARDS.md §8.2 (Open Issues)
> **Prinsip**: Kerja berdasarkan spec ID, bukan tambal sulam. Setiap task referensi ke spec lock.

---

## Sprint Overview

| Sprint | Fokus | Estimasi | Status |
|--------|-------|----------|--------|
| Sprint 1-3 | Core module (engine, 3 variasi, persistence) | Selesai | ✅ |
| Sprint 4 | v5 Document-Centric Formal (kop, serif, borders, pastel) | Selesai | ✅ |
| **Sprint 5** | **QA Lock + Export + Logo + Responsive** | **2-3 hari** | 🔄 |
| Sprint 6 | Cross-module integration (RPP ↔ Promes) | Future | 📋 |

---

## Sprint 5 Task Board

### Phase A: QA Lock — Print Verification (HIGHEST PRIORITY)

> **Reasoning**: Print CSS ada 550+ lines tapi **tidak pernah di-test di real PDF**. Ini gap paling berisiko — bisa jadi border, font, spacing semua broken di output PDF. Harus verifikasi sebelum declare "production ready".

#### A1. Print QA Manual Test Matrix

| # | Test Scenario | Expected Result | Spec Ref | Method |
|---|---------------|----------------|---------|--------|
| A1.1 | Print Merdeka → PDF | Kop surat renders (logo box + instansi hierarchy + double border) | KOP-01–11 | Browser Print → Save as PDF |
| A1.2 | Print Merdeka → PDF | All table borders visible (outer 2px, inner 1px) | BORD-01–04 | Visual inspection on PDF |
| A1.3 | Print Merdeka → PDF | Serif font (Times New Roman) renders in all cells | CSS-03/06 | Text selection → font check |
| A1.4 | Print Merdeka → PDF | Badge colors print (pastel muted backgrounds visible) | CLR-01–10 | Color visible, not washed out |
| A1.5 | Print Merdeka → PDF | Signature block renders (NIP, name, role, place-date) | SIG-01–04 | All 4 fields visible |
| A1.6 | Print Merdeka → PDF | Page fits A4 landscape (no overflow, no cut-off) | LAY-01–04 | Content within margins |
| A1.7 | Print Matrix → PDF | Legacy format renders correctly | — | Quick check |
| A1.8 | Print Portrait → PDF | Ringkas format renders correctly | — | Quick check |

**Deliverable**: Print QA checklist result (pass/fail per item) + screenshot of PDF output.

> **PR-GATE**: Jika A1.1–A1.6 ada yang **FAIL**, Sprint 5 blocked. Fix print issues first.

#### A2. Print Bug Fix (if any A1 items fail)

| # | Task | Approach | Spec Ref |
|---|------|---------|---------|
| A2.1 | Fix any print rendering bugs found in A1 | Update `document-print.css` @media print section, reference spec IDs | Per relevant spec |

---

### Phase B: Component Test Coverage (HIGH)

> **Reasoning**: Domain engine ada 16 test cases, tapi **zero UI/component tests**. Jika MerdekaDocument break silently (missing rowSpan, badge in wrong row, missing NIP), tidak ada automated detection.

#### B1. PromesMerdekaDocument Structure Test

| # | Test Case | Expected Assertion | Spec Ref |
|---|-----------|-------------------|---------|
| B1.1 | Renders all 6 sections | Kop, Title, Identity, Table, Legend, Signature present | COMP-01–07 |
| B1.2 | Kop surat structure | Logo box + kop-text with 4 lines (instansi, dinas, unit, address) | KOP-01–10 |
| B1.3 | Double border renders | `.promes-merdeka-kop-double-border` element exists | KOP-11 |
| B1.4 | Matrix table structure | Header row 1 (Elemen, KodeTP, Materi, Alokasi, months) + row 2 (weeks) | COMP-08 |
| B1.5 | Elemen rowSpan correct | `rowSpan={group.tpCount}` for each element group | COMP-08 |
| B1.6 | Cadangan row present | colSpan=3 label + JP column + week cells | COMP-09 |
| B1.7 | Kokurikuler row (conditional) | Present only when `summary.koTotalJP > 0` | COMP-10 |
| B1.8 | Total row present | "JUMLAH JP PER MINGGU" label + totalJP value | COMP-11 |
| B1.9 | Agenda row present | "AGENDA NON-KBM" label + badge cells for event weeks | COMP-12 |
| B1.10 | Signature NIP | Left: `NIP. ${headmasterNip}`, Right: `NIP. ${teacherNip}` | SIG-02/03 |

**File**: `apps/teacher-admin/src/modules/promes/__tests__/PromesMerdekaDocument.test.tsx`
**Framework**: Vitest + React Testing Library (already in project)

#### B2. resolveMerdekaWeekCell Contract Test

| # | Test Case | Expected Result | Spec Ref |
|---|-----------|----------------|---------|
| B2.1 | materi + event week | className includes colClass, content = null | CELL-01 |
| B2.2 | materi + KBM week + unitId | content = unitJP number or "-" | CELL-01 |
| B2.3 | agenda + event week | content = `<span className="merdeka-badge {badgeClass}">{label}</span>` | CELL-05 |
| B2.4 | agenda + non-event week | content = "-" | CELL-05 |
| B2.5 | total + event week | content = "-" | CELL-04 |
| B2.6 | total + KBM week | content = intraJP + koJP (NOT + cadangan) | BR-01/02 |
| B2.7 | cadangan + KBM week | content = numeric JP (NOT "C") | CELL-02 |
| B2.8 | kokurikuler + KBM week | content = numeric koJP | CELL-03 |

**File**: `apps/teacher-admin/src/modules/promes/__tests__/resolveMerdekaWeekCell.test.tsx`

---

### Phase C: Logo Injection (MEDIUM → LOW, tapi user-facing impact)

> **Reasoning**: Kop surat shows "LOGO" placeholder. Guru/admin akan expect logo sekolah mereka muncul. Ini quick win — tambah prop `logoUrl` + render `<img>` instead of placeholder div.

#### C1. Logo Prop Addition

| # | Task | File | Spec Ref | Detail |
|---|------|------|---------|--------|
| C1.1 | Add `logoUrl?: string` prop to PromesMerdekaDocument | PromesMerdekaDocument.tsx | KOP-02 | Pass through from school profile |
| C1.2 | Conditional render: logoUrl → `<img>`, else → placeholder | PromesMerdekaDocument.tsx | KOP-04 | `<img src={logoUrl} className="document-logo" />` vs placeholder div |
| C1.3 | Pass logoUrl from SchoolProfile | usePromesState.ts | — | `school?.logoUrl` → prop chain |
| C1.4 | Print: logo renders in PDF | document-print.css | — | `.document-logo { max-width: 64px; max-height: 64px }` already exists |

**Spec impact**: KOP-02 (logo box), KOP-04 (placeholder border). Logo injection should NOT change border/padding specs — just switch content.

---

### Phase D: Responsive Tablet Optimization (MEDIUM)

> **Reasoning**: Canvas 297mm fixed width — pada viewport 768-1024px, akan scale down dan font bisa terlalu kecil. Need responsive breakpoint optimization.

#### D1. Tablet Breakpoint CSS

| # | Task | CSS Property | Spec Ref | Detail |
|---|------|-------------|---------|--------|
| D1.1 | Tablet canvas scaling | `@media (max-width: 1024px) .wysiwyg-canvas.wysiwyg-landscape { width: 100%; min-height: auto; }` | LAY-05 | Already exists in wysiwyg-canvas.css line 257 |
| D1.2 | Tablet font-size bump | `.wysiwyg-canvas .document-page.promes-merdeka-page { font-size: 8pt !important }` on tablet | TYPO-03 | Override 7.5pt → 8pt for readability |
| D1.3 | Sidebar collapse on tablet | `.doc-sidebar { position: fixed; transform: translateX(-100%) }` | LAY-07 | Already exists — mobile overlay behavior |
| D1.4 | Table horizontal scroll | `.merdeka-table-container { overflow-x: auto }` on tablet | CSS-14 | Already implemented — works on narrow screens |

**Note**: D1.1, D1.3, D1.4 already exist. Only D1.2 needs new CSS rule.

---

### Phase E: DOCX Export Foundation (LOW — future sprint)

> **Reasoning**: docx library available (imported in vendor bundle), tapi no merdeka exporter. Ini bisa jadi Sprint 6 feature. Untuk Sprint 5, cukup buat **interface/contract** — bukan full implementation.

#### E1. DOCX Export Contract Design

| # | Task | File | Detail |
|---|------|------|--------|
| E1.1 | Define `PromesDocxExporter` interface | `shared/exporters/promes-docx-exporter.ts` | Type signature + mock skeleton |
| E1.2 | Define merdeka DOCX layout spec | `PROMES-WORKFLOW-STANDARDS.md` §Appendix C | Table layout mapping: CSS → docx XML equivalent |
| E1.3 | Research docx library capabilities | `packages/vendor/docx` | Check: border, font, rowSpan, background color support |

**Deliverable**: Interface + spec document. Implementation deferred to Sprint 6.

---

## Task Priority Matrix

| Task | Priority | Effort | Risk | Dependency | Sprint 5? |
|------|----------|--------|------|------------|-----------|
| A1: Print QA Manual | **P0** | 1-2 jam | HIGH (unknown bugs possible) | None | ✅ YES |
| A2: Print Bug Fix | **P0** | Variable | Depends on A1 results | A1 | ✅ YES |
| B1: Component Tests | **P1** | 4-6 jam | LOW | Vitest setup | ✅ YES |
| B2: Cell Resolver Tests | **P1** | 2-3 jam | LOW | B1 setup | ✅ YES |
| C1: Logo Injection | **P2** | 2-3 jam | LOW | SchoolProfile.logoUrl field | ✅ YES |
| D1: Responsive Tablet | **P2** | 1 jam | LOW | — | ✅ YES (D1.2 only) |
| E1: DOCX Contract | **P3** | 3-4 jam | LOW | — | Partial (E1.1 + E1.2 only) |

---

## Execution Order (Recommended)

```
Day 1 Morning:  A1 → Print QA Manual (1-2 jam)
Day 1 Afternoon: A2 → Fix any print bugs found
Day 2 Morning:  B1 + B2 → Component + cell resolver tests
Day 2 Afternoon: C1 → Logo injection + D1.2 → Tablet font bump
Day 3:          E1.1 + E1.2 → DOCX export contract (if time permits)
```

---

## Gate Rules

1. **A1 is the blocker** — Jika print QA reveals bugs, ALL other tasks paused until print fixes complete.
2. **Every code change references spec ID** — BORD-03, KOP-02, CELL-05, etc. No tambal sulam.
3. **Every test case references spec ID** — COMP-08, BR-01, SIG-02, etc. No blind assertions.
4. **Build must pass** — `cd apps/teacher-admin && npx vite build` zero errors before commit.
5. **Workflow Standards MD updated** — Add new spec IDs if needed, update §8.1/8.2 after each fix.

---

## Success Criteria (Sprint 5 Complete When)

| # | Criterion | Evidence |
|---|-----------|---------|
| SC1 | Print QA all pass (A1.1–A1.6) | PDF screenshots + checklist |
| SC2 | Print bugs fixed (if any) | Git commit referencing spec IDs |
| SC3 | 18 component/cell tests pass | Vitest run output, zero failures |
| SC4 | Logo injection works (logoUrl prop) | MerdekaDocument renders with real logo |
| SC5 | Responsive tablet font bump | CSS rule added per D1.2 |
| SC6 | Build passes | `npx vite build` zero errors |
| SC7 | Workflow Standards MD updated | §8.1 + §8.2 + Appendix updated |

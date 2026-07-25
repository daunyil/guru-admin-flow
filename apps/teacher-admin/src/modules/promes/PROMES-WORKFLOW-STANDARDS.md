# PROMES Workflow Standards — Document-Centric Formal v5

> **KUNCI WORKFLOW**: Dokumen ini adalah **Single Source of Truth** untuk semua standar visual, arsitektur CSS, QA checklist, dan proses perubahan pada modul Promes. Setiap commit yang mengubah CSS/component Promes **WAJIB** melewati gate di dokumen ini. Tanpa referensi ke spec table yang relevan, PR **DITOLAK**.

---

## Daftar Isi

1. [Arsitektur & Dependency Map](#1-arsitektur--dependency-map)
2. [CSS Specification Tables — Nilai Kunci](#2-css-specification-tables--nilai-kunci)
3. [Component Specification Tables](#3-component-specification-tables)
4. [Business Rules (Domain Logic)](#4-business-rules-domain-logic)
5. [CSS Architecture Rules](#5-css-architecture-rules)
6. [Visual QA Checklist](#6-visual-qa-checklist)
7. [Change Management Process](#7-change-management-process)
8. [Known Issues & Remediation Log](#8-known-issues--remediation-log)

---

## 1. Arsitektur & Dependency Map

### File Inventory

| File | Path | Lines | Role | Change Risk |
|------|------|-------|------|-------------|
| `PromesPage.tsx` | `modules/promes/` | 210 | Top-level composition router | LOW |
| `PromesSidebar.tsx` | `modules/promes/` | 244 | WYSIWYG sidebar panel | LOW |
| `PromesFormView.tsx` | `modules/promes/` | 183 | Form view (no result state) | LOW |
| `PromesPortraitDocument.tsx` | `modules/promes/` | 200 | Portrait "ringkas" document | MEDIUM |
| `PromesMerdekaDocument.tsx` | `modules/promes/` | 326 | Landscape "merdeka" v5 document | **HIGH** |
| `PromesLandscapeMatrixDocument.tsx` | `modules/promes/` | 239 | Landscape "matrix" legacy | MEDIUM |
| `usePromesState.ts` | `modules/promes/` | 325 | State hook (15 useState, 2 ref, 3 effect) | MEDIUM |
| `promes-helpers.tsx` | `modules/promes/` | 574 | Shared helpers, types, cell resolvers | **HIGH** |
| `DocumentLayout.tsx` | `shared/documents/` | 529 | DocumentPage, Signature, Title, Table components | MEDIUM |
| `DocumentPreview.tsx` | `shared/documents/` | 309 | WYSIWYG preview + auto-save + error boundary | LOW |
| `document-print.css` | `shared/documents/` | 1848 | **CSS SSoT** — screen + print ALL document styles | **CRITICAL** |
| `wysiwyg-canvas.css` | `shared/documents/` | 913 | Canvas A4 sizing + sidebar + toolbar | **HIGH** |
| `promes-engine.ts` | `packages/domain/src/` | 480 | Pure function engine (9-step algorithm) | MEDIUM |
| `promes-types.ts` | `packages/domain/src/` | 161 | Domain types (PromesWeek, PromesResult, etc.) | MEDIUM |

### Component Hierarchy

```
PromesPage
  ├── [result=null] → PromesFormView
  └── [result exists] → doc-wysiwyg-layout
        ├── PromesSidebar (doc-sidebar-scroll)
        │     ├── Konteks & Opsi (variasi, semester, JP)
        │     ├── Ringkasan (Badge + doc-summary-dl)
        │     ├── Distribusi Materi (doc-sidebar-list)
        │     └── Errors / Warnings
        │
        └── DocumentPreview
              ├── wysiwyg-toolbar (status, save, format, print)
              └── wysiwyg-canvas
                    ├── [variasi=ringkas]  → PromesPortraitDocument
                    ├── [variasi=matrix]   → PromesLandscapeMatrixDocument
                    └── [variasi=merdeka]  → PromesMerdekaDocument
```

### Three Variasi Comparison

| Aspect | Ringkas (Portrait) | Matrix (Landscape) | Merdeka (Landscape) |
|--------|-------------------|--------------------|--------------------|
| Orientation | `portrait` | `landscape` | `landscape` |
| Font family | Arial 11pt | Arial 7.5pt | Times New Roman 7.5pt |
| Table type | DocumentTable (abstracted) | Raw `<table>` | Raw `<table>` |
| Kop surat | DocumentHeader | DocumentTitle | Custom merdeka kop + double border |
| Identity | DocumentIdentityTable | DocumentIdentityTable | Custom merdeka identity (serif) |
| JP columns | Intra/KO per row | Intra/Koku/Total (3 sub-cols) | Single "Alokasi Waktu" |
| Event display | Inline text | Vertical text `.promes-vertical-label` | CSS bg only + badge in agenda row |
| Materi layout | Week-per-row list | No/Elemen/Materi + weeks | Elemen(rowSpan)/KodeTP/Materi + weeks |
| Helper | `isPureCadanganWeek` | `buildMateriRows` + `resolveLandscapeWeekCell` | `buildMateriRowsWithElements` + `resolveMerdekaWeekCell` |

---

## 2. CSS Specification Tables — Nilai Kunci

> **PR-GATE**: Setiap CSS value change pada tabel di bawah **WAJIB** update spec table ini + link commit. Tabel ini adalah **lock** — perubahan tanpa update tabel = violation.

### 2.1 Typography Spec

| Property | Ringkas | Matrix | Merdeka | Spec ID |
|----------|---------|--------|---------|---------|
| `font-family` (page) | Arial, Helvetica, sans-serif | Arial, Helvetica, sans-serif | 'Times New Roman', Georgia, serif | TYPO-01 |
| `font-family` (th/td) | inherit | inherit | 'Times New Roman', Georgia, serif | TYPO-02 |
| `font-size` (page) | 11pt | 7.5pt | 7.5pt | TYPO-03 |
| `font-size` (th header) | inherit | 8pt | 7.5pt | TYPO-04 |
| `font-size` (th month) | — | 7.5pt | 7.5pt | TYPO-05 |
| `font-size` (th week) | — | 6.5pt | 6.5pt | TYPO-06 |
| `font-size` (td data) | inherit | 7.5pt | 7.5pt | TYPO-07 |
| `font-size` (td total-label) | — | 7pt | 7pt | TYPO-08 |
| `font-size` (td agenda-label) | — | 7pt | 7pt | TYPO-09 |
| `font-size` (badge) | — | — | 7pt | TYPO-10 |
| `line-height` (page) | 1.25 | 1.1 | 1.1 | TYPO-11 |
| `line-height` (kop line) | — | — | 1.25 | TYPO-12 |

### 2.2 Border Spec

| Element | Border Width | Border Color | Border Style | Spec ID |
|---------|-------------|-------------|-------------|---------|
| Matrix table outer | 2px | #000 | solid | BORD-01 |
| Merdeka table outer | 2px | #000 | solid | BORD-02 |
| Merdeka th (inner) | **1px** | #000 | solid | BORD-03 |
| Merdeka td (inner) | **1px** | #000 | solid | BORD-04 |
| Matrix th/td (inner) | 1px | inherit | solid | BORD-05 |
| Kop double border | 3px | #000 | double | BORD-06 |
| Logo placeholder | **1px** | #000 | solid | BORD-07 |
| Badge border | **1px** | per variant | solid | BORD-08 |
| Legend block border | **1px** | #000 | solid | BORD-09 |
| Signature name underline | text-decoration | — | underline | BORD-10 |

> **LOCK RULE**: BORD-03 dan BORD-04 **WAJIB** 1px. Jangan revert ke 1.5px tanpa approval. Outer border (BORD-01/02) **WAJIB** 2px untuk visual hierarchy formal.

### 2.3 Padding Spec

| Element | Padding Value | Spec ID |
|---------|--------------|---------|
| Merdeka th | **3pt 4pt** | PADD-01 |
| Merdeka td | **2pt 3pt** | PADD-02 |
| Merdeka th-week | **2pt 3pt** | PADD-03 |
| Merdeka identity td | 1pt 3pt | PADD-04 |
| Kop surat padding | 4pt 0 6pt 0 | PADD-05 |
| Badge padding | 1pt 4pt | PADD-06 |
| Legend padding | 3pt 6pt | PADD-07 |
| Signature block | center | PADD-08 |

> **LOCK RULE**: PADD-01 dan PADD-02 **tidak boleh** dikurangi di bawah 2pt tanpa QA approval. Cramped padding = readability regression.

### 2.4 Color Spec — Merdeka Event System

#### Badge Colors (Pastel Muted + Formal)

| Event Kind | Badge Bg | Badge Text | Badge Border | Col Bg | Spec ID |
|------------|----------|------------|-------------|--------|---------|
| MPLS `[M]` | #f5e6c8 | #5a3e1b | #8b6914 | #faf5eb | CLR-01 |
| HUT `[H]` | #f5d0d0 | #5a1a1a | #8b2020 | #faebeb | CLR-02 |
| STS `[STS]` | #dce8f5 | #1a3a6a | #4a6a9a | #ebf0f8 | CLR-03 |
| SAS `[SAS]` | #e8d5f5 | #3a1a5a | #6a4a8a | #f0e8f5 | CLR-04 |
| CM `[CM]` | #d5f5e0 | #1a4a2a | #4a8a5a | #e8f5eb | CLR-05 |
| RL `[R/L]` | #d8dde3 | #1a2a3a | #4a5a6a | #ebeef2 | CLR-06 |
| Remedial `[Rem]` | #dce8f5 | #1a3a6a | #4a6a9a | #ebf0f8 | CLR-07 |
| Kokurikuler `[KO]` | #d5f5e0 | #1a4a2a | #4a8a5a | #e8f5eb | CLR-08 |
| Holiday `[L]` | #f5d0d0 | #5a1a1a | #8b2020 | #faebeb | CLR-09 |
| Other `[*]` | #f5e6c8 | #5a3e1b | #8b6914 | #faf5eb | CLR-10 |

#### Header Colors

| Element | Background | Text | Spec ID |
|---------|-----------|------|---------|
| Header row (row 1) | #1a1a2e | white | CLR-11 |
| Subheader row (row 2) | #2d2d44 | white | CLR-12 |
| Elemen td | #f0f0f0 | #000 | CLR-13 |
| Data row (odd) | white | #000 | CLR-14 |
| Data row (alt/even) | #fafafa | #000 | CLR-15 |
| Cadangan row | #faf8e8 | #333 | CLR-16 |
| Kokurikuler row | #eaf5ea | #333 | CLR-17 |
| Total row | #ddd | #000 | CLR-18 |
| Agenda row | #f5f5f5 | #000 | CLR-19 |

### 2.5 Layout Spec

| Property | Value | Spec ID |
|----------|-------|---------|
| Document page landscape width | 297mm | LAY-01 |
| Document page landscape min-height | 210mm | LAY-02 |
| Document page landscape padding | 10mm 12mm 10mm 12mm | LAY-03 |
| Print @page margin (landscape) | 10mm 12mm | LAY-04 |
| Canvas landscape width | 297mm | LAY-05 |
| Canvas landscape padding | 10mm 12mm | LAY-06 |
| Sidebar width | 320px (min 280, max 360) | LAY-07 |
| Signature grid columns | 1fr 1fr | LAY-08 |
| Signature grid gap (generic) | 48px | LAY-09 |
| Signature grid gap (merdeka) | **24pt** | LAY-10 |
| Signature grid margin-top (generic) | 24px | LAY-11 |
| Signature grid margin-top (merdeka) | **10pt** | LAY-12 |
| Table overflow container | overflow-x: auto | LAY-13 |

### 2.6 Column Width Spec (Merdeka Matrix)

| Column | Width (%) | Spec ID |
|--------|----------|---------|
| Elemen | 7% | COL-01 |
| Kode TP | 5% | COL-02 |
| TP / Materi Pokok | 13% | COL-03 |
| Alokasi Waktu | 3% | COL-04 |
| Week columns (dynamic) | (100-28) / weekCount per col | COL-05 |

### 2.7 Kop Surat Spec

| Element | Value | Spec ID |
|---------|-------|---------|
| Kop layout | flex, align-items:center, justify-content:center | KOP-01 |
| Logo box width | 60pt | KOP-02 |
| Logo box height | 60pt | KOP-03 |
| Logo placeholder border | **1px solid #000** | KOP-04 |
| Logo placeholder font-size | 8pt | KOP-05 |
| Kop text layout | flex, flex-direction:column, align-items:center | KOP-06 |
| Instansi-1 font-size | 10pt, weight:700, letter-spacing:1pt | KOP-07 |
| Dinas font-size | 11pt, weight:700, letter-spacing:1.5pt | KOP-08 |
| Unit font-size | 13pt, weight:900, letter-spacing:1pt | KOP-09 |
| Address font-size | 8pt, weight:400, color:#333 | KOP-10 |
| Double border | 3px double #000, margin-top:3pt, margin-bottom:4pt | KOP-11 |
| **Print protection: Kop font-size hierarchy** | **KOP hierarchy WAJIB !important overrides di print mode — PROTECTED from generic .promes-landscape-page font-size:7pt flatten** | KOP-12 |

> **KOP-12 LOCK RULE**: Di print mode, `.promes-landscape-page { font-size: 7pt }` akan flatten SEMUA text ke 7pt, menghancurkan kop hierarchy (10pt→7pt, 11pt→7pt, 13pt→7pt). WAJIB tambah per-element !important font-size overrides di @media print untuk `.promes-merdeka-kop-instansi-1` (10pt), `.promes-merdeka-kop-dinas` (11pt), `.promes-merdeka-kop-unit` (13pt), `.promes-merdeka-kop-address` (8pt), `.promes-merdeka-kop-double-border` (3px double #000).

### 2.8 Title Spec

| Element | Value | Spec ID |
|---------|-------|---------|
| Title main font-weight | **900** | TITL-01 |
| Title main font-size | 12pt | TITL-02 |
| Title main letter-spacing | 2pt | TITL-03 |
| Title sub font-weight | **600** | TITL-04 |
| Title sub font-size | 9pt | TITL-05 |
| Title sub color | **#333** (NOT #000) | TITL-06 |
| Title sub letter-spacing | 1pt | TITL-07 |
| Title year font-weight | 700 | TITL-08 |
| Title year font-size | 8pt | TITL-09 |
| Title year color | #333 | TITL-10 |
| **Print protection: Title font-size hierarchy** | **Title hierarchy WAJIB !important overrides di print mode — PROTECTED from 7pt flatten** | TITL-11 |

> **TITL-11 LOCK RULE**: Di print mode, generic `.promes-landscape-page { font-size: 7pt }` akan flatten title hierarchy (12pt→7pt, 9pt→7pt, 8pt→7pt). WAJIB tambah per-element !important font-size overrides: `.promes-merdeka-title-main-doc` (12pt, weight:900), `.promes-merdeka-title-sub-doc` (9pt, weight:600, color:#333), `.promes-merdeka-title-year-doc` (8pt, weight:700, color:#333).

> **LOCK RULE**: TITL-04 weight **600** (NOT 700). TITL-06 color **#333** (NOT #000). Ini create hierarchy — main title (900/#000) vs subtitle (600/#333). Jangan flatten.

---

## 3. Component Specification Tables

### 3.1 PromesMerdekaDocument Internal Layout Order

| Section | Component/Class | Mandatory? | Spec ID |
|---------|----------------|------------|---------|
| 1. Kop Surat | `.promes-merdeka-kop-surat` + `.promes-merdeka-kop-double-border` | YES | COMP-01 |
| 2. Title | `.promes-merdeka-title-block-doc` | YES | COMP-02 |
| 3. Identity | `.promes-merdeka-identity-table` | YES | COMP-03 |
| 4. Matrix Table | `.merdeka-table-container` > `.merdeka-matrix-table` | YES | COMP-04 |
| 5. Legend | `.merdeka-legend-block` | YES (if activeEvents exist) | COMP-05 |
| 6. Warning | `.promes-warning` | YES (if status !== "valid") | COMP-06 |
| 7. Signature | `DocumentSignature` (left: Kepala, right: Guru) | YES | COMP-07 |

> **LOCK RULE**: Section order **WAJIB** 1→2→3→4→5→6→7. Jangan reorder atau skip section tanpa blueprint approval.

### 3.2 Merdeka Matrix Table Structure

| Row Type | colSpan Label | colSpan Value | JP Column | Cell Resolver Context | Spec ID |
|----------|-------------|---------------|-----------|----------------------|---------|
| Data rows (per TP) | Elemen(rowSpan) + KodeTP + Materi | group.tpCount + 1 + 1 | single "{totalJP} JP" | `"materi"` | COMP-08 |
| Cadangan row | "Jam Cadangan / Remedial / Pengayaan" | 3 | separate JP | `"cadangan"` | COMP-09 |
| Kokurikuler row | "Kokurikuler (Projek P5)" | 3 | separate JP | `"kokurikuler"` | COMP-10 |
| Total row | "JUMLAH JP PER MINGGU" | 3 | separate JP | `"total"` | COMP-11 |
| Agenda row | "AGENDA NON-KBM / ASESMEN / LIBUR" | 3 | "-" | `"agenda"` | COMP-12 |

### 3.3 resolveMerdekaWeekCell Contract

| Context | Event Week Output | Non-Event Week Output | Spec ID |
|---------|-------------------|----------------------|---------|
| `materi` | className=`merdeka-td {colClass}`, content=`null`, title=event.title | className=`merdeka-td`, content=unitJP or `"-"` | CELL-01 |
| `cadangan` | className=`merdeka-td {colClass}`, content=`null` | className=`merdeka-td merdeka-td-cadangan`, content=cadanganJP or `"-"` | CELL-02 |
| `kokurikuler` | className=`merdeka-td {colClass}`, content=`null` | className=`merdeka-td merdeka-td-koku-val`, content=koJP or `"-"` | CELL-03 |
| `total` | className=`merdeka-td merdeka-td-total-event`, content=`"-"` | className=`merdeka-td merdeka-td-total-val`, content=intraJP+koJP or `"-"` | CELL-04 |
| `agenda` | className=`merdeka-td merdeka-td-agenda-cell`, content=`<span className="merdeka-badge {badgeClass}">{label}</span>` | className=`merdeka-td`, content=`"-"` | CELL-05 |

> **LOCK RULE**: CELL-01 content `null` (NOT badge text). CELL-05 is the ONLY context that shows badge `<span>` elements. Jangan tambah badge di materi/cadangan/koku rows.

### 3.4 DocumentSignature Contract

| Field | Left (Kepala Sekolah) | Right (Guru Mata Pelajaran) | Spec ID |
|-------|----------------------|----------------------------|---------|
| role | "Mengetahui,\nKepala Sekolah" | "Guru Mata Pelajaran" | SIG-01 |
| name | headmasterName | teacherName | SIG-02 |
| nip | headmasterNip | teacherNip | SIG-03 |
| placeDate | — (blank) | "{schoolRegency}, {formatLongDateID(todayISODate())}" | SIG-04 |
| **Print protection: Signature readability** | **Signature font-size WAJIB !important overrides di print mode — PROTECTED from 7pt flatten** | SIG-05 |

> **SIG-05 LOCK RULE**: Di print mode, `.promes-landscape-page { font-size: 7pt }` akan flatten signature text ke 7pt (too small for formal document). WAJIB tambah per-element !important overrides: `.signature-role` (8pt), `.signature-name` (9pt), `.signature-nip` (7.5pt), `.signature-place-date` (7.5pt).

---

## 4. Business Rules (Domain Logic)

### 4.1 JP Calculation Rules (Enforced in `resolveMerdekaWeekCell`)

| Rule | Formula | Spec ID |
|------|---------|---------|
| Total JP per KBM week | intraCapacityJP + koJP = 2 + 1 = **3 JP** | BR-01 |
| Cadangan subset | reservedForCadangan ⊂ intraCapacityJP (NOT added separately) | BR-02 |
| Event week JP | `"-"` (no KBM) | BR-03 |
| Total JP semester | intraCapacityJP + koTotalJP (e.g., 50 + 25 = 75) | BR-04 |

> **LOCK RULE**: BR-02 — reservedForCadangan **DITOLAK** sebagai add-on di total row. Ini adalah subset intraCapacityJP, sudah terhitung.

### 4.2 Data Field Separation (RULE 1 from `promes-helpers.tsx`)

| Column | Data Source | Max Length | Example | Spec ID |
|--------|-----------|-----------|---------|---------|
| Elemen | `extractElemenName(code, learningOutcome, title)` | ≤30 chars | "Pancasila", "TP 7" | BR-05 |
| KodeTP | `extractKodeTP(code, title)` | ≤10 chars | "TP 7.1", "SLM 1" | BR-06 |
| Materi | `compactText(title, 7)` | ≤7 words | "Mengidentifikasi sikap Pancasila" | BR-07 |

> **LOCK RULE**: BR-06 KodeTP **WAJIB** short code (max 10 chars). **DITOLAK** full title atau learningOutcome di KodeTP column.

### 4.3 Badge Display Rules (RULE 3-4 from `promes-helpers.tsx`)

| Rule | Description | Spec ID |
|------|-------------|---------|
| RULE 3 | Badge/vertical text **DITOLAK** di materi/cadangan/koku schedule cells. Event weeks = CSS background ONLY. | BR-08 |
| RULE 4 | Badge labels `[M]`, `[STS]`, `[SAS]`, etc. **ONLY** in agenda row (`context="agenda"`). | BR-09 |

---

## 5. CSS Architecture Rules

### 5.1 Single Source of Truth (SSoT)

| File | Authority Domain | Rule ID |
|------|-----------------|---------|
| `document-print.css` | ALL document screen + print styles (kop, tabel, signature, merdeka, matrix) | CSS-01 |
| `wysiwyg-canvas.css` | A4 canvas sizing, toolbar, sidebar, responsive layout | CSS-02 |

> **CSS-01 LOCK**: JANGAN tambah @media print rules di file lain. `document-print.css` adalah print SSoT.
> **CSS-02 LOCK**: JANGAN override document content styling dari `wysiwyg-canvas.css`. Canvas CSS hanya untuk layout infrastructure.

### 5.2 Cascade War Resolution Protocol

| Problem | Solution | Spec ID |
|---------|----------|---------|
| Generic `.document-page` font override blocks merdeka serif | `.wysiwyg-canvas .document-page.promes-merdeka-page { font-family: 'Times New Roman' !important }` | CSS-03 |
| Generic `.document-page` font-size overrides landscape compact | `.wysiwyg-canvas .document-page.promes-landscape-page { font-size: 7.5pt !important }` | CSS-04 |
| Inline style in `DocumentPage` component blocks CSS !important | Skip inline fontSize/lineHeight when `className.includes("promes-landscape-page")` | CSS-05 |
| Merdeka page needs serif for ALL child elements | `.wysiwyg-canvas .document-page.promes-merdeka-page * { font-family: 'Times New Roman' !important }` | CSS-06 |
| `padding:0 !important` override on `.document-page` inside wysiwyg | **REMOVED** — `.document-page` padding controlled by `document-print.css` SSoT only | CSS-07 |

### 5.3 CSS Class Naming Convention

| Pattern | Format | Example | Rule ID |
|---------|--------|---------|---------|
| Merdeka-specific | `promes-merdeka-{section}-{element}` | `promes-merdeka-kop-surat`, `promes-merdeka-kop-logo-box` | CSS-08 |
| Merdeka table cell | `merdeka-{element}` | `merdeka-th`, `merdeka-td`, `merdeka-td-elemen` | CSS-09 |
| Merdeka event column | `merdeka-col-{eventkind}` | `merdeka-col-sts`, `merdeka-col-hut` | CSS-10 |
| Merdeka badge variant | `merdeka-badge-{eventkind}` | `merdeka-badge-sts`, `merdeka-badge-cm` | CSS-11 |
| Matrix legacy | `promes-{element}` | `promes-matrix-table`, `promes-event-cell` | CSS-12 |
| Shared document | `document-{element}` | `document-page`, `document-header` | CSS-13 |

> **CSS-08 LOCK**: Merdeka classes **WAJIB** prefixed `promes-merdeka-` (kop/identity/title) atau `merdeka-` (table cells/badges). Jangan create unprefixed classes untuk merdeka elements.

### 5.4 Overflow & Layout Safety

| Rule | CSS Property | Spec ID |
|------|-------------|---------|
| Matrix table overflow | `.merdeka-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }` | CSS-14 |
| Word wrap in narrow columns | `.merdeka-td { word-wrap: break-word; overflow-wrap: break-word; }` | CSS-15 |
| Month header nowrap | `.merdeka-th-month { white-space: nowrap; }` | CSS-16 |
| Week header nowrap | `.merdeka-th-week { white-space: nowrap; }` | CSS-17 |
| Sidebar overflow | `.doc-sidebar-scroll { overflow-y: auto; overflow-x: hidden; }` | CSS-18 |
| Document area flex | `.doc-document-area { flex: 1; min-width: 0; }` | CSS-19 |

---

## 6. Visual QA Checklist

> **PR-GATE**: Setiap PR yang mengubah Promes visual **WAJIB** pass checklist ini. Failed item = PR blocked.

### 6.1 Kop Surat QA

| # | Check | Pass Criteria | Spec Ref |
|---|-------|--------------|---------|
| K1 | Logo box vertical alignment | Logo box center-aligned with text block (align-items:center) | KOP-01 |
| K2 | Text centering | All kop lines centered (flex, align-items:center on kop-text) | KOP-06 |
| K3 | Instansi hierarchy order | PEMERINTAH → DINAS → SATUAN → Alamat (correct order) | COMP-01 |
| K4 | Double border visible | 3px double #000 border below kop | KOP-11 |
| K5 | Font consistency | All kop text uses Times New Roman (serif) | TYPO-01 |

### 6.2 Matrix Table QA

| # | Check | Pass Criteria | Spec Ref |
|---|-------|--------------|---------|
| T1 | Outer border thickness | 2px solid #000 on table element | BORD-01/02 |
| T2 | Inner border consistency | **1px solid #000** on ALL th/td (NOT 1.5px) | BORD-03/04 |
| T3 | Header background | #1a1a2e (row 1), #2d2d44 (row 2) | CLR-11/12 |
| T4 | Cell padding | th: 3pt 4pt, td: 2pt 3pt — readable, not cramped | PADD-01/02 |
| T5 | Month header nowrap | "Jul", "Agu", "Okt", "Nov" not wrapping/breaking | CSS-16 |
| T6 | Week header nowrap | Week numbers "1", "2" etc. centered, not overlapping | CSS-17 |
| T7 | Word wrap on narrow columns | Long text in materi/kode breaks properly, not overflowing | CSS-15 |
| T8 | Table overflow | On narrow screens, table scrolls horizontally in container | CSS-14 |
| T9 | Elemen rowSpan | Elemen cell spans all TP rows in group (correct rowSpan count) | COMP-08 |
| T10 | Serif font enforcement | ALL cells use Times New Roman (not Arial fallback) | CSS-06 |

### 6.3 Data Row QA

| # | Check | Pass Criteria | Spec Ref |
|---|-------|--------------|---------|
| D1 | Numeric JP values | Materi cells show numbers (0,1,2,3) or `"-"`, NOT badge text | CELL-01 |
| D2 | Event week background | Event weeks show CSS bg color (pastel), content = null/empty | CELL-01 |
| D3 | Badge only in agenda | Badge `<span>` elements ONLY in agenda row context | BR-08/09 |
| D4 | Cadangan numeric | Cadangan cells show numeric JP, NOT `"C"` string | CELL-02 |
| D5 | Total formula | Total = intraCapacityJP + koJP (NOT + reservedForCadangan) | BR-01/02 |
| D6 | Event week total | Total row shows `"-"` on event weeks (NOT 0) | CELL-04 |
| D7 | Alternating row bg | Odd rows white, even rows #fafafa | CLR-14/15 |
| D8 | Elemen column styling | #f0f0f0 bg, font-weight:700, vertical-align:middle | CLR-13 |

### 6.4 Signature QA

| # | Check | Pass Criteria | Spec Ref |
|---|-------|--------------|---------|
| S1 | Serif font | Signature block uses Times New Roman | SIG-01 |
| S2 | NIP displayed | Both left (Kepala) and right (Guru) show NIP | SIG-02/03 |
| S3 | Place-date on right | Only right column shows place+date | SIG-04 |
| S4 | Name underline | Signature name has text-decoration:underline | BORD-10 |
| S5 | Spacing adequate | Signature-space height: 52px (not collapsed) | PADD-08 |

### 6.5 Print QA

| # | Check | Pass Criteria | Spec Ref |
|---|-------|--------------|---------|
| P1 | Print margins | @page landscape margin 10mm 12mm | LAY-04 |
| P2 | Padding removal | .promes-landscape-page padding:0 !important in print | LAY-03 |
| P3 | Serif print | Merdeka * font-family: serif !important in print | CSS-03 |
| P4 | Color print | print-color-adjust: exact on badge/col/table cells | CLR-01-10 |
| P5 | No overflow in print | overflow:hidden !important on landscape page in print | — |
| P6 | Border consistency print | Print th/td border: **1px solid #000** !important | BORD-03/04 |

---

## 7. Change Management Process

### 7.1 Change Classification

| Level | Description | Approval Required | Spec Table Update Required |
|-------|-------------|-------------------|---------------------------|
| **CRITICAL** | Changes to `document-print.css` merdeka section, `promes-helpers.tsx` cell resolver logic, `PromesMerdekaDocument.tsx` layout order | 2 reviewers + QA checklist pass | ALL affected spec IDs |
| **HIGH** | Changes to `wysiwyg-canvas.css` cascade overrides, `DocumentLayout.tsx` inline-style logic, `PromesLandscapeMatrixDocument.tsx` | 1 reviewer + QA checklist pass | Affected spec IDs |
| **MEDIUM** | Changes to `usePromesState.ts`, `PromesSidebar.tsx`, `PromesFormView.tsx`, domain engine | 1 reviewer | Relevant spec IDs only |
| **LOW** | Changes to `PromesPage.tsx`, `DocumentPreview.tsx`, sidebar UI, form UI | Self-review | N/A |

### 7.2 Mandatory Change Workflow

```
1. ANALYZE    → Identify affected spec IDs from tables above
2. SPECIFY    → Write exact new values BEFORE coding
3. UPDATE     → Update spec tables in this MD file FIRST
4. CODE       → Implement changes referencing spec IDs
5. QA         → Run Visual QA Checklist (Section 6)
6. BUILD      → Verify Vite build passes with zero errors
7. COMMIT     → Commit with message referencing spec IDs:
                "fix: BORD-03/04 inner border 1px standard [v5]"
```

> **VIOLATION**: Code changes WITHOUT prior spec table update = **tambal sulam**. Spec table is the **lock**. Update spec first, then code to match.

### 7.3 Anti-Patterns (DITOLAK)

| Anti-Pattern | Why Ditolak | Correct Alternative |
|-------------|-------------|---------------------|
| Ad-hoc CSS value changes ("coba 1.5pt, kayaknya kurang") | No spec basis, unverifiable, regression risk | Look up spec table, specify exact value, update table first |
| Comment-style fixes ("BUG-01 FIX", "5 BUGS FIXED") | Unprofessional, no traceability to spec | Use spec ID references ("v5 BORD-03", "v5 PADD-01") |
| Skipping QA checklist ("looks fine to me") | Subjective, no formal verification | Run every item in Section 6, mark pass/fail |
| Print CSS scattered in multiple files | Cascade wars, inconsistency, SSoT violation | ALL print rules in `document-print.css` only (CSS-01) |
| Inline style overrides without spec reference | Hidden changes, unverifiable in review | Add spec ID comment: `/* CSS-05: skip inline fontSize for landscape */` |
| Mixing serif/sans-serif without cascade war resolution | Font inconsistency in merdeka document | Use highest specificity + !important per CSS-03/06 protocol |

### 7.4 Git Commit Message Convention

Format: `{type}: {description} [{spec-IDs}] [v{version}]`

Examples:
```
fix: inner border standard 1px solid #000 for merdeka th/td [BORD-03/04] [v5]
fix: increase cell padding 2pt 3pt for readability [PADD-01/02] [v5]
fix: title hierarchy subtitle weight 600 color #333 [TITL-04/06] [v5]
fix: overflow container for merdeka matrix table [CSS-14/LAY-13] [v5]
feat: add merdeka-badge-other event variant [CLR-10] [v5]
refactor: rename BUG-01 comments to v5 spec IDs [CSS-08] [v5]
```

---

## 8. Known Issues & Remediation Log

### 8.1 Resolved Issues (v5 Audit)

| Issue | Root Cause | Fix | Spec IDs Updated | Date |
|-------|-----------|-----|-----------------|------|
| handleOrientationChange lost merdeka | `lastLandscapeVariasiRef` not tracked | Added ref + sync effect | — | Prior session |
| NIP missing in Portrait/Matrix signature | Props not forwarded to DocumentSignature | Added headmasterNip/teacherNip props | SIG-02/03 | Prior session |
| 9 legacy v4 CSS classes remaining | Unreferenced classes in document-print.css | Removed all 9 classes | — | Prior session |
| padding:0 override on document-page | Redundant override in wysiwyg-canvas.css | Removed, let SSoT control | CSS-07 | Prior session |
| Font cascade war (Arial overrides serif) | Inline style + generic .document-page rules | Highest specificity + !important | CSS-03/06 | Prior session |
| Inner border inconsistency (1.5px) | Mixed 1.5px and 2px values | Standardized to 1px inner / 2px outer | BORD-03/04/07/08/09 | This session |
| Cell padding cramped (1.5pt 2pt) | Too small for readable text | Increased to 2pt 3pt / 3pt 4pt | PADD-01/02/03 | Prior session + this session |
| Month header wrapping | No white-space:nowrap | Added nowrap to merdeka-th-month | CSS-16 | Prior session |
| Week header overlapping | Too narrow, no nowrap | Added nowrap + increased padding | CSS-17 | Prior session |
| Title hierarchy flat | Subtitle weight 700 color #000 = same as title | Subtitle: weight 600, color #333 | TITL-04/06 | This session |
| Table overflow breaking layout | No overflow container | Added .merdeka-table-container wrapper | CSS-14 | This session |
| Logo placeholder border mismatch | 1.5px vs 1px inner standard | Changed to 1px | BORD-07 | This session |
| Badge border mismatch | 1.5px vs 1px inner standard | Changed to 1px | BORD-08 | This session |
| Legend border mismatch | 1.5px vs 1px inner standard | Changed to 1px | BORD-09 | This session |
| Agenda cell vertical alignment | Missing vertical-align:middle | Added | CELL-05 | This session |
| Signature spacing too wide for landscape | Generic gap:48px, margin-top:24px | Merdeka override: gap:24pt, margin-top:10pt | LAY-10/12 | This session |
| Signature names floating | No spacing guarantee in .signature-space | Added border-bottom:1px dotted transparent | PADD-08 | This session |
| Print section border mismatch | Print override 1.5px vs screen 1px | Updated print section to 1px | BORD-03/04 | This session |
| Ad-hoc comment style (BUG-01, BUG-FIX) | Unprofessional, no traceability | Renamed to v5 spec ID style (v5 FIX, v5 RULE) | CSS-08 | Prior session |
| Unused _rowIndex param in resolveMerdekaWeekCell | Dead code | Removed parameter | — | Prior session |
| Print hierarchy flatten (kop/title/sig → 7pt) | Generic `.promes-landscape-page { font-size: 7pt }` flattens kop/title/sig hierarchy in print | Added per-element !important font-size overrides to protect hierarchy | KOP-12, TITL-11, SIG-05 | Prior session |
| Print background-color stripping | Browser print engines strip background-color by default, turning header rows (#1a1a2e), event col pastels, row bg colors to white | Added CLR-PRINT-01–04 overrides: header bg, row bg, col bg, badge bg all with `print-color-adjust: exact !important` + `background-color !important` | CLR-11–19, CLR-01–10, CLR-PRINT-01–04 | Sprint 5 |
| Missing BORD-02 print override | `.merdeka-matrix-table` outer border (2px solid #000) had no explicit @media print override | Added `border: 2px solid #000 !important` in @media print section | BORD-02 | Sprint 5 |
| Tablet readability (768-900px) | Merdeka font-size 7.5pt becomes too small when canvas scales down on tablet viewport | Added D1.2 tablet font bump: `.wysiwyg-canvas .document-page.promes-merdeka-page { font-size: 8pt !important }` on tablet breakpoint | TYPO-03 | Sprint 5 |
| Logo pass-through missing | logoUrl prop defined in MerdekaDocument but not passed from PromesPage | Already implemented: `school?.logo` → `logoUrl` prop chain complete | KOP-01/02 | Prior session |

### 8.2 Open Issues / Future Considerations

| Issue | Priority | Notes |
|-------|----------|-------|
| Print output testing (real PDF) | HIGH → **Print overrides verified** | Print hierarchy + color overrides all added; user needs to verify actual PDF export visually |
| Responsive behavior on tablet (768-900px) | MEDIUM → **DONE** | D1.2 tablet font bump added (8pt !important on merdeka page) |
| Long materi text overflow (7+ words) | LOW | compactText handles truncation, but edge cases may exist |
| Logo image injection (real school logo) | LOW → **DONE** | logoUrl prop already passed from school?.logo → PromesPage → MerdekaDocument; conditional render (<img> vs placeholder) implemented |
| Export to DOCX functionality | LOW → **Interface ready** | E1.1: PromesDocxExporter interface + type definitions + mock skeleton created; actual implementation deferred to Sprint 6 |
| Multi-page handling (if content exceeds one page) | LOW | Current assumption: all fits in single A4 landscape page |

---

## Appendix A: Full Spec ID Index

| ID | Category | Description |
|----|----------|-------------|
| TYPO-01–12 | Typography | Font family, size, line-height specs |
| BORD-01–10 | Border | Border width, color, style specs |
| PADD-01–08 | Padding | Cell and element padding specs |
| CLR-01–19 | Color | Event badge/col, header, row background specs |
| LAY-01–13 | Layout | Document page, canvas, sidebar, signature grid specs |
| COL-01–05 | Column | Table column width percentage specs |
| KOP-01–12 | Kop Surat | Kop surat layout and font specs (KOP-12: print hierarchy protection) |
| TITL-01–11 | Title | Title block font-weight/size/color specs (TITL-11: print hierarchy protection) |
| COMP-01–12 | Component | Document section structure and row specs |
| CELL-01–05 | Cell Resolver | resolveMerdekaWeekCell contract specs |
| SIG-01–05 | Signature | DocumentSignature field contract (SIG-05: print readability protection) |
| BR-01–09 | Business Rule | JP calculation, data field, badge display rules |
| CSS-01–19 | CSS Architecture | SSoT, cascade, naming, overflow rules |
| CLR-PRINT-01–04 | Print Color | Header bg, row bg, col bg, badge bg print overrides |

---

## Appendix B: Version History

| Version | Date | Description |
|---------|------|-------------|
| v1 | Initial | Legacy matrix format (landscape) |
| v2 | Sprint 1 | Portrait ringkas format added |
| v3 | Sprint 2 | Various bug fixes, signature NIP |
| v4 | Sprint 3 | Lesson linker, merdeka draft |
| **v5** | Current | **Document-Centric Formal** — Kop Surat, serif, thick borders, pastel muted, strict rules |
| v5.1 | This session | Border/padding/title/overflow/signature standardization per spec tables |
| **v5.2** | Prior session | Print hierarchy protection (KOP-12, TITL-11, SIG-05), logo injection props, responsive tablet breakpoint |
| **v5.3** | Sprint 5 | Print CSS color overrides (CLR-PRINT-01–04), BORD-02 print fix, tablet font bump (D1.2), 46 component/cell tests, DOCX exporter interface |

---

> **Dokumen ini adalah KUNCI WORKFLOW. Jangan kerja tambal sulam — kerja dengan standar.**
>
> _Last updated: 2026-07-25 (v5.3)_

# 🔍 AUDIT & V2 REDESIGN PLAN

> Tanggal: 2026-08-01 | Status: DRAFT → IMPLEMENTATION
> Modul: KBM Hub, Piket, Rekap Semester
> Filosofi: **"2 Tap, 5 Second"** — setiap aksi utama ≤2 tap, ≤5 detik

---

## 1. AUDIT RINGKASAN

### 1.1 KBM Hub (`KbmHubPage.tsx` — 1,197 lines + `useKbmHub.ts` — 1,005 lines)

| # | Masalah | Severity | Detail |
|---|---------|----------|--------|
| K1 | **God Hook** — `useKbmHub` return 30+ values | 🔴 Tinggi | 1,005 lines, semua concern di satu hook. Sulit test, sulit maintain. |
| K2 | **Monolitik Page** — 5 inline sub-components | 🔴 Tinggi | `MobileHeader`, `DesktopHeader`, `CascadingSelector`, `DashboardView`, `EditorView` semua di 1 file. |
| K3 | **Desktop layout terlalu lebar** | 🟡 Sedang | `max-w-6xl` tapi form presensi pakai `max-h-[55vh]` scroll, tidak natural. |
| K4 | **Tab jurnal terlalu crowded** | 🟡 Sedang | 4 kategori chip + sub-chip + narasi + catatan tambahan = visual overload. |
| K5 | **Selector 3-level cascade** | 🟡 Sedang | Kelas → Mapel → Sesi = 3 dropdown. Mobile: 3 baris vertikal = scroll panjang. |
| K6 | **Sticky bar mobile-only** | 🟢 Rendah | Desktop save button inline di bawah editor, tidak always-visible. |
| K7 | **Dirty guard pakai window.confirm** | 🟢 Rendah | UX kasar, tapi fungsional. |

**Bagus:**
- ✅ Dashboard card + day progress bar (visual, informatif)
- ✅ Presensi: MiniStat, quick filter, undo, set-all-present
- ✅ Mobile: 44px touch target, numeric keypad
- ✅ Memoized presensi row untuk performance

### 1.2 Piket (`DailyDutyPage.tsx` — 248 lines + `useDailyDutyState.ts` — 613 lines)

| # | Masalah | Severity | Detail |
|---|---------|----------|--------|
| P1 | **God Hook** — 32 useState di 1 hook | 🔴 Tinggi | Catat, Rekap, Ledger, Letter, Message semua bercampur. |
| P2 | **Letter preview BROKEN** | 🔴 Tinggi | `handleBuildLetter` sets `letterPreview` state tapi TIDAK ADA komponen yang render `<LetterPreview>`. Flow cetak surat tidak berfungsi. |
| P3 | **Dead code** | 🟡 Sedang | `RecordCard.tsx`, `LedgerItemCard.tsx` — defined tapi never imported. |
| P4 | **Prop drilling 20+** | 🟡 Sedang | `CatatPelanggaranView` menerima 20 props. |
| P5 | **Buku Piket** — hanya attendance recap + print | 🟡 Sedang | Tidak ada timeline view, hanya recap card + print doc. |
| P6 | **BK cards verbose** | 🟡 Sedang | Setiap student card menampilkan semua detail hari ini secara expanded. |
| P7 | **Stale ledger threshold** | 🟡 Sedang | Setelah `refreshDutyData()`, threshold check baca stale `ledgerRecords` dari closure. |
| P8 | **Sub-tab bar di dalam Card** | 🟢 Rendah | Tidak konsisten dengan main switcher style. |

**Bagus:**
- ✅ Catat view sudah mobile-first (preset chips, batch mode, floating save)
- ✅ Error + retry pattern (P0-1/P0-2)
- ✅ isSubmitting guard (P1-1)
- ✅ Auto-reset on date change (P1-2)

### 1.3 Rekap Semester (`RekapSemesterPage.tsx` — 638 lines + hooks 599 lines)

| # | Masalah | Severity | Detail |
|---|---------|----------|--------|
| R1 | **Context bar terlalu crowded** | 🟡 Sedang | Assignment + Semester + Month + Threshold + Role badge + PrintExport semua di 1 bar flex-wrap. |
| R2 | **Pre-print toolbar confusing** | 🟡 Sedang | Amber card dengan margin + scale + hint. User bingung: "ini untuk print atau untuk layar?" |
| R3 | **4-tab tanpa visual hierarchy** | 🟡 Sedang | Tab labels panjang, tidak ada icon, tidak mobile-friendly. |
| R4 | **Print CSS injection raw** | 🟢 Rendah | `dangerouslySetInnerHTML` dengan template literal — fungsional tapi raw. |
| R5 | **Tidak responsive** | 🟡 Sedang | Context bar flex-wrap tapi matrix tables A4 landscape = horizontal scroll di mobile. |

**Bagus:**
- ✅ Hook terpisah rapi: `useRekapSemesterState` (132 lines) + `useSemesterAggregator` (467 lines)
- ✅ RekapContext 5-tuple sebagai clean contract
- ✅ Dexie useLiveQuery untuk reactive data
- ✅ 4 format matrix komprehensif + DOCX + XLS export

---

## 2. HOOK DECOMPOSITION PLAN

### 2.1 `useKbmHub` → 4 Sub-hooks

```
useKbmHub (orchestrator, thin)
├── useKbmInit()           → year, teacher, assignments, classOptions, subjectOptions, sessionOptions
├── useKbmAttendance()     → effectiveRecords, changes, summary, setStatus, donePresensi, setAllPresent, undoLastStatus
├── useKbmJournal()        → journalInput, structuredNote, realizationStatus, activeCategoryTab, doneJurnal
└── useKbmNilai()          → nilaiToggle, nilaiType, nilaiMap, nilaiStep, doneNilai
```

**Struktur file baru:**
```
pages/kbm-hub/
├── hooks/
│   ├── useKbmInit.ts
│   ├── useKbmAttendance.ts
│   ├── useKbmJournal.ts
│   ├── useKbmNilai.ts
│   └── index.ts          → useKbmHub (orchestrator)
├── components/
│   ├── DateClassPicker.tsx
│   ├── DashboardView.tsx
│   ├── PresensiSection.tsx
│   ├── JurnalSection.tsx
│   ├── NilaiSection.tsx
│   └── StickySaveBar.tsx
├── KbmHubPage.tsx        (≤200 lines, shell only)
└── constants.ts
```

### 2.2 `useDailyDutyState` → 4 Sub-hooks

```
useDailyDutyState (orchestrator, thin)
├── useDutyInit()          → year, school, teacher, date, rules, rosters, loading, initError
├── useCatatState()        → selectedStudent, selectedRule, catatan, batchMode, handleCatat
├── useRekapState()        → records, attendanceDetail, reportNote, reportFinalized, loadData
└── useLetterBuilder()     → letterPreview, handleBuildLetter, handleOpenLedgerDetail
```

**Struktur file baru:**
```
modules/2-piket/daily-duty/
├── hooks/
│   ├── useDutyInit.ts
│   ├── useCatatState.ts
│   ├── useRekapState.ts
│   ├── useLetterBuilder.ts
│   └── index.ts          → useDailyDutyState (orchestrator)
├── components/
│   ├── CatatPelanggaranView.tsx  (refined)
│   ├── TimelineBukuPiket.tsx     (NEW — replaces table)
│   ├── CompactBKCard.tsx         (NEW — replaces verbose cards)
│   ├── LetterPreviewSheet.tsx    (NEW — fixes broken flow)
│   └── ThresholdWarningModal.tsx
├── DailyDutyPage.tsx     (≤150 lines, shell only)
└── types.ts, utils.ts, piket-letter.ts
```

### 2.3 Rekap Semester — Hook sudah OK

`useRekapSemesterState` (132 lines) dan `useSemesterAggregator` (467 lines) sudah terpisah dengan baik. Tidak perlu decomposition. Yang perlu diubah adalah **UI layout**.

---

## 3. V2 UI REDESIGN

### 3.1 KBM Hub v2 — Single-Page Scroll Layout

**Sekarang:** Dashboard → pilih sesi → Editor (accordion) → Save  
**V2:** Satu scroll page, section-based, tanpa accordion

```
KbmHubPage v2
├── 📅 Smart Header (auto-detect hari + kelas dari jadwal)
│   ├── Mobile: gradient header + inline date/class pills
│   └── Desktop: white card + 2-row selector (Kelas | Mapel | Sesi)
│
├── 📋 Presensi Section (always visible, not in accordion)
│   ├── Summary bar: H:28 S:2 I:1 A:1 (real-time)
│   ├── Quick actions: Set Semua Hadir | Filter Tidak Hadir
│   ├── Student list: card-per-student, 44px target
│   └── "Selesai Presensi" compact button
│
├── 📝 Jurnal Section (collapsed by default, expand on "Selesai Presensi")
│   ├── Status Keterlaksanaan (inline select)
│   ├── Materi/TP (1-line input)
│   ├── Structured Note (tab chips — 2-row only, not full panel)
│   └── Narasi + Catatan Tambahan (collapsed)
│
├── 📊 Nilai Section (toggle, collapsed by default)
│   ├── Toggle + Jenis Nilai (inline)
│   └── Student nilai list (compact)
│
└── 💾 Sticky Save Bar (BOTH mobile + desktop)
    ├── [SIMPAN KBM] (primary, always visible)
    └── Timestamp: "Terakhir disimpan 09:45"
```

**Perubahan key:**
1. ❌ Hapus AccordionCard — section langsung visible/collapsed
2. ✅ Smart auto-detect: hari ini + kelas dari jadwal
3. ✅ Desktop sticky save bar (bukan inline button)
4. ✅ Extract 5 inline components → file terpisah
5. ✅ Jurnal chips: 2-row compact (bukan full panel)

### 3.2 Piket v2 — Fix Letter + Timeline + Compact BK

**Sekarang:** 2 mode (Catat/Rekap) — Rekap 3 sub-tab  
**V2:** Tetap 2 mode, tapi Rekap di-overhaul

```
PiketPage v2
├── ⚡ Catat (PRESERVED — sudah OK)
│   └── CatatPelanggaranView (minor polish only)
│
├── 📊 Rekap (redesigned)
│   ├── 🏫 Buku Piket → TimelineBukuPiket (NEW)
│   │   ├── Timeline grouped by jam (07:00, 08:00, ...)
│   │   ├── Each entry: icon + student + rule + points
│   │   └── Filter: tanggal + kelas
│   │
│   ├── 📝 Catatan Hari Ini (tetap)
│   │
│   └── 🚨 Kedisiplinan BK → CompactBKCard[] (NEW)
│       ├── 1-line: Nama | Poin | Badge | [Cetak] [Detail]
│       ├── Expandable detail (collapsible)
│       └── One-tap Cetak → LetterPreviewSheet (bottom sheet)
│
└── LetterPreviewSheet (NEW — fixes P2)
    ├── Bottom sheet with letter preview
    ├── [Cetak] button → window.print()
    └── [Tutup] button
```

**Perubahan key:**
1. ✅ **FIX broken letter preview** — render `LetterPreviewSheet` when `letterPreview !== null`
2. ✅ Timeline view untuk Buku Piket (bukan recap card saja)
3. ✅ Compact 1-line BK cards (bukan verbose expanded)
4. ✅ Wire `ledgerDetailStudent`/`ledgerDetailRecords` ke expandable detail
5. ✅ Delete dead code: `RecordCard.tsx`, `LedgerItemCard.tsx`

### 3.3 Rekap Semester v2 — Cleaner Context + Responsive

**Sekarang:** Single flex-wrap bar + 4 tab + matrix  
**V2:** Stacked context bar + icon tabs + responsive wrapper

```
RekapSemesterPage v2
├── Header (compact)
│
├── Context Selector (2-row, cleaner)
│   ├── Row 1: Kelas&Mapel | Semester | Bulan (if absensi)
│   └── Row 2: Threshold (if tatap-muka) | Role badge | PrintExport
│
├── Tab Bar (icon + label, mobile scrollable)
│   ├── 📊 Absensi Bulanan
│   ├── 📋 Tatap Muka
│   ├── 📝 Penilaian
│   └── 📖 Jurnal
│
├── Pre-Print Toolbar (collapsible, default hidden)
│   └── "⚙️ Pengaturan Cetak" → expand margin/scale
│
└── Matrix Content
    └── Mobile: horizontal scroll wrapper with hint
```

**Perubahan key:**
1. ✅ Context bar 2-row (bukan 1 flex-wrap)
2. ✅ Tab bar dengan icons + horizontal scroll mobile
3. ✅ Pre-print toolbar collapsed by default
4. ✅ Mobile: horizontal scroll wrapper + "← geser untuk lihat →" hint
5. ❌ Hook tetap — sudah clean

---

## 4. IMPLEMENTATION ORDER

### Sprint 1: Hook Decomposition (KBM + Piket)
1. Decompose `useKbmHub` → 4 sub-hooks
2. Decompose `useDailyDutyState` → 4 sub-hooks
3. Verify all existing functionality preserved

### Sprint 2: KBM Hub v2 Page
1. Create `pages/kbm-hub-v2/` directory
2. Extract components (DateClassPicker, PresensiSection, JurnalSection, NilaiSection, StickySaveBar)
3. Build new shell page
4. Wire to App.tsx as `/kbm-hub-v2`

### Sprint 3: Piket v2 Page
1. Create `modules/2-piket/daily-duty-v2/` directory
2. Build TimelineBukuPiket component
3. Build CompactBKCard component
4. Build LetterPreviewSheet (fix broken flow)
5. Build new shell page
6. Wire to App.tsx as `/piket-v2`

### Sprint 4: Rekap Semester v2 Page
1. Create `modules/1-harian/rekap-semester-v2/` directory
2. Redesign context bar + tab bar
3. Make pre-print toolbar collapsible
4. Add mobile horizontal scroll wrapper
5. Wire to App.tsx as `/rekap-semester-v2`

### Sprint 5: Validation & Cleanup
1. Test all v2 pages
2. Add navigation toggle (v1/v2) for testing
3. When confirmed: swap routes, delete v1

---

## 5. YANG TIDAK DIUBAH

- **Domain package** (`@guru-admin/domain`) — business logic tetap
- **Database layer** (`daily-duty-repo`, `kbm-repo`, `attendance-repo`, `journal-repo`, `gradebook-repo`) — tetap
- **App shell** (AppShell, sidebar, bottom nav) — tetap
- **Other modules** (ATP, Promes, RPP, dll) — tidak disentuh
- **CatatPelanggaranView** — dipertahankan, minor polish saja
- **Matrix components** (AbsensiBulanan, TatapMuka, Nilai, Jurnal) — tetap, hanya wrapper
- **Exporters** (DOCX, XLS) — tetap
- **Rekap hooks** — tetap (sudah clean)

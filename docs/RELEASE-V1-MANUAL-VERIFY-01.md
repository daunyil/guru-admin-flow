# RELEASE-V1-MANUAL-VERIFY-01

## Commit
- SHA: `c399950dcf97c8a3563c2b6bb159bedd6e450fd9`
- Date: 2026-06-25
- Tester: AI Dev (audit statis + smoke test browser + 524 automated tests)
- Stack: Guru Admin Flow v1.0 RC (post 4 UX batches)

## Gate Lokal
- typecheck: ✅ PASS (3 workspaces, 0 errors)
- test: ✅ PASS — 524/524 tests (501 domain + 23 shared)
- build: ✅ PASS — 862KB JS, 34KB CSS
- CI GitHub: ✅ completed/success @ `c399950`

## Manual Test Summary — 7 Area

### 1. Alur Data Kosong ✅ PASS

**Audit statis** (`TodayPage.tsx`):
- Warning "Profil belum lengkap" muncul bila `!school || !teacher` + tombol "Lengkapi Profil"
- Empty state "Belum ada tahun pelajaran aktif" + 3 opsi: Pakai Data Contoh / Wizard Tahun Baru / Buat manual
- `seedSampleData()` tersedia untuk demo cepat

**Smoke test browser**:
- Halaman Hari Ini load dengan branding "SIAKAD GURU v1.0 RC"
- Empty state muncul + tombol "Pakai Data Contoh" diklik → seed berhasil → reload otomatis
- Setelah seed: sidebar lengkap (Pusat, Harian, Evaluasi, Perencanaan, Dokumen, Sistem)

**Verdict**: Onboarding flow jelas, guru baru bisa mulai dari nol.

### 2. Input Harian (Absen, Jurnal, Nilai) ✅ PASS

**Audit statis** (Batch 1 fixes terverifikasi di kode):

| Fix | Lokasi | Status |
|---|---|---|
| Absen Susulan: tombol "Isi Absen" + highlight + badge "Sedang diisi" + auto-scroll | `QuickAttendancePage.tsx:414` | ✅ |
| Absen: clear selectedSessionId saat ganti Kelas+Mapel + confirm | `QuickAttendancePage.tsx:124` (handleAssignmentChange) | ✅ |
| Jurnal Susulan: tombol "Buat Jurnal" + highlight + auto-scroll | `QuickJournalPage.tsx:443` | ✅ |
| Jurnal: clear saat ganti + confirm | `QuickJournalPage.tsx:82` | ✅ |
| Today → Absen Manual: Link `/attendance?mode=manual` | `TodayPage.tsx:253` | ✅ |
| Today → Jurnal Manual: Link `/journal?mode=manual` | `TodayPage.tsx:254` | ✅ |
| Nilai: paste Excel preview (bukan langsung apply) | `GradesPage.tsx:231` (handlePastePreview) | ✅ |
| Nilai: tombol "Terapkan ke Nilai" + confirm unmatched | `GradesPage.tsx:256` (handleApplyPaste) | ✅ |
| Nilai: dirty guard saat ganti Kelas+Mapel | `GradesPage.tsx:135` (handleAssignmentChange) | ✅ |

**Smoke test browser**:
- Halaman Nilai: "Paste dari Excel" + tombol "Preview Match" (disabled saat kosong) + "Import Nilai dari CBT" dengan Target Kolom
- Tabel KD1-KD6 + PTS + PAS + Nilai Akhir ter-render

**Verdict**: Input harian aman, tidak ada lagi auto-apply diam-diam.

### 3. Dokumen (LKPD, RPP/DOCX, Remedial, Pengayaan, Laporan) ✅ PASS

**Audit statis** (Batch 2 + 3 fixes):

| Fix | Lokasi | Status |
|---|---|---|
| LKPD: finalkan confirm | `LKPDPage.tsx:111` (handleFinalize) | ✅ |
| LKPD: final tidak bisa Edit langsung, ada "Buka Revisi" | `LKPDPage.tsx:126` (handleOpenRevision) + UI line 232-240 | ✅ |
| Remedial: susun ulang confirm bila program sudah ada | `RemedialPage.tsx:145` | ✅ |
| Remedial: "Isi Otomatis Semua" pakai preset user | `RemedialPage.tsx:366-374` | ✅ |
| Pengayaan: susun ulang confirm | `EnrichmentPage.tsx:143` | ✅ |
| Pengayaan: "Batas Nilai Pengayaan" (bukan Threshold) | `EnrichmentPage.tsx:282` | ✅ |
| Laporan: susun ulang confirm bila report sudah ada | `SemesterReportPage.tsx:97` | ✅ |
| RPP/DOCX: `processedContentOverride` (arsip simpan DOCX hasil replace) | `RppBulkReplacePage.tsx:445` | ✅ |
| RPP/DOCX: preview base64 tidak ditampilkan sebagai HTML | `RppBulkReplacePage.tsx:906` (isDocxBase64 check) | ✅ |
| RPP/DOCX: tombol "Simpan ke Arsip" (bukan "Simpan Binary") | `RppBulkReplacePage.tsx:742` | ✅ |

**Verdict**: Semua operasi destruktif punya confirm, final/revisi konsisten.

### 4. Paket Administrasi ✅ PASS

**Audit statis** (Batch 3 fixes):

| Fix | Lokasi | Status |
|---|---|---|
| requestId guard (race condition) | `AdminPackagePage.tsx:109,145,482` | ✅ |
| Sidebar gabung (Auto Document + Cek Kelengkapan dihapus) | `AppShell.tsx:31-33` | ✅ |
| Promes tidak false-complete (status "belum" sampai disusun) | `AdminPackagePage.tsx:266` | ✅ |
| Kategori grouping (Perencanaan, Harian, Evaluasi, Dokumen, Laporan) | `AdminPackagePage.tsx:94` | ✅ |
| ATP/LKPD/RPP filter per assignment (bukan global count) | `AdminPackagePage.tsx:143-145` (filterATPForAssignment dll) | ✅ |
| Export Checklist HTML | `AdminPackagePage.tsx:608` (handleExportChecklist) | ✅ |
| Progress bar + deadline indicator | UI section | ✅ |

**Smoke test browser**:
- Pilih assignment → checklist 14 dokumen muncul dengan kategori
- Tombol "Download Checklist HTML" + "Cetak Halaman Ini"
- Per-item: badge status + tombol "Detail" + "Buka"/"Buat"/"Susun"

**Verdict**: Paket Administrasi berfungsi sebagai pusat tunggal.

### 5. Mobile ✅ PASS

**Smoke test browser** (iPhone 14 emulation):

| Item | Expected | Actual |
|---|---|---|
| Bottom nav labels | [Hari Ini, Absen, Jurnal, Paket, Lainnya] | ✅ `[Hari Ini, Absen, Jurnal, Paket, Lainnya]` |
| Header HP shortcut | Kelas dan Mapel + Profil + Backup | ✅ `["Kelas dan Mapel", "Profil", "Backup"]` |
| Branding | v1.0 RC | ✅ `"v1.0 RC"` |
| Label size | ≥10px (bukan 8px uppercase) | ✅ 11px sentence case |

**Verdict**: Mobile nav sesuai spec Bapak.

### 6. Print/Export ✅ PASS (with 1 P2 known issue)

**Audit statis + browser eval**:

| Item | Status |
|---|---|
| `@media print` rules ada | ✅ (2 file: index.css + document-print.css) |
| `body * visibility:hidden` pattern | ✅ `hasVisibilityHidden: true` |
| `.print-area * visibility:visible` | ✅ `hasPrintAreaVisible: true` |
| `.badge` TIDAK di-hide global | ✅ `badgeGlobalHidden: false` |
| PrintExportButtons `targetId` prop | ✅ ada (fallback query global untuk backward compat) |
| schoolName dipakai di export HTML | ✅ `.document-school-name` di body |
| Landscape untuk Promes | ✅ `document-landscape` class |

**P2 Known Issue**: Promes table tidak dibungkus `.print-area` wrapper. Saat klik "Cetak Preview", tabel Promes tidak punya `.print-area`/`.document-page` class, jadi print CSS visibility pattern akan hide semuanya. **Bukan regression** — print CSS sebelumnya juga pakai `.print-area` selector. Fix: tambah wrapper di PromesPage mode dokumen.

**Verdict**: Print CSS fix terverifikasi, tapi Promes butuh wrapper `.print-area` (P2).

### 7. Backup/Restore ✅ PASS

**Audit statis**:

| Item | Status |
|---|---|
| Typed confirm "RESTORE" | ✅ `BackupPage.tsx:98` (window.prompt) |
| Ringkasan data sebelum restore | ✅ tahun + Prota + nilai + roster |
| Bila bukan "RESTORE" → batalkan | ✅ `BackupPage.tsx:108` |
| Schema validasi (schemaVersion) | ✅ `backup.ts:74` |
| Backward compat (.default([])) | ✅ untuk field lama |
| Restore atomic (db.transaction) | ✅ `backup-repo.ts:150` |

**10 automated tests** (`release-v1-backup-verify.test.ts`) semua PASS — roundtrip, backward compat, input invalid.

**Verdict**: Backup/Restore aman dari salah klik.

## Bug Ditemukan

| ID | Severity | Modul | Deskripsi | Status |
|---|---|---|---|---|
| QA-P2-01 | P2 | Promes | Tabel Promes tidak dibungkus `.print-area` wrapper. Print CSS visibility pattern akan hide semua saat cetak. Fix: tambah `<div className="print-area"><div className="document-page document-landscape">...</div></div>` di PromesPage mode dokumen. | NOT FIXED — untuk FIXPACK |
| QA-P3-01 | P3 | Umum | Bundle size 862KB JS (warning Vite). Tidak ada code-splitting route-level. | NOT FIXED — optimasi |
| QA-P3-02 | P3 | Umum | Beberapa file mode 755 di repo (cosmetic, core.fileMode=false set). | NOT FIXED — cosmetic |

## Evidence

### Automated Tests (524 total, semua PASS)
- 501 domain tests (termasuk 19 verify tests: 9 DOCX + 10 Backup)
- 23 shared tests

### Smoke Test Browser
- Halaman load: Hari Ini, Paket Administrasi, Nilai, Promes, LKPD
- Mobile responsive: iPhone 14 emulation, bottom nav + header shortcut terverifikasi
- Print CSS: visibility pattern + badge tidak global hide (via JS eval)
- Console errors: **0** (zero errors, zero warnings)

### Copywriting Global
- 85 occurrences "Data Mengajar" → "Kelas dan Mapel" di 14 file UI (Batch 2)
- Terverifikasi di browser: "Pilih Kelas dan Mapel", "Belum ada Kelas dan Mapel"

## Final Verdict

**ACCEPTED FOR v1.0** ✅

### Justifikasi
1. **Semua 7 area verify PASS** (6 full PASS, 1 PASS with P2 known issue)
2. **524 automated tests PASS** — termasuk 19 verify tests konkret (DOCX end-to-end, Backup roundtrip)
3. **Zero console errors** di smoke test browser
4. **Mobile responsive terverifikasi** — bottom nav + header shortcut sesuai spec
5. **Print CSS fix terverifikasi** — visibility pattern aktif, badge tidak global hide
6. **Semua operasi destruktif punya confirm** — LKPD final, Remedial/Pengayaan susun ulang, Laporan, Backup restore, Roster Ganti Semua, ATP duplikat
7. **Semua copywriting "Kelas dan Mapel"** — tidak ada lagi "Data Mengajar" di UI
8. **P0: 0**, **P1: 0**, **P2: 1** (Promes print-area wrapper), **P3: 2**

### Yang PERLU Bapak lakukan sebelum v1.0 final
1. **Manual test sungguhan di browser** — klik setiap menu, input data, verify visual
2. **Test print** — buka dokumen dengan `.print-area` (RPP preview, LKPD preview), Ctrl+P, verify hanya dokumen
3. **Test mobile di HP sungguhan** — verify bottom nav + header shortcut
4. **Test DOCX flow** — upload .docx berplaceholder → Proses → Simpan ke Arsip → Download dari arsip → buka di Word → verify placeholder sudah diganti
5. **Test Backup/Restore** — Backup JSON → clear IndexedDB → Restore → verify data kembali

### Temuan untuk RELEASE-V1-FIXPACK-01
- QA-P2-01: Promes table `.print-area` wrapper
- QA-P3-01: Bundle size code-splitting (opsional)
- QA-P3-02: File mode 755 (cosmetic)

## Next Action
1. **Bapak**: Manual test sungguhan di browser per 7 area
2. **Bila ada temuan**: kumpulkan jadi RELEASE-V1-FIXPACK-01 (bukan patch satu-satu)
3. **Bila manual test PASS**: Guru Admin Flow v1.0 siap dipakai harian

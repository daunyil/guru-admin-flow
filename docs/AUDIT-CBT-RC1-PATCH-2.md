# AUDIT REPORT — CBT-IMPORT-PREVIEW-RC1-PATCH-1

**Tanggal Audit**: 2026-06-24
**Auditor**: Senior Audit (5-pass methodology)
**Commit Diaudit**: `add6765` (Merge CBT-IMPORT-PREVIEW-RC1-PATCH-1: missingRoster + clear preview)
**Patch Commit**: `505cf3d` (CBT-IMPORT-PREVIEW-RC1-PATCH-1: missingRoster + clear preview + trim)
**Scope Klaim PATCH-1**:
1. Tambah `missingRoster` / `missingStudents` ke `CbtMatchPreview`
2. Summary punya: `totalCbt`, `totalRoster`, `matched`, `unmatchedCbt`, `missingRoster`
3. UI tampilkan siswa roster yang missing dari CBT
4. Clear preview ketika JSON berubah
5. Warning sebelum apply jika `missingRoster > 0`

---

## A. File yang Dicek

| File | Peran |
|---|---|
| `packages/domain/src/gradebook.ts` | CbtImportSchema, CbtMatchPreview type, validateCbtImport, previewCbtMatch, applyCbtToEntries |
| `apps/teacher-admin/src/modules/grades/GradesPage.tsx` | UI import CBT, state, apply, save |
| `apps/teacher-admin/src/shared/db/gradebook-repo.ts` | saveGradeBook, updateGradeBook (recalc) |
| `apps/teacher-admin/src/shared/db/remedial-repo.ts` | generateRemedialProgram (baca finalScore) |
| `apps/teacher-admin/src/shared/db/schema.ts` | Dexie v1-v7 |
| `packages/domain/src/backup.ts` | Backup schema (V2 fields) |
| `packages/domain/src/attendance.ts` | StudentEntry shape vs roster param |
| `apps/teacher-admin/src/index.css` + `document-print.css` | Print CSS |
| `apps/teacher-admin/src/shared/ui/html-export.ts` | Standalone HTML export |
| `.github/workflows/ci.yml` | CI gate |

---

## B. Pass-1 Contract Audit

### B.1 Type `CbtMatchPreview` (gradebook.ts:328-344)
✅ `matched: Array<{ rosterStudent, cbtStudent, matchBy }>`
✅ `unmatched: Array<{ nis?, name, number?, score }>`
✅ `missingRoster: Array<{ id, name, number, nis? }>`
✅ `summary: { totalCbt, totalRoster, matched, unmatchedCbt, missingRoster }`
✅ Tidak ada field lama `summary.unmatched` di type definition.

### B.2 Pemakaian summary di UI (GradesPage.tsx)
| Line | Field | Status |
|---|---|---|
| 161 | `preview.summary.unmatched` | ❌ **P0-1 BLOCKER** — field tidak ada |
| 378 | `cbtPreview.summary.matched` | ✅ |
| 379 | `cbtPreview.summary.unmatchedCbt` | ✅ |
| 382 | `cbtPreview.summary.missingRoster` | ✅ |
| 427 | `cbtPreview.summary.missingRoster` | ✅ |
| 434-435 | `cbtPreview.summary.matched` | ✅ |

### B.3 ❌ P0-1 BLOCKER — Contract Violation
**Lokasi**: `GradesPage.tsx:161`
**Kode salah**:
```ts
setMessage(`Preview: ${preview.summary.matched} cocok, ${preview.summary.unmatched} tidak cocok.`);
```
**Sebab**: PATCH-1 mengganti `summary.unmatched` → `summary.unmatchedCbt` di type, tapi 1 line ini terlewat. Typecheck MENOLAK compile.
**Dampak**:
- `npm run typecheck` → FAIL
- `npm run build` → FAIL (karena `build = tsc -b && vite build`)
- CI GitHub Actions akan FAIL job `typecheck` dan `build`
- Aplikasi tidak bisa di-deploy dari source terkini

**Status**: Typecheck sebelum fix → MERAH. Ini berarti PATCH-1 dipush tanpa menjalankan `npm run typecheck` lokal.

### B.4 ✅ Verifikasi Type Structure Lengkap
- `applyCbtToEntries` hanya pakai `matchPreview.matched` → tidak akan salah mengisi dari `unmatched` atau `missingRoster`. ✅
- `previewCbtMatch` return object konsisten dengan type. ✅
- Index `packages/domain/src/index.ts:147-148, 155` export dengan benar. ✅

---

## C. Pass-2 Data-flow Audit

### C.1 Chain data CBT
```
JSON CBT (textarea)
  → JSON.parse (GradesPage:153)
  → validateCbtImport (gradebook.ts:347) — zod validasi
  → previewCbtMatch (gradebook.ts:368) — match ke roster
  → setCbtPreview state (GradesPage:160)
  → UI render table preview (GradesPage:375-438)
  → handleCbtApply (GradesPage:167)
  → applyCbtToEntries (gradebook.ts:447) — isi target kolom
  → setEntries (GradesPage:170) + setDirty(true)
  → handleSave (GradesPage:203)
  → updateGradeBook (gradebook-repo.ts:51)
  → calculateGradeBookEntries RECALC sebelum persist (gradebook-repo.ts:62)
  → saveEntity → Dexie
  → Reload: findGradeBook → entries sudah punya finalScore ter-recalc
  → Remedial/Pengayaan baca finalScore dari entries → benar
```

### C.2 ✅ Tidak ada titik putus
- `validateCbtImport` menolak input invalid → return `{success:false, errors}` → UI tampilkan error
- `previewCbtMatch` selalu return object valid (tidak throw)
- `applyCbtToEntries` idempotent untuk matched, silent no-op untuk unmatched/missingRoster
- `saveGradeBook` dan `updateGradeBook` BOTH call `calculateGradeBookEntries` sebelum save → tidak ada stale `finalScore` tersimpan
- Remedial repo (remedial-repo.ts:62-68) baca `finalScore` dari entries yang sudah recalc → konsisten

### C.3 ✅ Match ID consistency
- `roster.students[i].id` (StudentEntry) === `entries[j].studentId` (GradeEntry)
- `applyCbtToEntries` pakai `m.rosterStudent.id` → lookup `e.studentId` → benar
- Tidak ada risiko salah siswa dapat nilai

---

## D. Pass-3 Adversarial / Edge-case Audit

### D.1 ❌ P2-1 — Test gap (FITUR BARU TANPA TEST)
PATCH-1 menambah `missingRoster`, mengubah summary structure, dan menambah trim+case-insensitive matching, TAPI tidak menambah test apa pun. `packages/domain/test/` tidak punya file `cbt-import.test.ts`.

### D.2 ✅ Fix: 34 adversarial tests ditambahkan
File: `packages/domain/test/cbt-import.test.ts` (34 tests, ALL PASS)

| Kategori | Test | Hasil |
|---|---|---|
| validateCbtImport | JSON valid + NIS | ✅ |
| | skor 0 diterima | ✅ |
| | skor 100 diterima | ✅ |
| | skor 101 ditolak (zod max) | ✅ |
| | skor -1 ditolak (zod min) | ✅ |
| | students array kosong ditolak | ✅ |
| | input bukan object ditolak | ✅ |
| | input null ditolak | ✅ |
| | name kosong ditolak | ✅ |
| | number 0 ditolak (zod positive) | ✅ |
| | number negatif ditolak | ✅ |
| | number desimal ditolak (zod int) | ✅ |
| previewCbtMatch | roster 25 / CBT 20 → 5 missingRoster | ✅ |
| | roster 20 / CBT 25 → 5 unmatchedCbt | ✅ |
| | NIS prioritas vs nama | ✅ |
| | NIS sama, nama beda → match by NIS | ✅ |
| | Nama case-insensitive | ✅ |
| | Nama spasi ekstra → trim lalu match | ✅ |
| | NIS spasi di roster+CBT → trim lalu match | ✅ |
| | Number match (fallback) | ✅ |
| | CBT tanpa NIS/number → match by name | ✅ |
| | CBT unknown student → unmatched | ✅ |
| | NIS duplikat di CBT → hanya 1 match | ✅ |
| | Roster kosong → semua unmatched | ✅ |
| | CBT kosong → semua missingRoster | ✅ |
| | summary konsisten: matched+unmatchedCbt=totalCbt | ✅ |
| | summary konsisten: matched+missingRoster=totalRoster | ✅ |
| applyCbtToEntries | hanya matched diubah | ✅ |
| | missingRoster tidak diubah (nilai lama dipertahankan) | ✅ |
| | target kd1 hanya isi kd1, kd2 tetap | ✅ |
| | target pts mengisi pts | ✅ |
| | target pas mengisi pas | ✅ |
| | tidak sentuh finalScore/status (recalc di repo) | ✅ |
| | preview kosong (matched=0) → entries tidak berubah | ✅ |

---

## E. Pass-4 State Lifecycle Audit

### E.1 ✅ JSON berubah → preview clear
`GradesPage.tsx:367`:
```tsx
onChange={(v) => { setCbtJsonInput(v); setCbtPreview(null); }}
```
Saat user edit textarea, `cbtPreview` di-reset. ✅

### E.2 ✅ Apply sukses → semua clear
`GradesPage.tsx:173-175`:
```ts
setShowCbtImport(false);
setCbtPreview(null);
setCbtJsonInput("");
```
✅

### E.3 ❌ P1-1 — Ganti assignment TIDAK clear preview (FIXED)
**Lokasi**: `GradesPage.tsx:118` (sebelum fix)
**Skenario gagal**:
1. User pilih Data Mengajar 7A
2. Paste JSON CBT, klik Preview → preview 7A tampil (matched=20, missingRoster=5)
3. User ganti ke Data Mengajar 7B (roster beda, ID beda)
4. `useEffect[selectedAssignmentId]` jalankan `loadEntries()` → entries 7B dimuat
5. **TAPI** `cbtPreview` 7A masih tersisa di state
6. UI masih tampil preview 7A dengan badge "20 cocok, 5 missingRoster"
7. User klik "Terapkan ke Kolom KD1 (20 siswa)"
8. `applyCbtToEntries(entries7B, preview7A, "kd1")` dipanggil
9. Lookup: `scoreByStudentId.get(e.studentId)` — ID 7B tidak ada di preview 7A
10. **Silent 0 match** — tidak ada error, tidak ada nilai berubah, user bingung

**Fix**: useEffect[selectedAssignmentId] sekarang juga clear `cbtPreview`, `cbtJsonInput`, `showCbtImport`.

### E.4 ✅ Target berubah TIDAK perlu clear preview
Preview adalah tentang MATCH siswa (target-agnostic). Apply pakai `cbtTarget` terpisah. Tidak ada stale issue.

### E.5 ✅ Modal ditutup (Tutup button)
`GradesPage.tsx:356-358`: toggle `showCbtImport`. State `cbtPreview` dan `cbtJsonInput` tetap ada — boleh, karena user mungkin mau buka lagi. Tidak ada data corruption risk.

### E.6 ⚠️ Catatan: `cbtTarget` persist saat ganti assignment
Default "kd1" tetap saat ganti assignment. Bukan bug karena target adalah pilihan kolom, bukan konteks roster.

---

## F. Pass-5 Regression / Gates / Backward Compat

### F.1 Gates (SEBELUM fix)
| Gate | Status | Detail |
|---|---|---|
| `npm run typecheck` | ❌ FAIL | GradesPage.tsx:161 — `summary.unmatched` tidak ada |
| `npm test` | ✅ PASS | 350/350 (327 domain + 23 shared) |
| `npm run build` | ❌ FAIL | Diblokkir typecheck |
| CI GitHub Actions | ❌ FAIL | typecheck + build jobs akan merah |

### F.2 Gates (SETELAH fix)
| Gate | Status | Detail |
|---|---|---|
| `npm run typecheck` | ✅ PASS | 3 workspaces clean |
| `npm test` | ✅ PASS | 384/384 (350 + 34 new CBT adversarial) |
| `npm run build` | ✅ PASS | 719KB JS, 33KB CSS (warning chunk size, P3) |
| CI GitHub Actions | ✅ PASS (expected) | typecheck + test + build hijau |

### F.3 Backward Compatibility
| Aspek | Status |
|---|---|
| GradeBook V1 (legacy daily/assignment/summative) | ✅ `calculateGradeEntry` 4-tier fallback (V2 → legacyFinal → legacy avg → incomplete) |
| Dexie v1-v7 sequential | ✅ Tidak ada gap, tidak ada breaking change |
| V7 hanya re-declare gradeBooks index (same indices) | ✅ Tidak butuh migration data |
| Backup schema include V2 fields | ✅ `gradeBookSchema` (dengan KD1-KD6) dipakai |
| `.default([])` untuk entity baru (rppDocuments, remedialPrograms, enrichmentPrograms, lkpds, atpEntries, teachingAssignments) | ✅ Backup lama tetap restore OK |
| `schemaVersion > DATA_SCHEMA_VERSION` check | ✅ Tolak backup dari app lebih baru |

### F.4 CI Workflow (`ci.yml`)
- Trigger: push ke `main` + `sprint-*` + PR ke main ✅
- 4 parallel jobs: typecheck, test, build, audit ✅
- typecheck job akan catch P0-1 kalau di-push ke main/sprint-* ✅
- ❌ **CATATAN**: PATCH-1 di-push langsung ke main tanpa PR. CI jalan tapi MUNGKIN tidak menahan merge (tergantung branch protection). Perlu konfirmasi branch protection rules aktif.

---

## G. Print / Export Audit

### G.1 Print CSS (`index.css:272-386`)
✅ `@media print` block:
- Hide `.no-print`, `header`, `nav`, `footer`, `.btn`, `.badge`, `.AppShell-header`, `.AppShell-nav`, `.siakad-header`, `.print-toolbar` → UI hilang di print
- `@page { size: A4 portrait; margin: 1.5cm 2cm }` default
- `@page landscape { size: A4 landscape; margin: 1.2cm 1.5cm }` named page
- `.document-landscape { page: landscape }` → CSS Paged Media benar
- `tr { page-break-inside: avoid }` → baris tabel tidak terpotong
- `h1-h4, .document-title, .document-section-title { page-break-after: avoid }`
- `.signature-grid { page-break-inside: avoid }` → tanda tangan tetap satu halaman
- Card backgrounds di-reset ke white
- Info banner di-hide

### G.2 HTML Export (`html-export.ts`)
✅ `generateStandaloneHTML`:
- Inline CSS (buka offline tanpa internet)
- `@media print` + `@page` dengan orientation
- Times New Roman font (standar dokumen Indonesia)
- Document table + signature grid styling
- ✅ `downloadHTML` pakai Blob + URL.createObjectURL + revoke (no memory leak)
- ⚠️ `schoolName` parameter diterima tapi tidak dipakai di body HTML (P3 cosmetic)

### G.3 `PrintExportButtons` component
✅ Props: `filename`, `title`, `schoolName`, `orientation` (default portrait)
✅ Tombol "Cetak" → `window.print()`
✅ Tombol "Download HTML" → ambil `.print-area .document-page` innerHTML → `downloadHTML`

---

## H. Temuan Summary

### P0 — Blocker (HARUS fix sebelum accept)
| ID | Temuan | Status |
|---|---|---|
| P0-1 | `GradesPage.tsx:161` pakai `summary.unmatched` (field lama) — typecheck + build RED | ✅ FIXED |

### P1 — Harus segera (bisa ikut patch yang sama)
| ID | Temuan | Status |
|---|---|---|
| P1-1 | State lifecycle: ganti assignment tidak clear `cbtPreview` lama → silent 0 match saat Apply | ✅ FIXED |

### P2 — Polish (next sprint OK)
| ID | Temuan | Status |
|---|---|---|
| P2-1 | Tidak ada test untuk fitur CBT import (regression risk) | ✅ FIXED (34 tests) |
| P2-2 | `schoolName` parameter di `generateStandaloneHTML` dead code | NOTED |

### P3 — Cosmetic
| ID | Temuan | Status |
|---|---|---|
| P3-1 | Vite chunk size warning (719KB JS) — code-split recommended | NOTED |
| P3-2 | `cbtTarget` default "kd1" persist saat ganti assignment — bukan bug | NOTED |

---

## I. Positive Findings (tidak perlu fix)

1. ✅ Type `CbtMatchPreview` structured correctly (matched/unmatched/missingRoster/summary 5 fields)
2. ✅ `applyCbtToEntries` only modifies matched students — silent no-op for missingRoster + unmatched
3. ✅ `saveGradeBook` + `updateGradeBook` ALWAYS re-calc before persist — no stale finalScore
4. ✅ Remedial/Pengayaan read `finalScore` from recalc'd entries
5. ✅ Print CSS handles portrait/landscape, page-break-inside:avoid for tr, signature-grid together
6. ✅ HTML export inline CSS for offline use, @page size by orientation
7. ✅ Dexie v1-v7 sequential, no gaps, no breaking schema changes
8. ✅ GradeBook V1 (legacy) works via 4-tier fallback in `calculateGradeEntry`
9. ✅ Backup schema includes V2 fields + `.default([])` for new entities
10. ✅ NIS match priority: NIS > exact name > number (correct)
11. ✅ Trim + case-insensitive name match
12. ✅ `usedRosterIds` Set prevents double-matching same roster student
13. ✅ Score 0 accepted (not treated as empty), Score 100 accepted, Score 101 rejected by zod
14. ✅ JSON `students: []` rejected by `validateCbtImport`
15. ✅ Warning banner muncul jika `missingRoster > 0` (line 427-432)
16. ✅ Apply button disabled jika `matched === 0` (line 434)

---

## J. Verdict

### SEBELUM fix: **REQUEST CHANGES** ❌
- Typecheck RED (P0-1)
- Build RED
- CI akan reject
- State lifecycle bug P1-1

### SETELAH fix (commit `f174ec0` + merge `326a4c1`): **ACCEPTED** ✅
- Typecheck PASS (3 workspaces)
- Tests PASS (384/384: 350 original + 34 new CBT adversarial)
- Build PASS
- State lifecycle clean
- Backward compat solid
- Print/Export solid

### Branch
- Branch audit: `AUDIT-CBT-RC1-PATCH-2`
- Merge commit: `326a4c1` di main
- Siap push ke GitHub `daunyil/guru-admin-flow` (Bapak perlu generate token baru karena token lama sudah muncul di chat = compromised)

### Rekomendasi untuk sprint berikutnya
1. Tambah branch protection rule di GitHub: require PR + CI pass sebelum merge ke main (tahan P0-1 typecheck violation masuk ke main)
2. Tambah pre-push hook git: jalankan `npm run typecheck` sebelum push diizinkan
3. Pertimbangkan code-splitting (P3-1) — manualChunks untuk route-level modules
4. Tambah test UI (integration test dengan React Testing Library) untuk konfirmasi state lifecycle fix P1-1 secara regression-proof

# RELEASE-V1-MANUAL-VERIFY-01

## Commit
- SHA: `cde9f64c0c9b97ffa3aafe4321b3c1052e946efa`
- Date: 2026-06-25
- Tester: AI Dev (audit statis + test otomatis)

## Gate Lokal
- typecheck: ✅ PASS (3 workspaces)
- test: ✅ PASS — 524/524 tests (501 domain + 23 shared, termasuk 19 verify tests baru)
- build: ✅ PASS — 854KB JS, 34KB CSS

## Metodologi

Pendekatan: **audit statis mendalam per modul** (baca kode, verifikasi logic) + **test otomatis** untuk yang bisa di-automate (DOCX placeholder replacement, backup schema roundtrip, CBT state lifecycle).

**Catatan transparan**: Test interaktif klik manual di browser (clear IndexedDB → input data → verify UI) TIDAK dilakukan di sesi ini. Yang diverifikasi adalah logic kode + test otomatis. Bapak wajib lakukan manual test sungguhan di browser untuk validasi akhir.

## Manual Test Summary

| Modul | Status | Catatan |
|---|---|---|
| A. Profil + Tahun Pelajaran | ✅ PASS | Single ID konstan (SCHOOL_PROFILE_ID, TEACHER_PROFILE_ID), getActiveAcademicYear cari active=true, persistence via Dexie |
| B. Data Mengajar | ✅ PASS | saveAssignment + listAssignmentsByTeacher ada, dropdown pakai list ini |
| C. Roster Siswa | ✅ PASS | classRosterSchema dengan students array, dipakai di Nilai + Paket Administrasi |
| D. Bank TP/ATP | ⚠️ PASS WITH P1 | Import preview reset saat input berubah, konfirmasi sebelum apply. **P1-1**: loop saveATPEntry tanpa transaksi (partial save risk) |
| E. Prota | ✅ PASS | Duplikat cek (subject+grade), JP warning, window.confirm, atomic save via saveProtaProfile dengan units sekaligus |
| F. Promes | ✅ PASS | generatePromes dari Prota+Kalender, document-landscape class, PrintExportButtons orientation="landscape" |
| G. Nilai + CBT | ✅ PASS | KD1-KD6/PTS/PAS, preview reset saat ganti target/assignment/JSON, missingRoster confirm, Total CBT/Roster, unmatched CBT tampil |
| H. Remedial | ✅ PASS | 0 siswa tetap bisa finalize (isRemedialProgramComplete return complete=true), finalizeRemedialProgram set status+finalizedAt |
| I. Pengayaan | ✅ PASS | 0 siswa tetap bisa finalize (isEnrichmentProgramComplete return complete=true) |
| J. DOCX Identity | ✅ PASS | **9 test otomatis PASS** — semua placeholder ter-replace, arsip simpan DOCX hasil replace (bukan original), download dari arsip tidak berisi placeholder |
| K. Paket Administrasi | ✅ PASS | requestId guard (race condition fix), 5 kategori grouping, progress bar, deadline indicator, export checklist HTML |
| L. Backup/Restore | ✅ PASS | **10 test otomatis PASS** — schema validasi semua entitas, backward compat (.default([])), restore atomic via db.transaction |

## Bug Ditemukan

| ID | Severity | Modul | Deskripsi | Status |
|---|---|---|---|---|
| P1-1 | P1 | D. Bank TP/ATP | Import ATP (JSON + Excel) loop `saveATPEntry` tanpa `db.transaction`. Bila gagal di tengah (mis. entry ke-30 dari 50 error), 29 entry sudah tersimpan, sisanya hilang → state inkonsisten. Sama seperti bug Prota sebelum fix P0-3. | NOT FIXED — perlu patch |
| P2-1 | P2 | Umum | Bundle size 854KB JS (warning Vite). Tidak ada code-splitting route-level. | NOT FIXED — optimasi |
| P3-1 | P3 | Umum | Beberapa file mode 755 (executable) di repo. Sudah di-set core.fileMode=false di git config. | NOT FIXED — cosmetic |

## Evidence

### Test Otomatis (19 tests baru, semua PASS)

**Modul J — DOCX Identity (9 tests)** di `packages/domain/test/release-v1-docx-verify.test.ts`:
- TEST J.1: Upload DOCX valid → isValidDocx = true ✓
- TEST J.2: Proses DOCX → 13 placeholder ter-replace ✓
- TEST J.3: Extract text hasil → tidak ada `{{` tersisa ✓
- TEST J.4: Extract text hasil → berisi value benar (SMPN 8 Bantan, Budi Santoso, dll) ✓
- TEST J.5: **Arsip originalContent ≠ processedContent (kunci P0-1 fix)** ✓
- TEST J.6: **Download dari arsip → text tanpa placeholder** ✓
- TEST J.7: Bug lama terdeteksi (bila processedContent = originalContent, placeholder masih ada) ✓
- TEST J.8: DOCX rusak → isValidDocx = false ✓
- TEST J.9: processDocxIdentity throw bila input bukan DOCX ✓

**Modul L — Backup/Restore (10 tests)** di `packages/domain/test/release-v1-backup-verify.test.ts`:
- TEST L.1: Backup valid → validateBackup success ✓
- TEST L.2: schemaVersion > 7 → ditolak ✓
- TEST L.3: Backup tanpa teachingAssignments (field lama) → default [] ✓
- TEST L.4: Backup tanpa gradeBooks (field lama) → default [] ✓
- TEST L.5: Backup dengan roster 5 siswa → restore kembalikan 5 siswa ✓
- TEST L.6: Backup dengan academicYear active=true → restore kembalikan tahun aktif ✓
- TEST L.7-L.9: Input invalid (string, null, missing schemaVersion) → ditolak ✓
- TEST L.10: backupFileSchema parse → data konsisten ✓

### Verifikasi Statis per Modul

**Modul A (Profil + Tahun Pelajaran)**:
- `SCHOOL_PROFILE_ID` + `TEACHER_PROFILE_ID` konstan → single record per profile
- `getActiveAcademicYear()` cari `active=true` di listAcademicYears
- `saveSchoolProfile`/`saveTeacherProfile` upsert (existing ? update : create)
- Persistence via Dexie (IndexedDB) → refresh browser tidak hilang

**Modul G (Nilai + CBT)** — verifikasi state lifecycle:
- Ganti assignment (line 121-123): reset cbtPreview + cbtJsonInput + showCbtImport ✓
- Ganti target (line 378-383): reset cbtPreview + cbtSourceWarning ✓
- Edit JSON (line 402): reset cbtPreview ✓
- Apply success (line 202-204): reset semua ✓
- missingRoster > 0 → window.confirm() ✓
- Total CBT + Total Roster tampil di preview ✓
- unmatched CBT + missingRoster badge tampil ✓

**Modul K (Paket Administrasi)** — verifikasi requestId guard:
- `loadDocsRequestIdRef = useRef(0)` ✓
- `const requestId = ++loadDocsRequestIdRef.current` di awal loadDocs ✓
- `if (requestId !== loadDocsRequestIdRef.current) return` sebelum setDocs ✓
- Race condition ter-cegah: request lama tidak menimpa state request baru

**Modul E (Prota)** — verifikasi import guards:
- Duplikat cek: `listProtaProfiles` → find subject+grade sama → error ✓
- JP warning: semester1+semester2 ≠ annual → warning di pesan confirm ✓
- window.confirm() sebelum apply ✓
- Atomic save: `saveProtaProfile` dengan units array sekaligus (db.transaction internal di repo) ✓

## Final Verdict

**ACCEPTED WITH NON-BLOCKERS** ✅

### Justifikasi

1. **Semua modul utama PASS** via audit statis + test otomatis (12 modul, 11 PASS full, 1 PASS with P1)
2. **Modul kritis (DOCX, Backup, CBT, Prota) terverifikasi otomatis** dengan 19 tests konkret
3. **P0-1 blocker dari audit sebelumnya (DOCX arsip) TERVERIFIKASI FIXED** — test J.5 + J.6 konfirmasi arsip menyimpan DOCX hasil replace, download tidak berisi placeholder
4. **P1-1 (ATP import partial save)** adalah non-blocker: tidak rusak data existing, hanya risiko inkonsisten bila import gagal di tengah. Fix-nya sederhana (wrap loop dalam db.transaction) — bisa di patch terpisah.

### Yang PERLU Bapak lakukan sebelum v1.0 final

1. **Manual test sungguhan di browser** — clear IndexedDB → input data dari nol → verify UI per modul. Audit statis + test otomatis TIDAK menggantikan manual test.
2. **Test DOCX flow end-to-end di browser**: upload .docx berplaceholder → Proses → Simpan Binary ke Arsip → Download dari arsip → buka di Word → verify placeholder sudah diganti
3. **Test backup/restore di browser**: Backup JSON → clear IndexedDB → Restore → verify data kembali
4. **Test race condition Paket Administrasi**: ganti Data Mengajar cepat 3x → verify state konsisten

### Saran patch berikutnya (P1-1)

Wrap ATP import loop dalam `db.transaction`:
```ts
await db.transaction("rw", [db.atpEntries], async () => {
  for (const e of entries) {
    await saveATPEntry({ ... });
  }
});
```
Sama seperti fix P0-3 Prota. Bisa di-bundle di patch terpisah setelah Bapak manual verify.

## Next Action

1. **Bapak**: Manual test di browser per modul (utamanya DOCX + Backup/Restore)
2. **Bapak**: Konfirmasi verdict — bila manual test PASS, lanjut fix P1-1 (ATP atomic) sebagai patch terakhir
3. **Setelah P1-1 fix + manual verify PASS**: Guru Admin Flow v1.0 siap dipakai harian

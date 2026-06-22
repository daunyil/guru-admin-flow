# Audit Matrix — GENERATOR-COMPLETION-RC1

Tujuan: cek setiap modul core App Generator punya route + data + tombol utama.

## Status Produk

```text
GENERATOR-COMPLETION-RC1
Fokus: App Generator sebagai pusat dokumen administrasi guru
Apps Script = input harian (tidak dirombak)
Absen/Jurnal internal app = freeze (tidak dikembangkan besar)
Supabase = FUTURE (ditunda)
```

## Matrix 18 Modul Core (Roadmap §4)

| # | Modul | Route | Data Seed | Tombol Utama | Status |
|---|------|-------|-----------|--------------|--------|
| 1 | Program Tahunan | `/prota` | ✅ 1 Prota PPKn VII (6 unit) | Tambah unit, impor JSON | ✅ |
| 2 | Program Semester | `/promes` | ✅ Auto-generate saat buka | Generate, Mode Dokumen, Cetak | ✅ |
| 3 | ATP / Bank TP | `/atp` | ✅ 2 TP (Norma bab 1, 2) | Tambah TP, Edit, Hapus, Prompt AI | ✅ |
| 4 | Kalender Pendidikan + Hari Besar | `/calendar` | ✅ 6 events | Tambah event, impor JSON | ✅ |
| 5 | Jadwal Mengajar | `/schedule` | ✅ 1 jadwal (VII A Senin) | Tambah/edit, Generate Sesi, Linker | ✅ |
| 6 | Daftar Siswa | `/roster` | ✅ 1 roster VII A (10 siswa + NIS) | Tambah siswa, impor massal | ✅ |
| 7 | Absensi Semester | `/attendance` | ✅ 1 sesi ada absensi contoh | 3 mode: Dari Jadwal / Susulan / Absen Manual | ✅ |
| 8 | Jurnal Mengajar | `/journal` | ✅ 1 jurnal final contoh | 3 mode: Hari Ini / Susulan / Manual | ✅ |
| 9 | Daftar Nilai | `/grades` | ✅ 1 GradeBook (10 siswa, 75-94) | Pilih Assignment, Isi 80, Acak, Paste, Simpan | ✅ |
| 10 | Analisis Ketuntasan | `/completeness` | ✅ Cek otomatis | Checklist per modul + link | ✅ |
| 11 | **Program Remedial** | `/remedial` | ✅ Generate dari GradeBook | Pilih Assignment, Generate, Edit Siswa, Finalkan, Cetak | ✅ **BARU** |
| 12 | **Program Pengayaan** | `/pengayaan` | ✅ Generate dari GradeBook | Pilih Assignment, Generate, Edit Siswa, Finalkan, Cetak | ✅ **BARU** |
| 13 | LKPD | `/lkpd` | ✅ 1 LKPD draft | Buat dari TP, Edit, Finalkan, Preview/Cetak | ✅ |
| 14 | **RPP Bulk Identity Replacement** | `/rpp-bulk` | — (guru upload/paste) | Upload/Paste, Auto-fill Identitas, Preview, Download, Cetak | ✅ **BARU** |
| 14b | RPP Template (legacy) | `/rpp` | — (template generator) | Pilih konteks, Salin placeholder | ✅ (legacy) |
| 15 | Laporan Akhir Semester | `/semester-report` | ✅ Generate dari assignment | Pilih Assignment, Generate, Finalize, Cetak | ✅ |
| 16 | **Paket Administrasi Guru** | `/admin-package` | ✅ Checklist 14 dokumen | Pilih Assignment, Lihat Skor, Buka per Dokumen | ✅ **BARU** |
| 17 | Backup / Restore | `/backup` | — | Export, Import, Restore (include rppDocuments + remedial + enrichment) | ✅ |
| 18 | Import Apps Script | (planned Phase 7) | — | — | ⏳ Phase 7 |

## Modul Pendukung

| Modul | Route | Status |
|---|---|---|
| Data Mengajar | `/assignments` | ✅ |
| Profil Sekolah + Guru | `/profile` | ✅ |
| Tahun Baru Wizard | `/new-year` | ✅ |

## Phase Status (Roadmap §9)

| Phase | Status | Catatan |
|---|---|---|
| Phase 0 — Roadmap Reset & Contract Lock | ✅ DONE | Roadmap V3 diadopsi, audit matrix baru ini |
| Phase 1 — RPP Bulk Identity Replacement | ✅ DONE | `/rpp-bulk` lengkap dengan upload/paste/preview/cetak |
| Phase 2 — Remedial | ✅ DONE | `/remedial` generate dari GradeBook < KKTP |
| Phase 3 — Pengayaan | ✅ DONE | `/pengayaan` generate dari GradeBook ≥ 90 |
| Phase 4 — LKPD Completion | ✅ DONE (sebelumnya) | `/lkpd` sudah ada dari APP-USABLE-RC1 |
| Phase 5 — Auto Document Engine | ⏳ PLANNED | Tombol "Generate Paket Dokumen" = future work |
| Phase 6 — Paket Administrasi Guru | ✅ DONE | `/admin-package` checklist 14 dokumen |
| Phase 7 — Apps Script Bridge | ⏳ PLANNED | Import JSON dari Apps Script = future work |
| Phase 8 — Print/Export Polish | ⏳ PARTIAL | Print CSS sudah ada, export HTML/PDF/Word = future |
| Phase 9 — Supabase Migration | ⏳ FUTURE | Ditunda sampai generator matang |

## Sistem Auto (Roadmap §5)

| Fitur Auto | Status |
|---|---|
| Generate LKPD dari TP | ✅ (LKPDPage: pilih TP → auto-fill subject/grade/tp) |
| Bulk ganti identitas RPP lama | ✅ **BARU** (`/rpp-bulk`) |
| Generate Jurnal dari pertemuan/absensi | ✅ (QuickJournalPage meeting-first) |
| Generate Remedial dari nilai | ✅ **BARU** (`/remedial`) |
| Generate Pengayaan dari nilai | ✅ **BARU** (`/pengayaan`) |
| Generate Laporan Akhir Semester | ✅ (`/semester-report` pilih assignment → generate) |
| Generate Paket Dokumen | ⏳ PLANNED (Phase 5) |

## Filter Assignment 5-tuple (Roadmap §5 "tidak bercampur")

Modul yang sudah filter by (teacherId + subject + classId + semester + academicYearId):

| Modul | Filter | Verified |
|---|---|---|
| Nilai | ✅ findGradeBook by 5-tuple | ✅ |
| Absen Susulan | ✅ recapAttendanceForAssignment | ✅ |
| Absen Manual | ✅ findOrCreateManualSession | ✅ |
| Jurnal | ✅ recapJournalsForAssignment | ✅ |
| Laporan | ✅ generator filter by assignment (Test #8 domain) | ✅ |
| Remedial | ✅ generateRemedialProgram by assignment | ✅ |
| Pengayaan | ✅ generateEnrichmentProgram by assignment | ✅ |
| Paket Administrasi | ✅ filter sessions/journals/attendance by assignment | ✅ |

## ContextCard Coverage (Roadmap §"tidak ada istilah teknis")

| Layar Kerja | InfoCard | Field |
|---|---|---|
| Nilai | ✅ | Guru, Mapel, Kelas, Semester, TP |
| Absen Susulan | ✅ | Guru, Mapel, Kelas, Semester, TP |
| Absen editor | ✅ | Mapel, Kelas, Tanggal, Jam, Semester |
| Jurnal | ✅ | Guru, Mapel, Kelas, Semester, TP |
| LKPD form | ✅ | Guru, Mapel, Kelas, Fase, Bab |
| RPP Template | ✅ | Guru, Mapel, Kelas, Semester, TP |
| RPP Bulk Replace | ✅ | Sekolah, Guru, Mapel, Kelas, Semester |
| Laporan | ✅ | Guru, Mapel, Kelas (VII A), Semester, TP |
| Remedial | ✅ | Guru, Mapel, Kelas, Semester, TP |
| Pengayaan | ✅ | Guru, Mapel, Kelas, Semester, TP |
| Paket Administrasi | ✅ | Guru, Mapel, Kelas, Semester, TP |

## Backup/Restore Coverage

Entitas yang di-include di export + restore (dengan backward compat default `[]`):

```
academicYears, schoolProfile, teacherProfile, calendarEvents,
protaProfiles (+units), teachingSchedules, teachingAssignments,
lessonSessions, attendanceRecords, classRosters, teachingJournals,
semesterReports, gradeBooks, atpEntries, lkpds,
rppDocuments (BARU), remedialPrograms (BARU), enrichmentPrograms (BARU),
documentSnapshots
```

DATA_SCHEMA_VERSION = 6.

## Known Issues Tersisa

1. **Phase 5 — Auto Document Engine** belum ada. Tombol "Generate Paket Dokumen" yang menghasilkan RPP+LKPD+Remedial+Pengayaan+Laporan sekaligus = future work.
2. **Phase 7 — Apps Script Bridge** belum ada. Import JSON dari Apps Script = future work.
3. **Phase 8 — Print/Export Polish** partial. Print CSS sudah ada, tapi export PDF/Word belum.
4. **Multi-guru belum penuh** — AssignmentsPage masih admin-style (single-teacher MVP). Master Guru = future work.
5. **Build warning** — chunk >500KB (bukan blocker).
6. **CI belum verified** — GitHub workflow masih pending. Lokal PASS.
7. **RPP bulk replace hanya placeholder-based** — literal text replacement (ganti teks "SMA Negeri 1" → "SMPN 8 Bantan") = future work. Saat ini hanya placeholder `{{...}}` yang di-replace.

## Larangan yang Dipatuhi (Roadmap §11)

- ❌ Tidak buat Supabase
- ❌ Tidak rebuild absen/jurnal internal
- ❌ Tidak login multi-user penuh
- ❌ Tidak hapus modul absen/jurnal yang sudah ada
- ❌ Tidak klaim CLOSED

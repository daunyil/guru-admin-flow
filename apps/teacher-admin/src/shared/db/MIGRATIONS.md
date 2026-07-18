# Migrations — Dexie Schema

Setiap perubahan skema Dexie wajib:

1. Naikkan `db.version(n)` di `schema.ts`
2. Sediakan `upgrade()` function yang idempoten
3. Catat di tabel bawah dengan: versi, tanggal, deskripsi perubahan

## Riwayat

| Version | Tanggal | Perubahan | Notes |
|---------|---------|-----------|-------|
| 1 | Sprint 1 | Skema awal. 14 tabel: academicYears, schoolProfile, teacherProfile, calendarEvents, protaProfiles, protaUnits, teachingSchedules, lessonSessions, attendanceRecords, classRosters, teachingJournals, semesterReports, documentSnapshots, syncQueue. | Lihat docs/TECHNICAL_PLAN.md §4.3 untuk detail indeks. |
| 2 | Sprint 2 | + gradeBooks | Index composite [academicYearId+teacherId+classId+semester] |
| 3 | PATCH-FLOW-RC2C | + teachingAssignments | Index composite [academicYearId+semester+teacherId+classId+subject] |
| 4 | APP-USABLE-RC1 | + atpEntries, lkpds | ATP/TP dan LKPD modul |
| 5 | Sprint 2 | semesterReports index update | Tambah classId, grade, composite index |
| 6 | GENERATOR-COMPLETION-RC1 | + rppDocuments, remedialPrograms, enrichmentPrograms | RPP bulk + remedial + pengayaan |
| 7 | GRADEBOOK-V2 | gradeBooks index update | KD1-KD6 + PTS + PAS fields |
| 8 | PIKET-HARIAN-MOBILE-01 | + dailyDutyRules, dailyDutyReports, dailyDutyRecords | Tabel Piket Harian (terisolasi) |
| 9 | WYSIWYG-DOC-01 | + schoolDocuments | Tabel dokumen sekolah generik untuk infrastruktur WYSIWYG. Index: id, docType, semester, tahunAjaran, kodeMapel, kodeKelas, status, teacherId, academicYearId, updatedAt |

## Aturan Upgrade

- **Idempoten**: upgrade boleh dijalankan berkali-kali tanpa merusak data.
- **Additive**: tambah field baru sebagai optional, jangan hapus field lama.
- **Migration data**: bila perlu transformasi data, lakukan di `upgrade()` dengan try-catch per record.
- **Catat di worklog**: setiap migration wajib catat di `worklog.md` di sprint yang sama.

# Migrations — Dexie Schema

Setiap perubahan skema Dexie wajib:

1. Naikkan `db.version(n)` di `schema.ts`
2. Sediakan `upgrade()` function yang idempoten
3. Catat di tabel bawah dengan: versi, tanggal, deskripsi perubahan

## Riwayat

| Version | Tanggal | Perubahan | Notes |
|---------|---------|-----------|-------|
| 1 | Sprint 1 | Skema awal. 14 tabel: academicYears, schoolProfile, teacherProfile, calendarEvents, protaProfiles, protaUnits, teachingSchedules, lessonSessions, attendanceRecords, classRosters, teachingJournals, semesterReports, documentSnapshots, syncQueue. | Lihat docs/TECHNICAL_PLAN.md §4.3 untuk detail indeks. |

## Aturan Upgrade

- **Idempoten**: upgrade boleh dijalankan berkali-kali tanpa merusak data.
- **Additive**: tambah field baru sebagai optional, jangan hapus field lama.
- **Migration data**: bila perlu transformasi data, lakukan di `upgrade()` dengan try-catch per record.
- **Catat di worklog**: setiap migration wajib catat di `worklog.md` di sprint yang sama.

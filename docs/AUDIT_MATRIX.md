# Audit Matrix — APP-USABLE-RC1

Tujuan: cek setiap menu punya route + data + tombol utama yang bisa dipakai guru.

## Cara Pakai

Setelah seed data (klik "Pakai Data Contoh" di Home), cek setiap menu.

## Matrix

| # | Menu | Route | File | Data Seed | Tombol Utama | Catatan |
|---|------|-------|------|-----------|--------------|---------|
| 1 | Hari Ini | `/` | `routes/TodayPage.tsx` | ✅ Profil + tahun + assignments + sesi | "Pakai Data Contoh", "Mulai Cepat", "Sesi Mengajar Hari Ini" | Warning bila belum ada Data Mengajar |
| 2 | Profil | `/profile` | `modules/profile/ProfilePage.tsx` | ✅ Sekolah + guru | Simpan profil sekolah + guru | — |
| 3 | Kalender | `/calendar` | `modules/calendar/CalendarPage.tsx` | ✅ 6 events (MPLS, KBM, HUT RI, libur semester, rapor) | Tambah event, impor JSON | — |
| 4 | Program Tahunan | `/prota` | `modules/prota/ProtaPage.tsx` | ✅ 6 unit PPKn (3 sem 1, 3 sem 2) | Tambah unit, impor JSON | — |
| 5 | Program Semester | `/promes` | `modules/promes/PromesPage.tsx` | ⚠️ Tidak auto-generate di seed. Guru generate dari Prota | Generate Promes | Butuh klik Generate setelah seed |
| 6 | Jadwal | `/schedule` | `modules/schedule/SchedulePage.tsx` | ✅ 2 jadwal (VII A Senin, VIII B Selasa) | Tambah/edit jadwal, Generate Sesi, Linker Promes | Generate Sesi sudah dijalankan di seed |
| 7 | Siswa | `/roster` | `modules/roster/RosterPage.tsx` | ✅ 2 roster (VII A 10 siswa, VIII B 5 siswa) dengan NIS | Tambah siswa, impor massal | — |
| 8 | Data Mengajar | `/assignments` | `modules/assignments/AssignmentsPage.tsx` | ✅ 2 assignment (auto-gen dari jadwal) | Tambah manual, Auto-Gen dari Jadwal, Hapus | — |
| 9 | Bank TP | `/atp` | `modules/atp/ATPPage.tsx` | ✅ 2 ATP/TP (Norma bab 1, bab 2) | Tambah TP, Edit, Hapus, Prompt AI | Pakai schema formal atpEntries |
| 10 | LKPD | `/lkpd` | `modules/lkpd/LKPDPage.tsx` | ✅ 1 LKPD draft ("Norma dalam Masyarakat") | Buat LKPD (dari TP), Edit, Finalkan, Preview/Cetak, Hapus | Modul nyata, bukan cuma prompt AI |
| 11 | RPP | `/rpp` | `modules/rpp/RPPPage.tsx` | ❌ Tidak ada seed RPP (template saja) | Template RPP | Hanya template generator |
| 12 | Absen | `/attendance` | `modules/attendance/QuickAttendancePage.tsx` | ✅ Sesi dari jadwal | 3 mode: Dari Jadwal / Susulan / Manual | Catch-up window + ContextCard |
| 13 | Jurnal | `/journal` | `modules/journal/QuickJournalPage.tsx` | ✅ Sesi dari jadwal | 3 mode: Hari Ini / Susulan / Manual | Rekap + ContextCard + finalize |
| 14 | Nilai | `/grades` | `modules/grades/GradesPage.tsx` | ❌ Tidak ada seed nilai (guru input sendiri) | Pilih Data Mengajar, Isi Semua 80, Acak, Paste Excel, Simpan | ContextCard |
| 15 | Kelengkapan | `/completeness` | `modules/completeness/CompletenessPage.tsx` | ✅ Cek otomatis dari data | Per-modul checklist + link | — |
| 16 | Laporan | `/semester-report` | `modules/semester-report/SemesterReportPage.tsx` | ❌ Kosong sampai guru ada data absensi+jurnal | Generate, Finalize | — |
| 17 | Backup | `/backup` | `modules/backup/BackupPage.tsx` | — | Export, Import, Restore | Include atpEntries + lkpds |
| 18 | Tahun Baru | `/new-year` | `modules/new-year/NewYearWizard.tsx` | — | Wizard tahun baru | — |

## Full-Flow Test Scenario

Setelah seed, jalankan urutan ini:

1. **Hari Ini** → Klik "Pakai Data Contoh" → reload
2. **Data Mengajar** → Pastikan 2 assignment muncul (VII A · PPKn, VIII B · PPKn)
3. **Bank TP** → Pastikan 2 TP muncul
4. **LKPD** → Pastikan 1 LKPD muncul → klik Preview → klik Cetak
5. **Jadwal** → Pastikan 2 jadwal + klik "Generate Sesi" → pastikan sesi muncul
6. **Absen** → mode "Dari Jadwal" → pilih tanggal Senin → klik sesi → isi absen → Simpan
7. **Absen** → mode "Absen Susulan" → pilih Data Mengajar → pastikan daftar belum absen muncul
8. **Absen** → mode "Manual" → pilih Data Mengajar → Mulai Absen → isi → Simpan
9. **Jurnal** → pilih Data Mengajar → mode "Hari Ini" → klik pertemuan → editor terbuka → Setujui & Finalkan → pastikan jadi locked
10. **Jurnal** → mode "Jurnal Susulan" → pastikan daftar belum jurnal muncul
11. **Jurnal** → mode "Jurnal Manual" → Mulai Jurnal Manual → isi → Simpan
12. **Nilai** → pilih Data Mengajar → Isi Semua 80 → Simpan → reload → pastikan data tetap ada
13. **Backup** → Export → pastikan file JSON terunduh
14. **Kelengkapan** → pastikan skor kelengkapan > 0

## Known Issues

1. **Promes tidak auto-generate di seed** — guru harus klik Generate di menu Promes setelah seed. Bisa ditambahkan di patch berikutnya.
2. **RPP hanya template** — tidak ada data RPP nyata, hanya generator teks template.
3. **Multi-guru belum penuh** — semua filter pakai teacherId, tapi AssignmentsPage masih admin-style (single-teacher MVP). Master Guru = future work.
4. **Build warning** — chunk >500KB (sudah ada sejak Sprint 4, bukan blocker).

# Audit Matrix — APP-USABLE-RC1A

Tujuan: cek setiap menu punya route + data + tombol utama yang bisa dipakai guru.

## Cara Pakai

Setelah seed data (klik "Pakai Data Contoh" di Home), cek setiap menu.

## Matrix

| # | Menu | Route | Data Seed | Tombol Utama | Status |
|---|------|-------|-----------|--------------|--------|
| 1 | Hari Ini | `/` | ✅ Profil + tahun + assignments + sesi | "Pakai Data Contoh", "Mulai Cepat", "Sesi Mengajar Hari Ini" | ✅ Siap |
| 2 | Profil | `/profile` | ✅ Sekolah + guru | Simpan profil sekolah + guru | ✅ Siap |
| 3 | Kalender | `/calendar` | ✅ 6 events | Tambah event, impor JSON | ✅ Siap |
| 4 | Program Tahunan | `/prota` | ✅ 1 Prota PPKn VII (6 unit) | Tambah unit, impor JSON | ✅ Siap |
| 5 | Program Semester | `/promes` | ✅ Auto-generate saat buka halaman (Prota+Kalender sudah ada) | Generate, Mode Dokumen, Cetak | ✅ Siap |
| 6 | Jadwal | `/schedule` | ✅ 1 jadwal (VII A Senin) | Tambah/edit jadwal, Generate Sesi, Linker Promes | ✅ Siap |
| 7 | Siswa | `/roster` | ✅ 1 roster VII A (10 siswa + NIS) | Tambah siswa, impor massal | ✅ Siap |
| 8 | Data Mengajar | `/assignments` | ✅ 1 assignment (VII A · PPKn, auto-gen) | Tambah manual, Auto-Gen dari Jadwal, Hapus | ✅ Siap |
| 9 | Bank TP | `/atp` | ✅ 2 ATP/TP (Norma bab 1, bab 2) | Tambah TP, Edit, Hapus, Prompt AI | ✅ Siap |
| 10 | LKPD | `/lkpd` | ✅ 1 LKPD draft ("Norma dalam Masyarakat") | Buat LKPD (dari TP), Edit, Finalkan, Preview/Cetak, Hapus | ✅ Siap |
| 11 | RPP | `/rpp` | Template generator (tidak butuh data persist) | Pilih konteks, Salin placeholder, Generate template | ✅ Siap (template) |
| 12 | Absen | `/attendance` | ✅ Sesi dari jadwal + 1 sesi sudah ada absensi contoh | 3 mode: Dari Jadwal / Susulan / Manual | ✅ Siap |
| 13 | Jurnal | `/journal` | ✅ Sesi dari jadwal + 1 jurnal final contoh | 3 mode: Hari Ini / Susulan / Manual | ✅ Siap |
| 14 | Nilai | `/grades` | ✅ 1 GradeBook contoh (10 siswa, nilai 75-94) | Pilih Data Mengajar, Isi Semua 80, Acak, Paste Excel, Simpan | ✅ Siap |
| 15 | Kelengkapan | `/completeness` | ✅ Cek otomatis dari data | Per-modul checklist + link | ✅ Siap |
| 16 | Laporan | `/semester-report` | ✅ Bisa generate dari data absensi+jurnal+sesi yang sudah ada | Generate, Finalize, Mode Dokumen, Cetak | ✅ Siap |
| 17 | Backup | `/backup` | — | Export, Import, Restore | ✅ Siap |
| 18 | Tahun Baru | `/new-year` | — | Wizard tahun baru | ✅ Siap |

## Alur Data Contoh Lengkap (Seed → Laporan)

Setelah klik "Pakai Data Contoh":

```
Profil sekolah + guru (Siti Aminah, S.Pd.)
  → Tahun pelajaran 2025/2026
  → Kalender (6 events)
  → Prota PPKn VII (6 unit)
  → Jadwal VII A (Senin jam 1-2)
  → Roster VII A (10 siswa + NIS)
  → Data Mengajar (1 assignment auto-gen: VII A · PPKn)
  → ATP/TP (2 entry: Norma bab 1, bab 2)
  → LKPD (1 draft: "Norma dalam Masyarakat")
  → Generate Sesi (otomatis dari jadwal+kalender)
  → 1 sesi sudah diisi:
      - Absensi (9 H, 1 S)
      - Jurnal (final/locked, materi "Norma dalam Masyarakat")
      - Nilai (GradeBook, 10 siswa, nilai 75-94)
  → Promes (auto-generate saat buka menu Program Semester)
  → Laporan (bisa di-generate dari menu Laporan → Generate)
```

## Full-Flow Test Scenario

1. **Home** → klik "Pakai Data Contoh" → reload
2. **Data Mengajar** → pastikan 1 assignment muncul (VII A · PPKn · Siti Aminah)
3. **Bank TP** → pastikan 2 TP muncul
4. **LKPD** → pastikan 1 LKPD muncul → klik **Preview** → klik **Cetak**
5. **Program Semester** → pastikan Promes **otomatis muncul** (tidak perlu klik Generate)
6. **Jadwal** → pastikan 1 jadwal + sesi sudah ter-generate
7. **Absen** → mode "Dari Jadwal" → pilih tanggal Senin → klik sesi → pastikan ada absensi contoh → ubah 1 siswa → Simpan
8. **Absen** → mode "Absen Susulan" → pilih Data Mengajar → pastikan ContextCard + rekap + daftar belum absen
9. **Absen** → mode "Manual" → pilih Data Mengajar → Mulai Absen → isi → Simpan
10. **Jurnal** → pilih Data Mengajar → mode "Hari Ini" → klik pertemuan → pastikan ada jurnal contoh (final) → klik "Buka Kembali" → edit → "Setujui & Finalkan"
11. **Jurnal** → mode "Jurnal Susulan" → pastikan ContextCard + daftar belum jurnal
12. **Nilai** → pilih Data Mengajar → pastikan ContextCard + GradeBook contoh muncul → edit nilai → Simpan
13. **Laporan** → pilih Prota + semester → pastikan ContextCard → klik **Generate Laporan** → pastikan summary muncul
14. **RPP** → pilih konteks → pastikan ContextCard → klik "Salin Semua"
15. **Backup** → Export → pastikan file JSON terunduh
16. **Kelengkapan** → pastikan skor > 0

## ContextCard Coverage

| Layar Kerja | ContextCard/InfoCard | Field ditampilkan |
|---|---|---|
| Nilai | ✅ ContextCard | Guru, Mapel, Kelas, Semester, TP |
| Absen Susulan | ✅ ContextCard | Guru, Mapel, Kelas, Semester, TP |
| Absen (editor, semua mode) | ✅ InfoCard | Mapel, Kelas, Tanggal, Jam, Semester |
| Jurnal (setelah pilih assignment) | ✅ ContextCard | Guru, Mapel, Kelas, Semester, TP |
| LKPD (form, setelah pilih TP) | ✅ InfoCard | Guru, Mapel, Kelas, Fase, Bab |
| RPP (setelah pilih konteks) | ✅ InfoCard | Guru, Mapel, Kelas, Semester, TP |
| Laporan (setelah pilih Prota) | ✅ InfoCard | Guru, Mapel, Kelas, Semester, TP |

## Istilah Teknis yang Sudah Dibersihkan

| Sebelum | Sesudah |
|---|---|
| "ATP/TP" (menu) | "Bank TP" |
| "Prota" (menu) | "Program Tahunan" |
| "Promes" (menu) | "Program Semester" |
| "Punya rencana Prota" (UI text) | "Punya rencana materi" |
| "Total ... pertemuan (sesuai LessonSession)" | "Total ... pertemuan terjadwal" |
| "Sesi Mengajar (LessonSession)" (Kelengkapan) | "Sesi Mengajar (Pertemuan)" |
| "Manual (Ad-hoc)" (button) | "Manual" |
| "Absen Manual (Ad-hoc)" (header) | "Absen Manual" |

Istilah yang dibiarkan karena baku Kurikulum Merdeka: JP (Jam Pelajaran), KKTP (Kriteria Ketercapaian Tujuan Pembelajaran).

## Known Issues Tersisa

1. **Multi-guru belum penuh** — semua filter pakai teacherId, tapi AssignmentsPage masih admin-style (single-teacher MVP). Master Guru = future work.
2. **Build warning** — chunk >500KB (bukan blocker).
3. **CI belum verified** — GitHub workflow masih pending. Lokal PASS untuk typecheck/test/build.
4. **RPP hanya template generator** — tidak menyimpan RPP persist, hanya bantu identitas + placeholder untuk Word.

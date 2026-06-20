# Project Contract — Guru Admin Flow

**Status:** Sprint 0 — Locked (Draft v1.0)
**Sumber otoritas:** `docs/GURU_ADMIN_FLOW_REFERENCE.md`
**Prinsip utama:** *Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.*

Dokumen ini adalah kontrak produk yang mengikat seluruh keputusan implementasi Sprint 1–6. Setiap penyimpangan harus melalui revisi kontrak, bukan keputusan sepihak dev.

---

## 1. Visi Produk

Guru Admin Flow adalah asisten administrasi guru yang mengubah pekerjaan berulang setiap semester — kalender, Prota, Promes, absensi, jurnal, dan laporan akhir semester — menjadi alur singkat berbasis data.

Aplikasi ini bukan sekadar generator dokumen. Aplikasi ini bekerja sebagai lapisan orkestrasi yang:

1. menyimpan data tetap (profil sekolah, profil guru, mapel, template) sebagai versi yang dapat dipakai ulang;
2. menerima data tahunan yang berubah (kalender pendidikan, kepala sekolah, tahun pelajaran) melalui impor JSON hasil AI;
3. menghasilkan dokumen turunan (Promes, sesi mengajar, jurnal, laporan) secara otomatis dari data tersebut;
4. mengumpulkan data realisasi harian (absensi, jurnal) melalui HP dengan default yang meminimalkan ketukan guru;
5. mengkompilasi laporan akhir semester dari data harian yang sudah tervalidasi.

Filosofi yang tidak boleh dilanggar: **jangan meminta guru mengisi data yang sudah bisa diambil dari sumber lain**. Jadwal → sesi mengajar. Sesi mengajar + Promes → jurnal kosong. Absensi default → semua hadir. Laporan → rekap jurnal + absensi.

---

## 2. Target Pengguna

### 2.1 Pengguna Utama

Guru mata pelajaran SMP yang mengajar multiple kelas dalam satu tahun pelajaran. Pada Sprint 0, persona acuan adalah guru PPKn/Pendidikan Pancasila SMPN 8 Bantan dengan beban mengajar lintas kelas VII/VIII/IX.

### 2.2 Pengguna Sekunder (out of scope MVP v1)

- Wali kelas (memerlukan modul wali kelas tersendiri — non-goal).
- Wakil Kepala Sekolah Bidang Kurikulum (ditangani oleh Smart Roster, aplikasi terpisah).
- Kepala Sekolah (memerlukan modul supervisi — non-goal).
- Koordinator Kokurikuler/TIM (memerlukan modul KO terpisah — non-goal).

### 2.3 Karakteristik Pengguna Utama

- Sibuk mengajar 6+ JP per hari, waktu administrasi terbatas.
- Mengakses aplikasi dari HP saat di kelas, dari laptop saat menyusun perangkat.
- Tidak terbiasa dengan istilah teknis (schema, sync, model data).
- Sering mengulang pekerjaan yang sama setiap semester dengan perubahan kecil.
- Rentan lupa mengisi jurnal dan absensi.

---

## 3. Masalah Utama yang Diselesaikan

| # | Masalah guru saat ini | Solusi Guru Admin Flow |
|---|---|---|
| 1 | Membuat perangkat administrasi yang mirip setiap semester | Fitur "Buat Tahun Pelajaran Baru dari Tahun Lalu" yang menyalin profil, Prota, dan template, lalu mengosongkan realisasi |
| 2 | Tahun pelajaran, kalender, kepala sekolah, dan jadwal sering berubah | Data tahunan disimpan terpisah dari data tetap; impor JSON hasil AI untuk kalender |
| 3 | Sering lupa mengisi absensi dan jurnal | Dashboard berbasis pekerjaan hari ini + daftar "Belum selesai" yang menagih |
| 4 | Absensi manual diisi satu per satu padahal mayoritas hadir | Default semua hadir, guru hanya mengubah yang tidak hadir |
| 5 | Jurnal dan laporan akhir dibuat manual di akhir semester | Jurnal otomatis dari jadwal + Promes + absensi; laporan dari kompilasi jurnal + absensi |
| 6 | Dokumen unduhan internet perlu diganti identitas massal | Profil sekolah/guru tersimpan sebagai sumber tunggal, semua dokumen di-generate dengan identitas yang sama |
| 7 | Data antar dokumen tidak sinkron | Satu sumber kebenaran per entitas; dokumen lain adalah turunan |

---

## 4. Scope MVP v1

Modul berikut wajib ada di MVP v1. Modul di luar daftar ini dilarang dikerjakan sebelum MVP v1 selesai.

### 4.1 Modul Wajib

| Kode | Modul | Output Utama |
|---|---|---|
| M01 | Profil Sekolah & Guru | Data master sekolah, guru, kepala sekolah, tahun pelajaran aktif |
| M02 | Kalender Pendidikan | Daftar CalendarEvent hasil impor JSON atau input manual |
| M03 | Prota | ProtaProfile + ProtaUnit, tervalidasi total JP |
| M04 | Promes | Dokumen Promes hasil generate dari Prota + Kalender + Jadwal |
| M05 | Jadwal Guru | TeachingSchedule hasil input manual atau impor dari Smart Roster |
| M06 | Absensi Cepat (HP) | AttendanceRecord per sesi, default semua hadir |
| M07 | Jurnal Otomatis | TeachingJournal hasil auto-fill dari jadwal + Promes + absensi |
| M08 | Laporan Akhir Semester | SemesterReport hasil kompilasi jurnal + absensi + progres materi |
| M09 | Backup / Restore | Ekspor & impor JSON snapshot lengkap |

### 4.2 Fitur Lintas Modul Wajib

- Fitur "Buat Tahun Pelajaran Baru dari Tahun Lalu" (lihat §7.5).
- Validasi total JP, kelengkapan jurnal, dan sinkronisasi sebelum finalisasi laporan.
- Status dokumen: `Draft | Ready for Review | Final | Revised | Locked`.
- Penanda status sinkronisasi per item: `Tersimpan di perangkat | Menunggu sinkronisasi | Tersinkron | Gagal sinkron`.

### 4.3 Batas MVP v1 — Pemisahan Produk

Smart Roster (aplikasi Waka Kurikulum) dan Guru Admin Flow adalah **dua aplikasi terpisah**. Pada MVP v1, keduanya berbagi monorepo tetapi tidak berbagi UI dashboard. Mereka hanya berbagi paket skema di `packages/shared`. Smart Roster menghasilkan JSON jadwal yang diimpor oleh Guru Admin Flow.

---

## 5. Non-Goals MVP v1

Daftar berikut dilarang dikerjakan sebelum MVP v1 selesai dan dikunci. Setiap item non-goal harus dijauhi meskipun tampak mudah diimplementasikan.

1. Bank soal lengkap beserta manajemen butir.
2. Analisis butir soal (item analysis).
3. Modul ajar AI penuh (AI hanya pembantu konversi dokumen → JSON di luar aplikasi).
4. Penggantian identitas DOCX massal (parser DOCX otomatis).
5. Supervisi kepala sekolah.
6. Aplikasi wali kelas.
7. Rapor penuh (rapor siswa lengkap dengan KKM dan deskripsi per KD).
8. Parser DOCX/PDF otomatis di dalam aplikasi.
9. Integrasi AI API langsung dari aplikasi.
10. Manajemen KO (Kokurikuler) per mapel — KO adalah kegiatan koordinator/TIM, bukan dibebankan ke guru mapel.
11. Modul nilai lengkap dengan remedial otomatis (nilai hanya disimpan minimal jika dibutuhkan untuk laporan).
12. Multi-sekolah per akun guru (di MVP v1, satu akun = satu sekolah).
13. Sinkronisasi real-time antar perangkat (di MVP v1, sinkronisasi satu arah: lokal → cloud saat online).

Alasan tiap non-goal dicatat di `docs/TECHNICAL_PLAN.md` §8 (Out of Scope Justification).

---

## 6. User Flow

### 6.1 Flow Awal Tahun Pelajaran

```text
Login (Sprint 6) / Buka aplikasi (Sprint 1–5, lokal)
→ Cek: apakah ada tahun pelajaran aktif?
  TIDAK → wizard "Buat Tahun Baru":
            1. Pilih tahun pelajaran sebelumnya (jika ada) ATAU mulai kosong
            2. Salin profil sekolah, profil guru, Prota, template
            3. Perbarui kepala sekolah jika berganti
            4. Impor kalender pendidikan JSON hasil AI
            5. Input/impor jadwal guru
            6. Generate Promes dari Prota + Kalender + Jadwal
            7. Preview Promes → simpan sebagai Draft
  YA   → langsung ke Dashboard Hari Ini
```

### 6.2 Flow Awal Semester

```text
Dashboard
→ Pilih semester aktif
→ Generate Promes (jika belum) dari Prota + Kalender + Jadwal
→ Cek status Promes:
  - Valid: lanjut
  - Perlu perbaikan: tampilkan JP yang belum terdistribusi
→ Promes siap → sesi mengajar otomatis dibuat untuk minggu efektif
```

### 6.3 Flow Harian (di kelas, dari HP)

```text
Buka aplikasi di HP
→ Dashboard Hari Ini menampilkan daftar sesi hari ini:
  "VII A — Pendidikan Pancasila — 08.10–09.30  [Absen & Jurnal]"
→ Tap sesi
→ Halaman Absensi:
  - Semua siswa otomatis Hadir
  - Guru hanya mengubah siswa yang Sakit/Izin/Alpa
  - Tap Simpan
→ Halaman Jurnal (otomatis terisi):
  - Tanggal, jam ke, kelas, mapel, materi dari Promes, tujuan pembelajaran,
    jumlah hadir/sakit/izin/alpa, guru pengampu
  - Guru memilih realisasi: Selesai / Dilanjutkan / Tidak Terlaksana
  - Guru tambahkan catatan bila perlu
  - Tap Simpan
→ Status: "Tersimpan di perangkat" → "Menunggu sinkronisasi" → "Tersinkron"
```

### 6.4 Flow Akhir Semester

```text
Dashboard → menu "Laporan Semester"
→ Halaman kelengkapan:
  - X dari Y jurnal sudah diisi
  - X dari Y sesi sudah berstatus Selesai/Dilanjutkan/Tidak Terlaksana
  - X dari Y absensi sudah tersinkron
  - Materi: A dari B unit terlaksana
→ Bila ada yang belum lengkap → tombol Finalisasi dinonaktifkan
→ Bila lengkap → tap Generate Laporan
→ Preview laporan → simpan sebagai "Ready for Review"
→ Kepala sekolah review (di luar aplikasi) → ubah status ke "Final"
→ Snapshot laporan terkunci, tidak bisa diubah diam-diam
```

### 6.5 Flow Backup / Restore

```text
Dashboard → menu "Backup"
→ Export JSON:
  - semua profil, kalender, Prota, jadwal, sesi, absensi, jurnal, laporan
  - file: guru-admin-flow-backup-YYYYMMDD-HHmm.json
→ Import JSON:
  - pilih file
  - validasi skema
  - konfirmasi overwrite
  - restore
```

---

## 7. Data Ownership

### 7.1 Sumber Kebenaran per Entitas

| Entitas | Sumber Kebenaran | Turunan |
|---|---|---|
| SchoolProfile | Input manual guru | Digunakan di semua dokumen |
| TeacherProfile | Input manual guru | Digunakan di semua dokumen |
| AcademicYear | Input/fitur "Buat Tahun Baru" | Konteks untuk semua entitas tahunan |
| CalendarEvent | Impor JSON AI / input manual | Acuan Promes + sesi mengajar |
| ProtaProfile | Impor JSON AI / input manual | Acuan Promes + jurnal |
| ProtaUnit | Bagian dari ProtaProfile | Materi untuk jurnal |
| TeachingSchedule | Input manual / impor Smart Roster | Sumber LessonSession |
| LessonSession | Auto-generate dari Schedule + Calendar | Sumber AttendanceRecord + TeachingJournal |
| AttendanceRecord | Input guru (default hadir) | Bahan laporan semester |
| TeachingJournal | Auto-fill + input guru | Bahan laporan semester |
| SemesterReport | Auto-generate dari Journal + Attendance + Progres | Dokumen final |

### 7.2 Aturan Tahun Baru

Saat fitur "Buat Tahun Pelajaran Baru" dijalankan:

| Data | Disalin | Dikosongkan |
|---|---|---|
| SchoolProfile | ya | — |
| TeacherProfile | ya | — |
| AcademicYear | baru, sebagai salinan | active=true pada yang baru, active=false pada lama |
| CalendarEvent | — | ya (diimpor ulang) |
| ProtaProfile | ya (sebagai versi baru) | — |
| ProtaUnit | ya | — |
| TeachingSchedule | ya (sebagai draft, perlu dikonfirmasi) | — |
| LessonSession | — | ya |
| AttendanceRecord | — | ya |
| TeachingJournal | — | ya |
| SemesterReport | — | ya |

Aturan mutlak: **dokumen final tahun lama tidak boleh ikut berubah saat membuat tahun baru**. Year-old `SemesterReport` dengan status `Final` atau `Locked` harus tetap utuh.

### 7.3 Status Dokumen

Setiap dokumen yang dapat di-finalisasi (Prota, Promes, SemesterReport) wajib memiliki status:

```text
Draft → Ready for Review → Final → Revised (jika ada perubahan setelah Final)
                                  → Locked (tidak bisa diubah lagi)
```

Transisi `Final → Revised` wajib membuat snapshot baru, bukan menimpa. Transisi `Final → Locked` bersifat permanen.

---

## 8. Prinsip UX

### 8.1 Dashboard Berbasis Pekerjaan Hari Ini

Halaman utama **bukan** menu teknis. Halaman utama adalah daftar pekerjaan hari ini:

```text
Hari ini (Senin, 18 Agustus 2025)
- 07.30–08.50  VII A  Pendidikan Pancasila  [Absen & Jurnal]
- 09.10–10.30  VIII B Pendidikan Pancasila  [Absen & Jurnal]

Belum selesai
- Jurnal VIII B kemarin (Senin, 17 Agustus) belum diisi
- Absensi VII A tanggal 15 Agustus belum tersinkron
- Promes Semester 1 status: Perlu perbaikan (2 JP belum terdistribusi)
```

Master data, konfigurasi, dan manajemen dokumen ada di menu sekunder.

### 8.2 Absensi Default Semua Hadir

Dilarang menampilkan absensi dengan status kosong. Saat guru membuka sesi, semua siswa otomatis berstatus `present`. Guru hanya mengubah siswa yang `sick | excused | absent`. Jika semua hadir, simpan cukup dengan 1–2 ketukan.

### 8.3 Jurnal Tidak Dimulai dari Kosong

Jurnal otomatis terisi: tanggal, jam ke, kelas, mapel, materi dari Promes, tujuan pembelajaran, jumlah hadir/sakit/izin/alpa, guru pengampu. Guru hanya memilih realisasi (`Selesai | Dilanjutkan | Tidak Terlaksana`) dan menambahkan catatan bila perlu.

### 8.4 Laporan dari Data Harian

Laporan akhir semester bukan diketik manual. Laporan dikompilasi dari:
`Absensi + Jurnal + Progres Materi + Nilai/Remedial (jika tersedia)`.

Aplikasi wajib menampilkan halaman kelengkapan sebelum tombol Finalisasi diaktifkan.

### 8.5 Status Sync Selalu Terlihat

Setiap item yang dikumpulkan dari HP (absensi, jurnal) wajib menampilkan status:
`Tersimpan di perangkat | Menunggu sinkronisasi | Tersinkron | Gagal sinkron, coba lagi`.

Guru tidak boleh dibuat bertanya-tanya apakah datanya sudah aman.

### 8.6 Mobile-First untuk Harian, Desktop-Friendly untuk Perencanaan

- Mobile: absensi, jurnal, dashboard hari ini.
- Desktop: kalender, Prota, Promes, laporan semester, backup/restore.

Layout wajib responsif. Tidak boleh ada fitur yang hanya bisa diakses dari salah satu ukuran.

---

## 9. Acceptance Criteria Sprint 0

Sprint 0 dianggap selesai jika dan hanya jika:

- [x] Ada `docs/PROJECT_CONTRACT.md` (dokumen ini).
- [x] Ada `docs/TECHNICAL_PLAN.md`.
- [x] Ada `docs/DATA_MODEL_DRAFT.md`.
- [x] Scope MVP v1 terkunci pada 9 modul (M01–M09) + fitur lintas modul.
- [x] Non-goals tertulis jelas di §5 (13 item).
- [x] Tidak ada kode fitur di luar MVP v1.
- [x] Tidak ada UI besar (hanya scaffold minimal di `apps/teacher-admin`).
- [x] Tidak ada dependensi Supabase di `package.json` Sprint 0.
- [x] Struktur repo siap untuk Sprint 1 (lihat `docs/TECHNICAL_PLAN.md` §3).

### Acceptance Criteria MVP v1 (untuk Sprint 1–6)

Diadopsi langsung dari `GURU_ADMIN_FLOW_REFERENCE.md` §16, 15 kriteria. Detail verifikasi per kriteria akan ditambahkan di `docs/TECHNICAL_PLAN.md` saat Sprint 1 dimulai.

---

## 10. Aturan untuk Dev/AI Berikutnya

Dilarang:

1. Memperluas scope sebelum MVP v1 selesai.
2. Mencampur Smart Roster dan Guru Admin Flow dalam satu dashboard pengguna.
3. Membuat guru mengisi data yang sudah bisa diambil dari jadwal, kalender, atau Promes.
4. Membuat absensi default kosong.
5. Membuat jurnal dimulai dari nol.
6. Menganggap Promes sebagai sumber utama; Promes adalah hasil dari Prota + Kalender + Jadwal.
7. Menghitung KO per mapel; KO berdiri sebagai kegiatan koordinator/TIM.
8. Membuat integrasi AI wajib; AI hanya pembantu konversi dokumen ke JSON di luar aplikasi.
9. Membuat aplikasi wajib online penuh; gunakan local-first untuk HP guru.
10. Mengubah dokumen final tahun lama ketika membuat tahun baru.

Diwajibkan:

1. Setiap PR wajib menyebut modul (M01–M09) yang diubah.
2. Setiap penambahan entitas data wajib memperbarui `docs/DATA_MODEL_DRAFT.md` terlebih dahulu.
3. Setiap perubahan UX wajib konsisten dengan §8 (Prinsip UX).
4. Setiap perubahan stack wajib memperbarui `docs/TECHNICAL_PLAN.md` terlebih dahulu.

---

## 11. Riwayat Revisi Kontrak

| Versi | Tanggal | Perubahan | Penanggung Jawab |
|---|---|---|---|
| v1.0 | Sprint 0 | Dokumen awal, dikunci dari `GURU_ADMIN_FLOW_REFERENCE.md` | Sprint 0 owner |

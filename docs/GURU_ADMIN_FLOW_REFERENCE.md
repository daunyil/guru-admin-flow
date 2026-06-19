# Guru Admin Flow — Referensi Arah Produk untuk AI

**Status dokumen:** Draft v0.1  
**Tujuan dokumen:** Menjadi referensi tetap agar AI/dev memahami arah aplikasi, batas MVP, logika kurikulum, dan keputusan produk yang sudah disepakati.  
**Konteks utama:** SMPN 8 Bantan, administrasi guru SMP, Kurikulum Merdeka/Kurikulum terbaru, kalender pendidikan berubah tiap tahun, perangkat guru sering berulang.

---

## 1. Ringkasan Produk

Aplikasi yang sedang dirancang bukan sekadar generator dokumen, tetapi **asisten administrasi guru**. Tujuan utamanya adalah mengurangi pekerjaan guru yang berulang setiap semester.

Filosofi produk:

> Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru.

Masalah yang ingin diselesaikan:

1. Guru harus membuat perangkat administrasi yang mirip setiap semester.
2. Tahun pelajaran, kalender, tanggal, kepala sekolah, dan jadwal sering berubah.
3. Guru sering lupa mengisi absensi dan jurnal.
4. Absensi manual harus diisi satu per satu, padahal mayoritas siswa biasanya hadir.
5. Jurnal dan laporan akhir semester sering dibuat manual di akhir semester.
6. Dokumen unduhan internet sering perlu diganti identitas sekolah/guru secara massal.
7. Data antar-dokumen sering tidak sinkron: Prota, Promes, jadwal, jurnal, nilai, dan laporan.

---

## 2. Pemisahan Produk

Produk dibagi menjadi dua aplikasi yang berbeda secara pengguna dan tujuan.

### 2.1 Smart Roster

**Pengguna utama:** Wakil Kepala Sekolah Bidang Kurikulum.

Fungsi:

- menyusun jadwal sekolah;
- mengelola guru, kelas, mapel, dan alokasi JP;
- mengecek bentrok jadwal;
- mengatur slot KO/TIM;
- mencetak atau mengekspor jadwal;
- menghasilkan jadwal guru yang dapat digunakan oleh aplikasi guru.

Karakter:

- desktop-first;
- digunakan terutama pada awal tahun pelajaran atau saat ada perubahan jadwal;
- dapat berjalan lokal/offline pada tahap awal;
- tidak menjadi pusat kegiatan harian guru.

### 2.2 Administrasi Guru / Guru Admin Flow

**Pengguna utama:** Guru.

Fungsi:

- membuat perangkat semester dari data tahun sebelumnya;
- mengelola profil sekolah/guru;
- mengimpor kalender pendidikan;
- menginput atau mengimpor Prota;
- menghasilkan Promes;
- menampilkan jadwal hari ini;
- absensi cepat dari HP;
- jurnal otomatis;
- laporan akhir semester otomatis;
- ekspor dokumen.

Karakter:

- mobile-first untuk absensi dan jurnal;
- desktop-friendly untuk kalender, Prota, Promes, dan laporan;
- dapat memakai Supabase untuk data online;
- tetap memiliki cache lokal agar data tidak hilang saat sinyal buruk.

---

## 3. Visi Alur Guru

Alur yang harus dirasakan guru:

```text
Awal tahun:
Siapkan profil, kalender, jadwal, dan Prota.

Awal semester:
Generate Promes dari Prota + Kalender + Jadwal.

Setiap masuk kelas:
Buka HP → pilih kelas → semua siswa otomatis hadir → ubah yang tidak hadir → simpan → jurnal otomatis terbentuk.

Akhir semester:
Cek kelengkapan → generate laporan semester → preview → cetak/ekspor.
```

Guru tidak boleh merasa mengisi aplikasi yang rumit. Aplikasi harus terasa seperti asisten kerja.

---

## 4. Prinsip UX Utama

### 4.1 Dashboard harus berbasis pekerjaan hari ini

Saat guru membuka aplikasi, tampilan utama adalah:

```text
Hari ini
- VII A — Pendidikan Pancasila — 08.10–09.30
  [Absen & Jurnal]

Belum selesai
- Jurnal VIII B kemarin belum diisi
- Absensi VII A belum tersinkron
- Laporan semester belum final
```

Jangan memulai dari menu teknis seperti master data, konfigurasi, atau manajemen dokumen.

### 4.2 Absensi default semua hadir

Alur absensi:

```text
Buka kelas
→ semua siswa otomatis Hadir
→ guru hanya ubah yang Sakit/Izin/Alpa
→ simpan
```

Jika semua hadir, cukup 1–2 klik.

### 4.3 Jurnal otomatis

Jurnal tidak dimulai dari kosong. Aplikasi mengisi otomatis:

- tanggal;
- jam ke;
- kelas;
- mapel;
- materi dari Promes;
- tujuan pembelajaran;
- jumlah hadir/sakit/izin/alpa;
- guru pengampu.

Guru hanya memilih realisasi:

```text
Selesai
Dilanjutkan
Tidak terlaksana
```

Lalu menambahkan catatan bila perlu.

### 4.4 Laporan akhir semester dari data harian

Laporan semester bukan diketik manual, tetapi dibuat dari:

```text
Absensi + Jurnal + Progres Materi + Nilai/Remedial jika tersedia
```

Aplikasi wajib menampilkan kelengkapan sebelum laporan final.

---

## 5. Data yang Sering Berubah dan Jarang Berubah

### 5.1 Data tetap / jarang berubah

- nama sekolah;
- alamat sekolah;
- nama guru;
- NIP guru;
- mata pelajaran;
- fase/kelas;
- format tanda tangan;
- template dokumen;
- CP/ATP/Prota, kecuali ada revisi kurikulum.

Data ini disimpan sebagai profil dan versi.

### 5.2 Data berubah tiap tahun

- tahun pelajaran;
- kalender pendidikan;
- kepala sekolah jika berganti;
- libur, asesmen, kegiatan sekolah;
- pembagian minggu efektif.

Kalender adalah data yang paling sering berubah dan harus mudah diimpor dari JSON hasil AI.

### 5.3 Data berubah tiap semester

- kelas yang diajar;
- jadwal mengajar;
- materi semester;
- Promes;
- agenda asesmen.

### 5.4 Data realisasi

- absensi;
- jurnal mengajar;
- catatan realisasi;
- nilai;
- remedial;
- laporan semester.

Data realisasi tidak boleh ikut tersalin saat membuat tahun baru.

---

## 6. Logika Kurikulum dan JP

### 6.1 Kalender pendidikan

Kalender pendidikan adalah acuan tanggal. Ia menentukan:

- minggu/tanggal KBM;
- asesmen;
- libur;
- kegiatan sekolah;
- remedial;
- rapor;
- kegiatan kokurikuler bila dijadwalkan blok.

Kalender **tidak menentukan jumlah JP mapel**. Jumlah JP berasal dari Prota/struktur kurikulum sekolah.

### 6.2 Prota

Prota adalah sumber kebenaran untuk:

- materi;
- tujuan pembelajaran;
- alokasi JP per materi;
- total JP semester;
- total JP tahunan.

Prota bisa:

1. diinput manual;
2. diimpor dari JSON hasil AI;
3. disimpan sebagai profil berversi.

Aplikasi tidak perlu memaksa satu angka universal untuk semua mapel.

### 6.3 Pendidikan Pancasila dan kokurikuler

Untuk praktik SMPN 8 Bantan:

- Pendidikan Pancasila reguler di jadwal berjalan 2 JP/minggu.
- 1 JP ekuivalen digunakan untuk KO/kokurikuler.
- KO tidak dihitung per mapel.
- KO adalah kegiatan tersendiri milik koordinator kokurikuler/TIM.
- Promes mapel cukup menampilkan row kokurikuler terpisah bila diperlukan.
- KO tidak masuk ke distribusi materi/TP Promes.

Tiga mode implementasi KO:

1. blok harian;
2. blok akhir minggu;
3. blok akhir semester.

Untuk aplikasi guru, KO tidak perlu ditelusuri kontribusinya per mapel.

### 6.4 Promes

Promes adalah hasil, bukan sumber utama.

Promes dibangkitkan dari:

```text
Prota + Kalender + Jadwal Guru
```

Promes harus membedakan:

- JP intrakurikuler/materi;
- row kokurikuler bila dipakai;
- asesmen/cadangan sekolah;
- libur/kegiatan.

Promes tidak boleh menyembunyikan kekurangan JP. Jika materi belum terdistribusi lengkap, dokumen berstatus draf/perlu perbaikan.

---

## 7. Modul MVP v1

MVP pertama fokus pada fitur paling berguna bagi guru.

### 7.1 Profil

Data:

- sekolah;
- guru;
- NIP;
- kepala sekolah;
- tahun pelajaran;
- mapel;
- kelas/fase.

### 7.2 Kalender

Fitur:

- impor JSON hasil AI;
- edit manual;
- validasi tanggal;
- jenis kegiatan: `learning`, `assessment`, `holiday`, `school_activity`, `remedial`, `report`, `cocurricular`;
- preview kalender semester.

### 7.3 Prota

Fitur:

- input manual total JP semester 1, semester 2, dan total tahunan;
- input daftar materi/TP dan JP;
- validasi jumlah JP;
- impor JSON hasil AI;
- versi Prota.

### 7.4 Promes

Fitur:

- generate dari Prota + Kalender;
- distribusi materi ke minggu/tanggal;
- row ringkasan;
- status valid/perlu perbaikan;
- preview cetak;
- ekspor.

### 7.5 Jadwal Guru

Fitur:

- input manual jadwal guru;
- impor jadwal dari Smart Roster;
- kelas, hari, jam ke, durasi JP;
- sumber sesi mengajar harian.

### 7.6 Absensi HP

Fitur:

- mobile-first;
- jadwal hari ini otomatis;
- semua siswa default hadir;
- guru hanya ubah yang tidak hadir;
- status: hadir, sakit, izin, alpa;
- simpan lokal terlebih dahulu;
- sync ke cloud jika online.

### 7.7 Jurnal Otomatis

Fitur:

- otomatis dari jadwal + Promes + absensi;
- status realisasi: selesai, dilanjutkan, tidak terlaksana;
- catatan dan tindak lanjut;
- daftar jurnal belum selesai.

### 7.8 Laporan Akhir Semester

Fitur:

- rekap pertemuan rencana vs terlaksana;
- rekap jurnal;
- rekap absensi;
- materi selesai/belum selesai;
- catatan tindak lanjut;
- preview dan ekspor.

### 7.9 Backup

Fitur:

- export JSON;
- import JSON;
- restore;
- snapshot dokumen final.

---

## 8. Non-Goals MVP v1

Tidak dikerjakan dulu:

- bank soal lengkap;
- analisis butir soal;
- modul ajar AI penuh;
- penggantian identitas DOCX massal;
- supervisi kepala sekolah;
- aplikasi wali kelas;
- rapor penuh;
- parser DOCX/PDF otomatis langsung di aplikasi;
- integrasi AI API langsung.

AI cloud cukup digunakan secara manual: guru mengunggah dokumen ke AI, lalu menyalin JSON hasilnya ke aplikasi.

---

## 9. Arsitektur Teknis

### 9.1 Produk

Dari sisi pengguna, produk dipisah:

```text
Smart Roster → Waka Kurikulum
Administrasi Guru → Guru
```

Dari sisi pengembangan, boleh memakai monorepo:

```text
apps/
  smart-roster/
  teacher-admin/

packages/
  calendar-schema/
  schedule-schema/
  curriculum-schema/
  promes-engine/
  document-engine/
  shared-ui/
```

### 9.2 Stack Teacher Admin

Rekomendasi:

```text
Frontend        : React + TypeScript + Vite
UI              : Tailwind / CSS modular
Mobile          : PWA
Local DB        : IndexedDB/Dexie
Cloud Backend   : Supabase
Database Cloud  : PostgreSQL
Auth            : Supabase Auth
Hosting         : Cloudflare Pages / Vercel
```

### 9.3 Model online/offline

Absensi, jurnal, dan nilai bersifat tersinkron, bukan harus online terus.

```text
Isi di HP
→ simpan lokal
→ status pending sync
→ sync ke Supabase saat online
```

Guru harus melihat status:

```text
Tersimpan di perangkat
Menunggu sinkronisasi
Tersinkron
Gagal sinkron, coba lagi
```

### 9.4 Smart Roster

Smart Roster tidak wajib memakai Supabase di awal. Bisa tetap lokal dan mengekspor JSON/Excel jadwal.

Nanti Teacher Admin mengimpor hasil Smart Roster.

---

## 10. Data Model Awal

### 10.1 AcademicYear

```ts
type AcademicYear = {
  id: string;
  label: string; // "2025/2026"
  startDate: string;
  endDate: string;
  active: boolean;
};
```

### 10.2 CalendarEvent

```ts
type CalendarEvent = {
  id: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  type:
    | "learning"
    | "assessment"
    | "holiday"
    | "school_activity"
    | "remedial"
    | "report"
    | "cocurricular";
  label: string;
  scope: "ALL" | string[];
  blocksLearning: boolean;
};
```

### 10.3 ProtaProfile

```ts
type ProtaProfile = {
  id: string;
  subject: string;
  grade: string;
  phase: string;
  academicYearId: string;
  annualIntraJP: number;
  semester1IntraJP: number;
  semester2IntraJP: number;
  annualCocurricularJP?: number;
  semester1CocurricularJP?: number;
  semester2CocurricularJP?: number;
  units: ProtaUnit[];
};
```

### 10.4 ProtaUnit

```ts
type ProtaUnit = {
  id: string;
  semester: 1 | 2;
  title: string;
  jp: number;
  order: number;
};
```

### 10.5 TeachingSchedule

```ts
type TeachingSchedule = {
  id: string;
  teacherId: string;
  subject: string;
  classId: string;
  dayOfWeek: number;
  startPeriod: number;
  durationJP: number;
};
```

### 10.6 LessonSession

```ts
type LessonSession = {
  id: string;
  classId: string;
  subject: string;
  date: string;
  plannedUnitId?: string;
  status: "planned" | "done" | "continued" | "cancelled";
};
```

### 10.7 AttendanceRecord

```ts
type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "sick" | "excused" | "absent";
};
```

### 10.8 TeachingJournal

```ts
type TeachingJournal = {
  id: string;
  sessionId: string;
  realizationStatus: "done" | "continued" | "cancelled";
  note: string;
  followUp: string;
  locked: boolean;
};
```

---

## 11. Status Dokumen

Setiap dokumen penting memakai status:

```text
Draft
Ready for Review
Final
Revised
Locked
```

Dokumen final tidak boleh berubah diam-diam. Jika ada perubahan, buat revisi atau snapshot baru.

---

## 12. Prinsip Validasi

Aplikasi harus menolak atau memberi peringatan bila:

1. total JP materi tidak sama dengan target Prota;
2. kalender tidak memiliki tanggal awal/akhir yang valid;
3. event kalender tumpang tindih secara konflik;
4. Promes belum mendistribusikan semua materi;
5. jurnal belum lengkap tetapi laporan semester akan difinalisasi;
6. absensi belum tersinkron tetapi laporan akan dibuat;
7. data tahun lama akan tertimpa oleh data tahun baru.

---

## 13. Flow “Buat Tahun Baru dari Tahun Lalu”

Fitur wajib karena masalah guru sering berulang tiap tahun.

```text
Buat Tahun Pelajaran Baru
→ pilih sumber tahun sebelumnya
→ pertahankan profil, Prota, materi, template
→ perbarui kalender, kepala sekolah, jadwal
→ kosongkan absensi, jurnal, nilai, remedial
→ generate perangkat baru
```

Ini harus menjadi fitur utama, bukan fitur sampingan.

---

## 14. Referensi Dokumen yang Pernah Dianalisis

Arah produk ini disusun berdasarkan:

1. Kalender Pendidikan Kabupaten Bengkalis Tahun Pelajaran 2025/2026.
2. Program Semester SMPN 8 Bantan yang menunjukkan alokasi 3 jam/minggu, 54 JP efektif, 6 JP cadangan, total 60 JP.
3. Program Tahunan PPKn Fase D Kelas VII yang menunjukkan total 108 JP dalam satu tahun.
4. Referensi buku Pendidikan Pancasila yang menunjukkan model 72 JP intrakurikuler dan row P5/kokurikuler.
5. Prototipe Promes Generator SMPN 8 Bantan.
6. Prototipe Smart Roster SMPN 8 Bantan.

Catatan penting:

- Dokumen tahun lama masih memakai istilah P5/Projek Penguatan Profil Pelajar Pancasila.
- Dokumen baru dapat memakai istilah Kokurikuler.
- Mesin internal sebaiknya menggunakan istilah netral `cocurricular` agar tidak rusak jika istilah kurikulum berubah lagi.

---

## 15. Roadmap Sprint

### Sprint 0 — Product Contract

Output:

- referensi produk;
- scope MVP;
- data model awal;
- user flow;
- acceptance criteria.

### Sprint 1 — Fondasi Aplikasi Lokal

Output:

- setup React + TS + Vite;
- layout desktop/mobile;
- IndexedDB/Dexie;
- profil sekolah/guru;
- backup/restore JSON.

### Sprint 2 — Kalender + Prota + Promes

Output:

- import kalender JSON;
- editor kalender;
- input Prota;
- validasi JP;
- generate Promes;
- preview Promes.

### Sprint 3 — Jadwal Guru + Sesi Mengajar

Output:

- input/impor jadwal guru;
- generate sesi mengajar dari kalender + jadwal;
- hubungkan sesi dengan materi Promes;
- dashboard hari ini.

### Sprint 4 — Absensi + Jurnal HP

Output:

- halaman mobile;
- absensi default semua hadir;
- ubah yang tidak hadir;
- auto jurnal;
- status realisasi;
- daftar pekerjaan belum selesai.

### Sprint 5 — Laporan Semester

Output:

- rekap pertemuan;
- rekap jurnal;
- rekap absensi;
- rekap materi;
- preview laporan;
- export awal.

### Sprint 6 — Supabase Sync

Output:

- login;
- school membership;
- sync data dasar;
- sync absensi;
- sync jurnal;
- status pending/synced/error.

---

## 16. Acceptance Criteria MVP v1

MVP dianggap berhasil jika:

1. Guru dapat membuat tahun pelajaran baru.
2. Guru dapat mengimpor kalender JSON hasil AI.
3. Guru dapat menginput Prota dan materi.
4. Aplikasi memvalidasi total JP.
5. Aplikasi dapat menghasilkan Promes.
6. Guru dapat memasukkan jadwal mengajar.
7. HP menampilkan jadwal hari ini.
8. Absensi default semua hadir.
9. Guru dapat mengubah siswa tidak hadir saja.
10. Jurnal otomatis dibuat setelah absensi.
11. Guru dapat menandai materi selesai/dilanjutkan/tidak terlaksana.
12. Aplikasi menampilkan jurnal/absensi yang belum selesai.
13. Laporan semester dapat dibuat dari data absensi dan jurnal.
14. Dokumen final memiliki status dan snapshot.
15. Data dapat dibackup dan direstore.

---

## 17. Aturan untuk AI/Dev yang Melanjutkan

Jika AI/dev melanjutkan proyek ini:

1. Jangan memperluas scope sebelum MVP v1 selesai.
2. Jangan mencampur Smart Roster dan Administrasi Guru dalam satu dashboard pengguna.
3. Jangan membuat guru mengisi data yang sudah bisa diambil dari jadwal, kalender, atau Promes.
4. Jangan membuat absensi default kosong.
5. Jangan membuat jurnal dimulai dari nol.
6. Jangan menganggap Promes sebagai sumber utama; Promes adalah hasil dari Prota + Kalender + Jadwal.
7. Jangan menghitung KO per mapel; KO berdiri sebagai kegiatan koordinator/TIM.
8. Jangan membuat integrasi AI wajib; AI hanya pembantu konversi dokumen ke JSON.
9. Jangan membuat aplikasi wajib online penuh; gunakan local-first untuk HP guru.
10. Jangan mengubah dokumen final tahun lama ketika membuat tahun baru.

---

## 18. Ringkasan Satu Kalimat

Guru Admin Flow adalah aplikasi administrasi guru yang mengubah pekerjaan berulang setiap semester—kalender, Prota, Promes, absensi, jurnal, dan laporan—menjadi alur singkat berbasis data, dengan HP untuk kegiatan harian dan laptop untuk perencanaan.

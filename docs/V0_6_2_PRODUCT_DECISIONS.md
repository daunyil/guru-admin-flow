# V0.6.2 Product Decisions — Guru Admin Flow

**Status:** LOCKED (v0.6.2)
**Tanggal:** 2025-06-20
**Sumber:** Instruksi patch dari senior developer

---

## 1. Keputusan Produk

### 1.1 Absensi tidak wajib terkunci jadwal

Absensi boleh dilakukan kapan saja, tidak harus menunggu jadwal ter-generate. Guru bisa absen manual bila jadwal belum ada.

### 1.2 Absensi punya 3 mode

1. **Dari Jadwal** — absen berdasarkan sesi yang sudah di-generate dari jadwal + kalender.
2. **Manual** — guru pilih tanggal + kelas + mapel + jam (opsional). Tidak butuh jadwal.
3. **Susulan/Terlupa** — guru bisa isi absen untuk tanggal yang sudah lewat. Opsi:
   - Isi Semua H (semua hadir)
   - Salin dari Absen Sebelumnya
   - Buat Draft Cepat

Semua hasil auto/susulan berstatus **draft** sampai guru klik Simpan/Setujui.

### 1.3 Format absensi standar

```text
H = Hadir (default)
S = Sakit
I = Izin
A = Alpa
```

**Tidak pakai T (Terlambat).** Status `late` disembunyikan dari UI, tidak dihapus dari schema (backward compatibility).

### 1.4 Jurnal otomatis

Jurnal tidak dimulai dari kosong. Dibuat dari:
- Absensi (jumlah H/S/I/A)
- Promes (materi + TP)
- TP/ATP (tujuan pembelajaran)
- Template kegiatan (kegiatan default)

Guru cukup:
- Setujui & Simpan
- Ganti Materi
- Salin Jurnal Sebelumnya

Catatan dan tindak lanjut opsional.

### 1.5 Nilai adalah administrasi ringan

Nilai di app ini bukan sistem ujian. Hanya catatan administrasi.

### 1.6 Nilai akhir

Nilai akhir bisa:
- Diisi manual
- Diambil dari CBT
- Dihitung dari ujian + harian
- Nilai harian bisa menyesuaikan nilai akhir

### 1.7 Remedial dan pengayaan

Dibuat sederhana:
- Remedial otomatis jika nilai akhir < KKTP
- Pengayaan otomatis jika nilai tinggi (≥ 90)

### 1.8 ATP/TP sebagai pusat sinkron

Semua dokumen perangkat (LKPD, RPP, jurnal, Promes) sinkron dari ATP/TP.

### 1.9 LKPD wajib berdasarkan Tujuan Pembelajaran

LKPD tidak bisa dibuat tanpa memilih TP dari ATP.

### 1.10 AI tidak diintegrasikan ke app

- Tidak ada API key
- Tidak ada integrasi AI cloud
- Tidak ada pengiriman data otomatis
- App hanya membuat **prompt AI** untuk dipakai di luar app
- Guru klik "Salin Prompt" → paste ke AI eksternal

### 1.11 RPP/Modul Ajar bertahap

- RPP tetap Word
- App menyimpan data identitas
- App menghasilkan daftar placeholder
- Generate dari template master asli
- Bukan dari file hasil generate

---

## 2. Prioritas Patch

```text
PATCH-01: Contract Update (dokumen ini)
PATCH-02: Quick Attendance Core (absensi tanpa jadwal)
PATCH-03: Quick Journal (jurnal 10-30 detik)
PATCH-04: Home Pending Work (dashboard pekerjaan tertunda)
PATCH-05: Nilai Cepat (isi cepat + remedial/pengayaan)
PATCH-06: ATP/LKPD/AI Bridge (bank TP + prompt generator)
PATCH-07: RPP Template (placeholder Word)
```

---

## 3. Aturan Absensi

- Default: semua H
- Guru hanya ubah yang S/I/A
- 3 mode: Dari Jadwal, Manual, Susulan
- Hasil susulan = draft sampai disetujui
- Tidak ada T di UI
- Mobile-first

---

## 4. Aturan Jurnal

- Tidak dimulai dari kosong
- Auto-fill dari absensi + Promes + TP
- Guru: Setujui & Simpan / Ganti Materi / Salin Sebelumnya
- Deteksi jurnal terlupa
- Auto-generate jurnal terlupa sebagai draft
- Dokumen jurnal tidak pakai kolom T

---

## 5. Aturan Nilai

- Isi Semua 80
- Acak Terkontrol
- Salin dari nilai sebelumnya
- Paste dari Excel/CBT
- Nilai akhir: manual / dari CBT / hitung
- Harian menyesuaikan nilai akhir
- Remedial otomatis < KKTP
- Pengayaan otomatis ≥ 90

### Dokumen nilai wajib

1. Daftar Nilai
2. Leger Nilai
3. Rekap Ketuntasan
4. Program Remedial
5. Hasil Remedial
6. Program Pengayaan
7. Rekap Pengayaan

---

## 6. Aturan ATP/LKPD

- Bank ATP/TP: kelas, bab, elemen, CP, TP, profil Pelajar Pancasila, kata kunci, alokasi JP
- LKPD wajib pilih TP
- LKPD dari template sederhana
- Sinkron semua dokumen dari TP

---

## 7. Aturan AI Bridge

- Tidak ada API key
- Tidak ada AI cloud
- Tidak ada pengiriman data otomatis
- App generate prompt teks
- Guru klik "Salin Prompt"
- Prompt untuk: LKPD, RPP, jurnal, remedial, pengayaan

---

## 8. Aturan RPP Bertahap

### Tahap 1 (v0.6.2)

- RPP tetap Word
- App simpan data identitas
- App hasilkan daftar placeholder:
  - `{{NAMA_SEKOLAH}}`
  - `{{NAMA_GURU}}`
  - `{{NIP_GURU}}`
  - `{{MAPEL}}`
  - `{{KELAS}}`
  - `{{SEMESTER}}`
  - `{{TAHUN_PELAJARAN}}`
  - `{{TEMPAT_TTD}}`
  - `{{KEPALA_SEKOLAH}}`
- Generate dari template master asli
- Cek identitas ganda sebelum download

---

## 9. Acceptance Criteria

1. Guru bisa absen tanpa jadwal
2. Guru bisa membuat absen susulan
3. Absensi hanya menampilkan H/S/I/A
4. Jurnal bisa dibuat otomatis dari absensi
5. Home menampilkan pekerjaan tertunda
6. Nilai bisa diisi cepat tanpa input satu per satu
7. Remedial/pengayaan bisa dicetak sederhana
8. LKPD mengambil TP dari ATP
9. AI hanya berbentuk prompt generator
10. Format dokumen bisa diperbaiki bertahap

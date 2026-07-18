# Guru Admin Flow v1.0 — Panduan Operasional

Dokumen ini menjadi panduan singkat agar aplikasi bisa dipakai harian tanpa audit teknis berulang.

## Prinsip v1.0

- Aplikasi dipakai sebagai pusat dokumen administrasi guru.
- Data disimpan lokal di browser/perangkat.
- Backup JSON adalah pengaman utama.
- Cloud sync dan integrasi Apps Script ditunda ke v1.1.

## Alur Awal Tahun

1. Lengkapi profil sekolah dan guru.
2. Buat atau aktifkan tahun pelajaran.
3. Isi kalender pendidikan.
4. Isi Prota.
5. Generate Promes.
6. Input atau impor jadwal.
7. Pastikan sesi mengajar terbentuk.
8. Export backup awal.

## Alur Harian

1. Buka halaman Hari Ini.
2. Isi absen reguler.
3. Isi jurnal reguler.
4. Gunakan absen/jurnal susulan bila ada data tertinggal.
5. Export backup setelah perubahan penting.

## Alur Dokumen

| Dokumen | Fungsi |
|---|---|
| LKPD | Bahan kegiatan siswa |
| RPP Bulk Replace | Ganti identitas banyak dokumen |
| Remedial | Program perbaikan siswa di bawah threshold |
| Pengayaan | Program pengayaan siswa di atas threshold |
| Laporan Semester | Rekap akhir semester |
| Paket Administrasi | Pusat kumpulan dokumen utama |

## Backup Rutin

Disarankan export backup:

- setelah setup awal tahun,
- setelah input banyak data,
- setiap akhir minggu,
- sebelum restore,
- sebelum pindah perangkat atau browser.

Simpan backup di lokasi aman seperti Google Drive, flashdisk, atau folder khusus laptop.

## Aturan Hotfix

Setelah v1.0, hanya bug nyata yang perlu dikerjakan.

| Jenis masalah | Tindakan |
|---|---|
| Data hilang | Hotfix langsung |
| App crash | Hotfix langsung |
| Absen/jurnal salah sesi | Hotfix langsung |
| Dokumen utama gagal dibuat | Hotfix langsung |
| Tampilan kurang cantik | Tunda |
| Fitur baru | Tunda |

## Format Laporan Bug

```text
Bug: <apa yang salah>
Menu: <halaman/menu>
Data: <tanggal/kelas/sesi bila ada>
Dampak: <apa akibatnya>
```

## Kesimpulan

Untuk v1.0, Bapak cukup memakai aplikasi, membuat backup rutin, dan melaporkan hanya bug nyata yang mengganggu pekerjaan harian.

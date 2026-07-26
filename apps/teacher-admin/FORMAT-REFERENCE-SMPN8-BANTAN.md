# FORMAT-REFERENCE-SMPN8-BANTAN.md

> **Versi**: 1.0  
> **Tanggal**: 2026-07-26  
> **Sumber**: Format dokumen fisik dari SMP Negeri 8 Bantan, Tahun Pelajaran 2023/2024  
> **Status**: ACTIVE — referensi untuk Sprint 4 (Rekap Semester)

## Tujuan

Dokumen ini mendefinisikan **format cetak real** yang digunakan di sekolah SMPN 8 Bantan untuk absensi dan penilaian. Format ini menjadi acuan TIDAK BOLEH di-over-engineer — kita replicate format yang sudah dipakai di sekolah, bukan invent format baru.

---

## 1. ABSENSI KEHADIRAN SISWA

### 1.1 Layout & Orientasi
- **Orientasi**: LANDSCAPE (A4/Legal Landscape)
- **Lebar tabel**: 36+ kolom (NO + NAMA + NISN + 31 tanggal + 4 rekap)
- **Font**: Sans-serif (Arial/Calibri), ukuran kecil ~9pt untuk muat 31 kolom
- **Border**: Solid hitam tipis (1px) pada semua sel

### 1.2 Kop Surat (Header)
```
ABSENSI KEHADIRAN SISWA/I SMP NEGERI 8 BANTAN
TAHUN PELAJARAN 2023/2024

KELAS : VII
BULAN : [Januari/Februari/dst]
```
- Judul: Bold, Uppercase, Center-aligned, 12-14pt
- Metadata: Left-aligned, Bold labels, garis bawah untuk input

### 1.3 Struktur Kolom Tabel

| # | Kolom | Lebar | Alignment | Notes |
|---|-------|-------|-----------|-------|
| 1 | NO. | ~30px | Center | Nomor urut |
| 2 | NAMA | ~180px | Left | Huruf kapital semua |
| 3 | NISN | ~50px | Center | 10 digit numeric |
| 4-34 | 1–31 | ~22px each | Center | Kolom tanggal, 1 per hari |
| 35 | ALPA | ~40px | Center | Rekap: jumlah A |
| 36 | SAKIT | ~40px | Center | Rekap: jumlah S |
| 37 | IZIN | ~40px | Center | Rekap: jumlah I |
| 38 | JLH | ~40px | Center | Total ketidakhadiran |

**Header multi-level**: 
- Row 1: `TANGGAL` (merged colspan=31) | `KETERANGAN` (merged colspan=4)
- Row 2: `1` `2` `3` ... `31` | `ALPA` `SAKIT` `IZIN` `JLH`
- `NO.` dan `NAMA` dan `NISN`: rowspan=2 (merged vertikal dengan row 2)

### 1.4 Marking Absensi
| Kode | Arti | Warna (opsional digital) |
|------|------|--------------------------|
| **H** | Hadir | Default (kosong/tanpa marking) |
| **S** | Sakit | Amber/yellow |
| **I** | Izin | Slate/gray |
| **T** | Terlambat | Orange |
| **A** | Alpa/Tanpa Keterangan | Rose/red |

**Note**: Di format fisik, guru tidak menulis "H" — sel kosong = Hadir. Guru hanya menulis S/I/T/A untuk yang tidak hadir.

### 1.5 Nama Hari
- ❌ **TIDAK ADA** kolom nama hari (Senin, Selasa, dst)
- Format real hanya menampilkan angka tanggal 1-31
- Hari bisa ditampilkan sebagai tooltip digital atau baris sub-header opsional

### 1.6 Footer/TTD
```
                    Muntai,                2023
                    Wali Kelas

                    ( ___________________ )
```
- Lokasi + tahun di kiri
- Jabatan "Wali Kelas" dicetak
- Garis horizontal panjang untuk nama + tanda tangan

### 1.7 Spesifikasi Cetak
- `@media print { @page { size: landscape; } }`
- Kolom 1–31 harus muat di satu halaman landscape
- Font 9-10pt saat print
- NISN field: 10 digit (standar Kemdikbud)
- Baris kosong: 28-35 row (standar kelas Indonesia)
- Untuk bulan < 31 hari (Feb=28/29, Apr=30), kolom berlebih **hidden** (tidak ditampilkan)

### 1.8 Perbedaan dengan Input Harian
| Aspek | Input Harian (sudah ada) | Rekap Bulanan (Sprint 4) |
|-------|---------------------------|---------------------------|
| View | Per-sesi (1 hari per edit) | Matriks 31 kolom per bulan |
| Input | Klik H/S/I/T/A per siswa per sesi | Read-only rekap, tidak di-edit |
| Orientasi | Portrait (A4) | Landscape (A4/Folio) |
| Fungsi | Input operasional harian | Cetak rekap untuk wali kelas |
| Rekap | Count di toast/sidebar | Kolom ALPA/SAKIT/IZIN/JLH |

---

## 2. PENILAIAN PENGETAHUAN SISWA

### 2.1 Layout & Orientasi
- **Orientasi**: LANDSCAPE
- **Lebar tabel**: 25 kolom (NO + NAMA + 10 Ulangan + 10 Tugas + PTS + PAS + Ket)
- **Font**: Sans-serif, ukuran kecil ~9pt
- **Border**: Solid hitam tipis (1px) pada semua sel

### 2.2 Kop Surat (Header)
```
PENILAIAN PENGETAHUAN SISWA/I SMP NEGERI 8 BANTAN
TAHUN PELAJARAN 2023/2024

Mata Pelajaran : ........................................
Kelas/ Semester : ........................................
```
- Judul: Bold, Uppercase, Center-aligned, 12-14pt
- Metadata: Left-aligned, garis putus-putus untuk input manual

### 2.3 Struktur Kolom Tabel — Header Multi-Level (3 Tingkat)

**Row 1 (Super-header):**
| Colspan | Label |
|---------|-------|
| rowspan=2 | NO. |
| rowspan=2 | NAMA |
| colspan=20 | Penilaian Harian (PA) |
| rowspan=2 | Penilaian Tengah Semester (PTS) |
| rowspan=2 | Penilaian Akhir Semester (PAS) |
| rowspan=2 | Ket. |

**Row 2 (Sub-header):**
| Colspan | Label |
|---------|-------|
| colspan=10 | Penilaian Harian/ Ulangan Harian |
| colspan=10 | Nilai Tugas/ PR |

**Row 3 (KD labels):**
| Label | Notes |
|-------|-------|
| KD | × 10 kolom (Ulangan) |
| KD | × 10 kolom (Tugas) |
| — | PTS (merged vertikal) |
| — | PAS (merged vertikal) |
| — | Ket. (merged vertikal) |

### 2.4 Jenis Nilai

| Kategori | Kolom | Max | Notes |
|----------|-------|-----|-------|
| Ulangan Harian | 10 kolom KD | 10 | Per KD (Kompetensi Dasar) |
| Tugas/PR | 10 kolom KD | 10 | Per KD |
| PTS | 1 kolom | 1 | Penilaian Tengah Semester |
| PAS | 1 kolom | 1 | Penilaian Akhir Semester |
| Keterangan | 1 kolom | 1 | Catatan manual guru |

**Total: 25 kolom data**

### 2.5 Gap dengan Kode Saat Ini

| Aspek | Format Real | Kode Saat Ini | Aksi |
|-------|-------------|---------------|------|
| Grup PA | 2 sub-grup (Ulangan 10 + Tugas 10) | 1 grup (UH 2-6 atau KD 1-6) | ⚠️ Model perlu split |
| Max kolom | 10 per grup | 6 per grup | ⚠️ Perlu extend ke 10 |
| Sub-header | "KD" per kolom | "UH1/UH2..." atau "KD1/KD2..." | ⚠️ Perlu rename |
| Status | "Ket." (manual) | "Tuntas/Remedial/Belum" (auto) | ⚠️ Dual mode |
| PTS/PAS | Labels real | pts/pas di domain | ✅ Match |
| TTD | Guru Bidang Studi | Tidak ada | ❌ Sprint 4 |

### 2.6 Footer/TTD
```
                    Muntai,                2023
                    Guru Bidang Studi

                    ( ___________________ )
```

### 2.7 Spesifikasi Cetak
- `@media print { @page { size: landscape; } }`
- 25 kolom harus muat di 1 halaman landscape
- Merge cells: NO/NAMA rowspan=2, PA colspan=20, sub-group colspan=10
- Nama siswa: UPPERCASE, left-aligned
- Nilai: numerik 0-100, center-aligned

---

## 3. PRINSIP UMUM FORMAT CETAK

### 3.1 JANGAN invent format baru
- **Pesan dari user**: "Kenapa memaksakan bulanya jadi kolom gak ada yang buat begitu"
- Format yang kita buat di app HARUS mirip format yang sudah dipakai di sekolah
- Jika format sekolah berbeda dari "ideal" kita → ikuti format sekolah

### 3.2 Landscape untuk dokumen tabel lebar
- Absensi (31+ kolom) → Landscape
- Penilaian (25+ kolom) → Landscape  
- Jurnal (narrow) → Portrait
- Promes (landscape legacy) → Landscape

### 3.3 Kop surat dari Profil Sekolah
- Nama sekolah, tahun pelajaran, kelas → diambil dari `@shared/db/` school profile
- Lokasi/desa → dari profil sekolah
- Template kop surat: disimpan di `@shared/documents/` sebagai reusable template

### 3.4 TTD digital
- Wali Kelas / Guru Bidang Studi → dari profil guru
- Nama guru diisi otomatis dari data yang sudah ada
- TTD area: placeholder line + nama guru yang tercetak

---

## 4. Sprint 4 Scope

Sprint 4 akan membangun:
1. **Rekap Absensi Bulanan** — Matriks 31 kolom per bulan (landscape, kop surat, rekap ALPA/SAKIT/IZIN/JLH, TTD wali kelas)
2. **Rekap Nilai Semester** — PA multi-level header (Ulangan + Tugas per KD, PTS, PAS, Ket.) (landscape, kop surat, TTD guru bidang studi)

**Model data perlu disesuaikan** sebelum Sprint 4 dimulai:
- `GradeBook.gradeModel` perlu extend dari "uh"|"kd" menjadi "uh"|"kd"|"pa-split"
- Max kolom extend dari 6 ke 10 (uhCount 2-10, kdCount 2-10)
- Tambah `taskScore` fields (uh1_task, uh2_task, ... atau kd1_task, kd2_task, ...)

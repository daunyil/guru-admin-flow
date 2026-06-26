# Guru Admin Flow v1.0 — Release Package

## Versi
- **APP_VERSION**: 1.0.0
- **DATA_SCHEMA_VERSION**: 7
- **Tanggal Release**: 2026-06-26
- **Commit**: `9c157a63f6ed50990e41f021f141ffe2753194f6`
- **Catatan**: v1.0.0 adalah baseline code-complete sebelum field test. Patch dokumentasi setelah tag dicatat sebagai RELEASE-PACKAGE-01B.

---

## Panduan Install

### Persyaratan
- Node.js 20+
- npm 10+
- Browser modern (Chrome, Firefox, Edge, Safari)

### Cara Install
```bash
git clone https://github.com/daunyil/guru-admin-flow.git
cd guru-admin-flow
npm install
npm run build
```

### Cara Jalankan (Development)
```bash
npm run dev
```
Buka `http://localhost:5173`

### Cara Build (Production)
```bash
npm run build
```
Hasil build ada di `apps/teacher-admin/dist/`. Buka `index.html` langsung di browser atau deploy ke static hosting.

### Supabase (Opsional)
App tetap jalan tanpa Supabase. Bila ingin pakai cloud:
1. Buat project di Supabase
2. Jalankan SQL:
   - `supabase/schema.teacher-auth.sql`
   - `supabase/rls.teacher-auth.sql`
3. Set env di `.env`:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx
   ```
4. Rebuild: `npm run build`

---

## Panduan Backup / Restore

### Backup
1. Buka menu **Backup**
2. Klik **Export Sekarang**
3. File JSON tersimpan (berisi semua data: profil, tahun, jadwal, sesi, absensi, jurnal, nilai, dokumen)

### Restore
1. Buka menu **Backup**
2. Klik **Pilih file backup (.json)**
3. Pilih file JSON hasil backup
4. Preview data muncul
5. Klik **Ya, Restore Sekarang**
6. Ketik **RESTORE** untuk konfirmasi
7. Data lokal diganti dengan data dari file backup

### Catatan
- Backup bersifat **overwrite penuh** (tidak merge)
- Restore **menghapus** semua data lokal saat ini
- Selalu backup sebelum operasi besar (import, tahun baru, clear data)

---

## Panduan Pakai Harian

### Alur Harian Guru
1. **Buka menu Hari Ini** — lihat sesi mengajar hari ini
2. **Absen** — klik sesi → tombol "Isi Absensi" → isi H/S/I/A → Simpan
3. **Jurnal** — klik sesi → tombol "Isi Jurnal" → isi materi + catatan → Simpan Draft atau Setujui & Finalkan
4. **Nilai** — pilih Kelas dan Mapel → isi KD1-KD6 + PTS + PAS → Simpan

### Alur Mingguan/Bulanan
1. **Paket Administrasi** — cek kelengkapan 14 dokumen
2. **Remedial/Pengayaan** — susun dari nilai terbaru
3. **LKPD** — buat dari Tujuan Pembelajaran
4. **Promes** — susun dari Prota + Kalender

### Alur Akhir Semester
1. **Laporan Semester** — susun dari data semester
2. **Backup** — export semua data sebelum tahun baru
3. **Tahun Baru** — wizard salin data ke tahun pelajaran berikutnya

### Cetak Dokumen
- **Daftar Nilai**: menu Nilai → Cetak Daftar Nilai (landscape)
- **Rekap Absensi**: menu Absen → mode Susulan → Cetak Rekap Absensi
- **Promes**: menu Promes → Susun → Cetak Preview → Mode Dokumen → Cetak (landscape)
- **Jurnal**: menu Jurnal → pilih pertemuan → Mode Dokumen → Cetak
- **LKPD**: menu LKPD → Preview → Cetak
- **Remedial/Pengayaan**: menu masing-masing → Cetak
- **Laporan Semester**: menu Laporan → Susun → Mode Dokumen → Cetak
- **Checklist Administrasi**: menu Paket Administrasi → Download Checklist HTML

---

## Batasan yang Sengaja Ditahan

### Tidak Ada di v1.0
1. **Cloud sync penuh** — Supabase bridge ada tapi pull-to-local dinonaktifkan. Local-first.
2. **Multi-sekolah** — satu instalasi = satu sekolah.
3. **Login multi-user penuh** — AuthGate ada tapi local mode tetap default.
4. **AI dokumen otomatis** — prompt generator ada, tapi tidak ada API built-in. Guru salin manual ke AI.
5. **Smart Roster** — integrasi penjadwalan otomatis belum.
6. **PDF export** — export HTML + print CSS saja. PDF via browser print-to-PDF.
7. **Code-splitting** — bundle 860KB JS (warning Vite, tidak memengaruhi fungsi).

### Yang Perlu Diperhatikan
1. **Promes tidak persist** — Promes di-generate on-demand, tidak tersimpan otomatis. Cetak/download setelah susun.
2. **Supabase field test** — bridge sudah ada dengan parent-child push + error toast, tapi belum diuji dengan data nyata Supabase.
3. **CI connector** — GitHub Actions CI ada dan hijau, tapi belum terbaca dari connector Bapak.
4. **Token GitHub** — token yang muncul di chat harus di-revoke.

---

## Struktur Modul

| Modul | Route | Fungsi |
|---|---|---|
| Hari Ini | `/` | Dashboard harian + quick links |
| Paket Administrasi | `/admin-package` | Checklist 14 dokumen + skor + export checklist |
| Absen | `/attendance` | Absen reguler + susulan + cetak rekap |
| Jurnal | `/journal` | Jurnal reguler + susulan + manual + chip kegiatan |
| Nilai | `/grades` | KD1-KD6 + PTS + PAS + paste Excel + import CBT + cetak |
| Perangkat Penilaian | `/evaluation-docs` | Kisi-kisi + kartu soal + naskah soal |
| Remedial | `/remedial` | Susun dari nilai + cetak |
| Pengayaan | `/pengayaan` | Susun dari nilai + cetak |
| Kelas dan Mapel | `/assignments` | Manajemen assignment |
| Kalender | `/calendar` | Kalender pendidikan |
| Prota | `/prota` | Program Tahunan + import JSON |
| Promes | `/promes` | Program Semester (on-demand) |
| Jadwal | `/schedule` | Jadwal + generate sesi |
| Siswa | `/roster` | Daftar siswa per kelas |
| Bank TP | `/atp` | Tujuan Pembelajaran + import |
| LKPD | `/lkpd` | Lembar Kerja + final/revisi |
| RPP / Modul Ajar | `/rpp` | RPP |
| Perbarui Identitas Dokumen | `/rpp-bulk` | Ganti identitas DOCX/txt |
| Laporan Semester | `/semester-report` | Laporan akhir semester |
| Import dari HP | `/apps-script-import` | Import dari Apps Script |
| Profil | `/profile` | Profil sekolah + guru + tahun pelajaran |
| Backup | `/backup` | Export/Import JSON |

---

## Tech Stack

- **Frontend**: React 18 + TypeScript (strict) + Tailwind CSS 3
- **Router**: React Router 6 (HashRouter)
- **Local DB**: Dexie.js (IndexedDB), 19+ tables, schema v7
- **Cloud (opsional)**: Supabase (auth + RLS + bridge)
- **Build**: Vite 5
- **Testing**: Vitest (524 tests)
- **CI**: GitHub Actions (typecheck + test + build + audit)
- **Branding**: SIAKAD GURU v1.0.0

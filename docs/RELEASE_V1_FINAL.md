# Guru Admin Flow v1.0 — Final Release Lock

Tanggal lock: 26 Juni 2026

## Verdict

**Guru Admin Flow v1.0 = STABLE BASELINE / SIAP DIPAKAI HARIAN.**

Release ini dikunci untuk menutup fase coding/audit berulang. Setelah dokumen ini dibuat, pekerjaan berikutnya hanya boleh berupa hotfix bug nyata yang mengganggu pemakaian harian.

## Baseline

| Item | Nilai |
|---|---|
| Release | `v1.0.0` |
| App version | `APP_VERSION = "1.0.0"` |
| Data schema | `DATA_SCHEMA_VERSION = 7` |
| Baseline functional commit | `411390d3da974a52efd6b5f59318a7d2f9b8b0cd` |
| Baseline fixpack | `MV-POLISH-FIXPACK-02` |
| Scope | Local-first PWA / offline-first / backup JSON |
| Cloud sync | Ditunda ke v1.1 |

## Gate Baseline

Gate yang menjadi dasar release lock adalah laporan `MV-POLISH-FIXPACK-02`:

| Gate | Status |
|---|---|
| Typecheck | ✅ 0 errors |
| Unit/domain/app tests | ✅ 524/524 PASS |
| Build | ✅ PASS |
| CI | ✅ completed/success pada baseline commit |
| Console browser | ✅ zero console errors |

Catatan: commit release lock setelah baseline ini hanya mengubah metadata/dokumen/version label, tanpa menaikkan schema dan tanpa menambah fitur.

## Scope v1.0 yang Dianggap Selesai

| Modul | Status |
|---|---|
| Profil sekolah/guru | ✅ selesai |
| Tahun pelajaran aktif | ✅ selesai |
| Kalender pendidikan | ✅ selesai |
| Prota | ✅ selesai |
| Promes | ✅ selesai |
| Jadwal/sesi mengajar | ✅ selesai |
| Absensi cepat HP | ✅ selesai |
| Absen susulan | ✅ selesai |
| Jurnal otomatis | ✅ selesai |
| Jurnal susulan | ✅ selesai |
| LKPD | ✅ selesai |
| RPP bulk replace | ✅ selesai |
| Remedial | ✅ selesai |
| Pengayaan | ✅ selesai |
| Laporan semester | ✅ selesai |
| Paket administrasi guru | ✅ selesai |
| Backup/restore JSON | ✅ selesai dan wajib dipakai |

## Temuan Audit Terakhir yang Sudah Ditutup

| ID | Area | Status |
|---|---|---|
| P1 | Jurnal Hari Ini memakai kartu + tombol eksplisit `Isi Jurnal` / `Ubah` | ✅ fixed |
| P2 | Badge Absen Reguler dihitung dari record sesi hari itu, bukan data susulan | ✅ fixed |
| P2 | `parseISODate` menolak tanggal mustahil melalui round-trip validation | ✅ fixed |

## Deferred yang Tidak Menghalangi Pemakaian

Item berikut tidak menjadi blocker v1.0 karena tidak mengganggu data harian, simpan, restore, atau dokumen utama.

| Item | Keputusan |
|---|---|
| Bundle size polish | Tunda. Tidak disentuh kecuali app terasa lambat nyata di perangkat Bapak. |
| File mode/cosmetic minor | Tunda. Tidak disentuh bila tidak mengganggu pemakaian. |
| Supabase/cloud sync | Pindah ke v1.1 setelah kebutuhan harian stabil. |
| Integrasi Apps Script | Pindah ke v1.1/adaptor, bukan blocker v1.0. |
| Fitur baru | Backlog setelah v1.0, bukan bagian release lock. |

## Aturan Setelah Release Lock

Mulai setelah dokumen ini, jangan buka audit besar lagi untuk v1.0.

Yang boleh dikerjakan:

1. **P0** — app crash, data hilang, backup/restore rusak.
2. **P1** — absen/jurnal/dokumen utama salah atau tidak bisa disimpan.
3. **P2 nyata** — bug mengganggu alur harian dan bisa direproduksi.

Yang tidak boleh dikerjakan di v1.0:

1. UI polish kosmetik.
2. Refactor besar.
3. Fitur baru.
4. Cloud sync.
5. Perombakan schema tanpa alasan data-loss.

## Checklist Pemakaian Harian

Minimal yang Bapak lakukan:

1. Isi profil sekolah/guru.
2. Buat/aktifkan tahun pelajaran.
3. Pastikan jadwal/sesi ada.
4. Isi absen dan jurnal dari halaman Hari Ini.
5. Pakai susulan jika ada data yang terlupa.
6. Buat dokumen administrasi sesuai kebutuhan.
7. Export backup JSON secara rutin.

## Kesimpulan

**Guru Admin Flow v1.0 dikunci sebagai release stabil.**

Aplikasi boleh dipakai untuk data nyata. Pekerjaan teknis berikutnya hanya hotfix bug nyata, bukan audit ulang atau penambahan fitur.

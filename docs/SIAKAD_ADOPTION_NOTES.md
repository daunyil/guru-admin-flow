# SIAKAD Adoption Notes

Sumber adopsi:

- `index1.html`: struktur dashboard, siswa, absensi, nilai, jurnal, laporan, bottom nav.
- `css1.css`: header biru, card mobile, tombol absensi, bottom nav, tabel laporan, print style.
- `js12.txt`: alur absensi H/S/I/A, nilai UH1/UH2/UTS/UAS, jurnal, laporan piket, matrix absensi, daftar nilai, laporan jurnal.
- `promes_generator_smpn8bantan (1).html`: template Promes, kalender, materi, hasil, print, export.

Status implementasi awal v0.6.1:

- Mobile shell sudah mengadopsi header SIAKAD dan bottom nav.
- CSS token SIAKAD sudah masuk ke `index.css`.
- Implementasi absensi mobile baru tersedia di `MobileAttendancePage.tsx`.
- Router masih perlu diarahkan ke halaman absensi mobile bila gate lokal sudah dicek.

Target berikut:

1. Aktifkan `MobileAttendancePage` sebagai `/attendance`.
2. Ubah nilai menjadi model UH1/UH2/UTS/UAS/Remedial.
3. Tambah pusat laporan: Piket, Matrix Absensi, Daftar Nilai, Jurnal Guru.

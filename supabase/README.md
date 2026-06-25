# Supabase Setup

Tahap awal Supabase untuk Guru Admin Flow.

Target:
- Login guru memakai email dan password.
- Akun login dihubungkan ke teacher profile.
- Data mengajar, absensi, dan jurnal difilter berdasarkan teacher id.
- Admin dapat melihat semua data.

Env aplikasi:
- Salin apps/teacher-admin/env.example menjadi apps/teacher-admin/.env.local
- Isi VITE_SUPABASE_URL
- Isi VITE_SUPABASE_ANON_KEY

Catatan keamanan:
- Jangan menyimpan service role key di frontend.
- Anon key boleh dipakai di frontend jika RLS aktif.

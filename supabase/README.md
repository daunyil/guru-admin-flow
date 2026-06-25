# Supabase Setup

Tahap awal Supabase untuk Guru Admin Flow.

Target:
- Login guru memakai email dan password.
- Akun login dihubungkan ke teacher profile.
- Data mengajar, absensi, dan jurnal difilter berdasarkan teacher id.
- Admin dapat melihat semua data.

## Urutan setup

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase/schema.teacher-auth.sql`.
4. Jalankan `supabase/rls.teacher-auth.sql`.
5. Buat user guru di Authentication.
6. Tambahkan baris di `teacher_profiles` dengan `user_id` dari user Auth.
7. Tambahkan `teaching_assignments` untuk mapel dan kelas guru.

## Env aplikasi

Salin:

```bash
apps/teacher-admin/env.example
```

menjadi:

```bash
apps/teacher-admin/.env.local
```

Isi:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Catatan keamanan

- Jangan menyimpan service role key di frontend.
- Anon key boleh dipakai di frontend jika RLS aktif.
- Login gate hanya aktif jika `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` diisi.
- Jika env kosong, aplikasi tetap berjalan mode lokal/offline.

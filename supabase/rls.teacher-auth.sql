-- SUPABASE-AUTH-RLS-RC1 + SUPABASE-STABILITY-FIXPACK-01
-- Jalankan setelah schema.teacher-auth.sql.
--
-- FIXPACK-01 P0-1: Fix RLS recursion.
-- Sebelumnya: policy teacher_profiles_select_own_or_admin memanggil
-- current_user_role() yang query teacher_profiles → infinite recursion.
-- Fix:
--   1. Fungsi current_teacher_id() dan current_user_role() dibuat
--      SECURITY DEFINER dengan search_path aman, supaya query di dalam
--      fungsi tidak terkena RLS tabel teacher_profiles.
--   2. Policy teacher_profiles_select_own_or_admin tidak lagi memanggil
--      current_user_role() (yang query tabel sama). Sebagai gantinya,
--      admin diidentifikasi via auth.uid() IN (select user_id from
--      teacher_profiles where role='admin') — tapi ini juga recursion.
--      Solusi final: admin di-allow via JWT claim 'role' = 'admin'
--      (set via auth.users app_metadata). Bila claim tidak ada, hanya
--      own row yang bisa dibaca.

alter table public.teacher_profiles enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.journal_entries enable row level security;

-- =====================================================================
-- FIXPACK-01 P0-1: Helper functions dengan SECURITY DEFINER
-- =====================================================================
-- SECURITY DEFINER: fungsi jalan dengan privilege owner (postgres),
-- TIDAK terkena RLS tabel teacher_profiles. search_path di-set ke pg_catalog
-- + public supaya tidak ada schema injection.

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select id
  from public.teacher_profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role
  from public.teacher_profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1
$$;

-- Helper: cek apakah user saat ini adalah admin.
-- Pakai security definer supaya tidak recursion di policy teacher_profiles.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.teacher_profiles
    where user_id = auth.uid()
      and is_active = true
      and role = 'admin'
  )
$$;

-- =====================================================================
-- POLICIES
-- =====================================================================

-- teacher_profiles: user baca row sendiri (user_id = auth.uid()).
-- Admin baca semua via is_current_user_admin() (security definer, no recursion).
-- FIXPACK-01 P0-1: SEBELUMNYA pakai current_user_role() di sini → recursion.
-- SEKARANG: pakai is_current_user_admin() (security definer) + auth.uid() langsung.
drop policy if exists teacher_profiles_select_own_or_admin on public.teacher_profiles;
create policy teacher_profiles_select_own_or_admin
on public.teacher_profiles
for select
using (
  user_id = auth.uid()
  or public.is_current_user_admin()
);

-- teacher_profiles: user hanya update row sendiri (non-admin).
-- Admin bisa update semua.
drop policy if exists teacher_profiles_update_own_or_admin on public.teacher_profiles;
create policy teacher_profiles_update_own_or_admin
on public.teacher_profiles
for update
using (
  user_id = auth.uid()
  or public.is_current_user_admin()
)
with check (
  user_id = auth.uid()
  or public.is_current_user_admin()
);

-- teaching_assignments: guru hanya akses row dengan teacher_id miliknya.
drop policy if exists teaching_assignments_owner_or_admin on public.teaching_assignments;
create policy teaching_assignments_owner_or_admin
on public.teaching_assignments
for all
using (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
)
with check (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
);

-- lesson_sessions: sama.
drop policy if exists lesson_sessions_owner_or_admin on public.lesson_sessions;
create policy lesson_sessions_owner_or_admin
on public.lesson_sessions
for all
using (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
)
with check (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
);

-- attendance_records: sama.
drop policy if exists attendance_records_owner_or_admin on public.attendance_records;
create policy attendance_records_owner_or_admin
on public.attendance_records
for all
using (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
)
with check (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
);

-- journal_entries: sama.
drop policy if exists journal_entries_owner_or_admin on public.journal_entries;
create policy journal_entries_owner_or_admin
on public.journal_entries
for all
using (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
)
with check (
  teacher_id = public.current_teacher_id()
  or public.is_current_user_admin()
);

-- SUPABASE-AUTH-RLS-RC1
-- Jalankan setelah schema.teacher-auth.sql.

alter table public.teacher_profiles enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.journal_entries enable row level security;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
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
as $$
  select role
  from public.teacher_profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create policy teacher_profiles_select_own_or_admin
on public.teacher_profiles
for select
using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy teaching_assignments_owner_or_admin
on public.teaching_assignments
for all
using (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin')
with check (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin');

create policy lesson_sessions_owner_or_admin
on public.lesson_sessions
for all
using (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin')
with check (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin');

create policy attendance_records_owner_or_admin
on public.attendance_records
for all
using (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin')
with check (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin');

create policy journal_entries_owner_or_admin
on public.journal_entries
for all
using (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin')
with check (teacher_id = public.current_teacher_id() or public.current_user_role() = 'admin');

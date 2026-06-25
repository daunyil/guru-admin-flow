create extension if not exists pgcrypto;

create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  full_name text not null,
  email text,
  role text not null default 'teacher',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id),
  academic_year_label text not null,
  semester int not null,
  class_id text not null,
  class_label text not null,
  subject text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teaching_assignments(id),
  teacher_id uuid not null references public.teacher_profiles(id),
  class_id text not null,
  class_label text not null,
  subject text not null,
  session_date date not null,
  start_period int not null,
  duration_jp int not null default 2,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id),
  teacher_id uuid not null references public.teacher_profiles(id),
  student_id text not null,
  student_name text not null,
  student_number int,
  status text not null default 'present',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id),
  teacher_id uuid not null references public.teacher_profiles(id),
  material text not null default '',
  activity text not null default '',
  note text,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

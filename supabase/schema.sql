-- Green Mountain TOEFL Academy production schema.
-- Run this in the Supabase SQL editor after creating the project.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.program_type as enum ('Primary', 'Junior', 'ITP', 'iBT');
create type public.work_category as enum ('Exercise', 'Homework', 'Monthly Test', 'Mock Exam');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  student_code text not null unique,
  full_name text not null,
  program public.program_type not null,
  class_name text not null,
  profile_image_path text,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  title text not null,
  program public.program_type not null,
  class_name text not null,
  category public.work_category not null,
  section text not null,
  instructions text not null default '',
  source_material text,
  section_blocks text,
  media_path text,
  media_url text,
  answer_count integer not null default 1 check (answer_count between 1 and 120),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 240),
  posted_at timestamptz not null default now(),
  due_at timestamptz
);

create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (assignment_id, student_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  recording_url text,
  auto_submitted boolean not null default false,
  submitted_at timestamptz not null default now(),
  score text,
  feedback text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique (assignment_id, student_id)
);

create table public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  review_month date not null,
  overall_score numeric,
  listening_score numeric,
  reading_score numeric,
  speaking_score numeric,
  writing_score numeric,
  language_score numeric,
  strong_areas text not null default '',
  improving_areas text not null default '',
  weaknesses text not null default '',
  improvement_plan text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, review_month)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid references public.profiles(id),
  recipient_role public.user_role,
  body text not null,
  created_at timestamptz not null default now(),
  check (recipient_id is not null or recipient_role is not null)
);

create table public.typing_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_slug text not null,
  score integer not null default 0,
  wpm integer,
  accuracy numeric,
  played_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.assignments enable row level security;
alter table public.test_sessions enable row level security;
alter table public.submissions enable row level security;
alter table public.monthly_reviews enable row level security;
alter table public.messages enable row level security;
alter table public.typing_scores enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.current_role() in ('teacher', 'admin')
$$;

create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_student_self" on public.profiles
  for insert with check (id = auth.uid() and role = 'student');

create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

create policy "profiles_admin_delete_non_admin" on public.profiles
  for delete using (public.is_admin() and role <> 'admin');

create policy "students_select_scoped" on public.students
  for select using (profile_id = auth.uid() or public.is_teacher_or_admin());

create policy "students_insert_self_or_admin" on public.students
  for insert with check (profile_id = auth.uid() or public.is_admin());

create policy "students_update_self_or_admin" on public.students
  for update using (profile_id = auth.uid() or public.is_admin());

create policy "students_admin_delete" on public.students
  for delete using (public.is_admin());

create policy "assignments_select_by_class" on public.assignments
  for select using (
    public.is_teacher_or_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = auth.uid()
        and s.program = assignments.program
        and s.class_name = assignments.class_name
    )
  );

create policy "assignments_teacher_insert" on public.assignments
  for insert with check (public.is_teacher_or_admin());

create policy "assignments_teacher_update" on public.assignments
  for update using (public.is_teacher_or_admin());

create policy "assignments_teacher_delete" on public.assignments
  for delete using (public.is_teacher_or_admin());

create policy "sessions_select_owner_or_staff" on public.test_sessions
  for select using (
    public.is_teacher_or_admin()
    or exists (select 1 from public.students s where s.id = test_sessions.student_id and s.profile_id = auth.uid())
  );

create policy "sessions_student_insert" on public.test_sessions
  for insert with check (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));

create policy "sessions_student_update" on public.test_sessions
  for update using (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));

create policy "submissions_select_owner_or_staff" on public.submissions
  for select using (
    public.is_teacher_or_admin()
    or exists (select 1 from public.students s where s.id = submissions.student_id and s.profile_id = auth.uid())
  );

create policy "submissions_student_insert" on public.submissions
  for insert with check (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));

create policy "submissions_staff_review" on public.submissions
  for update using (public.is_teacher_or_admin());

create policy "reviews_select_owner_or_staff" on public.monthly_reviews
  for select using (
    public.is_teacher_or_admin()
    or exists (select 1 from public.students s where s.id = monthly_reviews.student_id and s.profile_id = auth.uid())
  );

create policy "reviews_teacher_write" on public.monthly_reviews
  for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());

create policy "messages_select_inbox" on public.messages
  for select using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or recipient_role = public.current_role()
    or public.is_admin()
  );

create policy "messages_insert_auth" on public.messages
  for insert with check (sender_id = auth.uid());

create policy "typing_scores_select_owner_or_staff" on public.typing_scores
  for select using (
    public.is_teacher_or_admin()
    or exists (select 1 from public.students s where s.id = typing_scores.student_id and s.profile_id = auth.uid())
  );

create policy "typing_scores_student_insert" on public.typing_scores
  for insert with check (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));

-- Storage hardening notes:
-- 1. Create private buckets: assignment-media, profile-images, speaking-recordings.
-- 2. Use signed URLs for student access.
-- 3. Do not allow public uploads from anonymous users.

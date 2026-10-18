-- Run once after monthly-ai-all-classes.sql: one-section retakes authorised by the teacher.
-- Also set the RETAKE_TEACHER_SECRET function secret (the teacher password used on monthly-exams/retake.html).
begin;
-- One row per retake code. Only the code's SHA-256 hash is stored; the function (service role) is the only reader.
create table if not exists public.monthly_retakes (
 code_hash text primary key,
 attempt_id uuid not null references public.monthly_exam_attempts(id) on delete cascade,
 section text not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 retake_attempt_id uuid references public.monthly_exam_attempts(id) on delete set null,
 used_at timestamptz
);
create unique index if not exists monthly_retakes_attempt on public.monthly_retakes(retake_attempt_id);
alter table public.monthly_retakes enable row level security;
revoke all on public.monthly_retakes from public, anon, authenticated;
-- A retake report has {"of":<original attempt>,"section":...}; the original lists merged retakes under "taken".
alter table public.monthly_ai_reports add column if not exists retake jsonb;
-- Writing and speaking can be retaken task by task; empty means the whole section.
alter table public.monthly_retakes add column if not exists tasks text[];
-- Retakes the student asked for: the student's page shows a request code, the teacher approves it on their own device,
-- and the retake code then works only on that student's computer. retake_code is readable only by the function.
alter table public.monthly_retakes add column if not exists for_student uuid;
create table if not exists public.monthly_retake_requests (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.monthly_exam_attempts(id) on delete cascade,
 student_id uuid not null,
 request_code text not null,
 created_at timestamptz not null default now(),
 approved_at timestamptz,
 retake_code text,
 section text
);
alter table public.monthly_retake_requests enable row level security;
revoke all on public.monthly_retake_requests from public, anon, authenticated;
-- What the student asked to retake when requesting (empty tasks: the whole section).
alter table public.monthly_retake_requests add column if not exists requested_section text;
alter table public.monthly_retake_requests add column if not exists requested_tasks text[];
commit;

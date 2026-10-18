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
commit;

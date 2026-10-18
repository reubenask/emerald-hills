-- Run once after monthly-retake.sql: wrong teacher passwords, so repeated guessing locks the teacher pages for an hour.
-- Only a hash of the caller's address is kept. The function (service role) is the only reader and writer.
begin;
create table if not exists public.monthly_teacher_logins (
 id bigint generated always as identity primary key,
 ip_hash text not null,
 failed boolean not null default true,
 created_at timestamptz not null default now()
);
create index if not exists monthly_teacher_logins_recent on public.monthly_teacher_logins(created_at);
alter table public.monthly_teacher_logins enable row level security;
revoke all on public.monthly_teacher_logins from public, anon, authenticated;
commit;

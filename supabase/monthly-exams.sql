-- Run once in a new Supabase project. Teacher addresses are inserted separately.
begin;
create schema if not exists monthly_private;
revoke all on schema monthly_private from public, anon, authenticated;
create table monthly_private.teacher_emails(email text primary key check(email=lower(email)));
alter table monthly_private.teacher_emails enable row level security;
revoke all on monthly_private.teacher_emails from public, anon, authenticated;

-- Check the verified Auth identity, never a role supplied by the browser.
create function public.monthly_is_teacher() returns boolean
language sql stable security definer set search_path=''
as $$ select exists (
  select 1 from auth.users u join monthly_private.teacher_emails t on t.email=lower(u.email)
  where u.id=auth.uid() and u.email_confirmed_at is not null
); $$;
revoke all on function public.monthly_is_teacher() from public, anon;
grant execute on function public.monthly_is_teacher() to authenticated;

create table public.monthly_exam_attempts (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 exam_id text not null check(exam_id in ('primary-step2','itp','ibt')),
 exam_version text not null,
 student_name text not null default '',
 class_name text not null default '',
 response_state jsonb not null default '{}'::jsonb,
 status text not null default 'draft' check(status in ('draft','submitted')),
 results_released boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz
);
create index monthly_attempts_student on public.monthly_exam_attempts(student_id);
alter table public.monthly_exam_attempts enable row level security;
revoke all on public.monthly_exam_attempts from public, anon, authenticated;
grant select,insert,update on public.monthly_exam_attempts to authenticated;
create policy monthly_attempt_read on public.monthly_exam_attempts for select to authenticated
 using(student_id=auth.uid() or public.monthly_is_teacher());
create policy monthly_attempt_insert on public.monthly_exam_attempts for insert to authenticated
 with check(student_id=auth.uid() and status='draft' and not results_released);
create policy monthly_attempt_update on public.monthly_exam_attempts for update to authenticated
 using((student_id=auth.uid() and status='draft') or public.monthly_is_teacher())
 with check(student_id=auth.uid() or public.monthly_is_teacher());

create function monthly_private.guard_attempt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.created_at:=now(); new.submitted_at:=null;
 elsif not public.monthly_is_teacher() then
  if new.student_id is distinct from old.student_id or new.exam_id is distinct from old.exam_id
   or new.results_released is distinct from old.results_released
   or new.created_at is distinct from old.created_at then
   raise exception 'Protected attempt fields cannot be changed';
  end if;
  if old.status <> 'draft' then raise exception 'Submitted work is locked'; end if;
  new.submitted_at:=case when new.status='submitted' then now() else null end;
 end if;
 new.updated_at:=now(); return new;
end; $$;
revoke all on function monthly_private.guard_attempt() from public, anon, authenticated;
create trigger monthly_attempt_guard before insert or update on public.monthly_exam_attempts
 for each row execute function monthly_private.guard_attempt();

create table public.monthly_exam_reviews (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.monthly_exam_attempts(id) on delete cascade,
 section_key text not null,
 task_key text not null default 'section',
 rubric_version text not null,
 score numeric not null check(score>=0),
 max_score numeric not null check(max_score>0 and score<=max_score),
 feedback jsonb not null default '{}'::jsonb,
 reviewed_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 unique(attempt_id,section_key,task_key)
);
alter table public.monthly_exam_reviews enable row level security;
revoke all on public.monthly_exam_reviews from public, anon, authenticated;
grant select,insert,update on public.monthly_exam_reviews to authenticated;
create policy monthly_review_read on public.monthly_exam_reviews for select to authenticated
 using(public.monthly_is_teacher() or exists(select 1 from public.monthly_exam_attempts a
  where a.id=attempt_id and a.student_id=auth.uid() and a.results_released));
create policy monthly_review_insert on public.monthly_exam_reviews for insert to authenticated
 with check(public.monthly_is_teacher() and reviewed_by=auth.uid());
create policy monthly_review_update on public.monthly_exam_reviews for update to authenticated
 using(public.monthly_is_teacher()) with check(public.monthly_is_teacher() and reviewed_by=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('monthly-speaking','monthly-speaking',false,20971520,
 array['audio/webm','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/mpeg']);
create policy monthly_audio_read on storage.objects for select to authenticated
 using(bucket_id='monthly-speaking' and
 ((storage.foldername(name))[1]=auth.uid()::text or public.monthly_is_teacher()));
create policy monthly_audio_insert on storage.objects for insert to authenticated
 with check(bucket_id='monthly-speaking' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.monthly_exam_attempts a
 where a.id::text=(storage.foldername(name))[2] and a.student_id=auth.uid() and a.status='draft'));
create policy monthly_audio_update on storage.objects for update to authenticated
 using(bucket_id='monthly-speaking' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.monthly_exam_attempts a
 where a.id::text=(storage.foldername(name))[2] and a.student_id=auth.uid() and a.status='draft'))
 with check(bucket_id='monthly-speaking' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.monthly_exam_attempts a
 where a.id::text=(storage.foldername(name))[2] and a.student_id=auth.uid() and a.status='draft'));
create policy monthly_audio_delete on storage.objects for delete to authenticated
 using(bucket_id='monthly-speaking' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.monthly_exam_attempts a
 where a.id::text=(storage.foldername(name))[2] and a.student_id=auth.uid() and a.status='draft'));
commit;

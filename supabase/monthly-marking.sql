-- Run once after monthly-exams.sql. Adds what automatic marking needs:
-- marking status on attempts, report cards, AI/teacher source and transcripts on reviews,
-- and a totals view.
begin;

alter table public.monthly_exam_attempts
 add column marking_status text not null default 'pending'
  check(marking_status in ('pending','marking','marked','needs_teacher','failed')),
 add column marking_notes jsonb not null default '[]'::jsonb,
 add column marked_at timestamptz;

alter table public.monthly_exam_reviews
 alter column reviewed_by drop not null,
 add column source text not null default 'teacher' check(source in ('auto','ai','teacher')),
 add column transcript text;

-- Same guard as before, plus: students cannot touch marking fields, and the
-- marking Edge Function (service role) may update submitted attempts.
create or replace function monthly_private.guard_attempt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.created_at:=now(); new.submitted_at:=null;
  new.marking_status:='pending'; new.marking_notes:='[]'::jsonb; new.marked_at:=null;
 elsif coalesce(auth.role(),'')='service_role' then
  null;
 elsif not public.monthly_is_teacher() then
  if new.student_id is distinct from old.student_id or new.exam_id is distinct from old.exam_id
   or new.results_released is distinct from old.results_released
   or new.created_at is distinct from old.created_at
   or new.marking_status is distinct from old.marking_status
   or new.marking_notes is distinct from old.marking_notes
   or new.marked_at is distinct from old.marked_at then
   raise exception 'Protected attempt fields cannot be changed';
  end if;
  if old.status <> 'draft' then raise exception 'Submitted work is locked'; end if;
  new.submitted_at:=case when new.status='submitted' then now() else null end;
 end if;
 new.updated_at:=now(); return new;
end; $$;

-- Teachers editing a mark must record themselves as the reviewer.
drop policy monthly_review_update on public.monthly_exam_reviews;
create policy monthly_review_update on public.monthly_exam_reviews for update to authenticated
 using(public.monthly_is_teacher())
 with check(public.monthly_is_teacher() and reviewed_by=auth.uid() and source='teacher');

-- One row per attempt with section scores and the overall total. RLS of the
-- underlying tables applies, so students only see released results.
create view public.monthly_exam_totals with (security_invoker=true) as
select a.id as attempt_id, a.student_id, a.student_name, a.class_name, a.exam_id, a.exam_version,
 a.status, a.submitted_at, a.marking_status, a.marking_notes, a.results_released,
 coalesce(s.sections,'{}'::jsonb) as sections, s.total_score, s.total_max
from public.monthly_exam_attempts a
left join lateral (
 select jsonb_object_agg(section_key, jsonb_build_object('score',sc,'max',mx)) as sections,
  sum(sc) as total_score, sum(mx) as total_max
 from (select section_key, sum(score) as sc, sum(max_score) as mx
  from public.monthly_exam_reviews r where r.attempt_id=a.id group by section_key) x
) s on true;
grant select on public.monthly_exam_totals to authenticated;

-- Report card per attempt, written by the marking function. Students see it
-- only after results are released.
create table public.monthly_exam_reports (
 attempt_id uuid primary key references public.monthly_exam_attempts(id) on delete cascade,
 html text not null,
 scores jsonb not null default '{}'::jsonb,
 total numeric not null,
 total_max numeric not null,
 sent_to text,
 sent_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.monthly_exam_reports enable row level security;
revoke all on public.monthly_exam_reports from public, anon, authenticated;
grant select on public.monthly_exam_reports to authenticated;
create policy monthly_report_read on public.monthly_exam_reports for select to authenticated
 using(public.monthly_is_teacher() or exists(select 1 from public.monthly_exam_attempts a
  where a.id=attempt_id and a.student_id=auth.uid() and a.results_released));
commit;

begin;
create table if not exists public.monthly_ai_reports (
 attempt_id uuid primary key references public.monthly_exam_attempts(id) on delete cascade,
 catalog_version text not null,
 objective jsonb not null,
 jobs jsonb not null,
 lease_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.monthly_ai_reports enable row level security;
revoke all on public.monthly_ai_reports from public, anon, authenticated;
grant select on public.monthly_ai_reports to authenticated;
create policy monthly_ai_teacher_read on public.monthly_ai_reports for select to authenticated
 using(public.monthly_is_teacher());
-- Students obtain their released report through the authenticated function only.
create or replace function public.monthly_claim_marking(p_attempt uuid)
returns setof public.monthly_ai_reports language sql security definer set search_path='' as $$
 update public.monthly_ai_reports set lease_until=now()+interval '150 seconds'
 where attempt_id=p_attempt and (lease_until is null or lease_until<now())
 returning *;
$$;
revoke all on function public.monthly_claim_marking(uuid) from public,anon,authenticated;
grant execute on function public.monthly_claim_marking(uuid) to service_role;
create table if not exists public.monthly_ai_catalog (
 exam_id text primary key check(exam_id in ('itp','ibt')),
 version text not null,
 content jsonb not null
);
alter table public.monthly_ai_catalog enable row level security;
revoke all on public.monthly_ai_catalog from public,anon,authenticated;
commit;

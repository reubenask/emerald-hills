-- Run once after monthly-ai.sql: enables Primary Step 2 and records when each report was emailed.
begin;
alter table public.monthly_ai_catalog drop constraint if exists monthly_ai_catalog_exam_id_check;
alter table public.monthly_ai_catalog add constraint monthly_ai_catalog_exam_id_check
 check(exam_id in ('primary-step2','itp','ibt'));
alter table public.monthly_ai_reports add column if not exists emailed_at timestamptz;
commit;

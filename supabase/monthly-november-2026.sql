-- Lets later months' tests (for example 'itp-november-2026') save and be marked.
-- Each month has its own exam id, so October attempts keep their own answer keys.
-- Run this first, then supabase/catalog/november-2026.sql.
alter table public.monthly_exam_attempts drop constraint if exists monthly_exam_attempts_exam_id_check;
alter table public.monthly_exam_attempts add constraint monthly_exam_attempts_exam_id_check
 check(exam_id ~ '^(primary-step2|itp|ibt)(-[a-z]+-[0-9]{4})?$');
alter table public.monthly_ai_catalog drop constraint if exists monthly_ai_catalog_exam_id_check;
alter table public.monthly_ai_catalog add constraint monthly_ai_catalog_exam_id_check
 check(exam_id ~ '^(primary-step2|itp|ibt)(-[a-z]+-[0-9]{4})?$');

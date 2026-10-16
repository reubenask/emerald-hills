-- ITP Speaking Task 3: let the marker check facts against the class lesson instead of flagging every script for teacher review.
-- Run once in the SQL editor (rebuilding the ITP catalog with tools/build_monthly_ai_catalog.cjs does the same).
update public.monthly_ai_catalog c
set content=jsonb_set(c.content,'{tasks}',(
  select jsonb_agg(case when t->>'id'='speaking-3' then (t-'forceTeacherReview')||jsonb_build_object(
    'prompt','On the phone, explain to an absent classmate the school planting project from the class lesson: what the project is and the choices of seeds, the weekly journal requirements (drawing and writing), and what to bring to the Garden Fair and the date. Check every fact against the lesson transcript; credit accurate facts and point out wrong or missing ones.',
    'sourceAudio','https://reubenask.github.io/emerald-hills/monthly-exams/junior/assets/garden-lesson.mp3') else t end order by n)
  from jsonb_array_elements(c.content->'tasks') with ordinality as x(t,n)))
where c.exam_id='itp';

# Monthly exam auto-marking

When a student presses **Submit All**, the exam page sends their answers and recordings to Supabase and calls the `mark-monthly-attempt` Edge Function. The function scores every multiple-choice, dropdown and sentence-ordering item from the answer keys, then uses Gemini to transcribe each speaking recording and score writing and speaking against the rubrics. Scores land in `monthly_exam_reviews`, and `monthly_exam_totals` gives one row per student with section scores and the overall total.

Nothing is sent until `monthly-exams/cloud-config.js` is filled in, so the pages keep working offline as before.

## Flow

1. Student finishes all sections and presses Submit All.
2. `cloud-submit.js` signs the student in anonymously, creates a `monthly_exam_attempts` row, uploads recordings to the private `monthly-speaking` bucket as `<student_id>/<attempt_id>/<clip>.webm`, and marks the attempt `submitted`.
3. It calls `mark-monthly-attempt`, which writes one review row per section or task:
   - `source = 'auto'`: objective items scored from `functions/mark-monthly-attempt/keys/*.json`.
   - `source = 'ai'`: writing and speaking scored by Gemini with the transcript and per-criterion comments in `feedback`.
4. `marking_status` becomes `marked`, or `needs_teacher` when something needs a person (see `marking_notes`).
5. A teacher checks the marks, edits any row (it becomes `source = 'teacher'` and is never overwritten by re-marking), then sets `results_released = true` so the student can see them.

## Setup (once)

1. In the Supabase SQL editor run `supabase/monthly-exams.sql` (if not already run), then `supabase/monthly-marking.sql`.
2. Add teacher emails: `insert into monthly_private.teacher_emails values ('teacher@example.com');`
3. Authentication → Sign In / Providers: turn on **Anonymous sign-ins**.
4. Deploy the function and set its secrets:
   ```bash
   supabase functions deploy mark-monthly-attempt
   supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-2.5-flash
   ```
   `GEMINI_MODEL` is optional; use whichever Gemini model your key has access to.
5. Put the project URL and anon key in `monthly-exams/cloud-config.js`. Never put the Gemini key or service-role key there.

## Before the first real sitting

Fill in every rubric `reference` that starts with `TEACHER TO ADD` in `functions/mark-monthly-attempt/rubrics/`:

- Primary Step 2: the writing picture story, speaking picture story, and video retell.
- ITP: the speaking picture narration and the listening/speaking lesson.
- iBT: the seven listen-and-repeat sentences and four interview questions (these exist only as audio in the page). Until they are filled in, those recordings are transcribed but not scored.

Also confirm the ITP Writing Task 1 blank answers marked `confirm: true` in `tools/extract_monthly_keys.cjs` (blanks 3, 7 and 8), then set `confirm` to false and rerun `node tools/extract_monthly_keys.cjs`.

## Re-marking

A teacher can re-mark an attempt by calling the function with `{ "attempt_id": "...", "force": true }` while signed in. Teacher-edited rows are kept.

## Tests

```bash
cd supabase/functions/mark-monthly-attempt && deno test objective.test.ts
```

# Monthly exam auto-marking and report cards

When a student presses **Submit All**, the exam page sends their answers and recordings to Supabase and calls the `mark-monthly-attempt` Edge Function. That function:

1. **Auto-marks objective items from the answer keys**: Vocabulary, Language Form and Meaning, Reading, the ITP Writing Task 1 dropdowns, and iBT Writing Task 1 (Build a Sentence).
2. **Marks writing with the marking skill** (`functions/mark-monthly-attempt/skill.ts`) through your Gemini API key. No answer key is needed.
3. **Transcribes each speaking recording first**, then marks the transcript with the same skill and scores delivery from the audio.
4. **Builds a report card** with section scores, percentages, the total, per-criterion comments and speaking transcripts, then **emails it** to the address in `REPORT_EMAIL_TO`.

Nothing is sent until `monthly-exams/cloud-config.js` is filled in, so the pages keep working offline as before.

## The marking skill

Every writing task and every free-speaking transcript is marked on five criteria, each 0-4:

| Criterion | What it checks |
|---|---|
| Structure | The parts the task type needs. Email: greeting, purpose, each question answered with a reason, closing, sign-off. Opinion: topic sentence, two reasons, example, conclusion. Discussion post: stance, reasons, example, goes beyond classmates, conclusion. Story: characters, order, ending. Spoken answer: introduction, points with details, closing. |
| Grammar | Range and accuracy for the level |
| Vocabulary | Range, precision and register for the level |
| Linking words | Cohesion and range of linkers for the level |
| Logic and development | Clear order, reasons and examples |

Speaking adds **Delivery** (pronunciation and fluency, 0-4), scored from the audio. Read-aloud tasks are marked on accuracy against the passage, pronunciation, and fluency and intonation. Primary Step 2 Writing Task 2 (ten linking-word sentences) is one point per correct sentence.

The descriptors are calibrated per level, so the same answer scores higher at Primary than at iBT:

- **Primary** (CEFR A1-A2): simple sentences, everyday words, and, but, because, then.
- **ITP** (CEFR A2-B2): compound and complex sentences, topic vocabulary, however, therefore, for example.
- **iBT** (CEFR B2-C1): wide range of structures, academic vocabulary, natural cohesion, developed argument.

To change how anything is marked, edit `skill.ts`. Task prompts and which criteria apply to which task are in `rubrics/*.json`.

## Setup (once)

1. In the Supabase SQL editor run `supabase/monthly-exams.sql` (if not already run), then `supabase/monthly-marking.sql`.
2. Add teacher emails: `insert into monthly_private.teacher_emails values ('teacher@example.com');`
3. Authentication → Sign In / Providers: turn on **Anonymous sign-ins**.
4. Deploy the function and set its secrets:
   ```bash
   supabase functions deploy mark-monthly-attempt
   supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-2.5-flash
   supabase secrets set RESEND_API_KEY=... REPORT_EMAIL_TO=you@example.com REPORT_EMAIL_FROM="Emerald Hills <reports@yourdomain>"
   ```
   `GEMINI_MODEL` is optional. `REPORT_EMAIL_TO` can be a comma-separated list. If the email secrets are missing, report cards are still saved in `monthly_exam_reports`, just not emailed. Resend needs a verified sending domain for `REPORT_EMAIL_FROM`.
5. Put the project URL and anon key in `monthly-exams/cloud-config.js`. Never put the Gemini, Resend or service-role key there.

## Before the first real sitting

- iBT Speaking Task 1: add the seven listen-and-repeat sentences to `rubrics/ibt.json` (they exist only as audio). Until then those recordings are transcribed and listed for the teacher but not scored.
- ITP Writing Task 1: confirm blanks 3, 7 and 8 in `tools/extract_monthly_keys.cjs`, set `confirm` to false, and rerun `node tools/extract_monthly_keys.cjs`.

## What teachers see

- `monthly_exam_totals`: one row per student with section scores and the total.
- `monthly_exam_reports`: the report card HTML and per-section percentages (same keys as the platform's monthly review scores).
- `monthly_exam_reviews`: every mark with criteria comments and transcripts. Editing a row sets it to `source = 'teacher'`; re-marking never overwrites it.
- Attempts with `marking_status = 'needs_teacher'` list what to check in `marking_notes`, and their report card says "Provisional".

A teacher can re-mark an attempt (and resend its report) by calling the function with `{ "attempt_id": "...", "force": true }` while signed in.

## Tests

```bash
cd supabase/functions/mark-monthly-attempt && deno test --allow-env
```

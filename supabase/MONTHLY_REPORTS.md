# Monthly exam marking and report cards: going live

All three monthly exams (Primary Step 2, ITP, iBT) use the same flow:

1. The student ticks the consent box and finishes the test. Answers and recordings are saved to Supabase as they go.
2. On Submit All, the objective sections are marked from the answer keys. These are Vocabulary, Language Form and Meaning, Reading, ITP Writing Task 1, and iBT Build a Sentence.
3. The page immediately starts marking writing and speaking through the `monthly-mark` function and Gemini. Speaking is transcribed first, then marked.
4. When everything is marked, the report card is emailed to `REPORT_EMAIL_TO`. The email subject includes the student's name and class. The student can also open the full report page.

Writing and speaking are marked like a teacher marking a script, on Structure and task fulfilment, Logic and development, Grammar, Vocabulary and Linking words (plus Delivery for speaking). The expectations are set for each level (Primary, ITP or iBT). Each task's feedback lists every mistake with its correction and the reason, suggests better linking words, and gives a corrected version of the student's own response.

## Steps (in Supabase, once)

1. **SQL editor:** run `supabase/monthly-ai-all-classes.sql`, then `supabase/catalog/primary-step2.sql`, then `supabase/catalog/itp-speaking3-lesson.sql`.
2. **Edge Functions → Secrets:** check that these exist:
   - `GEMINI_API_KEY`
   - `RESEND_API_KEY`
   - `REPORT_EMAIL_TO`: where reports go; use commas for several addresses.
   - `REPORT_EMAIL_FROM` (optional): for example `Emerald Hills <reports@yourschool.com>`. It needs a domain verified in Resend. Without it, Resend only delivers to the address you signed up to Resend with.
3. **Redeploy `monthly-mark`:** run `node tools/build_monthly_mark_function.cjs` and paste `supabase/.local/monthly-mark-deploy.ts` into the function editor, the same way it was first deployed.
4. **Merge the PR** so GitHub Pages publishes the updated exam pages.

## Rebuilding

- After changing the Primary exam page: run `node tools/build_primary_ai_catalog.cjs`, then run the new `supabase/catalog/primary-step2.sql`.
- After changing the ITP or iBT pages: run `node tools/build_monthly_ai_catalog.cjs` on the machine that has the source files.
- Tests: `node tools/test_monthly_marking.mjs` (it uses whichever catalogs are built).

## Notes

- Primary Step 2 students are children. The consent box says that the teacher has the school's and the parent's permission to send their work to Google Gemini. Make sure that is true before using it with a class.
- Marking runs while the exam page stays open after submission (about one task every 10-30 seconds). If a student closes the page early, opening the report page finishes the marking and sends the email.

## Section retakes

When a machine, microphone or audio problem spoils one section of a submitted Primary Step 2 or ITP test, the teacher can let the student retake just that section.

1. After submitting, the student goes to Request a Retake under Submit All & View Results, ticks the section that went wrong (and, for writing and speaking, the tasks), and presses Request a Retake. The page shows a request code.
2. On your own device, open the Teacher Page (`monthly-exams/retake.html`), enter the teacher password and press Show Retake Requests. Choose the request whose code matches the student's screen; the student's choice is already selected and can be changed. Press Approve Retake. The student's page then shows Start Retake; nothing is typed on the student's computer, and only that computer can take the retake. (Without a request, you can still find a test by name and create a code and link to open on the student's computer.)
For writing and speaking, untick the tasks that worked to retake only the broken ones; the other tasks keep their marks. Other sections are always retaken whole.
3. The retake is marked for that section (or those tasks) only. Its marks replace that section in the original report, which is emailed again with a note saying which section was retaken. The retake is not emailed on its own.

The code works once, for one student, one test and one section, expires after 48 hours, and is tied to the first computer that opens it. Codes are stored as hashes; for an approved request the function also keeps the code (in a table only it can read) so it can hand it to that student's page.

Setup (once): run `supabase/monthly-retake.sql`, add the function secret `RETAKE_TEACHER_SECRET` (the teacher password, at least 8 characters), and redeploy `monthly-mark`.

Tests: `node tools/test_monthly_retake.mjs` (after building the Primary catalog and the function bundle).

## Teacher Page: every report on your own device

Open `monthly-exams/retake.html` on your own device, enter the teacher password and press Show All Reports. Every submitted test is listed, newest first, with its scores, whether it has been approved and emailed, and red lines for anything that needs you: a missing or silent recording, marking that failed, a handwritten page not marked yet, a mark the AI was unsure about, or a retake request waiting for you. Tick Only tests that need me to hide the rest. Trial tests (a name starting with TRIAL, or a class containing "delete me") are left out.

Open Full Report shows the same full report the student sees, with the recordings. Under each writing and speaking task you can change the mark (quarter points allowed) and add a note for the student, then press Save Mark. Approve All and Email Report approves every remaining mark as it stands and emails the final report, marked [Approved]. The student's own report page shows your changed marks and notes. The emails are a copy for your records.

Started but not sent lists tests from the last two weeks that never reached the server as submitted: the student did not press Submit All, or never ticked the consent box. Only the student's computer has those answers.

The password stays in that browser tab only. After 10 wrong passwords from one address (or 100 in total) within an hour, the teacher pages refuse every password for the rest of that hour. Setup (once): run `supabase/monthly-teacher.sql`, then redeploy `monthly-mark`. Use a long teacher password (a short sentence is easy to remember and hard to guess); change it in Edge Functions, Secrets, `RETAKE_TEACHER_SECRET`.

## Setting up next month's tests

Do this a few days before the test, then do one trial run on each test.

1. **Replace the test content** in `monthly-exams/primary-step2/index.html`, `monthly-exams/junior/index.html` (ITP) and the five pages in `monthly-exams/ibt/`. Keep the element ids, `data-answer` names and the `record-panel` blocks the same, because the marking and the retake code rely on them.
2. **Give each test a new browser save key**, so last month's answers in a student's browser do not load into the new test:
   - Primary and ITP: change `"key"` in the `META={...}` line of each page (for example `primary-step2-monthly-2026-v1` to `primary-step2-monthly-2026-11`).
   - iBT: replace every `monthly-ibt-october-2026-v1` in the five iBT pages **and** in `monthly-exams/shared/exam-cloud.js` with the same new value (for example `monthly-ibt-november-2026-v1`). They must match, or iBT tests will never be sent.
3. **Bump the catalog version**: `version` at the top of `tools/build_primary_ai_catalog.cjs` and `tools/build_monthly_ai_catalog.cjs`.
4. **Rebuild the marking catalogs** (answer keys, explanations and task briefs the server marks against):
   - Primary: `node tools/build_primary_ai_catalog.cjs`, then run the new `supabase/catalog/primary-step2.sql` in the SQL editor.
   - ITP and iBT: `node tools/build_monthly_ai_catalog.cjs`. It reads source folders that are only on Reuben's Mac (`TOEFL_Junior_June_2026_Monthly_Test/`, `iBT 2026/Monthly Exams/`) and has the ITP task prompts written into it, so update those prompts too. The ITP Speaking Task 3 lesson facts are in `supabase/catalog/itp-speaking3-lesson.sql`.
   - Until the new catalog is in Supabase, the server marks against last month's answer key.
5. **If you changed anything in `monthly-exams/shared/`**, change the `?v=` value after that script's name in every page that loads it, so browsers fetch the new script.
6. **Run the tests**: `node tools/test_monthly_retake.mjs` (after building the Primary catalog and the function bundle).
7. **Trial run**: take each test once with the name `TRIAL` and class `Trial (delete me)`, record every speaking task, press Submit All, and check the email and the Teacher Page report.

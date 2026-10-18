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

1. After submitting, the student presses Request a Retake on their test page, which shows a request code.
2. On your own device, open `monthly-exams/retake.html`, enter the teacher password and press Show Retake Requests. Choose the request whose code matches the student's screen, pick the section, and press Approve Retake. The student's page then shows Start Retake; nothing is typed on the student's computer, and only that computer can take the retake. (Without a request, you can still find a test by name and create a code and link to open on the student's computer.)
For writing and speaking, untick the tasks that worked to retake only the broken ones; the other tasks keep their marks. Other sections are always retaken whole.
3. The retake is marked for that section (or those tasks) only. Its marks replace that section in the original report, which is emailed again with a note saying which section was retaken. The retake is not emailed on its own.

The code works once, for one student, one test and one section, expires after 48 hours, and is tied to the first computer that opens it. Codes are stored as hashes; for an approved request the function also keeps the code (in a table only it can read) so it can hand it to that student's page.

Setup (once): run `supabase/monthly-retake.sql`, add the function secret `RETAKE_TEACHER_SECRET` (the teacher password, at least 8 characters), and redeploy `monthly-mark`.

Tests: `node tools/test_monthly_retake.mjs` (after building the Primary catalog and the function bundle).

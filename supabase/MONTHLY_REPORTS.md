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

1. The student goes to Request a Retake under Submit All & View Results, ticks the section that went wrong (and, for writing and speaking, the tasks), and presses Request a Retake. The page shows a request code. This works after Submit All, and also before it for any section the student has already submitted (sections not yet submitted can still be changed by the student, so they are not offered).
2. On your own device, open `monthly-exams/retake.html`, enter the teacher password and press Show Retake Requests. Choose the request whose code matches the student's screen; the student's choice is already selected and can be changed. Press Approve Retake. The student's page then shows Start Retake; nothing is typed on the student's computer, and only that computer can take the retake. (Without a request, you can still find a test by name and create a code and link to open on the student's computer.)
For writing and speaking, untick the tasks that worked to retake only the broken ones; the other tasks keep their marks. Other sections are always retaken whole.
3. Before Submit All, Start Retake reopens that section (or those tasks) in the same test: its answers are cleared, a new recording replaces the old one, and the other sections stay as they are. The student submits the section again and then Submit All, and the whole test is marked and emailed once, as a normal test.
4. After Submit All, the retake is marked for that section (or those tasks) only. Its marks replace that section in the original report, which is emailed again with a note saying which section was retaken. The retake is not emailed on its own.

The code works once, for one student, one test and one section, expires after 48 hours, and is tied to the first computer that opens it. Codes are stored as hashes; for an approved request the function also keeps the code (in a table only it can read) so it can hand it to that student's page.

Setup (once): run `supabase/monthly-retake.sql`, add the function secret `RETAKE_TEACHER_SECRET` (the teacher password, at least 8 characters), and redeploy `monthly-mark`.

Tests: `node tools/test_monthly_retake.mjs` (after building the Primary catalog and the function bundle), and `node tools/test_retake_pages_browser.mjs` (the November pages and the teacher page in a browser; it needs the live catalogs saved as `supabase/.local/live-catalogs.json`).

## A new month's tests

Each month's pages get their own exam id, such as `itp-november-2026` (the form is `<primary-step2|itp|ibt>-<month>-<year>`), so earlier months keep their own answer keys. The server marks it at its level (Primary, ITP or iBT). A new page will not save or mark until its catalog is in Supabase. Nothing in the code is keyed to a month: retake sections and tasks come from the test's own catalog, the teacher page names the test and links to `<month>-<year>/<level>/index.html` from its exam id, and the stricter junior speaking marking is used whenever the catalog's speaking tasks use the junior rubrics (`juniorReadAloud`, `juniorNarration`, `juniorSchool`). So a new month needs its pages and its catalog, and no code change or new function deploy.

1. Give the page `data-cloud-exam="<exam id>"` on its `<html>` tag and the cloud script block (copy it from the November pages and change the exam id and consent key).
2. Copy `tools/build_november_ai_catalog.cjs`, point it at the new pages, and rewrite the picture descriptions, audio transcripts and video summary for the new media. Run it.
3. Run `supabase/monthly-november-2026.sql` once (already done for November), then the new `supabase/catalog/<month>.sql`.
4. Take a short test on each page and check the report email arrives.
5. Run `node tools/check_exam_pages.mjs` (GitHub also runs it every day and after every change to `monthly-exams`, and emails you if it fails). It lists any page that has no cloud saving code, or whose exam id has no marking on the server.

If a student opens a page whose exam id the server can't mark, the student is told to tell the teacher and you get an email headed "[Action needed] Test ... is not connected to marking" (at most once a day per test).

## When marking fails

Each writing or speaking task is tried with the Gemini models first, then the NVIDIA backup models. A model that sends back broken or empty JSON is skipped and the next one is asked. A model that has hit its daily limit is skipped for ten minutes.

If every model fails three times, the report is emailed with "[Check needed]" and a "Not marked yet" box giving the reason (for example "the free AI daily limit was used up"). The server check then keeps retrying that task after 30 minutes, 2, 6, 12 and 24 hours, and emails the full report again (subject ending "(marking completed)") once it is marked. Refresh Report on the report page retries straight away.

Optional function secrets: `NVIDIA_MARKING_MODEL` (comma-separated, tried in order; default `meta/llama-3.3-70b-instruct,nvidia/nemotron-3.5-super-vl-120b-a12b`), `NVIDIA_MAX_TOKENS` (default 8192), `NVIDIA_TIMEOUT_MS` (default 75000), `MARKING_BUDGET_MS` (time each request may spend on marking, default 115000, under the function's 150-second limit).

The lasting fix for the daily limit is a Gemini API key with billing turned on (Google AI Studio, Billing).

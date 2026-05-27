# Green Mountain TOEFL Platform

Local prototype and production foundation for the Green Mountain TOEFL Academy test platform.

## Contents

- `platform.html` - main student, teacher, and admin platform prototype
- `webapp/` - React + Vite + TypeScript production foundation
- `supabase/schema.sql` - production database, auth profile, and RLS schema
- `SECURITY_ROLLOUT.md` - security checklist before public rollout
- `emerald_hills.html` - English program introduction page
- `emerald_hills_simplified.html` - Chinese program introduction page
- `typing-game.html` and `typing-game_runner.html` - Typing Centre games
- TOEFL Junior reference HTML/PDF files used as design/content references

## Current Features

- Student, teacher, and admin roles
- Primary Step 1, Primary Step 2, Junior, TOEFL ITP Level 1, TOEFL ITP Level 2, and iBT class structure
- Independent student work platforms:
  - Class Exercises
  - Homework
  - Monthly Test
  - Mock Exams
- Teacher content builder with section-specific formal test blocks
- Flexible homework and exercise mode
- Generated answer sheets
- Student submissions and teacher scoring
- Monthly reviews with scores and performance graph
- Admin overview, student details, scoring overview, annotations, and messages
- Student/admin profile picture upload
- Student Typing Centre with student IDs

## Production Direction

The static prototype is not secure enough for real rollout because it uses browser storage for accounts and data. The production path is:

- React + Vite + TypeScript frontend in `webapp/`
- Supabase Auth for accounts
- Supabase Postgres for student records, exams, submissions, reviews, messages, timers, and typing scores
- Supabase Storage for uploads
- Row Level Security policies from `supabase/schema.sql`

Read `SECURITY_ROLLOUT.md` before deploying to real students.

## Run Locally

From this folder:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/platform.html
```

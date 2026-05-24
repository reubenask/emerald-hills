# Green Mountain TOEFL Platform

Local prototype for the Green Mountain TOEFL Academy test platform.

## Contents

- `platform.html` - main student, teacher, and admin platform prototype
- `emerald_hills.html` - English program introduction page
- `emerald_hills_simplified.html` - Chinese program introduction page
- TOEFL Junior reference HTML/PDF files used as design/content references

## Current Features

- Student, teacher, and admin roles
- Primary Step 1, Primary Step 2, Junior, ITP, and iBT class structure
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

## Run Locally

From this folder:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/platform.html
```

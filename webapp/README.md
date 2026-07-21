# Emerald Hills TOEFL Webapp

React + Vite + TypeScript migration shell for the Emerald Hills TOEFL Academy platform.

The current production-style prototype still lives at `../platform.html`. This app is the safe migration layer: it documents the modules, embeds the current HTML platform, and gives us typed React boundaries so the platform can move feature by feature without breaking the working demo.

## Stack

- React
- Vite
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Row Level Security

## Setup

```bash
npm install
npm run dev
```

The React app can open the current HTML platform through the “Current HTML Platform” view.

## Supabase Environment

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Until these are configured, the app still renders as a migration shell but does not make database calls.

## Migration Plan

1. Keep `../platform.html` live while React becomes the shell.
2. Define shared data contracts for accounts, students, assignments, submissions, scores, monthly reviews, lesson notes, files, messages, and audit logs.
3. Move authentication into Supabase Auth.
4. Move scores and reviews next because teacher, admin, and student views must share one source.
5. Move lesson notes and semester overview so the overview is generated from saved lesson notes.
6. Move assignments, exams, submissions, guest entrance testing, gallery, and typing progress.

## Build

```bash
npm run build
```

## Production Note

React improves maintainability, but it does not create real security by itself. Production launch still needs Supabase/Auth/Postgres/Storage or an equivalent backend, row-level security, backups, and audit logs.

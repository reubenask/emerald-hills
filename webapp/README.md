# Green Mountain TOEFL Webapp

Production foundation for the Green Mountain TOEFL Academy platform.

## Stack

- React
- Vite
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Row Level Security

## Setup

1. Install Node tooling with npm, pnpm, or yarn.
2. Create a Supabase project.
3. Run `../supabase/schema.sql` in the Supabase SQL editor.
4. Copy `.env.example` to `.env.local`.
5. Fill in:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

6. Install and run:

```bash
npm install
npm run dev
```

## Account Rules

- Public self-signup should create student accounts only.
- Teacher and admin accounts should be created by an existing admin or a protected Supabase Edge Function.
- The first admin should be created manually in Supabase or by a one-time protected script.

## Build

```bash
npm run build
```

## Important

The legacy `platform.html` remains useful for fast demo testing. Real production accounts, uploads, scoring, timers, and messages should be moved into this app and Supabase.

# Security Rollout Checklist

This repository now has two layers:

- `platform.html`: current static prototype for fast UI testing.
- `webapp/`: production foundation using React + Vite + TypeScript + Supabase.

Do not use the static prototype as the real school production system. It stores accounts and records in browser `localStorage`, which is acceptable for a demo but not secure for real students, teachers, parents, or payments.

## Required Before Public Rollout

1. Use Supabase Auth for login and signup.
2. Store all student, teacher, admin, assignment, submission, review, message, typing score, and timer data in Postgres.
3. Run `supabase/schema.sql` and confirm Row Level Security is enabled on every table.
4. Create the first admin from the Supabase dashboard or a protected server script. Do not allow public users to self-select admin role.
5. Create teacher/admin accounts through admin invitation or a protected Edge Function.
6. Move uploads into private Supabase Storage buckets:
   - `assignment-media`
   - `profile-images`
   - `speaking-recordings`
7. Use signed URLs for media files instead of exposing raw file data in the browser.
8. Remove browser-stored passwords completely.
9. Keep service-role keys only on a server or Supabase Edge Function, never in frontend code.
10. Add a Content Security Policy before production:
   - allow only the app domain, Supabase project domain, trusted font/CDN domains, and required media sources.
11. Validate file uploads:
   - type allowlist: images, audio, video, PDF
   - size limits by bucket
   - malware scanning if the school will accept files from many students
12. Add audit logs for admin deletion, teacher grading, and message sending.
13. Add backups and export policy for parent/student records.
14. Add privacy policy and consent text for student data and profile images.

## Current Prototype Risks Fixed By The New Foundation

- Plain passwords in browser storage
- Account records tied to one browser only
- Teacher/admin permissions enforced only by frontend logic
- Student IDs generated only locally
- Uploads stored as base64 in the browser
- Test timers resettable by clearing browser storage
- No centralized audit trail
- No reliable parent access across devices

## Recommended Production Stack

- Frontend: React + Vite + TypeScript
- Auth: Supabase Auth
- Database: Supabase Postgres
- File storage: Supabase Storage private buckets
- Authorization: Postgres Row Level Security
- Hosting: Vercel, Netlify, or Cloudflare Pages for the React app
- Domain: school-owned custom domain with HTTPS

GitHub Pages can host the static demo, but the production app should be deployed with environment variables and backend connectivity.

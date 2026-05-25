import { BookOpen, ClipboardCheck, Database, Gamepad2, LockKeyhole, ShieldCheck, Timer, UploadCloud, Users } from "lucide-react";
import { isSupabaseConfigured } from "./lib/supabase";
import type { TypingGame } from "./types";

const typingGames: TypingGame[] = [
  {
    title: "TYPE//VOID",
    file: "../typing-game.html",
    description: "Neon typing accuracy and speed practice."
  },
  {
    title: "RUNTYPE Sprint",
    file: "../typing-game_runner.html",
    description: "Runner-style sprint typing challenge."
  }
];

const securityItems = [
  {
    title: "Supabase Auth",
    body: "No production passwords in localStorage. Students, teachers, and admins authenticate through managed auth.",
    icon: LockKeyhole
  },
  {
    title: "Postgres + RLS",
    body: "Student data, assignments, submissions, reviews, and messages are protected by row-level policies.",
    icon: Database
  },
  {
    title: "Teacher Uploads",
    body: "Question files, audio, video, images, and PDFs move to private Storage buckets with signed access.",
    icon: UploadCloud
  },
  {
    title: "Timed Tests",
    body: "Monthly Tests and Mock Exams keep server-backed start times so students cannot reset timers locally.",
    icon: Timer
  }
];

const roleRules = [
  "Students can only see their own class work, typing centre, submissions, rankings, and reviews.",
  "Teachers can create work, review submissions, and write reviews, but cannot delete accounts.",
  "Admins can view the full school overview and delete student or teacher accounts.",
  "Uploads are stored outside the browser and linked to assignments with ownership records."
];

export default function App() {
  return (
    <main className="shell">
      <aside className="side">
        <div className="brand"><span>GM</span> TOEFL Academy</div>
        <nav>
          <a href="#security">Security</a>
          <a href="#roles">Roles</a>
          <a href="#typing">Typing Centre</a>
          <a href="#next">Next Build</a>
        </nav>
      </aside>

      <section className="content">
        <header className="hero">
          <p>Production Webapp Foundation</p>
          <h1>Green Mountain TOEFL Academy</h1>
          <span>
            React + Vite + TypeScript shell with Supabase Auth, Postgres, Storage, and row-level security ready for rollout.
          </span>
          {!isSupabaseConfigured && (
            <div className="notice">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to connect this app to your Supabase project.
            </div>
          )}
        </header>

        <section id="security" className="grid">
          {securityItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="card" key={item.title}>
                <Icon size={24} />
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            );
          })}
        </section>

        <section id="roles" className="panel">
          <div>
            <p className="eyebrow">Access Control</p>
            <h2>Role rules for rollout</h2>
          </div>
          <ul>
            {roleRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </section>

        <section className="grid">
          <article className="card">
            <Users size={24} />
            <h2>Student IDs</h2>
            <p>Student IDs are assigned on account creation and stored in the database, not just in a browser.</p>
          </article>
          <article className="card">
            <ClipboardCheck size={24} />
            <h2>Exam Builder</h2>
            <p>Guided templates remain: Junior, Primary, ITP, and iBT 2026 section structures map to database records.</p>
          </article>
          <article className="card">
            <BookOpen size={24} />
            <h2>Monthly Reviews</h2>
            <p>Scores, comments, performance graphs, and parent-facing reports are preserved as secure student records.</p>
          </article>
          <article className="card">
            <ShieldCheck size={24} />
            <h2>Admin Oversight</h2>
            <p>Admins can audit accounts, messages, submissions, and teacher feedback from one database-backed view.</p>
          </article>
        </section>

        <section id="typing" className="panel">
          <div>
            <p className="eyebrow">Open To All Students</p>
            <h2>Typing Centre</h2>
          </div>
          <div className="game-grid">
            {typingGames.map((game) => (
              <a className="game-card" href={game.file} key={game.file}>
                <Gamepad2 size={24} />
                <strong>{game.title}</strong>
                <span>{game.description}</span>
              </a>
            ))}
          </div>
        </section>

        <section id="next" className="panel">
          <div>
            <p className="eyebrow">Build Sequence</p>
            <h2>What comes next</h2>
          </div>
          <ol>
            <li>Create Supabase project and run `supabase/schema.sql`.</li>
            <li>Move login/signup to Supabase Auth.</li>
            <li>Move assignments, submissions, reviews, messages, and files into Postgres + Storage.</li>
            <li>Replace the static prototype screens with React routes one module at a time.</li>
          </ol>
        </section>
      </section>
    </main>
  );
}

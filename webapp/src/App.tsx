import { ArrowUpRight, BookOpen, ClipboardCheck, Database, FileText, Gamepad2, GraduationCap, LayoutDashboard, LockKeyhole, Route, ShieldCheck, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { dataEntities, migrationPhases, platformModules, typingGames } from "./data/migration";
import { isSupabaseConfigured } from "./lib/supabase";
import type { MigrationStatus, PlatformModule } from "./types";

type View = "overview" | "legacy" | "security" | "data" | "typing";

const views: Array<{ id: View; label: string }> = [
  { id: "overview", label: "Migration Overview" },
  { id: "legacy", label: "Current HTML Platform" },
  { id: "security", label: "Security Plan" },
  { id: "data", label: "Data Model" },
  { id: "typing", label: "Typing Centre" }
];

const statusLabels: Record<MigrationStatus, string> = {
  "live-html": "Live in HTML",
  "react-shell": "React shell",
  "ready-next": "Ready next",
  future: "Future"
};

const statusCopy: Record<MigrationStatus, string> = {
  "live-html": "Keep using this in platform.html while React catches up.",
  "react-shell": "Already represented in this React foundation.",
  "ready-next": "Best candidate to migrate after auth/data contracts.",
  future: "Move after the core records are stable."
};

function App() {
  const [activeView, setActiveView] = useState<View>("overview");
  const readyCount = useMemo(() => platformModules.filter((module) => module.status === "ready-next").length, []);

  return (
    <main className="shell">
      <aside className="side">
        <a className="brand" href="../platform.html" aria-label="Open current Emerald Hills platform">
          <span>EH</span>
          <strong>Emerald Hills</strong>
          <small>TOEFL Academy</small>
        </a>
        <nav aria-label="React migration views">
          {views.map((view) => (
            <button className={activeView === view.id ? "active" : ""} key={view.id} onClick={() => setActiveView(view.id)} type="button">
              {view.label}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <ShieldCheck size={18} />
          <span>{isSupabaseConfigured ? "Supabase env connected." : "Supabase env not connected yet."}</span>
        </div>
      </aside>

      <section className="content">
        {activeView === "overview" && <Overview readyCount={readyCount} />}
        {activeView === "legacy" && <LegacyBridge />}
        {activeView === "security" && <SecurityPlan />}
        {activeView === "data" && <DataModel />}
        {activeView === "typing" && <TypingCentre />}
      </section>
    </main>
  );
}

function Overview({ readyCount }: { readyCount: number }) {
  return (
    <>
      <header className="hero">
        <p>React Migration Shell</p>
        <h1>Move Emerald Hills carefully, one module at a time.</h1>
        <span>
          The current `platform.html` stays live. This React + Vite + TypeScript app becomes the maintainable structure around it, then replaces each module only after its data model is clear.
        </span>
        <div className="hero-actions">
          <a className="primary-link" href="../platform.html">
            Open current platform <ArrowUpRight size={18} />
          </a>
          <a className="secondary-link" href="#migration-modules">
            Review modules
          </a>
        </div>
      </header>

      <section className="metric-grid" aria-label="Migration status">
        <Metric icon={<LayoutDashboard />} label="Current platform" value="HTML live" />
        <Metric icon={<Route />} label="React modules ready next" value={String(readyCount)} />
        <Metric icon={<Database />} label="Data source target" value="Supabase" />
        <Metric icon={<LockKeyhole />} label="Security target" value="RLS + audit" />
      </section>

      <section className="panel" id="migration-modules">
        <div className="section-heading">
          <p className="eyebrow">Module Map</p>
          <h2>What moves into React</h2>
        </div>
        <div className="module-grid">
          {platformModules.map((module) => <ModuleCard key={module.id} module={module} />)}
        </div>
      </section>

      <section className="phase-grid">
        {migrationPhases.map((phase, index) => (
          <article className="card phase-card" key={phase.title}>
            <span className="phase-index">{index + 1}</span>
            <h2>{phase.title}</h2>
            <p>{phase.body}</p>
            <ul>
              {phase.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}

function LegacyBridge() {
  return (
    <>
      <header className="hero compact">
        <p>Current Platform Bridge</p>
        <h1>The HTML app remains available while React grows.</h1>
        <span>
          Use this embedded view for quick checks. If a browser blocks local iframe behavior, open the same platform directly.
        </span>
        <div className="hero-actions">
          <a className="primary-link" href="../platform.html">
            Open full HTML app <ArrowUpRight size={18} />
          </a>
        </div>
      </header>
      <section className="legacy-panel">
        <iframe className="legacy-frame" src="../platform.html" title="Current Emerald Hills HTML Platform" />
      </section>
    </>
  );
}

function SecurityPlan() {
  const securityItems = [
    {
      title: "Authentication",
      body: "Move signup/signin from browser-only records into Supabase Auth. Students self-sign up; teacher/admin accounts require admin approval.",
      icon: LockKeyhole
    },
    {
      title: "Database protection",
      body: "Use Postgres row-level security so students read only their own scores, reviews, submissions, messages, and rankings.",
      icon: Database
    },
    {
      title: "Private file storage",
      body: "Exam HTML, audio, video, images, PPTX, DOCX, PDFs, and profile pictures belong in Storage buckets with signed preview links.",
      icon: UploadCloud
    },
    {
      title: "Audit trail",
      body: "Every score edit, class shift, account deletion, review update, and admin annotation should record who changed what and when.",
      icon: ClipboardCheck
    }
  ];

  return (
    <>
      <header className="hero compact">
        <p>Security Plan</p>
        <h1>React improves structure, but real security needs a backend.</h1>
        <span>
          TypeScript helps us reduce code mistakes. Supabase Auth, Postgres, Storage, RLS, backups, and audit logs are what make the platform production-safe.
        </span>
      </header>
      <section className="grid">
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
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Frontend Reality Check</p>
          <h2>What React does and does not solve</h2>
        </div>
        <div className="split-list">
          <div>
            <h3>React helps with</h3>
            <ul>
              <li>Cleaner components instead of one very large HTML file.</li>
              <li>Typed data models for scores, reviews, lessons, and assignments.</li>
              <li>Shared views so teacher, admin, and student pages use the same source.</li>
            </ul>
          </div>
          <div>
            <h3>Backend still required for</h3>
            <ul>
              <li>Real passwords and protected roles.</li>
              <li>Cross-device data sync.</li>
              <li>Secure uploads, backups, and edit history.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function DataModel() {
  return (
    <>
      <header className="hero compact">
        <p>Shared Data Model</p>
        <h1>One source should feed every role.</h1>
        <span>
          The biggest current risk is duplicated display logic. These entities are the records React and Supabase should share across student, teacher, and admin screens.
        </span>
      </header>
      <section className="entity-grid">
        {dataEntities.map((entity) => (
          <article className="card entity-card" key={entity.name}>
            <Database size={22} />
            <h2>{entity.name}</h2>
            <p>{entity.purpose}</p>
            <div className="tag-row">
              {entity.examples.map((example) => <span key={example}>{example}</span>)}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function TypingCentre() {
  return (
    <>
      <header className="hero compact">
        <p>Typing Centre</p>
        <h1>Existing typing games stay available during migration.</h1>
        <span>
          These games can remain separate HTML files for now. Later, React can wrap them and store speed, accuracy, and practice history by student ID.
        </span>
      </header>
      <section className="game-grid">
        {typingGames.map((game) => (
          <a className="game-card" href={game.file} key={game.file}>
            <Gamepad2 size={28} />
            <strong>{game.title}</strong>
            <span>{game.description}</span>
            <em>Open game</em>
          </a>
        ))}
      </section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ModuleCard({ module }: { module: PlatformModule }) {
  const icon = module.owner === "student" ? <GraduationCap /> : module.owner === "teacher" ? <BookOpen /> : module.owner === "admin" ? <ShieldCheck /> : <FileText />;

  return (
    <article className="card module-card">
      {icon}
      <div>
        <h2>{module.title}</h2>
        <small>{module.zhTitle}</small>
      </div>
      <p>{module.description}</p>
      <div className="module-footer">
        <span className={`status-pill ${module.status}`}>{statusLabels[module.status]}</span>
        <a href={module.source}>Source <ArrowUpRight size={14} /></a>
      </div>
      <small className="status-note">{statusCopy[module.status]}</small>
    </article>
  );
}

export default App;

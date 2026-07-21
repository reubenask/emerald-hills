import type { DataEntity, MigrationPhase, PlatformModule, TypingGame } from "../types";

export const platformModules: PlatformModule[] = [
  {
    id: "auth",
    title: "Role-first authentication",
    zhTitle: "身份登录",
    owner: "shared",
    status: "ready-next",
    source: "../platform.html#roles",
    route: "/auth",
    description: "Student, teacher, and admin signup/login should be the first React feature because every other module depends on protected roles."
  },
  {
    id: "guest",
    title: "Guest entrance exams",
    zhTitle: "访客入学测试",
    owner: "public",
    status: "live-html",
    source: "../platform.html#guest",
    route: "/guest",
    description: "Entrance exam registration, level choice, uploaded exam files, and admin review stay live in the current HTML platform while we define data contracts."
  },
  {
    id: "student",
    title: "Student dashboard",
    zhTitle: "学生中心",
    owner: "student",
    status: "live-html",
    source: "../platform.html#student-login",
    route: "/student",
    description: "Student work platforms, results portal, monthly reviews, class ranking, typing centre, and messages."
  },
  {
    id: "teacher",
    title: "Teacher console",
    zhTitle: "教师管理中心",
    owner: "teacher",
    status: "live-html",
    source: "../platform.html#teacher-login",
    route: "/teacher",
    description: "Assignments, lesson notes, score entry, monthly reviews, submissions, and student records."
  },
  {
    id: "admin",
    title: "Admin oversight",
    zhTitle: "管理员总览",
    owner: "admin",
    status: "live-html",
    source: "../platform.html#admin-login",
    route: "/admin",
    description: "School-wide oversight for accounts, student movement, guest exams, score cards, teacher notes, and messages."
  },
  {
    id: "assignments",
    title: "Assignments and exams",
    zhTitle: "作业与考试",
    owner: "teacher",
    status: "ready-next",
    source: "../platform.html#teacher-login",
    route: "/teacher/work",
    description: "Homework, class exercises, monthly tests, and mock exams need one shared score/submission model before migration."
  },
  {
    id: "scores",
    title: "Scores and report cards",
    zhTitle: "成绩与报告卡",
    owner: "shared",
    status: "ready-next",
    source: "../platform.html#student-login",
    route: "/scores",
    description: "One score source must feed teacher records, admin records, student report cards, graphs, homework, exercises, tests, and mock exams."
  },
  {
    id: "lesson-notes",
    title: "Lesson notes and semester overview",
    zhTitle: "课堂记录与学期总览",
    owner: "teacher",
    status: "ready-next",
    source: "../platform.html#teacher-login",
    route: "/lessons",
    description: "Daily lesson notes should automatically generate semester overview rows, with teacher edits stored as overrides."
  },
  {
    id: "typing",
    title: "Typing Centre",
    zhTitle: "打字练习中心",
    owner: "shared",
    status: "react-shell",
    source: "../typing-game.html",
    route: "/typing-centre",
    description: "Typing games can be linked immediately, then later wrapped as React routes with student progress tracking."
  },
  {
    id: "gallery",
    title: "Gallery",
    zhTitle: "校园相册",
    owner: "public",
    status: "live-html",
    source: "../platform.html#gallery",
    route: "/gallery",
    description: "Public school photos and videos are admin-controlled and can move after storage is configured."
  }
];

export const migrationPhases: MigrationPhase[] = [
  {
    title: "Phase 1: React shell without disruption",
    body: "Keep the current HTML platform live and embed it from React while we carve out typed modules.",
    items: [
      "Create a branded React + Vite + TypeScript dashboard.",
      "Link directly to the current HTML platform for testing.",
      "Document every module and owner before moving logic."
    ]
  },
  {
    title: "Phase 2: Shared data contracts",
    body: "Define the records once so teacher, admin, student, and guest views all read the same source.",
    items: [
      "Profiles, students, classes, assignments, submissions, score entries, reviews, lesson notes, files, messages, and audit logs.",
      "Normalize homework, exercises, monthly tests, and mock exams.",
      "Make score cards compute from score entries instead of copied values."
    ]
  },
  {
    title: "Phase 3: Supabase-backed production data",
    body: "Move from browser-only storage into real auth, Postgres, storage buckets, and row-level security.",
    items: [
      "Use Supabase Auth for student, teacher, and admin accounts.",
      "Use Storage for exam HTML, audio, video, images, PDFs, PPTX, DOCX, and profile pictures.",
      "Record teacher/admin edits in audit logs."
    ]
  },
  {
    title: "Phase 4: Migrate one module at a time",
    body: "Replace the HTML screens gradually, starting with login and score records because they reduce the most duplication.",
    items: [
      "Authentication and account management.",
      "Score entry and report cards.",
      "Lesson notes and semester overview.",
      "Assignments, exams, submissions, and guest entrance testing."
    ]
  }
];

export const dataEntities: DataEntity[] = [
  {
    name: "profiles",
    purpose: "One account record for each student, teacher, admin, and guest contact.",
    examples: ["role", "email", "display name", "avatar", "created date"]
  },
  {
    name: "students",
    purpose: "Class placement and student ID that remain stable even when the class changes.",
    examples: ["EH-STU-2009", "Primary Step 2", "profile picture", "active status"]
  },
  {
    name: "assignments",
    purpose: "Teacher-created homework, class exercises, monthly tests, and mock exams.",
    examples: ["class", "section", "due date", "time limit", "attached files"]
  },
  {
    name: "submissions",
    purpose: "Student answers, uploaded work, autosave state, and review status.",
    examples: ["submitted at", "locked answers", "pending speaking/writing score", "feedback"]
  },
  {
    name: "score_entries",
    purpose: "The single score source for report cards, rankings, graphs, student records, and admin views.",
    examples: ["homework 8/10", "class exercise 100%", "monthly test listening 14/20"]
  },
  {
    name: "monthly_reviews",
    purpose: "One bilingual monthly review per student per month.",
    examples: ["strong areas", "currently improving", "weaknesses", "how we will improve"]
  },
  {
    name: "lesson_notes",
    purpose: "Daily class lesson records that also generate semester overview tables.",
    examples: ["date", "topic", "objective", "content", "homework", "student performance"]
  },
  {
    name: "audit_logs",
    purpose: "Evidence trail for score edits, account changes, student movement, and admin actions.",
    examples: ["who changed it", "old value", "new value", "timestamp"]
  }
];

export const typingGames: TypingGame[] = [
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

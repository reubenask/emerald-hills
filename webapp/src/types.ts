export type UserRole = "student" | "teacher" | "admin";

export type Program = "Primary" | "Junior" | "ITP" | "iBT";

export type WorkCategory = "Exercise" | "Homework" | "Monthly Test" | "Mock Exam";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  student_code: string;
  full_name: string;
  program: Program;
  class_name: string;
  profile_image_path: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  program: Program;
  class_name: string;
  category: WorkCategory;
  section: string;
  instructions: string;
  duration_minutes: number | null;
  answer_count: number;
  due_at: string | null;
}

export interface TypingGame {
  title: string;
  file: string;
  description: string;
}

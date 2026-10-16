// Marks a submitted monthly exam attempt.
// Objective sections are scored from the answer keys. Writing is marked by Gemini
// with the level-calibrated marking skill in ./skill.ts; speaking is transcribed
// first, then the transcript is marked the same way and delivery is scored from audio.
//
// POST { attempt_id: string, force?: boolean }  with the caller's Supabase JWT.
// Students may trigger marking of their own submitted attempt; teachers may
// re-mark any attempt with force:true. Teacher-edited marks are never replaced.
import { createClient } from "npm:@supabase/supabase-js@2";
import primaryKey from "./keys/primary-step2.json" with { type: "json" };
import itpKey from "./keys/itp.json" with { type: "json" };
import ibtKey from "./keys/ibt.json" with { type: "json" };
import primaryRubric from "./rubrics/primary-step2.json" with { type: "json" };
import itpRubric from "./rubrics/itp.json" with { type: "json" };
import ibtRubric from "./rubrics/ibt.json" with { type: "json" };
import { markObjective, type Note } from "./objective.ts";
import { markWithGemini } from "./ai.ts";
import { buildReport, sendReport } from "./report.ts";

const EXAMS: Record<string, { key: any; rubric: any }> = {
  "primary-step2": { key: primaryKey, rubric: primaryRubric },
  itp: { key: itpKey, rubric: itpRubric },
  ibt: { key: ibtKey, rubric: ibtRubric },
};
const RUBRIC_VERSION = "monthly-skill-2026-10-v2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

type Review = {
  attempt_id: string; section_key: string; task_key: string; rubric_version: string;
  score: number; max_score: number; feedback: Record<string, unknown>; source: "auto" | "ai";
  transcript?: string | null; reviewed_by: null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  const { attempt_id, force = false } = await req.json().catch(() => ({}));
  if (!attempt_id) return reply({ error: "attempt_id is required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // RLS decides visibility: the student who owns the attempt, or a teacher.
  const { data: attempt } = await caller.from("monthly_exam_attempts").select("*").eq("id", attempt_id).maybeSingle();
  if (!attempt) return reply({ error: "Attempt not found" }, 404);
  const { data: isTeacher } = await caller.rpc("monthly_is_teacher");
  if (attempt.status !== "submitted") return reply({ error: "Attempt is not submitted" }, 409);
  if (force && !isTeacher) return reply({ error: "Only teachers can re-mark" }, 403);
  if (["marking", "marked", "needs_teacher"].includes(attempt.marking_status) && !force)
    return reply({ attempt_id, marking_status: attempt.marking_status });
  const exam = EXAMS[attempt.exam_id];
  if (!exam) return reply({ error: "Unknown exam " + attempt.exam_id }, 400);

  await admin.from("monthly_exam_attempts").update({ marking_status: "marking" }).eq("id", attempt_id);
  try {
    const reviews: Review[] = [];
    const notes: Note[] = [];
    const add = (section: string, task: string, score: number, max: number, feedback: Record<string, unknown>,
      source: "auto" | "ai", transcript: string | null = null) =>
      reviews.push({ attempt_id, section_key: section, task_key: task, rubric_version: RUBRIC_VERSION,
        score, max_score: max, feedback, source, transcript, reviewed_by: null });

    markObjective(exam.key, attempt.response_state, add, notes);
    await markWithGemini(admin, attempt, exam.rubric, add, notes);

    // Keep any mark a teacher has already edited.
    const { data: teacherRows } = await admin.from("monthly_exam_reviews")
      .select("section_key,task_key").eq("attempt_id", attempt_id).eq("source", "teacher");
    const kept = new Set((teacherRows ?? []).map((r) => r.section_key + "/" + r.task_key));
    const rows = reviews.filter((r) => !kept.has(r.section_key + "/" + r.task_key));
    if (rows.length) {
      const { error } = await admin.from("monthly_exam_reviews").upsert(rows, { onConflict: "attempt_id,section_key,task_key" });
      if (error) throw error;
    }
    const marking_status = notes.length ? "needs_teacher" : "marked";

    // Report card from every mark on the attempt, teacher edits included, then email it.
    const { data: allReviews } = await admin.from("monthly_exam_reviews")
      .select("section_key,task_key,score,max_score,feedback,transcript").eq("attempt_id", attempt_id);
    const report = buildReport(attempt, allReviews ?? [], notes);
    let report_sent_to: string | null = null;
    try {
      report_sent_to = await sendReport(report.subject, report.html);
    } catch (err) {
      notes.push({ section: "-", task: "report-email", reason: err instanceof Error ? err.message : String(err) });
    }
    const now = new Date().toISOString();
    await admin.from("monthly_exam_reports").upsert({
      attempt_id, html: report.html, scores: report.scores, total: report.total, total_max: report.totalMax,
      sent_to: report_sent_to, sent_at: report_sent_to ? now : null, updated_at: now,
    });
    await admin.from("monthly_exam_attempts")
      .update({ marking_status, marking_notes: notes, marked_at: now }).eq("id", attempt_id);
    return reply({ attempt_id, marking_status, scores: report.scores, total: report.total,
      total_max: report.totalMax, report_sent_to, notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("monthly_exam_attempts")
      .update({ marking_status: "failed", marking_notes: [{ section: "-", task: "-", reason: message }] }).eq("id", attempt_id);
    return reply({ error: message }, 500);
  }
});

// Marks a submitted monthly exam attempt.
// Objective sections are scored from the answer keys; writing and speaking are
// transcribed and scored by Gemini against the rubrics in ./rubrics.
//
// POST { attempt_id: string, force?: boolean }  with the caller's Supabase JWT.
// Students may trigger marking of their own submitted attempt; teachers may
// re-mark any attempt with force:true. Teacher-edited marks are never replaced.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import primaryKey from "./keys/primary-step2.json" with { type: "json" };
import itpKey from "./keys/itp.json" with { type: "json" };
import ibtKey from "./keys/ibt.json" with { type: "json" };
import primaryRubric from "./rubrics/primary-step2.json" with { type: "json" };
import itpRubric from "./rubrics/itp.json" with { type: "json" };
import ibtRubric from "./rubrics/ibt.json" with { type: "json" };
import { type Add, markObjective, type Note } from "./objective.ts";

const EXAMS: Record<string, { key: any; rubric: any }> = {
  "primary-step2": { key: primaryKey, rubric: primaryRubric },
  itp: { key: itpKey, rubric: itpRubric },
  ibt: { key: ibtKey, rubric: ibtRubric },
};
const RUBRIC_VERSION = "monthly-2026-10-v1";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const AUDIO_BUCKET = "monthly-speaking";
const PLACEHOLDER = "TEACHER TO ADD";

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
    await admin.from("monthly_exam_attempts")
      .update({ marking_status, marking_notes: notes, marked_at: new Date().toISOString() }).eq("id", attempt_id);
    const { data: totals } = await admin.from("monthly_exam_totals").select("sections,total_score,total_max")
      .eq("attempt_id", attempt_id).single();
    return reply({ attempt_id, marking_status, ...totals, notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("monthly_exam_attempts")
      .update({ marking_status: "failed", marking_notes: [{ section: "-", task: "-", reason: message }] }).eq("id", attempt_id);
    return reply({ error: message }, 500);
  }
});

// ---------- Writing and speaking with Gemini ----------

async function markWithGemini(admin: SupabaseClient, attempt: any, rubric: any, add: Add, notes: Note[]) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const state = attempt.response_state ?? {};
  const answerFor = (task: any) =>
    rubric.exam_id === "ibt" ? state.sections?.[task.section]?.answers?.[task.answer] : state.answers?.[task.answer];

  // Recordings are uploaded as <student_id>/<attempt_id>/<clip>.<ext>
  const folder = `${attempt.student_id}/${attempt.id}`;
  const { data: files } = await admin.storage.from(AUDIO_BUCKET).list(folder);

  const jobs = rubric.tasks.map((task: any) => async () => {
    const criteria = typeof task.criteria === "string" || !task.criteria
      ? rubric.shared_criteria?.[task.criteria ?? task.kind] ?? []
      : task.criteria;
    const refMissing = typeof task.reference === "string" && task.reference.startsWith(PLACEHOLDER);

    if (task.kind === "sentences") {
      const sentences = task.items.map((word: string, i: number) => ({ word, sentence: state.answers?.[task.answer_prefix + i] ?? "" }));
      const result = await gemini([{ text: sentencesPrompt(rubric, task, sentences) }], SENTENCES_SCHEMA);
      const items = sentences.map((s: any, i: number) => {
        const r = result.items?.find((x: any) => x.index === i + 1);
        return { ...s, ok: Boolean(s.sentence.trim() && r?.ok), comment: r?.comment ?? "" };
      });
      add(task.section, task.task_key, items.filter((i: any) => i.ok).length, task.max_score,
        { items, model: GEMINI_MODEL }, "ai");
      return;
    }

    let parts: any[];
    let transcriptOf: string | null = null;
    if (task.kind === "writing") {
      const text = String(answerFor(task) ?? "").trim();
      if (!text) { add(task.section, task.task_key, 0, task.max_score, { comment: "No response" }, "ai"); return; }
      transcriptOf = text;
      parts = [{ text: rubricPrompt(rubric, task, criteria, "writing") + "\n\nSTUDENT RESPONSE:\n" + text }];
    } else {
      const file = files?.find((f) => f.name.split(".")[0] === task.clip);
      if (!file) { add(task.section, task.task_key, 0, task.max_score, { comment: "No recording" }, "ai"); return; }
      const { data: blob, error } = await admin.storage.from(AUDIO_BUCKET).download(`${folder}/${file.name}`);
      if (error || !blob) throw new Error("Could not download " + file.name);
      const mime = (blob.type || mimeFromName(file.name)).split(";")[0];
      parts = [
        { text: rubricPrompt(rubric, task, criteria, "speaking") },
        { inline_data: { mime_type: mime, data: encodeBase64(new Uint8Array(await blob.arrayBuffer())) } },
      ];
    }

    if (task.kind === "repeat" && refMissing) {
      // Without the target sentence a repeat cannot be scored; keep the transcript for the teacher.
      const t = await gemini([{ text: "Transcribe this student's recording verbatim. Return JSON." }, parts[1]], TRANSCRIPT_SCHEMA);
      notes.push({ section: task.section, task: task.task_key, reason: "Target sentence not in rubric yet", transcript: t.transcript });
      return;
    }
    const result = await gemini(parts, MARK_SCHEMA);
    const scored = criteria.map((c: any) => {
      const r = result.criteria?.find((x: any) => x.name === c.name);
      return { name: c.name, max: c.max, score: clamp(Math.round(Number(r?.score ?? 0)), 0, c.max), comment: r?.comment ?? "" };
    });
    const score = clamp(scored.reduce((s: number, c: any) => s + c.score, 0), 0, task.max_score);
    if (refMissing) notes.push({ section: task.section, task: task.task_key,
      reason: "Rubric reference not filled in; content was judged without it. Please check." });
    if (result.flags?.length) notes.push({ section: task.section, task: task.task_key, reason: result.flags.join("; ") });
    add(task.section, task.task_key, score, task.max_score,
      { criteria: scored, comment: result.feedback ?? "", model: GEMINI_MODEL }, "ai",
      task.kind === "writing" ? transcriptOf : result.transcript ?? null);
  });

  // A few at a time keeps within Gemini rate limits.
  for (let i = 0; i < jobs.length; i += 3) await Promise.all(jobs.slice(i, i + 3).map((j: () => Promise<void>) => j()));
}

// ---------- The marking skill: prompts ----------

const SYSTEM = `You are an experienced, fair ESL examiner marking a monthly test for a language school.
Mark only against the rubric you are given. Be consistent: the same response must always get the same marks.
Do not reward length for its own sake, and do not penalise accent if the words are understandable.
Judge young learners against their stated level, not native-speaker norms.
If a response is blank, silent, off-topic, in another language, or appears copied or read from a script where that is not allowed, give the marks the rubric says and add a short flag.
Feedback is for the student's teacher: two or three short sentences, specific, kind, and in plain English.`;

function rubricPrompt(rubric: any, task: any, criteria: any[], mode: "writing" | "speaking") {
  return [
    `EXAM: ${rubric.exam_id} (${rubric.level})`,
    `TASK: ${task.section} / ${task.task_key} (max ${task.max_score} points)`,
    task.prompt ? `TASK PROMPT GIVEN TO THE STUDENT: ${task.prompt}` : "",
    task.reference && !task.reference.startsWith(PLACEHOLDER) ? `REFERENCE: ${task.reference}` : "",
    "CRITERIA (score each criterion as a whole number from 0 to its max):",
    ...criteria.map((c) => `- ${c.name} (0-${c.max}): ${c.guide}`),
    mode === "speaking"
      ? "The attached audio is the student's recording. First write a verbatim transcript (include hesitations like 'um' and mark unclear words as [unclear]); then score from what you heard."
      : "The student's written response follows. Set transcript to an empty string.",
    "Return JSON only.",
  ].filter(Boolean).join("\n");
}

function sentencesPrompt(rubric: any, task: any, sentences: { word: string; sentence: string }[]) {
  return [
    `EXAM: ${rubric.exam_id} (${rubric.level})`,
    `TASK: ${task.prompt}`,
    `MARKING: ${task.guide}`,
    "SENTENCES:",
    ...sentences.map((s, i) => `${i + 1}. [${s.word}] ${s.sentence || "(blank)"}`),
    "For each numbered sentence return index, ok (true or false) and a short comment. Return JSON only.",
  ].join("\n");
}

const MARK_SCHEMA = {
  type: "OBJECT",
  properties: {
    transcript: { type: "STRING" },
    criteria: { type: "ARRAY", items: { type: "OBJECT", properties: {
      name: { type: "STRING" }, score: { type: "INTEGER" }, comment: { type: "STRING" } },
      required: ["name", "score", "comment"] } },
    feedback: { type: "STRING" },
    flags: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["transcript", "criteria", "feedback"],
};
const SENTENCES_SCHEMA = {
  type: "OBJECT",
  properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: {
    index: { type: "INTEGER" }, ok: { type: "BOOLEAN" }, comment: { type: "STRING" } },
    required: ["index", "ok", "comment"] } } },
  required: ["items"],
};
const TRANSCRIPT_SCHEMA = { type: "OBJECT", properties: { transcript: { type: "STRING" } }, required: ["transcript"] };

async function gemini(parts: any[], schema: unknown): Promise<any> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  try { return JSON.parse(text); } catch { throw new Error("Gemini returned non-JSON: " + text.slice(0, 200)); }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));
const mimeFromName = (name: string) =>
  ({ webm: "audio/webm", mp4: "audio/mp4", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", mp3: "audio/mpeg" } as Record<string, string>)[
    name.split(".").pop()!.toLowerCase()] ?? "audio/webm";

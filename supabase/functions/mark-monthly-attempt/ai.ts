// Writing and speaking marking with Gemini, using the marking skill in ./skill.ts.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import type { Add, Note } from "./objective.ts";
import { type Criterion, criteriaFor, DELIVERY, type Level, LEVELS, SYSTEM } from "./skill.ts";

export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const AUDIO_BUCKET = "monthly-speaking";
const PLACEHOLDER = "TEACHER TO ADD";

export async function markWithGemini(admin: SupabaseClient, attempt: any, rubric: any, add: Add, notes: Note[]) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const state = attempt.response_state ?? {};
  const level = rubric.level as Level;
  const answerFor = (task: any) =>
    rubric.exam_id === "ibt" ? state.sections?.[task.section]?.answers?.[task.answer] : state.answers?.[task.answer];

  // Recordings are uploaded as <student_id>/<attempt_id>/<clip>.<ext>
  const folder = `${attempt.student_id}/${attempt.id}`;
  const { data: files } = await admin.storage.from(AUDIO_BUCKET).list(folder);

  const jobs = rubric.tasks.map((task: any) => async () => {
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

    const speaking = task.kind !== "writing";
    const criteria = criteriaFor(level, task);
    const max = criteria.reduce((s, c) => s + c.max, 0) + (task.kind === "speaking" ? DELIVERY.max : 0);

    // Step 1: get the text. Writing is the student's own text; speaking is transcribed first.
    let text: string;
    let delivery: { score: number; comment: string } | null = null;
    if (!speaking) {
      text = String(answerFor(task) ?? "").trim();
      if (!text) { add(task.section, task.task_key, 0, max, { comment: "No response" }, "ai"); return; }
    } else {
      const file = files?.find((f) => f.name.split(".")[0] === task.clip);
      if (!file) { add(task.section, task.task_key, 0, max, { comment: "No recording" }, "ai"); return; }
      const { data: blob, error } = await admin.storage.from(AUDIO_BUCKET).download(`${folder}/${file.name}`);
      if (error || !blob) throw new Error("Could not download " + file.name);
      const audio = { inline_data: {
        mime_type: (blob.type || mimeFromName(file.name)).split(";")[0],
        data: encodeBase64(new Uint8Array(await blob.arrayBuffer())) } };
      const t = await gemini([{ text: transcribePrompt(level, task.kind === "speaking") }, audio],
        task.kind === "speaking" ? TRANSCRIBE_DELIVERY_SCHEMA : TRANSCRIPT_SCHEMA);
      text = String(t.transcript ?? "").trim();
      if (task.kind === "speaking")
        delivery = { score: clamp(Math.round(Number(t.delivery_score)), 0, DELIVERY.max), comment: t.delivery_comment ?? "" };
      if (!text) { add(task.section, task.task_key, 0, max, { comment: "Silent or unintelligible recording" }, "ai", ""); return; }
    }

    if (task.kind === "repeat" && task.reference.startsWith(PLACEHOLDER)) {
      // Without the target sentence a repeat cannot be scored; keep the transcript for the teacher.
      notes.push({ section: task.section, task: task.task_key, reason: "Target sentence not in rubric yet", transcript: text });
      return;
    }

    // Step 2: mark the text against the level-calibrated criteria.
    const result = await gemini([{ text: markPrompt(level, task, criteria, text, speaking) }], MARK_SCHEMA);
    const scored = criteria.map((c) => {
      const r = result.criteria?.find((x: any) => x.name === c.name);
      return { name: c.name, max: c.max, score: clamp(Math.round(Number(r?.score ?? 0)), 0, c.max), comment: r?.comment ?? "" };
    });
    if (delivery) scored.push({ name: DELIVERY.name, max: DELIVERY.max, ...delivery });
    const score = scored.reduce((s, c) => s + c.score, 0);
    if (result.flags?.length) notes.push({ section: task.section, task: task.task_key, reason: result.flags.join("; ") });
    add(task.section, task.task_key, score, max,
      { criteria: scored, comment: result.feedback ?? "", level, genre: task.genre ?? task.kind, model: GEMINI_MODEL },
      "ai", speaking ? text : null);
  });

  // A few at a time keeps within Gemini rate limits.
  for (let i = 0; i < jobs.length; i += 3) await Promise.all(jobs.slice(i, i + 3).map((j: () => Promise<void>) => j()));
}

// ---------- Prompts (the criteria themselves live in skill.ts) ----------

function transcribePrompt(level: Level, withDelivery: boolean) {
  return [
    `This is an ESL student's spoken answer (${LEVELS[level].label}).`,
    "Write a verbatim transcript of exactly what the student says. Keep their grammar mistakes; do not correct anything.",
    "Include fillers (um, uh), repetitions and self-corrections. Write [unclear] for words you cannot make out and [pause] for silences over three seconds.",
    withDelivery ? `Then score delivery from the audio only. ${DELIVERY.guide} Give delivery_score (0-${DELIVERY.max}) and a one-sentence delivery_comment.` : "",
    "Return JSON only.",
  ].filter(Boolean).join("\n");
}

function markPrompt(level: Level, task: any, criteria: Criterion[], text: string, spoken: boolean) {
  return [
    `LEVEL: ${LEVELS[level].label}. Judge against this level, not native-speaker norms.`,
    `TASK GIVEN TO THE STUDENT: ${task.prompt}`,
    task.reference ? `REFERENCE TEXT: ${task.reference}` : "",
    spoken
      ? "The response below is a verbatim transcript of speech. Fillers, repetitions and [pause] are normal in speech; judge structure, grammar, vocabulary, linking and logic from what was said, as a teacher marks a transcript."
      : "The response below is the student's writing.",
    "CRITERIA (score each as a whole number from 0 to its max):",
    ...criteria.map((c) => `- ${c.name} (0-${c.max}): ${c.guide}`),
    "",
    "STUDENT RESPONSE:",
    text,
    "",
    "Return JSON only.",
  ].filter((l) => l !== "").join("\n");
}

function sentencesPrompt(rubric: any, task: any, sentences: { word: string; sentence: string }[]) {
  return [
    `LEVEL: ${LEVELS[rubric.level as Level].label}`,
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
    criteria: { type: "ARRAY", items: { type: "OBJECT", properties: {
      name: { type: "STRING" }, score: { type: "INTEGER" }, comment: { type: "STRING" } },
      required: ["name", "score", "comment"] } },
    feedback: { type: "STRING" },
    flags: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["criteria", "feedback"],
};
const SENTENCES_SCHEMA = {
  type: "OBJECT",
  properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: {
    index: { type: "INTEGER" }, ok: { type: "BOOLEAN" }, comment: { type: "STRING" } },
    required: ["index", "ok", "comment"] } } },
  required: ["items"],
};
const TRANSCRIPT_SCHEMA = { type: "OBJECT", properties: { transcript: { type: "STRING" } }, required: ["transcript"] };
const TRANSCRIBE_DELIVERY_SCHEMA = {
  type: "OBJECT",
  properties: { transcript: { type: "STRING" }, delivery_score: { type: "INTEGER" }, delivery_comment: { type: "STRING" } },
  required: ["transcript", "delivery_score", "delivery_comment"],
};

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

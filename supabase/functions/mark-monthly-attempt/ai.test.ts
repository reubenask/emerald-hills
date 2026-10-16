import { assert, assertEquals } from "jsr:@std/assert@1";
import type { Note } from "./objective.ts";
import itpRubric from "./rubrics/itp.json" with { type: "json" };
import ibtRubric from "./rubrics/ibt.json" with { type: "json" };

Deno.env.set("GEMINI_API_KEY", "test");
const { markWithGemini } = await import("./ai.ts");

// Fake Gemini: transcribes every clip, gives 3/4 on every criterion, and records the prompts it saw.
const prompts: string[] = [];
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body));
  const parts = body.contents[0].parts;
  prompts.push(parts[0].text);
  const props = body.generationConfig.responseSchema.properties;
  let out: unknown;
  if (props.transcript) out = { transcript: "um I think the class should go to the museum because", delivery_score: 2, delivery_comment: "Some pauses." };
  else {
    const names = [...parts[0].text.matchAll(/^- (.+?) \(0-\d+\)/gm)].map((m) => m[1]);
    out = { criteria: names.map((name) => ({ name, score: 3, comment: "ok" })), feedback: "Good." };
  }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }));
}) as typeof fetch;

const clips = (names: string[]) => ({
  storage: { from: () => ({
    list: () => Promise.resolve({ data: names.map((n) => ({ name: n + ".webm" })) }),
    download: () => Promise.resolve({ data: new Blob(["abc"], { type: "audio/webm" }), error: null }),
  }) },
}) as any;

async function run(rubric: any, state: any, files: string[]) {
  const rows: Record<string, any> = {};
  const notes: Note[] = [];
  prompts.length = 0;
  await markWithGemini(clips(files), { id: "a", student_id: "s", response_state: state }, rubric,
    (section, task, score, max, feedback, _src, transcript) => { rows[section + "/" + task] = { score, max, feedback, transcript }; }, notes);
  return { rows, notes };
}

Deno.test("ITP: writing on 5 criteria, speaking transcribed then marked with delivery", async () => {
  const { rows } = await run(itpRubric, { answers: { email: "Dear Maria, ...", opinion: "" } }, ["speaking-1", "speaking-2", "speaking-3"]);
  assertEquals([rows["writing/task2-email"].score, rows["writing/task2-email"].max], [15, 20]);
  assertEquals(rows["writing/task3-opinion"].feedback.comment, "No response");
  assertEquals([rows["speaking/task2-picture-narration"].score, rows["speaking/task2-picture-narration"].max], [17, 24]);
  assertEquals(rows["speaking/task2-picture-narration"].transcript, "um I think the class should go to the museum because");
  assertEquals([rows["speaking/task1-read-aloud"].score, rows["speaking/task1-read-aloud"].max], [9, 12]);
  assert(prompts.some((p) => p.includes("TOEFL ITP") && p.includes("Required structure for Email")));
});

Deno.test("iBT: level descriptors differ, repeats without sentences go to the teacher, missing clips score 0", async () => {
  const { rows, notes } = await run(ibtRubric, { sections: { writing: { answers: { email: "Dear Ms. Carter", discussion: "I believe" } } } }, ["repeat-1", "interview-1"]);
  assert(prompts.some((p) => p.includes("academic English") && p.includes("Academic discussion post")));
  assertEquals(rows["speaking/repeat-1"], undefined);
  assertEquals(notes.find((n) => n.task === "repeat-1")?.transcript, "um I think the class should go to the museum because");
  assertEquals(rows["speaking/interview-2"].score, 0);
  assertEquals(rows["speaking/interview-1"].max, 24);
});

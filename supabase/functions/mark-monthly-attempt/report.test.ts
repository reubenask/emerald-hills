import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildReport } from "./report.ts";

Deno.test("report card totals sections and flags provisional results", () => {
  const r = buildReport({ exam_id: "itp", student_name: "Ana <B>", class_name: "ITP 1", submitted_at: "2026-10-16T02:00:00Z" }, [
    { section_key: "vocabulary", task_key: "objective", score: 40, max_score: 50, feedback: { wrong: ["v1"] } },
    { section_key: "writing", task_key: "task1-blanks", score: 8, max_score: 10, feedback: { wrong: [] } },
    { section_key: "writing", task_key: "task2-email", score: 15, max_score: 20,
      feedback: { criteria: [{ name: "Structure", score: 3, max: 4, comment: "No sign-off." }], comment: "Good." } },
    { section_key: "speaking", task_key: "task2-picture-narration", score: 18, max_score: 24, feedback: {}, transcript: "First Daniel..." },
  ], [{ section: "writing", task: "task1-blanks", reason: "key not confirmed" }]);
  assertEquals([r.total, r.totalMax], [81, 104]);
  assertEquals(r.scores, { vocabulary: 80, writing: 76.7, speaking: 75 });
  assert(r.provisional && r.subject.startsWith("[Check needed] Ana <B>"));
  assert(r.html.includes("Ana &lt;B&gt;") && r.html.includes("First Daniel...") && r.html.includes("No sign-off."));
});

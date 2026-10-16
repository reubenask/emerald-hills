import { assertEquals } from "jsr:@std/assert@1";
import { markObjective, type Note } from "./objective.ts";
import primaryKey from "./keys/primary-step2.json" with { type: "json" };
import itpKey from "./keys/itp.json" with { type: "json" };
import ibtKey from "./keys/ibt.json" with { type: "json" };

function run(key: any, state: any) {
  const rows: Record<string, [number, number]> = {};
  const notes: Note[] = [];
  markObjective(key, state, (s, t, score, max) => { rows[s + "/" + t] = [score, max]; }, notes);
  return { rows, notes };
}
const perfectBooklet = (key: any) => {
  const answers: Record<string, string> = {};
  for (const items of Object.values<any[]>(key.sections)) for (const q of items) answers[q.id] = q.key;
  for (const b of key.blanks?.items ?? []) answers[b.id] = b.answer;
  return { answers };
};

Deno.test("Primary Step 2: full marks and blank attempt", () => {
  assertEquals(run(primaryKey, perfectBooklet(primaryKey)).rows,
    { "reading/objective": [20, 20], "vocabulary/objective": [30, 30], "language/objective": [38, 38] });
  assertEquals(run(primaryKey, {}).rows["language/objective"], [0, 38]);
});

Deno.test("ITP: full marks including writing blanks, with unconfirmed keys flagged", () => {
  const { rows, notes } = run(itpKey, perfectBooklet(itpKey));
  assertEquals(rows, { "vocabulary/objective": [50, 50], "language/objective": [50, 50],
    "reading/objective": [15, 15], "writing/task1-blanks": [10, 10] });
  assertEquals(notes.length, 1);
});

Deno.test("iBT: full marks across section states", () => {
  const sec = (items: any[]) => ({ answers: Object.fromEntries(items.map((q) => [q.id, String(q.key)])) });
  const state = { sections: {
    vocabulary: sec(ibtKey.sections.vocabulary), reading: sec(ibtKey.sections.reading),
    writing: { orders: Object.fromEntries(ibtKey.arrangements.map((a: any) => [a.id, a.acceptedOrders[0]])) } } };
  assertEquals(run(ibtKey, state).rows,
    { "vocabulary/objective": [50, 50], "reading/objective": [20, 20], "writing/task1-build-sentence": [10, 10] });
  state.sections.vocabulary.answers.q1 = "2";
  assertEquals(run(ibtKey, state).rows["vocabulary/objective"], [49, 50]);
});

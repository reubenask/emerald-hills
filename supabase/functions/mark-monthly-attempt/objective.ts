// Scores the multiple-choice, dropdown and sentence-ordering items from the answer keys.

export type Note = { section: string; task: string; reason: string; transcript?: string };
export type Add = (section: string, task: string, score: number, max: number, feedback: Record<string, unknown>,
  source: "auto" | "ai", transcript?: string | null) => void;

export function markObjective(key: any, state: any, add: Add, notes: Note[]) {
  if (key.format === "booklet") {
    // Primary Step 2 and ITP: one state object; choices stored as the option index string.
    const answers = state?.answers ?? {};
    for (const [section, items] of Object.entries<any[]>(key.sections)) {
      const wrong = items.filter((q) => answers[q.id] !== q.key).map((q) => q.id);
      add(section, "objective", items.length - wrong.length, items.length, { wrong }, "auto");
    }
    if (key.blanks) {
      // ITP Writing Task 1: dropdowns store the option text.
      const items = key.blanks.items;
      const wrong = items.filter((b: any) => answers[b.id] !== b.answer).map((b: any) => b.id);
      add(key.blanks.section, key.blanks.task, items.length - wrong.length, items.length, { wrong }, "auto");
      const unconfirmed = items.filter((b: any) => b.confirm).map((b: any) => b.id);
      if (unconfirmed.length)
        notes.push({ section: key.blanks.section, task: key.blanks.task,
          reason: "Answer key not yet confirmed by a teacher for " + unconfirmed.join(", ") });
    }
    return;
  }
  // iBT: each section page keeps its own state under response_state.sections.
  const sections = state?.sections ?? {};
  for (const [section, items] of Object.entries<any[]>(key.sections)) {
    const answers = sections[section]?.answers ?? {};
    const wrong = items.filter((q) => answers[q.id] === undefined || Number(answers[q.id]) !== q.key).map((q) => q.id);
    add(section, "objective", items.length - wrong.length, items.length, { wrong }, "auto");
  }
  const orders = sections.writing?.orders ?? {};
  const wrong = key.arrangements.filter((a: any) =>
    !a.acceptedOrders.some((o: number[]) => JSON.stringify(orders[a.id]) === JSON.stringify(o))).map((a: any) => a.id);
  add("writing", "task1-build-sentence", key.arrangements.length - wrong.length, key.arrangements.length, { wrong }, "auto");
}

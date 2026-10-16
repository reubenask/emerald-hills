// Builds the report card for a marked attempt and emails it.
// Email goes through Resend (https://resend.com) when RESEND_API_KEY and
// REPORT_EMAIL_TO are set; otherwise the report is only saved on the attempt.
import type { Note } from "./objective.ts";

const EXAM_TITLES: Record<string, string> = {
  "primary-step2": "TOEFL Primary Step 2 Monthly Examination",
  itp: "TOEFL ITP Monthly Examination",
  ibt: "TOEFL iBT Monthly Examination",
};
const SECTION_ORDER = ["vocabulary", "language", "reading", "listening", "writing", "speaking"];
const SECTION_TITLES: Record<string, string> = {
  vocabulary: "Vocabulary", language: "Language Form and Meaning", reading: "Reading",
  listening: "Listening", writing: "Writing", speaking: "Speaking",
};

type Review = { section_key: string; task_key: string; score: number; max_score: number; feedback: any; transcript?: string | null };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pct = (score: number, max: number) => (max ? Math.round((score / max) * 1000) / 10 : 0);
const taskTitle = (key: string) => key.replace(/^task(\d+)-/, "Task $1 · ").replace(/-/g, " ");

export function buildReport(attempt: any, reviews: Review[], notes: Note[]) {
  const sections = SECTION_ORDER.filter((s) => reviews.some((r) => r.section_key === s)).map((s) => {
    const rows = reviews.filter((r) => r.section_key === s);
    const score = rows.reduce((a, r) => a + Number(r.score), 0), max = rows.reduce((a, r) => a + Number(r.max_score), 0);
    return { key: s, title: SECTION_TITLES[s] ?? s, rows, score, max, percent: pct(score, max) };
  });
  const total = sections.reduce((a, s) => a + s.score, 0), totalMax = sections.reduce((a, s) => a + s.max, 0);
  const provisional = notes.length > 0;
  const title = EXAM_TITLES[attempt.exam_id] ?? attempt.exam_id;
  const name = attempt.student_name || "Student";
  const subject = `${provisional ? "[Check needed] " : ""}${name} · ${attempt.class_name || ""} · ${title}: ${total}/${totalMax} (${pct(total, totalMax)}%)`;

  const detail = (r: Review) => {
    const crit = r.feedback?.criteria as any[] | undefined;
    const items = r.feedback?.items as any[] | undefined;
    return `<tr><td style="padding:6px 8px;vertical-align:top"><strong>${esc(taskTitle(r.task_key))}</strong></td>
<td style="padding:6px 8px;text-align:right;vertical-align:top;white-space:nowrap">${r.score} / ${r.max_score}</td>
<td style="padding:6px 8px;vertical-align:top">${
      crit ? crit.map((c) => `${esc(c.name)} ${c.score}/${c.max}: ${esc(c.comment)}`).join("<br>") : ""}${
      items ? items.map((i) => `${i.ok ? "✓" : "✗"} <em>${esc(i.word)}</em>: ${esc(i.sentence || "(blank)")}`).join("<br>") : ""}${
      r.feedback?.wrong?.length ? "Incorrect: " + esc(r.feedback.wrong.join(", ")) : ""}${
      r.feedback?.comment ? `<p style="margin:6px 0 0">${esc(r.feedback.comment)}</p>` : ""}${
      r.transcript ? `<p style="margin:6px 0 0;color:#555"><em>Transcript:</em> ${esc(r.transcript)}</p>` : ""}</td></tr>`;
  };

  const html = `<!doctype html><html><body style="margin:0;background:#f5f3ee;font-family:Georgia,serif;color:#1a2744">
<div style="max-width:720px;margin:0 auto;background:#fff;border-top:6px solid #ba9621">
<div style="background:#1a2744;color:#fff;padding:20px 24px"><div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase">Emerald Hills English Academy</div>
<h1 style="margin:6px 0 0;font-size:22px">Monthly Report Card</h1></div>
<div style="padding:20px 24px">
<p style="margin:0 0 4px"><strong>${esc(name)}</strong> · ${esc(attempt.class_name)}</p>
<p style="margin:0 0 16px;color:#555">${esc(title)} · submitted ${esc(String(attempt.submitted_at ?? "").slice(0, 10))}</p>
${provisional ? `<p style="background:#fff4e5;border-left:4px solid #ba9621;padding:10px 12px">Provisional: a teacher still needs to check ${notes.map((n) => esc(n.section + " " + taskTitle(n.task))).join(", ")}.</p>` : ""}
<table style="width:100%;border-collapse:collapse;margin:8px 0 20px">
<tr style="background:#1a2744;color:#fff"><th style="text-align:left;padding:8px">Section</th><th style="text-align:right;padding:8px">Score</th><th style="text-align:right;padding:8px">%</th></tr>
${sections.map((s) => `<tr style="border-bottom:1px solid #e5e1d8"><td style="padding:8px">${esc(s.title)}</td><td style="padding:8px;text-align:right">${s.score} / ${s.max}</td><td style="padding:8px;text-align:right">${s.percent}</td></tr>`).join("")}
<tr style="font-weight:bold;background:#f5f3ee"><td style="padding:8px">Total</td><td style="padding:8px;text-align:right">${total} / ${totalMax}</td><td style="padding:8px;text-align:right">${pct(total, totalMax)}</td></tr>
</table>
${sections.map((s) => `<h2 style="font-size:17px;border-bottom:2px solid #ba9621;padding-bottom:4px">${esc(s.title)}</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${s.rows.map(detail).join("")}</table>`).join("")}
</div></div></body></html>`;

  // Percentages per skill, in the shape the platform's monthly review uses.
  const scores = Object.fromEntries(sections.map((s) => [s.key, s.percent]));
  return { subject, html, scores, total, totalMax, provisional };
}

export async function sendReport(subject: string, html: string): Promise<string | null> {
  const key = Deno.env.get("RESEND_API_KEY"), to = Deno.env.get("REPORT_EMAIL_TO");
  if (!key || !to) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("REPORT_EMAIL_FROM") ?? "Emerald Hills Reports <onboarding@resend.dev>",
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject, html,
    }),
  });
  if (!res.ok) throw new Error(`Report email failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return to;
}

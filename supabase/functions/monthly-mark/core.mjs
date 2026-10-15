export const RUBRIC_VERSION = 'monthly-adult-practice-2026-10-v1';
export const RUBRIC_SOURCES = ['https://www.ets.org/content/dam/ets-org/pdfs/toefl/speaking-rubrics.pdf','https://www.ets.org/content/dam/ets-org/pdfs/toefl/writing-rubrics.pdf'];
export const RUBRICS = {
  writing: [['Task fulfilment', 3], ['Development and organisation', 3], ['Vocabulary', 2], ['Grammar and mechanics', 2]],
  speaking: [['Task fulfilment and development', 3], ['Delivery and intelligibility', 3], ['Vocabulary', 2], ['Grammar', 2]],
  readAloud: [['Reading accuracy', 5], ['Intelligibility', 3], ['Pacing and intonation', 2]],
  repeat: [['Repetition accuracy', 6], ['Intelligibility and delivery', 4]]
};
export const plain = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
export function objectiveReport(catalog, answers) {
  const result = catalog.objective.map(section => ({
    id: section.id, title: section.title,
    items: section.questions.map(q => {
      const supplied = answers[q.id];
      const selected = q.textAnswer ? String(supplied ?? '') : (supplied === '' || supplied == null ? null : Number(supplied));
      const correct = q.textAnswer ? selected === q.answer : Number.isInteger(selected) && selected === q.key;
      return { id: q.id, question: plain(q.text), options: q.options || [], selected: q.textAnswer ? selected || 'Not answered' : q.options[selected] ?? 'Not answered', answer: q.textAnswer ? q.answer : q.options[q.key], correct, explanation: q.explanation, score: correct ? 1 : 0, maxScore: 1 };
    })
  })).map(s => ({ ...s, score: s.items.reduce((n, q) => n + q.score, 0), maxScore: s.items.length }));
  if (catalog.arrangements) {
    const items = catalog.arrangements.map((q, i) => {
      const order = answers['arrangement-'+i];
      const valid = Array.isArray(order) && order.length === q.tokens.length && new Set(order).size === order.length && order.every(n => Number.isInteger(n) && n >= 0 && n < q.tokens.length);
      const correct = valid && q.acceptedOrders.some(a => a.every((v,j) => v === order[j]));
      return { id:'arrangement-'+i, question:q.context, selected:valid ? order.map(n => q.tokens[n]).join(' ') : 'Incomplete or invalid arrangement', answer:q.answer, correct, score:correct?1:0, maxScore:1, explanation:q.explanation || 'The sentence must use every supplied chunk once, with a complete subject and verb and correctly connected clauses. A valid order is: '+q.answer };
    });
    result.push({id:'writing',title:'Writing - Sentence Arrangement',items,score:items.reduce((n,q)=>n+q.score,0),maxScore:items.length});
  }
  return result;
}
export function validateAssessment(value, rubric, kind) {
  if (!value || !Array.isArray(value.categories) || value.categories.length !== rubric.length) throw Error('Invalid assessment categories');
  const categories = rubric.map(([name, max]) => {
    const c = value.categories.find(c => c.name === name);
    if (!c || !Number.isFinite(c.score) || c.score < 0 || c.score > max || typeof c.evidence !== 'string' || !c.evidence.trim()) throw Error('Invalid assessment evidence or score');
    return { name, score: c.score, maxScore: max, evidence: c.evidence.slice(0, 3000) };
  });
  if (!Array.isArray(value.corrections) || !Array.isArray(value.strengths) || !Array.isArray(value.improvements) || typeof value.improvedResponse !== 'string' || typeof value.needsTeacherReview !== 'boolean') throw Error('Incomplete assessment feedback');
  const corrections = value.corrections.map(c => {
    if (!c || ['original','corrected','reason'].some(k => typeof c[k] !== 'string')) throw Error('Invalid correction');
    return { original: c.original.slice(0, 3000), corrected: c.corrected.slice(0, 3000), reason: c.reason.slice(0, 3000), ...(typeof c.timestamp === 'string' ? { timestamp: c.timestamp.slice(0, 50) } : {}) };
  });
  return { categories, corrections, strengths: value.strengths.map(String).slice(0, 10), improvements: value.improvements.map(String).slice(0, 10), improvedResponse: value.improvedResponse.slice(0, 15000), needsTeacherReview: value.needsTeacherReview, score: categories.reduce((n,c) => n+c.score,0), maxScore: rubric.reduce((n,c) => n+c[1],0), kind, rubricVersion: RUBRIC_VERSION };
}
export function scorecard(catalog, objective, jobs) {
  const sections = catalog.sections.map(section => {
    const obj = objective.find(s => s.id === section.id);
    const tasks = jobs.filter(j => j.section === section.id);
    const pending = tasks.some(j => !['complete','missing'].includes(j.status));
    const score = (obj?.score || 0) + tasks.reduce((n,j) => n + (j.result?.score || 0), 0);
    const maxScore = (obj?.maxScore || 0) + tasks.reduce((n,j) => n + (j.result?.maxScore || 10), 0);
    return { id: section.id, title: section.title, score: pending ? null : score, maxScore, percentage: pending || !maxScore ? null : Math.round(score/maxScore*100), status: pending ? 'pending' : 'complete' };
  });
  const complete = sections.every(s => s.status === 'complete');
  return { sections, overall: complete ? Math.round(sections.reduce((n,s) => n+s.percentage,0)/sections.length) : null, maxOverall: 100, weighting: 'Each section contributes equally to the overall percentage. Task points are combined within each section.', complete, needsTeacherReview: jobs.some(j => j.result?.needsTeacherReview), disclaimer: 'AI-assisted classroom practice assessment, not an official ETS TOEFL score. AI transcription and grading can make mistakes; teacher review is available.' };
}

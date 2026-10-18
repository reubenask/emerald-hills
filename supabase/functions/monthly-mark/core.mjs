export const RUBRIC_VERSION = 'monthly-practice-2026-10-v2';
export const RUBRIC_SOURCES = ['https://www.ets.org/content/dam/ets-org/pdfs/toefl/speaking-rubrics.pdf','https://www.ets.org/content/dam/ets-org/pdfs/toefl/writing-rubrics.pdf'];
// Teacher-style criteria: structure, logic, grammar, vocabulary and linking words, plus delivery for speaking.
export const RUBRICS = {
  writing: [['Structure and task fulfilment', 3], ['Logic and development', 2], ['Grammar', 2], ['Vocabulary', 2], ['Linking words', 1]],
  speaking: [['Structure and task fulfilment', 2], ['Logic and development', 2], ['Grammar', 2], ['Vocabulary', 1], ['Linking words', 1], ['Delivery and intelligibility', 2]],
  sentences: [['Linking expressions used correctly', 6], ['Complete, grammatical sentences', 4]],
  readAloud: [['Reading accuracy', 5], ['Intelligibility', 3], ['Pacing and intonation', 2]],
  repeat: [['Repetition accuracy', 6], ['Intelligibility and delivery', 4]]
};
// What each level should be judged against. The same answer earns more at Primary than at iBT.
export const LEVEL_GUIDES = {
  'primary-step2': 'LEVEL: TOEFL Primary Step 2 young learners (CEFR A1-A2). Full credit means: simple sentences mostly correct, present and past simple used correctly, everyday and topic words, and, but, because, then, first, finally used to join ideas, ideas in a clear order. Expect childlike content; be encouraging and explain corrections in simple words a child can follow.',
  itp: 'LEVEL: TOEFL ITP / Junior preparation (CEFR A2-B2). Full credit means: a mix of simple and complex sentences with accurate tenses, articles and agreement; varied topic vocabulary; linkers such as however, therefore, for example, in addition, although used accurately; each point supported with a reason or example.',
  ibt: 'LEVEL: TOEFL iBT (CEFR B2-C1), academic English. Full credit means: a wide range of structures (complex sentences, conditionals, passives) with rare minor errors; precise academic vocabulary and appropriate register; natural, varied cohesion; a well-developed argument with explained reasons and specific examples.'
};
// The parts each task type needs; this is what "Structure" is judged on.
export const STRUCTURE_GUIDE = 'STRUCTURE: an email needs a greeting to the named person, an opening stating its purpose, every question or point answered with a reason, a closing line and a sign-off. An opinion paragraph needs a topic sentence with a clear opinion, two supported reasons, a specific example and a conclusion. An academic discussion post needs a clear stance, explained reasons, an example, and an idea beyond the classmates\' posts. A written or spoken story needs the characters, the events in order with sequencing words, and an ending. A spoken answer needs a direct answer, supporting points with details, and a closing sentence.';
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
  const linkingSuggestions = (Array.isArray(value.linkingSuggestions) ? value.linkingSuggestions : []).filter(l => l && ['original','better','reason'].every(k => typeof l[k] === 'string')).slice(0, 10).map(l => ({ original: l.original.slice(0, 1000), better: l.better.slice(0, 1000), reason: l.reason.slice(0, 1000) }));
  return { categories, corrections, linkingSuggestions, strengths: value.strengths.map(String).slice(0, 10), improvements: value.improvements.map(String).slice(0, 10), improvedResponse: value.improvedResponse.slice(0, 15000), needsTeacherReview: value.needsTeacherReview, score: categories.reduce((n,c) => n+c.score,0), maxScore: rubric.reduce((n,c) => n+c[1],0), kind, rubricVersion: RUBRIC_VERSION };
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

// A retake replaces one section of the original report: its objective marks and its writing or speaking tasks.
// Speaking jobs keep the path of the retake recording so the report can still play it.
export function mergeRetake(original, retake, section, retakeAttempt) {
  const jobs = original.jobs.map(j => {
    if (j.section !== section) return j;
    const r = retake.jobs.find(x => x.id === j.id);
    return r ? { ...r, ...(r.section === 'speaking' ? { recording: retakeAttempt.student_id + '/' + retakeAttempt.id + '/' + r.id } : {}), retaken: true } : j;
  });
  // A task-only retake has no objective part, so the section's objective marks stay as they were.
  const objective = original.objective.map(s => { const r = s.id === section && retake.objective.find(x => x.id === section); return r ? { ...r, retaken: true } : s; });
  const taken = [...(original.retake?.taken || []), { section, ...(retake.retake?.tasks ? { tasks: retake.retake.tasks } : {}), attempt: retakeAttempt.id, submittedAt: retakeAttempt.submitted_at }];
  return { jobs, objective, retake: { ...(original.retake || {}), taken } };
}
const ESC = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c] || c);
export const EXAM_TITLES = { 'primary-step2': 'TOEFL Primary Step 2', itp: 'TOEFL ITP', ibt: 'TOEFL iBT' };
// The emailed report card: score card, every wrong answer with the right one and why,
// and the writing and speaking feedback with corrections.
export function reportEmail(r) {
  const sc = r.scorecard, st = r.student || {}, name = st.name || st.studentName || 'Student', cls = st.className || st.studentClass || '', date = st.date || st.studentDate || '';
  const total = sc.sections.reduce((n, s) => n + (s.score ?? 0), 0), max = sc.sections.reduce((n, s) => n + s.maxScore, 0);
  // Speaking tasks with no usable recording are listed at the top, so a microphone problem is not missed.
  const checks = r.jobs.filter(j => j.section === 'speaking' && (j.status === 'missing' || (j.status === 'complete' && j.result?.score === 0 && !j.result?.categories?.length))).map(j => j.title + (j.status === 'missing' ? ': no recording' : ': no speech heard'));
  const subject = (sc.needsTeacherReview || !sc.complete || checks.length ? '[Check needed] ' : '') + name + (cls ? ' · ' + cls : '') + ' · ' + (EXAM_TITLES[r.exam] || r.exam) + ' Monthly: ' + (sc.overall ?? 'pending') + '%' + (r.retakes?.length ? ' (updated after ' + r.retakes.map(t => t.title).join(', ') + ' retake)' : '');
  const td = 'style="padding:6px 8px;border-bottom:1px solid #e5e1d8;vertical-align:top"';
  const wrong = r.objective.map(s => { const items = s.items.filter(q => !q.correct); return items.length ? '<h3 style="color:#092d24">' + esc(s.title) + ' · ' + s.score + ' / ' + s.maxScore + '</h3>' + items.map(q => '<p style="margin:0 0 10px"><b>' + esc(q.question) + '</b><br>Your answer: ' + esc(q.selected) + '<br>Correct answer: ' + esc(q.answer) + '<br><i>Why:</i> ' + esc(q.explanation) + '</p>').join('') : '<h3 style="color:#092d24">' + esc(s.title) + ' · ' + s.score + ' / ' + s.maxScore + ' · all correct</h3>'; }).join('');
  const tasks = r.jobs.map(j => { const a = j.result || {}; return '<div style="border-top:2px solid #dab977;margin-top:16px;padding-top:8px"><h3 style="margin:0;color:#092d24">' + esc(j.title) + ' · ' + (a.score ?? 'Pending') + ' / ' + (a.maxScore ?? '') + '</h3>' +
    (j.section === 'writing' ? '<p><b>What you wrote:</b></p><pre style="white-space:pre-wrap;background:#f5f3ee;padding:8px">' + esc(j.response || a.response || 'No response submitted.') + '</pre>' : '<p><b>Transcript of your recording:</b></p><pre style="white-space:pre-wrap;background:#f5f3ee;padding:8px">' + esc(a.transcript || 'No transcript.') + '</pre>') +
    (a.categories?.length ? '<table style="border-collapse:collapse;width:100%;font-size:14px">' + a.categories.map(c => '<tr><td ' + td + '>' + esc(c.name) + '</td><td ' + td + '>' + c.score + ' / ' + c.maxScore + (c.firstScore != null && c.firstScore !== c.score ? ' <span style="color:#555">(first mark ' + c.firstScore + ')</span>' : '') + '</td><td ' + td + '>' + esc(c.evidence) + '</td></tr>').join('') + '</table>' : '') +
    (a.moderation?.status === 'checked' ? '<p style="font-size:14px;color:#333"><b>Second check:</b> ' + (a.moderation.fair ? 'score confirmed as fair' : 'score adjusted from ' + a.moderation.firstScore + ' to ' + a.moderation.finalScore) + '. ' + esc(a.moderation.reason) + '</p>' : '') +
    (a.corrections?.length ? '<p><b>Mistakes and corrections:</b></p>' + a.corrections.map(c => '<p style="margin:0 0 8px">Original: ' + esc(c.original) + '<br>Correction: ' + esc(c.corrected) + '<br><i>' + esc(c.reason) + '</i></p>').join('') : '') +
    (a.linkingSuggestions?.length ? '<p><b>Linking words you could have used:</b></p>' + a.linkingSuggestions.map(l => '<p style="margin:0 0 8px">' + 'You wrote: ' + esc(l.original) + '<br>Better: ' + esc(l.better) + '<br><i>' + esc(l.reason) + '</i></p>').join('') : '') +
    (a.improvedResponse ? '<p><b>Corrected version:</b></p><pre style="white-space:pre-wrap;background:#eef5ef;padding:8px">' + esc(a.improvedResponse) + '</pre>' : '') +
    (j.status === 'error' ? '<p style="color:#9a3412">Marking could not complete; teacher review needed.</p>' : a.needsTeacherReview ? '<p style="color:#9a3412">Teacher review recommended.</p>' : '') + '</div>'; }).join('');
  const html = '<!doctype html><html><body style="margin:0;background:#f5f3ee;font:15px/1.55 Georgia,serif;color:#1a2744"><div style="max-width:760px;margin:0 auto;background:#fff">' +
    '<div style="background:#092d24;color:#e9efdf;padding:22px 24px;border-bottom:4px solid #dab977"><div style="letter-spacing:.2em;font-size:12px;color:#dab977">EMERALD HILLS · MONTHLY EXAMINATION</div><h1 style="margin:6px 0 0;font-weight:400;color:#dab977">EXAM REPORT CARD</h1>' +
    '<p style="margin:8px 0 0">' + esc(name) + (cls ? ' · ' + esc(cls) : '') + (date ? ' · ' + esc(date) : '') + ' · ' + esc(EXAM_TITLES[r.exam] || r.exam) + ' · submitted ' + esc(String(r.submittedAt || '').slice(0, 10)) + '</p></div><div style="padding:20px 24px">' +
    (checks.length ? '<p style="font-size:14px;border-left:4px solid #9a3412;padding:8px 12px;background:#fdf1ea;color:#9a3412"><b>Check needed:</b> ' + checks.map(esc).join('; ') + (r.exam === 'ibt' ? '' : '. The student can use Request a Retake for those tasks') + '.</p>' : '') +
    (r.retakes?.length ? '<p style="font-size:14px;border-left:4px solid #dab977;padding:8px 12px;background:#f5f3ee"><b>Section retake:</b> ' + r.retakes.map(t => esc(t.title) + ' was retaken' + (t.date ? ' on ' + esc(t.date) : '')).join('; ') + ', authorised by the teacher. The marks for that section come from the retake; all other sections are from the original test.</p>' : '') +
    '<table style="border-collapse:collapse;width:100%"><tr style="background:#092d24;color:#fff"><th style="text-align:left;padding:8px">Section</th><th style="text-align:right;padding:8px">Score</th><th style="text-align:right;padding:8px">%</th></tr>' +
    sc.sections.map(s => '<tr><td ' + td + '>' + esc(s.title) + '</td><td ' + td + ' align="right">' + (s.score ?? 'Pending') + ' / ' + s.maxScore + '</td><td ' + td + ' align="right">' + (s.percentage ?? '') + '</td></tr>').join('') +
    '<tr style="font-weight:bold;background:#f5f3ee"><td style="padding:8px">Overall</td><td style="padding:8px" align="right">' + total + ' / ' + max + '</td><td style="padding:8px" align="right">' + (sc.overall ?? 'Pending') + '</td></tr></table>' +
    '<p style="font-size:13px;color:#555">' + esc(sc.weighting) + ' ' + esc(sc.disclaimer) + '</p>' +
    '<p style="font-size:14px;color:#9a3412"><b>Status: awaiting teacher approval.</b> Writing and speaking were marked and then re-checked for fairness by AI; the teacher confirms or re-evaluates the final scores.</p>' +
    '<h2 style="color:#092d24;border-bottom:2px solid #dab977">Answers to Review</h2>' + wrong +
    '<h2 style="color:#092d24;border-bottom:2px solid #dab977">Writing and Speaking Feedback</h2>' + tasks + '</div></div></body></html>';
  return { subject, html };
}

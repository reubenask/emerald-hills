(function () {
  'use strict';
  const exam = document.documentElement.dataset.cloudExam;
  if (!['primary-step2', 'itp', 'ibt'].includes(exam)) return;
  const young = exam === 'primary-step2';
  // Set by the exam page when opened from a teacher's retake link.
  const retake = typeof RETAKE !== 'undefined' ? RETAKE : null;
  const key = 'monthly-cloud-attempt-' + exam + (retake ? '-retake-' + retake.code : ''), consentKey = young ? 'monthly-primary-ai-consent-v1' : 'monthly-adult-ai-consent-v1';
  const notice = document.createElement('section'); notice.className = 'student-form';
  notice.innerHTML = '<h3>Private Saving &amp; End-of-Test Report</h3><label style="display:flex;gap:12px;align-items:flex-start;font:inherit;text-transform:none;letter-spacing:normal"><input id="adultAIConsent" type="checkbox" style="width:auto;margin-top:5px"><span>'+'I have my parent or guardian\'s consent, or I am 18 or older, and I agree to my written answers and speaking recordings being processed by AI tools so my voice can be transcribed and my test marked. Transcripts, answer explanations and AI scores appear only after final submission.'+'</span></label><p id="cloudStatus" role="status">Your existing browser autosave remains on.</p><button type="button" id="cloudReport" class="btn btn-gold" hidden>Open Detailed Report</button>';
  document.querySelector('.student-form').after(notice);
  // A retake is checked with the server first; it fills in the original test's name, class and date.
  let retakeChecked = !retake;
  const retakeStatus = document.createElement('p'); retakeStatus.setAttribute('role','status'); retakeStatus.style.fontWeight = '600';
  if (retake) { notice.prepend(retakeStatus); retakeStatus.textContent = 'Checking your retake code...'; }
  async function checkRetake() {
    if (retakeChecked) return true;
    try {
      const r = await MonthlyCloud.call('retake-open', { code: retake.code, exam, section: retake.section });
      // iBT pages keep the details under the input ids.
      for (const [id, k] of [['studentName','name'],['studentClass','className'],['studentDate','date']]) { const sk = exam === 'ibt' ? id : k; if (!state.student[sk] && r.student?.[k]) { state.student[sk] = r.student[k]; document.getElementById(id).value = r.student[k]; } }
      // A task retake: the page enables only these tasks.
      if (r.allowed) retake.allowed = r.allowed;
      save(); render(); retakeChecked = true;
      retakeStatus.textContent = 'Retake for ' + (r.student?.name || 'this student') + ': ' + r.sectionTitle + (r.allowed ? ', ' + r.allowed.tasks.join(', ') + ' only' : ' only') + (exam === 'ibt' ? '. Complete it and submit the section.' : '. Complete it, submit the section, then press Submit All.') + ' Everything else keeps its original marks.';
      return true;
    } catch (e) { retakeStatus.textContent = 'Retake code problem: ' + e.message; return false; }
  }
  if (retake) checkRetake();
  const consent = notice.querySelector('input'), cloudStatus = notice.querySelector('#cloudStatus'), reportButton = notice.querySelector('button');
  // Repeat the sending status under the final submit button, where students look after submitting.
  const finalButton = document.querySelector('#finalSubmit, #submitAll') || (retake && document.querySelector('#results')), sendStatus = document.createElement('p');
  sendStatus.setAttribute('role','status'); sendStatus.style.fontWeight='600'; if (finalButton) finalButton.after(sendStatus);
  const status = { set textContent(t) { cloudStatus.textContent = t; if (snapshot().final) sendStatus.textContent = /Final submission saved|Marking/.test(t) ? t : 'Not sent to your teacher yet: ' + t; } };
  consent.checked = localStorage.getItem(consentKey) === 'yes';
  consent.addEventListener('change', () => { localStorage.setItem(consentKey, consent.checked ? 'yes' : 'no'); if (consent.checked) sync().catch(showError); });
  let record; try { record = JSON.parse(localStorage.getItem(key) || 'null'); } catch { record = null; }
  let syncing = false, finalising = false, last = '', clipVersions = new Map();
  const showError = e => { status.textContent = e.message || 'Cloud saving failed. Your browser autosave is unchanged.'; };
  function ibtStates() { const s = {}; for (const id of ['vocabulary','reading','writing','speaking']) { try { s[id] = JSON.parse(localStorage.getItem('monthly-ibt-october-2026-v1-'+id) || 'null'); } catch { s[id] = null; } } return s; }
  // iBT pages use studentName/studentClass/studentDate; send one shape to the server.
  function normal(st) { st = st || {}; const t = v => String(v || '').trim(); return { name: t(st.name || st.studentName), className: t(st.className || st.studentClass), date: t(st.date || st.studentDate) }; }
  function missingDetails() { const st = snapshot().student; return !st.name || !st.className || !st.date; }
  // An iBT retake page holds only its own section; the server keeps the other sections from the original test.
  function ibtRetakeSnapshot() {
    const id = retake.section, answers = {};
    if (id === 'vocabulary' || id === 'reading') for (const [q,value] of Object.entries(state.answers || {})) answers[id+'-'+q.replace(/^q/,'')] = value;
    if (id === 'writing') { for (const [q,value] of Object.entries(state.orders || {})) answers['arrangement-'+q.replace(/^s/,'')] = value; answers.email = state.answers?.email || ''; answers.discussion = state.answers?.discussion || ''; }
    return { student: normal(state.student), answers, submitted: Object.fromEntries(['vocabulary','reading','writing','speaking'].map(s => [s, s !== id || !!state.submitted])), final: !!state.submitted };
  }
  function snapshot() {
    if (exam === 'ibt' && retake) return ibtRetakeSnapshot();
    if (exam !== 'ibt') return { student: normal(state.student), answers: structuredClone(state.answers), submitted: Object.fromEntries(Object.entries(state.sections).map(([id,s]) => [id, !!s.submitted])), final: state.final };
    const s = ibtStates(), answers = {};
    for (const id of ['vocabulary','reading']) for (const [q,value] of Object.entries(s[id]?.answers || {})) answers[id+'-'+q.replace(/^q/,'')] = value;
    for (const [q,value] of Object.entries(s.writing?.orders || {})) answers['arrangement-'+q.replace(/^s/,'')] = value;
    answers.email = s.writing?.answers?.email || ''; answers.discussion = s.writing?.answers?.discussion || '';
    let released = false; try { const release = JSON.parse(localStorage.getItem('monthly-ibt-october-2026-v1-results') || 'null'); released = !!release && release.signature === JSON.stringify(['vocabulary','writing','reading','speaking'].map(id => s[id]?.submittedAt || s[id]?.submitted)); } catch {}
    let identity = {}; try { identity = JSON.parse(localStorage.getItem('monthly-ibt-october-2026-v1-identity') || '{}') || {}; } catch {}
    const student = normal(Object.assign({}, s.speaking?.student, s.reading?.student, s.vocabulary?.student, s.writing?.student, identity));
    return { student, answers, submitted: Object.fromEntries(Object.entries(s).map(([id,v]) => [id, !!v?.submitted])), final: released };
  }
  async function clips() {
    if (exam !== 'ibt') { await storageReady; return [...memoryClips].map(([id,blob]) => ({id:'speaking-'+id,blob})); }
    if (retake && retake.section !== 'speaking') return [];
    return new Promise((resolve,reject) => { const r = indexedDB.open(retake ? KEY + '-recordings' : 'monthly-ibt-october-2026-v1-speaking-recordings',1); r.onupgradeneeded=()=>r.result.createObjectStore('clips',{keyPath:'id'}); r.onsuccess=()=>{const d=r.result,q=d.transaction('clips').objectStore('clips').getAll();q.onsuccess=()=>{d.close();resolve(q.result)};q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error); });
  }
  function persist() { localStorage.setItem(key, JSON.stringify(record)); }
  async function sync() {
    if (!consent.checked || syncing || finalising) return;
    if (!(await checkRetake())) return;
    const data = snapshot();
    if (!data.final && !Object.values(data.submitted).some(Boolean) && !data.student?.name && !Object.keys(data.answers).length) return;
    if (record?.locked) {
      // A submitted test stays the same attempt; only a restarted (no longer final) test starts a new one.
      if (data.final) { reportButton.hidden=false; return; }
      record=null; last=''; clipVersions.clear(); localStorage.removeItem(key);
    }
    syncing=true;
    try {
      const serial=JSON.stringify(data);
      if (serial!==last || !record?.id) {
        const r=await MonthlyCloud.call('sync',{exam,attemptId:record?.id,...(retake?{retakeCode:retake.code}:{}),...(young?{consentConfirmed:true}:{adultConfirmed:true}),response:data});
        // Already submitted (for example restored by the teacher): stop re-sending instead of retrying uploads the server refuses.
        if (r.locked) { record={id:r.attemptId,locked:true,signature:serial}; persist(); status.textContent='Final submission saved. Your report is ready.'; reportButton.hidden=false; return; }
        record={id:r.attemptId,locked:false}; persist(); last=serial;
      }
      for (const c of await clips()) if (clipVersions.get(c.id)!==c.blob) { await MonthlyCloud.upload(record.id,c.id,c.blob); clipVersions.set(c.id,c.blob); }
      status.textContent='Browser and private cloud copies saved. Detailed results remain locked until final submission.';
      if(data.final)await finalise(data);
    } finally { syncing=false; }
  }
  async function finalise(data) {
    finalising=true;
    try {
      await MonthlyCloud.call('submit',{attemptId:record.id}); record.locked=true; record.signature=JSON.stringify(data); persist();
      status.textContent='Final submission saved. Marking your speaking and writing now; keep this page open.'; reportButton.hidden=false;
      markAll().catch(showError);
    } finally { finalising=false; }
  }
  // Mark every speaking and writing task straight after final submission, so the report
  // (and its email) is ready without the student opening the report page.
  let marking=false;
  async function markAll(){
    if(marking||!record?.locked)return; marking=true;
    try{
      for(let i=0;i<40;i++){
        const step=await MonthlyCloud.call('process',{attemptId:record.id});
        if(step.busy){await new Promise(r=>setTimeout(r,5000));continue;}
        if(!step.processed){status.textContent='Marking finished. Your report is ready.';return;}
        status.textContent='Marking your speaking and writing… ('+(i+1)+' done). Keep this page open.';
      }
    } finally { marking=false; }
  }
  // After submitting, a student can ask for a retake. The page shows a request code; the teacher approves it on their own
  // device, and this page then offers Start Retake. The teacher password is never typed on a student computer.
  const requestBox = document.createElement('div'); requestBox.hidden = true; requestBox.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid #d8d2c4';
  requestBox.innerHTML = '<h3 style="margin:0 0 8px">Request a Retake</h3><p role="status"></p><div></div><button type="button" class="btn btn-outline"></button>';
  const requestStatus = requestBox.querySelector('p'), requestChoices = requestBox.querySelector('div'), requestButton = requestBox.querySelector('button');
  // Sits under Submit All & View Results (and the results that appear there).
  // On iBT it sits on Start Here, under the final results.
  const requestPage = !retake && (exam !== 'ibt' || !!document.querySelector('#finalResults'));
  if (requestPage) (document.querySelector('#finalResults') || sendStatus).after(requestBox);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tickRow = (type, name, value, text, checked) => '<label style="display:flex;gap:10px;align-items:center;margin:6px 0;font:inherit;text-transform:none;letter-spacing:normal"><input type="' + type + '" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + ' style="width:auto;margin:0"> ' + esc(text) + '</label>';
  // The student ticks one section; writing and speaking also list their tasks, all ticked to start with.
  function showChoices(r) {
    requestChoices.innerHTML = '<p style="margin:8px 0 4px;font-weight:600">Which part went wrong?</p>' + r.sections.map(x => tickRow('radio', 'retakeSection', x.id, x.title, false)).join('') + '<div id="retakeTasks"></div>';
    const taskBox = requestChoices.querySelector('#retakeTasks');
    requestChoices.querySelectorAll('input[name="retakeSection"]').forEach(el => el.onchange = () => {
      const list = r.tasks.filter(t => t.section === el.value);
      taskBox.innerHTML = list.length ? '<p style="margin:10px 0 4px;font-weight:600">Which tasks? Untick the ones that worked.</p>' + list.map(t => tickRow('checkbox', 'retakeTask', t.id, t.title, true)).join('') : '';
      requestButton.disabled = false;
    });
    requestButton.disabled = true;
  }
  function showRequest(r) {
    requestChoices.innerHTML = ''; requestButton.disabled = false;
    if (r.status === 'approved') { requestStatus.textContent = 'Your teacher approved a retake of ' + r.sectionTitle + '.'; requestButton.hidden = false; requestButton.textContent = 'Start Retake'; requestButton.onclick = () => { const page = exam === 'ibt' ? { vocabulary: 'Vocabulary.html', reading: 'Reading.html', writing: 'Writing.html', speaking: 'Speaking.html' }[r.section] : location.pathname; location.href = page + '?retake=' + encodeURIComponent(r.code) + '&section=' + encodeURIComponent(r.section); }; }
    else if (r.status === 'pending') { requestStatus.textContent = 'Retake requested' + (r.asked ? ' for ' + r.asked : '') + '. Show this code to your teacher: ' + r.requestCode + '. This page updates when your teacher approves it.'; requestButton.hidden = true; }
    else { requestStatus.textContent = 'If a machine, microphone or sound problem spoiled part of your test, choose that part and ask your teacher for a retake.'; requestButton.hidden = false; requestButton.textContent = 'Request a Retake'; requestButton.onclick = askRetake; showChoices(r); }
  }
  async function askRetake() {
    const section = requestChoices.querySelector('input[name="retakeSection"]:checked')?.value, tasks = [...requestChoices.querySelectorAll('input[name="retakeTask"]:checked')].map(c => c.value);
    if (!section) { requestStatus.textContent = 'Choose the part of the test you want to retake.'; return; }
    if (requestChoices.querySelector('input[name="retakeTask"]') && !tasks.length) { requestStatus.textContent = 'Tick at least one task to retake.'; return; }
    requestButton.disabled = true;
    try { showRequest(await MonthlyCloud.call('retake-request', { attemptId: record.id, section, tasks })); } catch (e) { requestStatus.textContent = e.message; requestButton.disabled = false; }
  }
  let requestShown = '';
  async function checkRequest() {
    if (!requestPage) { requestBox.hidden = true; return; }
    requestBox.hidden = false;
    // Before submission the button is shown but disabled, so students know where to find it.
    if (!record?.locked || !snapshot().final) { requestShown = ''; requestChoices.innerHTML = ''; requestStatus.textContent = 'If a machine, microphone or sound problem spoils part of your test, you can ask your teacher for a retake here after you submit.'; requestButton.hidden = false; requestButton.textContent = 'Request a Retake'; requestButton.disabled = true; return; }
    try {
      const r = await MonthlyCloud.call('retake-request-status', { attemptId: record.id });
      // Redraw only when something changed, so the 15-second check never clears the student's ticks.
      const shown = r.status + (r.requestCode || '') + (r.code || '');
      if (shown !== requestShown) { requestShown = shown; showRequest(r); }
    } catch {}
  }
  setInterval(checkRequest, 15000); checkRequest();
  reportButton.onclick=()=>{if(record?.locked && snapshot().final)location.href='../report.html?exam='+exam+'&attempt='+encodeURIComponent(record.id);};
  // Preserve the established final confirmation and restart behaviour.
  if(typeof submitAll==='function') { const original=submitAll; window.submitAll=function(...args){ if(missingDetails()){ alert('Enter your name, class and date at the top of the page before you submit.'); status.textContent='Submission blocked: enter your name, class and date at the top of the page.'; return; } const r=original.apply(this,args); if(snapshot().final){ if(!consent.checked)status.textContent=(young?'To send this test for marking, tick the box above. Your browser submission is saved.':'To send this test for marking, tick the consent box above. Your browser submission is saved.');else sync().catch(showError); } return r; }; }
  setInterval(()=>{ if(!snapshot().final)reportButton.hidden=true; else if(!consent.checked)status.textContent='Tick the consent box at the top of the page to send your test.'; sync().catch(showError); },15000);
  window.addEventListener('pageshow',()=>sync().catch(showError));
  sync().catch(showError);
})();

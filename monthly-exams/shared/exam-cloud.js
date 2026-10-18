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
      for (const [id, k] of [['studentName','name'],['studentClass','className'],['studentDate','date']]) if (!state.student[k] && r.student?.[k]) { state.student[k] = r.student[k]; document.getElementById(id).value = r.student[k]; }
      // A task retake: the page enables only these tasks.
      if (r.allowed) retake.allowed = r.allowed;
      save(); render(); retakeChecked = true;
      retakeStatus.textContent = 'Retake for ' + (r.student?.name || 'this student') + ': ' + r.sectionTitle + (r.allowed ? ', ' + r.allowed.tasks.join(', ') + ' only' : ' only') + '. Complete it, submit the section, then press Submit All. Everything else keeps its original marks.';
      return true;
    } catch (e) { retakeStatus.textContent = 'Retake code problem: ' + e.message; return false; }
  }
  if (retake) checkRetake();
  const consent = notice.querySelector('input'), cloudStatus = notice.querySelector('#cloudStatus'), reportButton = notice.querySelector('button');
  // Repeat the sending status under the final submit button, where students look after submitting.
  const finalButton = document.querySelector('#finalSubmit, #submitAll'), sendStatus = document.createElement('p');
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
  function snapshot() {
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
    return new Promise((resolve,reject) => { const r = indexedDB.open('monthly-ibt-october-2026-v1-speaking-recordings',1); r.onupgradeneeded=()=>r.result.createObjectStore('clips',{keyPath:'id'}); r.onsuccess=()=>{const d=r.result,q=d.transaction('clips').objectStore('clips').getAll();q.onsuccess=()=>{d.close();resolve(q.result)};q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error); });
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
  const requestBox = document.createElement('div'); requestBox.hidden = true; requestBox.style.marginTop = '16px';
  requestBox.innerHTML = '<p role="status"></p><button type="button" class="btn btn-outline"></button>';
  const requestStatus = requestBox.querySelector('p'), requestButton = requestBox.querySelector('button');
  if (!retake && exam !== 'ibt') notice.append(requestBox);
  function showRequest(r) {
    if (r.status === 'approved') { requestStatus.textContent = 'Your teacher approved a retake of ' + r.sectionTitle + '.'; requestButton.hidden = false; requestButton.textContent = 'Start Retake'; requestButton.onclick = () => { location.href = location.pathname + '?retake=' + encodeURIComponent(r.code) + '&section=' + encodeURIComponent(r.section); }; }
    else if (r.status === 'pending') { requestStatus.textContent = 'Retake requested. Show this code to your teacher: ' + r.requestCode + '. This page updates when your teacher approves it.'; requestButton.hidden = true; }
    else { requestStatus.textContent = 'If a machine, microphone or sound problem spoiled part of your test, you can ask your teacher for a retake.'; requestButton.hidden = false; requestButton.textContent = 'Request a Retake'; requestButton.onclick = askRetake; }
  }
  async function askRetake() { requestButton.disabled = true; try { showRequest(await MonthlyCloud.call('retake-request', { attemptId: record.id })); } catch (e) { requestStatus.textContent = e.message; } finally { requestButton.disabled = false; } }
  async function checkRequest() {
    if (retake || exam === 'ibt' || !record?.locked || !snapshot().final) { requestBox.hidden = true; return; }
    requestBox.hidden = false;
    try { showRequest(await MonthlyCloud.call('retake-request-status', { attemptId: record.id })); } catch {}
  }
  setInterval(checkRequest, 15000); checkRequest();
  reportButton.onclick=()=>{if(record?.locked && snapshot().final)location.href='../report.html?exam='+exam+'&attempt='+encodeURIComponent(record.id);};
  // Preserve the established final confirmation and restart behaviour.
  if(typeof submitAll==='function') { const original=submitAll; window.submitAll=function(...args){ if(missingDetails()){ alert('Enter your name, class and date at the top of the page before you submit.'); status.textContent='Submission blocked: enter your name, class and date at the top of the page.'; return; } const r=original.apply(this,args); if(snapshot().final){ if(!consent.checked)status.textContent=(young?'To send this test for marking, tick the box above. Your browser submission is saved.':'To send this test for marking, tick the consent box above. Your browser submission is saved.');else sync().catch(showError); } return r; }; }
  setInterval(()=>{ if(!snapshot().final)reportButton.hidden=true; else if(!consent.checked)status.textContent='Tick the consent box at the top of the page to send your test.'; sync().catch(showError); },15000);
  window.addEventListener('pageshow',()=>sync().catch(showError));
  sync().catch(showError);
})();

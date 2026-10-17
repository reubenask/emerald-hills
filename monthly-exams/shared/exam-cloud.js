(function () {
  'use strict';
  const exam = document.documentElement.dataset.cloudExam;
  if (!['primary-step2', 'itp', 'ibt'].includes(exam)) return;
  const young = exam === 'primary-step2';
  const key = 'monthly-cloud-attempt-' + exam, consentKey = young ? 'monthly-primary-ai-consent-v1' : 'monthly-adult-ai-consent-v1';
  const notice = document.createElement('section'); notice.className = 'student-form';
  notice.innerHTML = '<h3>Private Saving &amp; End-of-Test Report</h3><label style="display:flex;gap:12px;align-items:flex-start;font:inherit;text-transform:none;letter-spacing:normal"><input id="adultAIConsent" type="checkbox" style="width:auto;margin-top:5px"><span>'+'I have my parent or guardian\'s consent, or I am 18 or older, and I agree to my written answers and speaking recordings being processed by AI tools so my voice can be transcribed and my test marked. Transcripts, answer explanations and AI scores appear only after final submission.'+'</span></label><p id="cloudStatus" role="status">Your existing browser autosave remains on.</p><button type="button" id="cloudReport" class="btn btn-gold" hidden>Open Detailed Report</button>';
  document.querySelector('.student-form').after(notice);
  const consent = notice.querySelector('input'), status = notice.querySelector('#cloudStatus'), reportButton = notice.querySelector('button');
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
        const r=await MonthlyCloud.call('sync',{exam,attemptId:record?.id,...(young?{consentConfirmed:true}:{adultConfirmed:true}),response:data});
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
  reportButton.onclick=()=>{if(record?.locked && snapshot().final)location.href='../report.html?exam='+exam+'&attempt='+encodeURIComponent(record.id);};
  // Preserve the established final confirmation and restart behaviour.
  if(typeof submitAll==='function') { const original=submitAll; window.submitAll=function(...args){ if(missingDetails()){ alert('Enter your name, class and date at the top of the page before you submit.'); status.textContent='Submission blocked: enter your name, class and date at the top of the page.'; return; } const r=original.apply(this,args); if(snapshot().final){ if(!consent.checked)status.textContent=(young?'To send this test for marking, tick the box above. Your browser submission is saved.':'To send this test for marking, tick the consent box above. Your browser submission is saved.');else sync().catch(showError); } return r; }; }
  setInterval(()=>{ if(!snapshot().final)reportButton.hidden=true; sync().catch(showError); },15000);
  window.addEventListener('pageshow',()=>sync().catch(showError));
  sync().catch(showError);
})();

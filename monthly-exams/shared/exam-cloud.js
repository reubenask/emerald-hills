(function () {
  'use strict';
  const exam = document.documentElement.dataset.cloudExam;
  if (!['itp', 'ibt'].includes(exam)) return;
  const key = 'monthly-cloud-attempt-' + exam, consentKey = 'monthly-adult-ai-consent-v1';
  const notice = document.createElement('section'); notice.className = 'student-form';
  notice.innerHTML = '<h3>Private Saving &amp; End-of-Test Report</h3><label style="display:flex;gap:12px;align-items:flex-start;font:inherit;text-transform:none;letter-spacing:normal"><input id="adultAIConsent" type="checkbox" style="width:auto;margin-top:5px"><span>I am 18 or older and agree to send my written responses and speaking recordings to private Supabase storage and Google Gemini for AI-assisted practice feedback. Transcripts, answer explanations and AI scores appear only after final submission.</span></label><p id="cloudStatus" role="status">Your existing browser autosave remains on.</p><button type="button" id="cloudReport" class="btn btn-gold" hidden>Open Detailed Report</button>';
  document.querySelector('.student-form').after(notice);
  const consent = notice.querySelector('input'), status = notice.querySelector('#cloudStatus'), reportButton = notice.querySelector('button');
  consent.checked = localStorage.getItem(consentKey) === 'yes';
  consent.addEventListener('change', () => { localStorage.setItem(consentKey, consent.checked ? 'yes' : 'no'); if (consent.checked) sync().catch(showError); });
  let record; try { record = JSON.parse(localStorage.getItem(key) || 'null'); } catch { record = null; }
  let syncing = false, finalising = false, last = '', clipVersions = new Map();
  const showError = e => { status.textContent = e.message || 'Cloud saving failed. Your browser autosave is unchanged.'; };
  function ibtStates() { const s = {}; for (const id of ['vocabulary','reading','writing','speaking']) { try { s[id] = JSON.parse(localStorage.getItem('monthly-ibt-october-2026-v1-'+id) || 'null'); } catch { s[id] = null; } } return s; }
  function snapshot() {
    if (exam === 'itp') return { student: structuredClone(state.student), answers: structuredClone(state.answers), submitted: Object.fromEntries(Object.entries(state.sections).map(([id,s]) => [id, !!s.submitted])), final: state.final };
    const s = ibtStates(), answers = {};
    for (const id of ['vocabulary','reading']) for (const [q,value] of Object.entries(s[id]?.answers || {})) answers[id+'-'+q.replace(/^q/,'')] = value;
    for (const [q,value] of Object.entries(s.writing?.orders || {})) answers['arrangement-'+q.replace(/^s/,'')] = value;
    answers.email = s.writing?.answers?.email || ''; answers.discussion = s.writing?.answers?.discussion || '';
    let released = false; try { const release = JSON.parse(localStorage.getItem('monthly-ibt-october-2026-v1-results') || 'null'); released = !!release && release.signature === JSON.stringify(['vocabulary','writing','reading','speaking'].map(id => s[id]?.submittedAt || s[id]?.submitted)); } catch {}
    let student = {}; try { student = JSON.parse(localStorage.getItem('monthly-ibt-student') || '{}'); } catch {}
    if (!student.name) student = s.writing?.student || s.vocabulary?.student || {};
    return { student, answers, submitted: Object.fromEntries(Object.entries(s).map(([id,v]) => [id, !!v?.submitted])), final: released };
  }
  async function clips() {
    if (exam === 'itp') { await storageReady; return [...memoryClips].map(([id,blob]) => ({id:'speaking-'+id,blob})); }
    return new Promise((resolve,reject) => { const r = indexedDB.open('monthly-ibt-october-2026-v1-speaking-recordings',1); r.onupgradeneeded=()=>r.result.createObjectStore('clips',{keyPath:'id'}); r.onsuccess=()=>{const d=r.result,q=d.transaction('clips').objectStore('clips').getAll();q.onsuccess=()=>{d.close();resolve(q.result)};q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error); });
  }
  function persist() { localStorage.setItem(key, JSON.stringify(record)); }
  async function sync() {
    if (!consent.checked || syncing || finalising) return;
    const data = snapshot();
    if (!data.final && !Object.values(data.submitted).some(Boolean) && !data.student?.name && !Object.keys(data.answers).length) return;
    if (record?.locked) {
      if (data.final && record.signature === JSON.stringify(data)) { reportButton.hidden=false; return; }
      record=null; last=''; clipVersions.clear(); localStorage.removeItem(key);
    }
    syncing=true;
    try {
      const serial=JSON.stringify(data);
      if (serial!==last || !record?.id) {
        const r=await MonthlyCloud.call('sync',{exam,attemptId:record?.id,adultConfirmed:true,response:data});
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
      status.textContent='Final submission saved. Open your report to view objective feedback and process speaking and writing.'; reportButton.hidden=false;
    } finally { finalising=false; }
  }
  reportButton.onclick=()=>{if(record?.locked && snapshot().final)location.href='../report.html?exam='+exam+'&attempt='+encodeURIComponent(record.id);};
  // Preserve the established final confirmation and restart behaviour.
  if(typeof submitAll==='function') { const original=submitAll; window.submitAll=function(...args){ const r=original.apply(this,args); if(snapshot().final){ if(!consent.checked)status.textContent='To request the detailed AI report, confirm the adult processing agreement above. Your browser submission is saved.';else sync().catch(showError); } return r; }; }
  setInterval(()=>{ if(!snapshot().final)reportButton.hidden=true; sync().catch(showError); },15000);
  window.addEventListener('pageshow',()=>sync().catch(showError));
  sync().catch(showError);
})();

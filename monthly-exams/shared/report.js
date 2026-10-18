(function(){
 'use strict';
 const $=id=>document.getElementById(id), params=new URLSearchParams(location.search), attemptId=params.get('attempt');
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let report,processing=false;
 // Teacher view: opened from the teacher page on the teacher's own device, with the password kept for this tab only.
 const teacher=params.get('teacher')==='1';let teacherSecret='';try{teacherSecret=sessionStorage.getItem('monthly-teacher-secret')||'';}catch{}
 const decided=a=>['approved','changed'].includes(a.teacherApproval);
 const teacherLine=a=>a.teacherApproval==='changed'?'<p class="notice teacher-note"><b>Teacher mark:</b> '+a.score+' / '+a.maxScore+(a.aiScore!=null?' (AI mark '+a.aiScore+')':'')+(a.teacherNote?'. '+safe(a.teacherNote):'')+'</p>':a.teacherApproval==='approved'?'<p class="notice teacher-note"><b>Approved by your teacher.</b>'+(a.teacherNote?' '+safe(a.teacherNote):'')+'</p>':'';
 const teacherForm=j=>{const a=j.result||{};return '<div class="teacher-box" data-job="'+safe(j.id)+'"><h4>Teacher</h4><label>Mark out of '+(a.maxScore||10)+' <input type="number" min="0" max="'+(a.maxScore||10)+'" step="0.25" value="'+(a.score??'')+'"></label><label>Note for the student (optional) <input type="text" maxlength="1000" value="'+safe(a.teacherNote||'')+'"></label><button type="button" class="gold">'+(decided(a)?'Update Mark':'Save Mark')+'</button> <span role="status">'+(decided(a)?(a.teacherApproval==='changed'?'Changed by you':'Approved by you'):'Not checked yet')+'</span></div>';};
 const list=a=>'<ul>'+(a||[]).map(s=>'<li>'+safe(s)+'</li>').join('')+'</ul>';
 function render(r){
  report=r;$('identity').textContent=({'primary-step2':'Primary Step 2',itp:'ITP',ibt:'iBT'}[r.exam]||r.exam)+' · '+(r.student?.name||'Student')+' · '+(r.student?.className||'')+(r.student?.date?' · '+r.student.date:'')+' · Submitted '+new Date(r.submittedAt).toLocaleString();
  const sc=r.scorecard;
  $('report').hidden=false;$('download').disabled=false;$('print').disabled=false;
  const errors=r.jobs.filter(j=>j.status==='error'),pending=r.jobs.filter(j=>j.status==='pending');
  $('retry').hidden=teacher||!errors.length;
  $('working').textContent=sc.complete?'Your practice report is ready.'+(sc.needsTeacherReview?' Some responses are flagged for teacher review.':''):errors.length?'Some AI marking requests could not complete. Objective feedback is available below; incomplete sections have no final score. Retry or ask your teacher to review.': 'Waiting for your results: '+r.jobs.filter(j=>['complete','missing'].includes(j.status)).length+' of '+r.jobs.length+' speaking/writing responses processed. Keep this page open.';
  const summary='<section class="panel"><h2>Score Card</h2><div class="scoregrid">'+sc.sections.map(s=>'<div class="score"><span>'+safe(s.title)+'</span><strong>'+(s.percentage===null?'Pending':s.percentage+'%')+'</strong><small>'+(s.score===null?'Awaiting marking':s.score+' / '+s.maxScore)+'</small></div>').join('')+'</div><p class="overall">Overall: '+(sc.overall===null?'Pending':sc.overall+' / 100')+'</p><p>'+safe(sc.weighting)+'</p><p class="notice">'+safe(sc.disclaimer)+'</p></section>';
  const objectives=r.objective.map(s=>'<section class="panel"><h2>'+safe(s.title)+' · '+s.score+' / '+s.maxScore+'</h2>'+s.items.map((q,i)=>'<article class="item '+(q.correct?'correct':'incorrect')+'"><h3>'+(i+1)+'. '+safe(q.question)+'</h3><p class="tag">'+(q.correct?'Correct':'Incorrect or unanswered')+'</p><p><b>Your answer:</b> '+safe(q.selected)+'</p><p><b>Correct answer:</b> '+safe(q.answer)+'</p><p><b>Why:</b> '+safe(q.explanation)+'</p></article>').join('')+'</section>').join('');
  const tasks=['writing','speaking'].map(section=>'<section class="panel"><h2>'+ (section==='writing'?'Writing':'Speaking')+' Feedback</h2>'+r.jobs.filter(j=>j.section===section).map(j=>{const a=j.result||{},audio=r.audio?.[j.id];return '<article class="item"><h3>'+safe(j.title)+' · '+(['complete','missing'].includes(j.status)?a.score+' / '+a.maxScore:'Pending')+'</h3><details open><summary>Task</summary><p>'+safe(j.prompt)+'</p>'+(j.target?'<p><b>Target text:</b> '+safe(j.target)+'</p>':'')+'</details>'+(audio?'<p>Your original recording:</p><audio controls preload="none" data-recording="'+safe(j.id)+'" src="'+safe(audio)+'"></audio>':'')+(j.section==='writing'?'<h4>Your Original Writing</h4><pre>'+safe(j.response||'No response submitted.')+'</pre>':'<h4>Machine Transcript — Your Recorded Words</h4><pre>'+safe(a.transcript??j.transcription?.transcript??(j.status==='missing'?'No recording submitted.':'Transcription is pending or unavailable.'))+'</pre>')+(j.status==='error'?'<p class="notice">'+safe(j.error)+'</p>':'')+(a.categories?'<h4>Rubric Breakdown</h4><table><thead><tr><th>Category</th><th>Score</th><th>Evidence</th></tr></thead><tbody>'+a.categories.map(c=>'<tr><td>'+safe(c.name)+'</td><td>'+c.score+' / '+c.maxScore+'</td><td>'+safe(c.evidence)+'</td></tr>').join('')+'</tbody></table>':'')+(a.corrections?.length?'<h4>Mistakes and Corrections</h4>'+a.corrections.map(c=>'<p><b>Original:</b> '+safe(c.original)+'<br><b>Suggested correction:</b> '+safe(c.corrected)+'<br><b>Why:</b> '+safe(c.reason)+(c.timestamp?' · '+safe(c.timestamp):'')+'</p>').join(''):'')+(a.linkingSuggestions?.length?'<h4>Linking Words You Could Have Used</h4>'+a.linkingSuggestions.map(l=>'<p><b>You wrote:</b> '+safe(l.original)+'<br><b>Better:</b> '+safe(l.better)+'<br><b>Why:</b> '+safe(l.reason)+'</p>').join(''):'')+(a.strengths?'<h4>Strengths</h4>'+list(a.strengths):'')+(a.improvements?'<h4>Next Steps</h4>'+list(a.improvements):'')+(a.improvedResponse?'<details open><summary>Corrected Version of Your Response</summary><pre>'+safe(a.improvedResponse)+'</pre></details>':'')+(a.needsTeacherReview&&!decided(a)?'<p class="notice">Teacher review recommended. AI feedback may be uncertain.</p>':'')+teacherLine(a)+(teacher&&j.status!=='pending'?teacherForm(j):'')+'</article>';}).join('')+'</section>').join('');
  $('report').innerHTML=summary+objectives+tasks;
  if(teacher){
   $('working').textContent=sc.approved?'Approved. The final report was emailed'+(r.emailedAt?' on '+new Date(r.emailedAt).toLocaleString():'')+'. You can still change a mark and approve again.':'Check each writing and speaking mark below. Change any mark you disagree with, then press Approve All and Email Report.';
   for(const box of document.querySelectorAll('.teacher-box')){const [score,note]=box.querySelectorAll('input'),button=box.querySelector('button'),status=box.querySelector('[role=status]');
    button.onclick=async()=>{button.disabled=true;status.textContent='Saving...';try{await MonthlyCloud.call('teacher-mark',{teacherSecret,attemptId,jobId:box.dataset.job,score:score.value,note:note.value});await load();}catch(e){status.textContent=e.message;button.disabled=false;}};}
  }
  return pending.length;
 }
 async function load(){const r=await MonthlyCloud.call(teacher?'teacher-report':'report',teacher?{teacherSecret,attemptId}:{attemptId});render(r);return r;}
 async function run(){if(processing)return;processing=true;$('refresh').disabled=true;try{let r=await load();while(!teacher&&r.jobs.some(j=>j.status==='pending')){const step=await MonthlyCloud.call('process',{attemptId});if(step.busy){$('working').textContent='Another request is processing this report. Refresh shortly to continue.';break;}r=await load();}}catch(e){$('working').textContent=e.message;}finally{processing=false;$('refresh').disabled=false;}}
 // Refresh sends only the unmarked tasks back for marking, then finishes them.
 const refresh=async()=>{if(processing)return;try{$('working').textContent='Checking for unmarked speaking and writing…';await MonthlyCloud.call('refresh',{attemptId});}catch(e){$('working').textContent=e.message;return;}await run();};
 $('refresh').onclick=refresh;$('retry').onclick=refresh;
 $('print').onclick=()=>window.print();
 $('download').onclick=async()=>{
  $('download').disabled=true;
  try{
   const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,.actions,#working,.teacher-box').forEach(e=>e.remove());
   for(const a of clone.querySelectorAll('audio')){const r=await fetch(a.src);if(!r.ok)throw Error('A recording could not be included. Refresh the report and try again.');const blob=await r.blob();a.src=await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob);});}
   const data=document.createElement('script');data.type='application/json';data.id='report-data';data.textContent=JSON.stringify(report).replace(/</g,'\\u003c');clone.querySelector('body').append(data);
   const blob=new Blob(['<!doctype html>'+clone.outerHTML],{type:'text/html'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(report.exam.toUpperCase()+' Monthly Report - '+(report.student?.name||'Student')).replace(/[^a-z0-9 .-]/gi,'')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }catch(e){$('working').textContent=e.message;}finally{$('download').disabled=false;}
 };
 if(teacher){
  $('refresh').hidden=true;document.querySelector('.actions a').href='retake.html';document.querySelector('.actions a').textContent='Back to Teacher Page';
  const approve=document.createElement('button');approve.className='gold';approve.textContent='Approve All and Email Report';$('refresh').after(approve);
  approve.onclick=async()=>{approve.disabled=true;$('working').textContent='Approving and emailing...';try{const r=await MonthlyCloud.call('teacher-approve',{teacherSecret,attemptId});await load();if(!r.emailed)$('working').textContent='Approved, but the email could not be sent. The server will try again.';}catch(e){$('working').textContent=e.message;}finally{approve.disabled=false;}};
  if(!teacherSecret){$('working').textContent='Open this report from the teacher page and enter the teacher password there.';return;}
 }
 if(!/^[0-9a-f-]{36}$/i.test(attemptId||'')){$('working').textContent='Open this report from your completed exam. No report is available before final submission.';return;}
 run();
})();

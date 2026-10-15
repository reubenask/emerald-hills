const {chromium}=require('/Users/reuben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'Trial Outputs/2026-10-15/AI Report UI Tests');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const {objectiveReport,scorecard,RUBRICS,validateAssessment}=await import('../supabase/functions/monthly-mark/core.mjs');
 const catalogs=require('../supabase/.local/monthly-ai-catalog.json');
 const b=await chromium.launch({executablePath:'/Users/reuben/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 try{
 for(const exam of ['itp','ibt']){
  const context=await b.newContext({acceptDownloads:true,viewport:{width:1200,height:900}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  const id='22222222-2222-4222-8222-222222222222',cat=catalogs[exam],answers={};
  for(const s of cat.objective)for(const q of s.questions)answers[q.id]=q.textAnswer?q.answer:String(q.key);
  if(cat.arrangements)cat.arrangements.forEach((q,i)=>answers['arrangement-'+i]=q.acceptedOrders[0]);
  answers[cat.objective[0].questions[0].id]='99';
  let fixture={attemptId:id,exam,student:{name:'SYNTHETIC UI TEST — NOT AI MARKED',className:'Adult test fixture'},submittedAt:'2026-10-15T09:00:00Z',objective:objectiveReport(cat,answers),jobs:cat.tasks.map(t=>({id:t.id,title:t.title,section:t.section,prompt:t.prompt,response:t.section==='writing'?'I has a idea. <img src=x onerror=alert(1)>':null,status:'complete',tries:1,result:{...validateAssessment({categories:RUBRICS[t.rubric].map(([name,max])=>({name,score:max/2,evidence:'Synthetic UI fixture evidence, not an AI judgement.'})),corrections:[{original:'I has a idea.',corrected:'I have an idea.',reason:'Use have with I and an before a vowel sound.'}],strengths:['Synthetic demonstration only.'],improvements:['Test feedback display.'],improvedResponse:'This is a mock feedback example for UI testing only.',needsTeacherReview:true},RUBRICS[t.rubric],t.section),...(t.section==='speaking'?{transcript:'I has a idea.'}:{})}})),audio:{}};
  fixture.scorecard=scorecard(cat,fixture.objective,fixture.jobs);
  const speakingId=cat.tasks.find(t=>t.section==='speaking').id;
  fixture.audio[speakingId]='http://127.0.0.1:8765/synthetic-test.wav';
  await p.route('**/synthetic-test.wav',r=>r.fulfill({status:200,contentType:'audio/wav',body:fs.readFileSync('/tmp/gemini-synthetic-capability-test.wav')}));
  await p.route('https://vknfagvmdirmpgtjlhjr.supabase.co/**',async route=>{
   const u=route.request().url();let value;
   if(u.includes('/auth/'))value={access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_in:3600,user:{id:'11111111-1111-4111-8111-111111111111'}};
   else if(u.includes('/storage/'))value={};
   else{const q=route.request().postDataJSON();value=q.action==='report'?fixture:q.action==='sync'?{attemptId:id}:q.action==='submit'?{submitted:true}:{};}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value),headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await p.goto('http://127.0.0.1:8765/'+(exam==='itp'?'junior/index.html':'ibt/Start%20Here.html'));
  assert(await p.locator('#cloudReport').isHidden());assert.equal(await p.locator('text=Machine Transcript').count(),0);
  await p.locator('#adultAIConsent').check();
  if(exam==='itp')await p.evaluate(()=>{state.student={name:'Synthetic Adult'};for(const s of Object.values(state.sections))s.submitted=true;save();render();});
  else await p.evaluate(()=>{for(const id of ['vocabulary','reading','writing','speaking'])localStorage.setItem('monthly-ibt-october-2026-v1-'+id,JSON.stringify({student:{name:'Synthetic Adult'},answers:{},orders:{},submitted:true,submittedAt:Date.now()}));renderOverview();});
  await p.locator(exam==='itp'?'#finalSubmit':'#submitAll').click();await p.waitForFunction(()=>!document.getElementById('cloudReport').hidden);
  await p.locator('#cloudReport').click();await p.waitForSelector('#report:not([hidden])');
  const reportText=await p.locator('#report').innerText();assert(reportText.includes('Correct answer:'));assert(reportText.includes('Machine Transcript'));assert(reportText.includes('I have an idea.'));assert.equal(await p.locator('#report img').count(),0);
  assert.equal(await p.locator('#report .incorrect').count(),1);
  await p.screenshot({path:path.join(out,exam+'-report.png'),fullPage:true});
  await p.locator('#report > .panel').first().screenshot({path:path.join(out,exam+'-scorecard.png')});
  await p.locator('#report > .panel').filter({has:p.getByRole('heading',{name:'Speaking Feedback',exact:true})}).locator('.item').first().screenshot({path:path.join(out,exam+'-speaking-feedback.png')});
  const [download]=await Promise.all([p.waitForEvent('download'),p.locator('#download').click()]);await download.saveAs(path.join(out,exam+'-SYNTHETIC-UI-report.html'));
  const exported=fs.readFileSync(path.join(out,exam+'-SYNTHETIC-UI-report.html'),'utf8');assert(exported.includes('src="data:audio/wav;base64,'));
  await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log(exam+': final-only report, original writing, transcript, corrections, safe rendering, wrong-answer explanations, download and mobile layout pass (mock provider only).');
  await context.close();
 }
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {objectiveReport,scorecard,validateAssessment,RUBRICS} from '../supabase/functions/monthly-mark/core.mjs';
const local=name=>{const u=new URL('../supabase/.local/'+name,import.meta.url);return fs.existsSync(u)?JSON.parse(fs.readFileSync(u)):{};};
// ITP and iBT catalogs are built on the teacher's machine; Primary is built from this repo.
const catalogs={...local('monthly-ai-catalog.json'),...local('monthly-ai-catalog-primary.json')};
for(const catalog of Object.values(catalogs)){
 const answers={};for(const s of catalog.objective)for(const q of s.questions)answers[q.id]=q.textAnswer?q.answer:String(q.key);
 if(catalog.arrangements)catalog.arrangements.forEach((q,i)=>answers['arrangement-'+i]=q.acceptedOrders[0]);
 const marked=objectiveReport(catalog,answers);assert(marked.every(s=>s.score===s.maxScore));assert(marked.every(s=>s.items.every(q=>q.explanation?.trim())));
 assert(objectiveReport(catalog,{}).every(s=>s.score===0));
 if(catalog.arrangements){answers['arrangement-0']=[1,1,1,1];assert.equal(objectiveReport(catalog,answers).find(s=>s.id==='writing').score,9);}
 const jobs=catalog.tasks.map(t=>({id:t.id,section:t.section,status:'complete',result:{score:10,maxScore:10}}));
 const card=scorecard(catalog,marked,jobs);assert.equal(card.overall,100);jobs[0].status='error';assert.equal(scorecard(catalog,marked,jobs).overall,null);
 console.log(catalog.id+': all correct, all blank, explanations, section weighting, and pending/error score gating pass.');
}
const good={categories:RUBRICS.writing.map(([name,max])=>({name,score:max,evidence:'Specific submitted text evidence.'})),corrections:[],strengths:['Clear task response.'],improvements:[],improvedResponse:'An example.',needsTeacherReview:false};
assert.equal(validateAssessment(good,RUBRICS.writing,'writing').score,10);
assert.throws(()=>validateAssessment({...good,categories:[{name:'Task fulfilment',score:999,evidence:'x'}]},RUBRICS.writing,'writing'));
assert.throws(()=>validateAssessment({...good,corrections:[{}]},RUBRICS.writing,'writing'));
assert.throws(()=>validateAssessment({...good,categories:good.categories.map(c=>({...c,evidence:''}))},RUBRICS.writing,'writing'));
console.log('AI response validation rejects out-of-range scores, absent evidence and malformed corrections.');
let handler, mode='draft',providerFail=true,report;const emails=[];
const uid='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const fnExam=catalogs.ibt?'ibt':'primary-step2',cat=structuredClone(catalogs[fnExam]);cat.tasks=cat.tasks.slice(0,1);
const attempt={id,student_id:uid,exam_id:fnExam,status:'draft',response_state:{student:{name:'Synthetic Student'},answers:{[cat.tasks[0].answerId]:'Hello, please correct my booking.'},submitted:Object.fromEntries(cat.sections.map(s=>[s.id,true])),final:false}};
const reply=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const fetchMock=async(url,options={})=>{
 if(url.endsWith('/auth/v1/user'))return options.headers.Authorization==='Bearer valid'?reply({id:uid}):new Response('{}',{status:401});
 if(url==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return reply({id:'email'});}
 if(url.includes('generativelanguage.googleapis.com'))return providerFail?new Response('{}',{status:503}):reply({output_text:JSON.stringify(good)});
 if(url.includes('/rest/v1/monthly_ai_catalog'))return reply([{content:cat}]);
 if(url.includes('/rest/v1/monthly_exam_attempts?id=')){
  if(mode==='other')return reply([]);
  if(options.method==='PATCH')Object.assign(attempt,JSON.parse(options.body));return reply([attempt]);
 }
 if(url.endsWith('/rest/v1/rpc/monthly_claim_marking'))return reply(report?[report]:[]);
 if(url.includes('/rest/v1/monthly_ai_reports')){
  if(options.method==='POST'){report=JSON.parse(options.body);return reply([report]);}
  if(options.method==='PATCH'){Object.assign(report,JSON.parse(options.body));return reply([report]);}
  return reply(report?[report]:[]);
 }
 throw Error('Unexpected mocked URL '+url);
};
const code=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/.local/monthly-mark-deploy.ts',import.meta.url),'utf8'));
vm.runInNewContext(code,{Deno:{env:{get:n=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service',SUPABASE_ANON_KEY:'test-anon',GEMINI_API_KEY:'test-gemini',RESEND_API_KEY:'test-resend',REPORT_EMAIL_TO:'teacher@example.com'}[n])},serve:fn=>handler=fn},fetch:fetchMock,Response,Request,AbortSignal,console:{error(){}},btoa,Uint8Array,Date,JSON,Error,Number,Math,Set,Object});
async function call(body,token='valid',origin='https://reubenask.github.io'){const r=await handler(new Request('https://example.supabase.co/functions/v1/monthly-mark',{method:'POST',headers:{Authorization:'Bearer '+token,origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,value:await r.json()};}
assert.equal((await call({action:'report',attemptId:id},'bad')).status,401);
assert.equal((await call({action:'report',attemptId:id},'valid','https://evil.example')).status,403);
assert.equal((await call({action:'report',attemptId:id})).status,403);
mode='other';assert.equal((await call({action:'report',attemptId:id})).status,404);mode='draft';
assert.equal((await call({action:'submit',attemptId:id})).status,400);
attempt.response_state.final=true;assert.equal((await call({action:'submit',attemptId:id})).status,200);
assert.equal((await call({action:'process',attemptId:id})).status,200);assert.equal(report.jobs[0].status,'error');assert(!report.jobs[0].result);
assert.equal(emails.length,0,'no email while a failed job can still be retried');
let r=await call({action:'report',attemptId:id});assert.equal(r.value.scorecard.overall,null);assert.equal(r.value.jobs[0].response,attempt.response_state.answers[cat.tasks[0].answerId]);
assert.equal((await call({action:'retry',attemptId:id})).status,200);providerFail=false;
assert.equal((await call({action:'process',attemptId:id})).status,200);assert.equal(report.jobs[0].status,'complete');assert.equal(report.jobs[0].result.score,10);
assert.equal(emails.length,1);assert.deepEqual(emails[0].to,['teacher@example.com']);assert(emails[0].subject.includes('Synthetic Student'));assert(emails[0].html.includes('Hello, please correct my booking.'));assert(emails[0].html.includes('Correct answer:'));
assert.equal((await call({action:'process',attemptId:id})).status,200);assert.equal(emails.length,1,'report is emailed only once');
for(const j of report.jobs){j.status='error';j.tries=3;}delete report.emailed_at;emails.length=0;
assert.equal((await call({action:'process',attemptId:id})).status,200);assert.equal(emails.length,1);assert(emails[0].subject.startsWith('[Check needed] Synthetic Student'));
console.log('Report email: sent once when marking finishes (flagged when a task could not be marked), with the student name, their writing and wrong-answer explanations.');
console.log('Authenticated function: invalid user/origin, cross-student access, pre-final report access, incomplete submission, provider failure without invented score, saved original response, retry and validated completion all pass.');

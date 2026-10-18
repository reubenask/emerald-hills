// Section retake, end to end against the bundled function with an in-memory database:
// teacher password, one-time code, retake marked for its section only, merged into the original report and emailed again.
// Run after: node tools/build_primary_ai_catalog.cjs && node tools/build_monthly_mark_function.cjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {objectiveReport} from '../supabase/functions/monthly-mark/core.mjs';
const cat=JSON.parse(fs.readFileSync(new URL('../supabase/.local/monthly-ai-catalog-primary.json',import.meta.url)))['primary-step2'];
const users={student:'11111111-1111-4111-8111-111111111111',teacherDevice:'33333333-3333-4333-8333-333333333333',other:'44444444-4444-4444-8444-444444444444'};
const tables={monthly_exam_attempts:[],monthly_retakes:[],monthly_ai_reports:[]};const emails=[],audio=new Set();
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
// Enough of PostgREST's filters for the function: eq, is.null, in.(...), gte, ilike with * wildcards.
function match(row,params){
 for(const [k,v] of params){if(['select','order','limit'].includes(k))continue;
  const [op,...rest]=v.split('.'),val=rest.join('.'),cell=row[k];
  if(op==='eq'&&String(cell)!==val)return false;
  if(op==='is'&&cell!=null)return false;
  if(op==='in'&&!val.slice(1,-1).split(',').includes(String(cell)))return false;
  if(op==='gte'&&!(String(cell)>=val))return false;
  if(op==='ilike'&&!new RegExp('^'+val.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$','i').test(cell||''))return false;}
 return true;
}
let n=0;const uuid=()=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(++n).padStart(12,'0');
async function fetchMock(url,options={}){
 const u=new URL(url),method=options.method||'GET';
 if(u.pathname==='/auth/v1/user'){const id=users[options.headers.Authorization.replace('Bearer ','')];return id?reply({id}):reply({},401);}
 if(url==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return reply({id:'email'});}
 if(u.hostname==='generativelanguage.googleapis.com'){
  if(!url.includes(':generateContent'))return reply({models:[]});
  const prompt=JSON.parse(options.body).contents[0].parts[0].text;
  if(prompt.startsWith('Transcribe'))return reply({candidates:[{content:{parts:[{text:JSON.stringify({transcript:'I am speaking again today.',unintelligible:false,noSpeech:false})}]}}]});
  const rubric=JSON.parse(prompt.match(/Category names and maxima: (\[\[.*?\]\])\./)[1]);
  const value=prompt.includes('moderating')?{fair:true,categories:rubric.map(([name,max])=>({name,score:max})),reason:'Fair.'}:{categories:rubric.map(([name,max])=>({name,score:max,evidence:'Clear speech.'})),corrections:[],strengths:['Clear.'],improvements:[],improvedResponse:'I am speaking again today.',needsTeacherReview:false};
  return reply({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
 }
 if(u.pathname.startsWith('/storage/v1/object/sign/'))return reply({signedURL:'/object/sign/'+u.pathname.split('/monthly-speaking/')[1]});
 if(u.pathname.startsWith('/storage/v1/object/monthly-speaking/')){const path=u.pathname.split('/monthly-speaking/')[1];return audio.has(path)?new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/webm'}}):reply({},404);}
 if(u.pathname==='/rest/v1/monthly_ai_catalog')return reply([{content:cat}]);
 if(u.pathname==='/rest/v1/rpc/monthly_claim_marking'){const r=tables.monthly_ai_reports.find(r=>r.attempt_id===JSON.parse(options.body).p_attempt);return reply(r?[structuredClone(r)]:[]);}
 const table=tables[u.pathname.replace('/rest/v1/','')];if(!table)throw Error('Unexpected mocked URL '+url);
 const rows=table.filter(r=>match(r,u.searchParams));
 if(method==='GET')return reply(structuredClone(rows));
 if(method==='POST'){const row={...(table===tables.monthly_exam_attempts?{id:uuid(),status:'draft',created_at:new Date().toISOString()}:{}),...JSON.parse(options.body)};table.push(row);return reply([structuredClone(row)]);}
 if(method==='PATCH'){const patch=JSON.parse(options.body);for(const r of rows){Object.assign(r,patch);if(patch.status==='submitted')r.submitted_at=new Date().toISOString();}return reply(structuredClone(rows));}
 throw Error('Unexpected method '+method);
}
let handler;
const code=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/.local/monthly-mark-deploy.ts',import.meta.url),'utf8'));
const secrets={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service',SUPABASE_ANON_KEY:'test-anon',GEMINI_API_KEY:'test-gemini',GEMINI_FALLBACK_MODELS:'test-model',RESEND_API_KEY:'test-resend',REPORT_EMAIL_TO:'teacher@example.com',RETAKE_TEACHER_SECRET:'correct horse battery'};
vm.runInNewContext(code,{Deno:{env:{get:k=>secrets[k]},serve:fn=>handler=fn},fetch:fetchMock,Response,Request,AbortSignal,console:{error(){},log(){}},btoa,Uint8Array,Date,JSON,Error,Number,Math,Set,Object,Array,String,crypto,TextEncoder,setTimeout:(f)=>setTimeout(f,0)});
async function call(body,token='student'){const r=await handler(new Request('https://example.supabase.co/functions/v1/monthly-mark',{method:'POST',headers:{Authorization:'Bearer '+token,origin:'https://reubenask.github.io','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,value:await r.json()};}

// The original test: speaking was not recorded, so it scored zero.
const student={name:'Yaya Test',className:'P2',date:'2026-10-18'},submitted=Object.fromEntries(cat.sections.map(s=>[s.id,true]));
const answers={};for(const s of cat.objective)for(const q of s.questions)answers[q.id]=String(q.key);for(const t of cat.tasks.filter(t=>t.section==='writing'))if(t.answerId)answers[t.answerId]='My story is about a robot.';
let r=await call({action:'sync',exam:'primary-step2',consentConfirmed:true,response:{student,answers,submitted,final:true}});assert.equal(r.status,200);
const original=r.value.attemptId;assert.equal((await call({action:'submit',attemptId:original})).status,200);
for(let i=0;i<10;i++)if(!(await call({action:'process',attemptId:original})).value.processed)break;
const before=tables.monthly_ai_reports.find(x=>x.attempt_id===original);
assert(before.jobs.filter(j=>j.section==='speaking').every(j=>j.status==='missing'&&j.result.score===0));assert.equal(emails.length,1);

// The teacher password is required to find tests and to create a code.
assert.equal((await call({action:'retake-find',teacherSecret:'wrong',name:'Yaya'},'teacherDevice')).status,403);
assert.equal((await call({action:'retake-create',teacherSecret:'wrong',attemptId:original,section:'speaking'},'teacherDevice')).status,403);
r=await call({action:'retake-find',teacherSecret:'correct horse battery',name:'yaya'},'teacherDevice');
assert.equal(r.status,200);assert.deepEqual(r.value.tests.map(t=>t.id),[original]);
r=await call({action:'retake-create',teacherSecret:'correct horse battery',attemptId:original,section:'speaking'},'teacherDevice');
assert.equal(r.status,200);const retakeCode=r.value.code;assert.match(retakeCode,/^[A-Z2-9]{8}$/);
assert(!JSON.stringify(tables.monthly_retakes).includes(retakeCode),'only the hash of the code is stored');

// The student opens the code; a wrong code or section is refused.
assert.equal((await call({action:'retake-open',code:'ABCDEFGH',exam:'primary-step2',section:'speaking'})).status,403);
assert.equal((await call({action:'retake-open',code:retakeCode,exam:'primary-step2',section:'writing'})).status,403);
r=await call({action:'retake-open',code:retakeCode.toLowerCase(),exam:'primary-step2',section:'speaking'});
assert.equal(r.status,200);assert.deepEqual(r.value.student,student);assert.equal(r.value.section,'speaking');

// The retake attempt holds the code: another computer cannot use it.
r=await call({action:'sync',exam:'primary-step2',consentConfirmed:true,retakeCode,response:{student,answers:{},submitted,final:false}});assert.equal(r.status,200);
const retake=r.value.attemptId;assert.notEqual(retake,original);
assert.equal((await call({action:'sync',exam:'primary-step2',consentConfirmed:true,retakeCode,response:{student,answers:{},submitted,final:false}})).value.attemptId,retake,'same computer resumes the same retake');
assert.equal((await call({action:'retake-open',code:retakeCode,exam:'primary-step2',section:'speaking'},'other')).status,403);
assert.equal((await call({action:'sync',exam:'primary-step2',consentConfirmed:true,retakeCode,response:{student,answers:{},submitted,final:false}},'other')).status,403);

// Submit the retake with recordings: only speaking is marked, then merged into the original and emailed again.
for(const t of cat.tasks.filter(t=>t.section==='speaking'))audio.add(users.student+'/'+retake+'/'+t.id);
await call({action:'sync',exam:'primary-step2',consentConfirmed:true,attemptId:retake,retakeCode,response:{student,answers:{},submitted,final:true}});
assert.equal((await call({action:'submit',attemptId:retake})).status,200);
const retakeReport=tables.monthly_ai_reports.find(x=>x.attempt_id===retake);
assert(retakeReport.jobs.every(j=>j.section==='speaking'));assert.deepEqual(retakeReport.objective,[]);
assert.equal((await call({action:'retake-open',code:retakeCode,exam:'primary-step2',section:'speaking'})).status,403,'a submitted code cannot be reused');
for(let i=0;i<10;i++)if(!(await call({action:'process',attemptId:retake})).value.processed)break;
const after=tables.monthly_ai_reports.find(x=>x.attempt_id===original);
assert.equal(emails.length,2,'the merged original report is emailed again, the retake is not emailed on its own');
assert(after.jobs.filter(j=>j.section==='speaking').every(j=>j.status==='complete'&&j.result.score===j.result.maxScore&&j.retaken&&j.recording.startsWith(users.student+'/'+retake+'/')));
assert.deepEqual(after.jobs.filter(j=>j.section!=='speaking'),before.jobs.filter(j=>j.section!=='speaking'),'other sections keep their original marks');
assert.deepEqual(after.objective,objectiveReport(cat,answers));
assert.equal(after.retake.taken[0].section,'speaking');assert(emails[1].subject.includes('updated after Speaking retake'));assert(emails[1].html.includes('Speaking was retaken'));
assert(!/[\u{1F300}-\u{1FAFF}]/u.test(emails[1].html));
r=await call({action:'report',attemptId:original});assert.equal(r.value.scorecard.sections.find(s=>s.id==='speaking').percentage,100);
assert(r.value.audio['speaking-1'].includes(retake),'the original report plays the retake recording');
r=await call({action:'report',attemptId:retake});assert.deepEqual(r.value.scorecard.sections.map(s=>s.id),['speaking']);
// The retake does not show up as a test to retake.
assert.deepEqual((await call({action:'retake-find',teacherSecret:'correct horse battery',name:'yaya'},'teacherDevice')).value.tests.map(t=>t.id),[original]);

// A task retake: only Speaking Task 2 is retaken; the other tasks and the objective marks stay.
const mid=structuredClone(tables.monthly_ai_reports.find(x=>x.attempt_id===original));
r=await call({action:'retake-create',teacherSecret:'correct horse battery',attemptId:original,section:'speaking',tasks:['speaking-2','writing-story']},'teacherDevice');assert.equal(r.status,400,'tasks must belong to the section');
r=await call({action:'retake-create',teacherSecret:'correct horse battery',attemptId:original,section:'speaking',tasks:['speaking-2']},'teacherDevice');assert.deepEqual(r.value.tasks,[cat.tasks.find(t=>t.id==='speaking-2').title]);
const taskCode=r.value.code;r=await call({action:'retake-open',code:taskCode,exam:'primary-step2',section:'speaking'});assert.deepEqual(r.value.allowed.speaking,[2]);assert.deepEqual(r.value.allowed.answers,[]);
const taskRetake=(await call({action:'sync',exam:'primary-step2',consentConfirmed:true,retakeCode:taskCode,response:{student,answers:{},submitted,final:true}})).value.attemptId;
audio.add(users.student+'/'+taskRetake+'/speaking-2');assert.equal((await call({action:'submit',attemptId:taskRetake})).status,200);
assert.deepEqual(tables.monthly_ai_reports.find(x=>x.attempt_id===taskRetake).jobs.map(j=>j.id),['speaking-2']);
for(let i=0;i<10;i++)if(!(await call({action:'process',attemptId:taskRetake})).value.processed)break;
const final=tables.monthly_ai_reports.find(x=>x.attempt_id===original);
assert(final.jobs.find(j=>j.id==='speaking-2').recording.includes(taskRetake));
assert.deepEqual(final.jobs.filter(j=>j.id!=='speaking-2'),mid.jobs.filter(j=>j.id!=='speaking-2'));assert.deepEqual(final.objective,mid.objective);
assert.deepEqual(final.retake.taken[1].tasks,['speaking-2']);assert.equal(emails.length,3);assert(emails[2].html.includes('Speaking ('+cat.tasks.find(t=>t.id==='speaking-2').title+') was retaken'));
console.log('Task retake: only the chosen task is enabled, marked and replaced; the rest of the report is unchanged.');
console.log('Section retake: teacher password, one-time code bound to one computer and section, section-only marking, merge into the original report and re-email all pass.');

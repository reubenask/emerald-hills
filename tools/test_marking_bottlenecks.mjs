// Marking bottlenecks, against the bundled function with mocked AI services, database and email:
// a broken or empty AI reply moves on to the next model, NVIDIA is the backup when Gemini is out of quota,
// failed tasks are retried later by the server check and the finished report is emailed again,
// running out of time is not counted as a failed try, and an exam id with no marking emails the teacher.
// Run after: node tools/build_primary_ai_catalog.cjs && node tools/build_monthly_mark_function.cjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {RUBRICS,failReason} from '../supabase/functions/monthly-mark/core.mjs';
const cat=structuredClone(JSON.parse(fs.readFileSync(new URL('../supabase/.local/monthly-ai-catalog-primary.json',import.meta.url)))['primary-step2']);
const task=cat.tasks.find(t=>t.section==='writing');cat.tasks=[task];
const good={categories:RUBRICS[task.rubric].map(([name,max])=>({name,score:max,evidence:'Specific submitted text evidence.'})),corrections:[],strengths:['Clear.'],improvements:[],improvedResponse:'Fixed.',needsTeacherReview:false};
const goodText=JSON.stringify(good), moderation=JSON.stringify({fair:true,categories:[],reason:'Fair.'});
const uid='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const attempt={id,student_id:uid,exam_id:'primary-step2',status:'draft',response_state:{student:{name:'Synthetic Student',className:'Test Class',date:'2026-11-24'},answers:{[task.answerId]:'I like my school.'},submitted:Object.fromEntries(cat.sections.map(s=>[s.id,true])),final:true}};
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
let report=null,gemini=[],nvidia=[],geminiCalls=0,nvidiaCalls=0,nvidiaBodies=[];const emails=[],sweepQueries=[];
// gemini/nvidia: queues of replies; each item is an HTTP status or the text the model returns.
const next=(q,fallback)=>q.length?q.shift():fallback;
async function fetchMock(url,options={}){
 if(url.endsWith('/auth/v1/user'))return options.headers.Authorization==='Bearer valid'?reply({id:uid}):reply({},401);
 if(url==='https://api.resend.com/emails'){emails.push({...JSON.parse(options.body),idempotency:options.headers['Idempotency-Key']});return reply({id:'email'});}
 if(url.includes('generativelanguage.googleapis.com')){
  if(!url.includes(':generateContent'))return reply({models:[]});
  geminiCalls++;const body=JSON.parse(options.body);if(body.contents[0].parts[0].text.includes('moderating'))return reply({candidates:[{content:{parts:[{text:moderation}]}}]});
  const v=next(gemini,429);return typeof v==='number'?reply({error:'quota'},v):reply({candidates:[{content:{parts:[{text:v}]}}]});
 }
 if(url.includes('integrate.api.nvidia.com')){nvidiaCalls++;const body=JSON.parse(options.body);nvidiaBodies.push(body);
  if(body.messages.at(-1).content.includes('moderating'))return reply({choices:[{message:{content:moderation}}]});
  const v=next(nvidia,503);return typeof v==='number'?reply({error:'down'},v):reply({choices:[{message:typeof v==='string'?{content:v}:v,finish_reason:'stop'}]});}
 if(url.includes('/rest/v1/monthly_ai_catalog'))return url.includes('exam_id=eq.primary-step2&')?reply([{content:cat}]):reply([]);
 if(url.includes('/rest/v1/monthly_retakes'))return reply([]);
 if(url.includes('/rest/v1/monthly_exam_attempts')){
  if(options.method==='POST')return reply([{...attempt,...JSON.parse(options.body),id}]);
  if(options.method==='PATCH')Object.assign(attempt,JSON.parse(options.body));return reply([attempt]);
 }
 if(url.endsWith('/rest/v1/rpc/monthly_claim_marking'))return reply(report?[report]:[]);
 if(url.includes('/rest/v1/monthly_ai_reports')){
  if(options.method==='POST'){report=JSON.parse(options.body);return reply([report]);}
  if(options.method==='PATCH'){Object.assign(report,JSON.parse(options.body));return reply([report]);}
  if(url.includes('emailed_at=')){sweepQueries.push(decodeURIComponent(url));const sent=!!report?.emailed_at;return reply(report&&(url.includes('emailed_at=is.null')?!sent:sent&&report.jobs.some(j=>j.status==='error'))?[report]:[]);}
  return reply(report?[report]:[]);
 }
 throw Error('Unexpected mocked URL '+url);
}
const envVars={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'s',SUPABASE_ANON_KEY:'a',GEMINI_API_KEY:'g',GEMINI_FALLBACK_MODELS:'gemini-b',NVIDIA_API_KEY:'n',RESEND_API_KEY:'r',REPORT_EMAIL_TO:'teacher@example.com',SWEEP_SECRET:'sweep'};
let now=Date.parse('2026-11-24T03:00:00Z');class FakeDate extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
let handler;const code=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/.local/monthly-mark-deploy.ts',import.meta.url),'utf8'));
vm.runInNewContext(code,{Deno:{env:{get:n=>envVars[n]},serve:fn=>handler=fn},fetch:fetchMock,Response,Request,AbortSignal,setTimeout:(f)=>setTimeout(f,0),console:{error(){},log(){}},btoa,Uint8Array,Date:FakeDate,JSON,Error,Number,Math,Set,Map,Object,String,Array,TextEncoder,crypto,encodeURIComponent,decodeURIComponent});
async function call(body,headers={Authorization:'Bearer valid'}){const r=await handler(new Request('https://example.supabase.co/functions/v1/monthly-mark',{method:'POST',headers:{origin:'https://reubenask.github.io','Content-Type':'application/json',...headers},body:JSON.stringify(body)}));return {status:r.status,value:await r.json()};}
const fresh=()=>{report=null;attempt.status='draft';emails.length=0;gemini=[];nvidia=[];geminiCalls=0;nvidiaCalls=0;nvidiaBodies=[];};
async function submit(){fresh();assert.equal((await call({action:'submit',attemptId:id})).status,200);}

// 1. Gemini out of quota on both models; NVIDIA's first model sends broken JSON, the second a usable reply with a trailing comma.
await submit();nvidia=['Here is the mark: {"categories": [ oops',goodText.replace(/}$/,',}')];
await call({action:'process',attemptId:id});
assert.equal(report.jobs[0].status,'complete');assert.equal(report.jobs[0].result.model,'nvidia:nvidia/nemotron-3.5-super-vl-120b-a12b');
assert.equal(nvidiaBodies[0].model,'meta/llama-3.3-70b-instruct');assert(!nvidiaBodies[0].chat_template_kwargs,'no reasoning switch for a non-reasoning model');
assert.equal(nvidiaBodies[1].chat_template_kwargs.enable_thinking,false);assert(nvidiaBodies[1].messages[0].content.startsWith('/no_think'));assert(nvidiaBodies[1].max_tokens>=8192);
assert.equal(emails.length,1);
console.log('Backup marker: broken JSON moves on to the next model; trailing commas are repaired; reasoning is switched off.');

// 2. A reasoning model that still puts its answer in reasoning_content (empty content) is read from there.
await submit();nvidia=[{content:'',reasoning_content:'Let me think. '+goodText}];
await call({action:'process',attemptId:id});assert.equal(report.jobs[0].status,'complete');
// Raw line breaks inside a JSON string are repaired too.
await submit();nvidia=[goodText.replace('"Fixed."','"Fixed\nline two."')];
await call({action:'process',attemptId:id});assert.equal(report.jobs[0].status,'complete',report.jobs[0].cause);assert.equal(report.jobs[0].result.improvedResponse,'Fixed\nline two.');
console.log('Empty content with the answer in reasoning_content, and raw line breaks in strings, are both usable.');

// 3. A model that hit its limit is not asked again within the same instance for a while.
await submit();await call({action:'process',attemptId:id});const callsAfterFirst=geminiCalls;assert.equal(report.jobs[0].status,'error');
await call({action:'process',attemptId:id});assert.equal(geminiCalls,callsAfterFirst,'resting Gemini models are skipped');
console.log('Models that returned 429 rest for ten minutes instead of being retried on every task.');

// 4. Everything down: three quick tries, then the report is emailed with the reason, then the server check retries later.
now+=11*60000;await submit();
for(let i=0;i<3;i++){now+=11*60000;await call({action:'process',attemptId:id});}
const job=report.jobs[0];assert.equal(job.status,'error');assert.equal(job.tries,3);assert(job.retryAt);
assert.equal(emails.length,1);assert(emails[0].subject.startsWith('[Check needed]'));assert(emails[0].html.includes('Not marked yet'));assert(emails[0].html.includes('the free AI daily limit was used up'));
await call({action:'sweep'},{'x-sweep-secret':'sweep'});assert.equal(job.tries,3,'not retried before its time');
assert(sweepQueries.some(q=>q.includes('jobs=cs.[{"status":"error"}]')));
now+=31*60000;gemini=[goodText];await call({action:'sweep'},{'x-sweep-secret':'sweep'});
assert.equal(report.jobs[0].status,'complete');assert.equal(report.jobs[0].tries,4);assert(!report.jobs[0].retryAt&&!report.jobs[0].cause);
assert.equal(emails.length,2);assert(emails[1].subject.endsWith('(marking completed)'));assert(!emails[1].html.includes('Not marked yet'));
console.log('Failed tasks: emailed with the reason after three tries, retried by the server check 30 minutes later, then re-emailed when marked.');

// 5. Later retries are spaced out and stop after the last one.
await submit();for(let i=0;i<3;i++){now+=11*60000;await call({action:'process',attemptId:id});}
const gaps=[];for(let i=0;i<6;i++){const at=Date.parse(report.jobs[0].retryAt||'');if(!at)break;gaps.push(Math.round((at-now)/60000));now=at+60000;await call({action:'sweep'},{'x-sweep-secret':'sweep'});}
assert.deepEqual(gaps,[30,120,360,720,1440]);assert.equal(report.jobs[0].tries,8);assert(!report.jobs[0].retryAt);
console.log('Later retries after 30 min, 2 h, 6 h, 12 h and 24 h, then stop.');

// 6. Running out of time is not a failed try.
envVars.MARKING_BUDGET_MS='30000';await submit();await call({action:'process',attemptId:id});
assert.equal(report.jobs[0].status,'pending');assert.equal(report.jobs[0].tries,0);delete envVars.MARKING_BUDGET_MS;
console.log('A request with too little time left leaves the task pending without counting a try.');

// 7. Unknown exam id: the student is told plainly, the teacher is emailed once a day, and the page check can ask.
fresh();let r=await call({action:'sync',exam:'itp-december-2026',adultConfirmed:true,response:{student:{name:'Oscar',className:'ITP 2'},answers:{}}});
assert.equal(r.status,503);assert(r.value.error.includes('Please tell your teacher'));
await call({action:'sync',exam:'itp-december-2026',adultConfirmed:true,response:{answers:{}}});
assert.equal(emails.length,1);assert(emails[0].subject.includes('itp-december-2026'));assert(emails[0].html.includes('Oscar'));assert.equal(emails[0].idempotency,'missing-catalog-itp-december-2026-'+new Date(now).toISOString().slice(0,10));
r=await call({action:'sync',exam:'december',adultConfirmed:true,response:{answers:{}}});assert.equal(r.status,400);assert.equal(emails.length,2,'an id the server cannot mark at all also alerts');
assert.deepEqual((await call({action:'exam-status',exam:'itp-december-2026'},{})).value.ready,false);
assert.equal((await call({action:'exam-status',exam:'primary-step2'},{})).value.ready,true);
console.log('Unknown exam id: clear message on the page, one alert email a day per id, and a public readiness check.');
assert.equal(failReason('Gemini HTTP 429 x | NVIDIA HTTP 503'),'the free AI daily limit was used up');
console.log('All marking bottleneck checks pass.');

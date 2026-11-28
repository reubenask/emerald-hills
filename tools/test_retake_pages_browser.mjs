// Retakes on the November test pages, in a real browser, against the bundled monthly-mark function with an in-memory database:
// 1. ITP, before Submit All: request a speaking task retake, the teacher approves on retake.html, Start Retake reopens the
//    section in the same test, and Submit All then sends one test for marking.
// 2. Primary Step 2, after Submit All: request, approve, Start Retake opens the retake link with only that section.
// Run after: node tools/build_monthly_mark_function.cjs, with the live catalogs saved as supabase/.local/live-catalogs.json
// (select exam_id, version, content from monthly_ai_catalog). Screenshots go to supabase/.local/retake-screens/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const shots=path.join(root,'supabase/.local/retake-screens');fs.mkdirSync(shots,{recursive:true});
const catalogs=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root,'supabase/.local/live-catalogs.json'),'utf8')).map(r=>[r.exam_id,r.content]));

// --- the function, with an in-memory database (same approach as test_monthly_retake.mjs)
const tables={monthly_exam_attempts:[],monthly_retakes:[],monthly_ai_reports:[],monthly_retake_requests:[]},emails=[],audio=new Set();
const tokens={};let n=0;const uuid=()=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(++n).padStart(12,'0');
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
function match(row,params){for(const [k,v] of params){if(['select','order','limit'].includes(k))continue;const [op,...rest]=v.split('.'),val=rest.join('.'),cell=row[k];
 if(op==='eq'&&String(cell)!==val)return false;if(op==='is'&&cell!=null)return false;if(op==='in'&&!val.slice(1,-1).split(',').includes(String(cell)))return false;if(op==='gte'&&!(String(cell)>=val))return false;
 if(op==='ilike'&&!new RegExp('^'+val.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$','i').test(cell||''))return false;}return true;}
async function fetchMock(url,options={}){
 const u=new URL(url),method=options.method||'GET';
 if(u.pathname==='/auth/v1/user'){const id=tokens[String(options.headers.Authorization).replace('Bearer ','')];return id?reply({id}):reply({},401);}
 if(url==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return reply({id:'email'});}
 if(u.hostname==='generativelanguage.googleapis.com'){
  if(!url.includes(':generateContent'))return reply({models:[]});
  const prompt=JSON.parse(options.body).contents[0].parts[0].text;
  if(prompt.startsWith('Transcribe'))return reply({candidates:[{content:{parts:[{text:JSON.stringify({transcript:'I am speaking about the test today.',unintelligible:false,noSpeech:false})}]}}]});
  const rubric=JSON.parse(prompt.match(/Category names and maxima: (\[\[.*?\]\])\./)[1]);
  const value=prompt.includes('moderating')?{fair:true,categories:rubric.map(([name,max])=>({name,score:max})),reason:'Fair.'}:{categories:rubric.map(([name,max])=>({name,score:max,evidence:'Clear.'})),corrections:[],strengths:['Clear.'],improvements:[],improvedResponse:'Fine.',needsTeacherReview:false};
  return reply({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
 }
 if(u.pathname.startsWith('/storage/v1/object/sign/'))return reply({signedURL:'/object/sign/x'});
 if(u.pathname.startsWith('/storage/v1/object/monthly-speaking/')){const p=u.pathname.split('/monthly-speaking/')[1];return audio.has(p)?new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/webm'}}):reply({},404);}
 if(u.pathname==='/rest/v1/monthly_ai_catalog'){const c=catalogs[u.searchParams.get('exam_id').replace('eq.','')];return reply(c?[{content:c}]:[]);}
 if(u.pathname==='/rest/v1/rpc/monthly_claim_marking'){const r=tables.monthly_ai_reports.find(r=>r.attempt_id===JSON.parse(options.body).p_attempt);return reply(r?[structuredClone(r)]:[]);}
 const table=tables[u.pathname.replace('/rest/v1/','')];if(!table)throw Error('Unexpected mocked URL '+url);
 const rows=table.filter(r=>match(r,u.searchParams));
 if(method==='GET')return reply(structuredClone(u.searchParams.get('order')==='created_at.desc'?rows.map((r,i)=>[r,i]).sort((a,b)=>String(b[0].created_at).localeCompare(String(a[0].created_at))||b[1]-a[1]).map(x=>x[0]):rows));
 if(method==='POST'){const row={...(table===tables.monthly_exam_attempts?{id:uuid(),status:'draft',created_at:new Date().toISOString()}:table===tables.monthly_retake_requests?{id:uuid(),created_at:new Date().toISOString(),approved_at:null}:{}),...JSON.parse(options.body)};table.push(row);return reply([structuredClone(row)]);}
 if(method==='PATCH'){const patch=JSON.parse(options.body);for(const r of rows){Object.assign(r,patch);if(patch.status==='submitted')r.submitted_at=new Date().toISOString();}return reply(structuredClone(rows));}
 throw Error('Unexpected method '+method);
}
let handler;
const code=stripTypeScriptTypes(fs.readFileSync(path.join(root,'supabase/.local/monthly-mark-deploy.ts'),'utf8'));
const secrets={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'s',SUPABASE_ANON_KEY:'a',GEMINI_API_KEY:'g',GEMINI_FALLBACK_MODELS:'m',RESEND_API_KEY:'r',REPORT_EMAIL_TO:'teacher@example.com',RETAKE_TEACHER_SECRET:'correct horse battery'};
vm.runInNewContext(code,{Deno:{env:{get:k=>secrets[k]},serve:fn=>handler=fn},fetch:fetchMock,Response,Request,AbortSignal,console:{error(){},log(){}},btoa,Uint8Array,Date,JSON,Error,Number,Math,Set,Object,Array,String,crypto,TextEncoder,setTimeout:f=>setTimeout(f,0)});

// --- static pages on an allowed origin
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'application/octet-stream'});fs.createReadStream(p).pipe(res);});
await new Promise(r=>server.listen(8765,'127.0.0.1',r));
const site='http://127.0.0.1:8765/monthly-exams/';

// Each browser context is one computer with its own anonymous student sign-in.
async function computer(browser,name){
 const context=await browser.newContext({viewport:{width:1200,height:900}}),id=uuid();tokens[name]=id;
 await context.route('https://vknfagvmdirmpgtjlhjr.supabase.co/**',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.pathname.startsWith('/auth/v1/'))return route.fulfill({json:{access_token:name,refresh_token:name,expires_in:3600,user:{id}}});
  if(u.pathname.startsWith('/storage/v1/object/monthly-speaking/')){audio.add(u.pathname.split('/monthly-speaking/')[1]);return route.fulfill({json:{Key:'ok'}});}
  if(u.pathname==='/functions/v1/monthly-mark'){const res=await handler(new Request('https://example.supabase.co/functions/v1/monthly-mark',{method:'POST',headers:{'x-student-authorization':r.headers()['x-student-authorization'],origin:'http://127.0.0.1:8765','Content-Type':'application/json'},body:r.postData()}));return route.fulfill({status:res.status,contentType:'application/json',body:await res.text()});}
  return route.fulfill({status:404,body:'{}'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 return {context,page,errors,id};
}
const until=async(fn,what,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,250));}throw Error('Timed out waiting for '+what);};
// Fill the test as if each section had been done: objective answers from the key, writing text, and a recording per task.
async function finish(page,exam,sections){
 const cat=catalogs[exam];
 await page.evaluate(({cat,sections})=>{
  state.student={name:'TRIAL Claude retake check',className:'Test',date:'2026-11-28'};
  for(const id of ['studentName','studentClass','studentDate'])document.getElementById(id).value=state.student[{studentName:'name',studentClass:'className',studentDate:'date'}[id]];
  for(const s of cat.objective)if(sections.includes(s.id))for(const q of s.questions)state.answers[q.id]=String(q.key);
  for(const t of cat.tasks)if(sections.includes(t.section)&&t.answerId)state.answers[t.answerId]='My answer for '+t.title+'. It has several sentences, because it explains my reasons.';
  for(const t of cat.tasks)if(sections.includes(t.section)&&t.section==='speaking')memoryClips.set(t.id,new Blob([new Uint8Array(20000)],{type:'audio/webm'}));
  for(const id of sections)state.sections[id]={...state.sections[id],started:true,submitted:true};
  save();render();
 },{cat,sections});
}
const attemptsOf=name=>tables.monthly_exam_attempts.filter(a=>a.student_id===tokens[name]);

const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
try{
 // ---------- 1. ITP November: retake before Submit All
 const student=await computer(browser,'itpStudent'),teacher=await computer(browser,'teacher');
 const p=student.page;await p.goto(site+'november-2026/itp/index.html');
 const box=p.locator('#retakeRequest');
 await until(()=>box.isVisible(),'the request box');
 assert.equal(await box.locator('button.btn-outline').isDisabled(),true,'nothing submitted yet: the button is shown but disabled');
 assert.match(await box.locator('p[role=status]').textContent(),/once you have submitted that section, before or after Submit All/);
 const all=catalogs['itp-november-2026'].sections.map(s=>s.id);
 await finish(p,'itp-november-2026',all.filter(id=>id!=='writing'));
 await p.evaluate(()=>NovemberCloudConnect.sync());
 await until(()=>attemptsOf('itpStudent').length===1&&attemptsOf('itpStudent')[0].response_state.submitted.speaking===true,'the draft on the server');
 await p.evaluate(()=>NovemberCloudConnect.checkRequest(true));
 await until(async()=>(await box.locator('input[name="retakeSection"]').count())>0,'section choices before Submit All');
 const offered=await box.locator('input[name="retakeSection"]').evaluateAll(els=>els.map(e=>e.value));
 assert(!offered.includes('writing'),'an unfinished section is not offered');assert(offered.includes('speaking'));
 await box.locator('input[value="speaking"]').check();
 await box.locator('input[name="retakeTask"][value="speaking-1"]').uncheck();await box.locator('input[name="retakeTask"][value="speaking-3"]').uncheck();
 await p.screenshot({path:path.join(shots,'1-itp-request-before-submit-all.png')});
 await box.locator('button.btn-outline').click();
 await until(async()=>/Show this code to your teacher: [A-Z2-9]{6}/.test(await box.locator('p[role=status]').textContent()),'a request code');
 const requestCode=(await box.locator('p[role=status]').textContent()).match(/teacher: ([A-Z2-9]{6})/)[1];
 await p.screenshot({path:path.join(shots,'2-itp-request-code.png')});

 const t=teacher.page;await t.goto(site+'retake.html');
 await t.fill('#secret','correct horse battery');await t.click('#requests');
 await until(async()=>(await t.locator('#requestList input').count())>0,'the request on the teacher page');
 assert.match(await t.locator('#requestList').textContent(),new RegExp(requestCode));
 assert.match(await t.locator('#requestList').textContent(),/ITP November 2026/,'the test name comes from its exam id');
 assert.match(await t.locator('#requestList').textContent(),/Not submitted yet/);
 await t.locator('#requestList input').first().check();
 assert.equal(await t.locator('#section').inputValue(),'speaking');
 assert.deepEqual(await t.locator('#section option').evaluateAll(o=>o.map(x=>x.value)),all,'every November section is listed');
 await t.screenshot({path:path.join(shots,'3-teacher-approves.png'),fullPage:true});
 await t.click('#create');await until(()=>t.locator('#approved').isVisible(),'approval');

 await p.evaluate(()=>NovemberCloudConnect.checkRequest(true));
 await until(async()=>(await box.locator('button.btn-outline').textContent())==='Start Retake','Start Retake');
 assert.match(await box.locator('p[role=status]').textContent(),/submit everything together with Submit All/);
 await p.screenshot({path:path.join(shots,'4-itp-approved-start-retake.png')});
 await box.locator('button.btn-outline').click();
 await until(()=>p.evaluate(()=>state.sections.speaking.submitted===false),'the reopened section');
 const after=await p.evaluate(()=>({sections:Object.fromEntries(Object.entries(state.sections).map(([k,v])=>[k,v.submitted])),view:state.view,pages:pageIndices(CONFIG.find(c=>c.id==='speaking')),reopen:state.reopen,final:state.final}));
 assert.equal(after.view,'speaking');assert.deepEqual(after.pages,[1],'only Task 2 opens');assert.deepEqual(after.reopen.allowed.speaking,[2]);
 assert.equal(after.sections.vocabulary,true,'other sections stay submitted');assert.equal(after.sections.writing,false);
 await p.screenshot({path:path.join(shots,'5-itp-speaking-reopened.png')});
 await until(()=>attemptsOf('itpStudent')[0].response_state.submitted.speaking===false,'the reopened section saved to the server');
 assert.equal(attemptsOf('itpStudent').length,1,'still one test, not a separate retake test');
 assert.equal(tables.monthly_retakes.at(-1).used_at!=null,true,'the code is used once');
 // Redo the task and finish the rest, then Submit All.
 await finish(p,'itp-november-2026',['speaking','writing']);
 await p.evaluate(()=>submitAll());
 await until(()=>attemptsOf('itpStudent')[0].status==='submitted','Submit All');
 await until(()=>tables.monthly_ai_reports.some(r=>r.attempt_id===attemptsOf('itpStudent')[0].id),'one report');
 assert.equal(tables.monthly_ai_reports.find(r=>r.attempt_id===attemptsOf('itpStudent')[0].id).retake,undefined,'an ordinary report for the whole test');
 assert.equal(attemptsOf('itpStudent').length,1);
 // After Submit All the request box offers the usual retake again, with every section.
 await p.evaluate(()=>NovemberCloudConnect.checkRequest(true));
 await until(async()=>(await box.locator('input[name="retakeSection"]').count())===all.length,'after Submit All, every section can be asked for');
 assert.deepEqual(student.errors,[],'no page errors on ITP');
 console.log('ITP November: retake requested before Submit All, approved on the teacher page, reopened in the same test, then submitted together.');

 // ---------- 2. Primary Step 2 November: retake after Submit All opens the retake link
 const kid=await computer(browser,'primaryStudent'),q=kid.page;await q.goto(site+'november-2026/primary-step2/index.html');
 const pall=catalogs['primary-step2-november-2026'].sections.map(s=>s.id);
 await finish(q,'primary-step2-november-2026',pall);
 await q.evaluate(()=>submitAll());
 await until(()=>attemptsOf('primaryStudent')[0]?.status==='submitted','Primary Submit All');
 const kbox=q.locator('#retakeRequest');
 await q.evaluate(()=>NovemberCloudConnect.checkRequest(true));
 await until(async()=>(await kbox.locator('input[name="retakeSection"]').count())===pall.length,'Primary section choices');
 await kbox.locator('input[value="speaking"]').check();await kbox.locator('input[name="retakeTask"][value="speaking-2"]').uncheck();await kbox.locator('input[name="retakeTask"][value="speaking-3"]').uncheck();
 await kbox.locator('button.btn-outline').click();
 await until(async()=>/Show this code/.test(await kbox.locator('p[role=status]').textContent()),'Primary request code');
 await t.click('#requests');await until(async()=>/Primary Step 2 November 2026/.test(await t.locator('#requestList').textContent()),'Primary request on the teacher page');
 await t.locator('#requestList input').first().check();await t.click('#create');await until(()=>t.locator('#approved').isVisible(),'Primary approval');
 await q.evaluate(()=>NovemberCloudConnect.checkRequest(true));
 await until(async()=>(await kbox.locator('button.btn-outline').textContent())==='Start Retake','Primary Start Retake');
 await kbox.locator('button.btn-outline').click();
 await q.waitForURL(/\?retake=/);
 await until(()=>q.evaluate(()=>!!RETAKE&&RETAKE.verified===true),'the Primary retake link verified');
 const pr=await q.evaluate(()=>({pages:pageIndices(CONFIG.find(c=>c.id==='speaking')),others:CONFIG.filter(c=>c.id!=='speaking').every(c=>state.sections[c.id].submitted),name:state.student.name}));
 assert.deepEqual(pr.pages,[0],'only Task 1 (Read Aloud) opens');assert.equal(pr.others,true);assert.equal(pr.name,'TRIAL Claude retake check','name, class and date come from the original test');
 await q.screenshot({path:path.join(shots,'6-primary-retake-link.png')});
 assert.deepEqual(kid.errors,[],'no page errors on Primary');
 console.log('Primary Step 2 November: retake after Submit All now opens the retake link with only the approved task.');
}finally{await browser.close();server.close();}

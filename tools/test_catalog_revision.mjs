import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolveCatalogRevision, responseMatchesRevision } from '../supabase/functions/monthly-mark/versioning.mjs';

const oldVersion='2026-11-22-v1',newVersion='2026-11-24-speaking-v2';
const old={version:oldVersion,sections:[{id:'speaking',title:'Speaking'}],objective:[],tasks:[{id:'repeat-1',title:'Repeat',section:'speaking',prompt:'earlier prompt',target:'earlier target',rubric:'repeat'}]};
const current={...old,version:newVersion,tasks:[{...old.tasks[0],prompt:'fresh prompt',target:'fresh target'}],_legacyVersion:oldVersion,_history:{[oldVersion]:old}};
assert.equal(resolveCatalogRevision(current,'__legacy__'),old);
assert.equal(resolveCatalogRevision(current,oldVersion),old);
assert.equal(resolveCatalogRevision(current,newVersion),current);
assert.equal(resolveCatalogRevision(current),current);
assert.equal(resolveCatalogRevision(current,'unknown'),null);
assert.equal(resolveCatalogRevision(current,'toString'),null);
assert.equal(resolveCatalogRevision(old,'__legacy__'),old);
assert(responseMatchesRevision(old,{}));
assert(!responseMatchesRevision(old,{examRevision:newVersion}));

// Exercise the actual deployed handler against a synthetic in-memory service only.
if(process.argv[2]){
  let handler,attempts=[],reports=[],calls=[];
  const base='https://synthetic.invalid';
  globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?base:''},serve:f=>handler=f};
  globalThis.fetch=async(input,options={})=>{
    const u=new URL(String(input));assert.equal(u.origin,base,'No real service or provider may be contacted');calls.push(u.pathname);
    const value=options.body?JSON.parse(options.body):null,method=options.method||'GET';
    const result=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
    if(u.pathname==='/auth/v1/user')return result({id:'00000000-0000-4000-8000-000000000001'});
    if(u.pathname.endsWith('/monthly_ai_catalog'))return result([{content:current}]);
    if(u.pathname.endsWith('/monthly_exam_attempts')){
      if(method==='POST'){const a={...value,id:`00000000-0000-4000-8000-${String(attempts.length+10).padStart(12,'0')}`,status:'draft'};attempts.push(a);return result([a]);}
      const id=u.searchParams.get('id')?.replace(/^eq\./,'');
      let selected=id?attempts.filter(a=>a.id===id):[];
      if(u.searchParams.has('student_id'))selected=selected.filter(a=>a.student_id===u.searchParams.get('student_id').slice(3));
      if(method==='PATCH')selected.forEach(a=>Object.assign(a,value));
      return result(selected);
    }
    if(u.pathname.endsWith('/monthly_ai_reports')){
      if(method==='POST'){reports.push(value);return result([value]);}
      return result(reports.filter(r=>r.attempt_id===u.searchParams.get('attempt_id')?.slice(3)));
    }
    if(u.pathname.endsWith('/monthly_retakes'))return result([]);
    throw Error('Unexpected synthetic path '+u.pathname);
  };
  await import(pathToFileURL(process.argv[2]).href);
  const call=async body=>{const r=await handler(new Request(base,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};};
  assert.equal((await call({action:'exam-status',exam:'ibt-november-2026'})).body.version,oldVersion);
  assert.equal((await call({action:'exam-status',exam:'ibt-november-2026',examRevision:newVersion})).body.version,newVersion);
  assert.equal((await call({action:'exam-status',exam:'ibt-november-2026',examRevision:'missing'})).body.ready,false);
  const response={student:{name:'Synthetic trial',className:'TEST',date:'2026-11-24'},answers:{},submitted:{speaking:true},final:true};
  const legacy=await call({action:'sync',exam:'ibt-november-2026',adultConfirmed:true,response});
  const revised=await call({action:'sync',exam:'ibt-november-2026',adultConfirmed:true,response:{...response,examRevision:newVersion}});
  assert.equal(legacy.status,200);assert.equal(revised.status,200);
  assert.equal(attempts[0].exam_version,oldVersion);assert.equal(attempts[1].exam_version,newVersion);
  const mixed=await call({action:'sync',exam:'ibt-november-2026',attemptId:legacy.body.attemptId,adultConfirmed:true,response:{...response,examRevision:newVersion}});
  assert.equal(mixed.status,409);assert.equal(attempts[0].response_state.examRevision,undefined);
  assert.equal((await call({action:'submit',attemptId:legacy.body.attemptId})).status,200);
  assert.equal((await call({action:'submit',attemptId:revised.body.attemptId})).status,200);
  assert.equal(reports[0].catalog_version,oldVersion);assert.equal(reports[0].jobs[0].target,'earlier target');
  assert.equal(reports[1].catalog_version,newVersion);assert.equal(reports[1].jobs[0].target,'fresh target');
  assert.equal(reports[0].jobs[0].prompt,'earlier prompt');assert.equal(reports[1].jobs[0].prompt,'fresh prompt');
  console.log('Passed: actual handler pins legacy/new attempts, blocks mixed revisions, and creates matching report jobs. No real network requests.');
}
console.log('Passed: catalogue revision selection and unknown-version protection.');

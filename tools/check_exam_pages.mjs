// Checks every monthly test page: is it connected to the marking server, and does the server have marking set up
// for its exam id? A page that fails would let students take the test with nothing saved or marked
// (as happened with the November pages on November 23). Exits with an error so GitHub emails the repository owner.
// Run: node tools/check_exam_pages.mjs   (GitHub runs it daily and after every change to monthly-exams)
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../monthly-exams');
const config=fs.readFileSync(path.join(root,'shared/cloud-config.js'),'utf8');
const url=config.match(/url:'([^']+)'/)[1], publicKey=config.match(/publicKey:'([^']+)'/)[1], gatewayKey=(config.match(/gatewayKey:'([^']+)'/)||[])[1];
const pages=[];
(function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()&&e.name!=='assets')walk(p);else if(e.name.endsWith('.html'))pages.push(p);}})(root);
const problems=[], ids=new Map();
for(const p of pages){
  const html=fs.readFileSync(p,'utf8'), id=(html.match(/<html[^>]*data-cloud-exam="([^"]+)"/)||[])[1], rel=path.relative(root,p);
  if(!id)continue;
  // The page must load or contain the cloud saving code, or nothing it does reaches the server.
  if(!/MonthlyCloud\s*=|shared\/cloud-client\.js/.test(html)||!/MonthlyCloud\.call\('submit'|shared\/exam-cloud\.js/.test(html))problems.push(rel+': has exam id '+id+' but no cloud saving code, so students\' work is never sent.');
  if(!ids.has(id))ids.set(id,[]);ids.get(id).push(rel);
}
for(const [id,where] of ids){
  let r;
  try{r=await (await fetch(url+'/functions/v1/monthly-mark',{method:'POST',headers:{apikey:publicKey,Authorization:'Bearer '+(gatewayKey||publicKey),'Content-Type':'application/json'},body:JSON.stringify({action:'exam-status',exam:id}),signal:AbortSignal.timeout(30000)})).json();}
  catch(e){problems.push(id+': could not ask the marking server ('+e.message+').');continue;}
  if(r.ready===undefined){problems.push(id+': the marking server does not answer this check yet ('+(r.error||'no answer')+'). Deploy the latest monthly-mark function.');continue;}
  if(r.ready===true)console.log('OK   '+id+' ('+r.tasks+' writing/speaking tasks) used by '+where.join(', '));
  else problems.push(id+' (used by '+where.join(', ')+'): '+(r.reason||r.error||'the marking server did not confirm it is set up')+' Run the catalog SQL for this exam (supabase/MONTHLY_REPORTS.md, "A new month\'s tests").');
}
if(problems.length){console.error('\nProblems found:\n- '+problems.join('\n- '));process.exit(1);}
console.log('\nAll '+ids.size+' exam ids on '+pages.length+' pages are connected to marking.');

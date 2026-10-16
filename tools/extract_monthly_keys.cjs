// Pulls the objective answer keys out of the monthly exam pages into
// supabase/functions/mark-monthly-attempt/keys/<exam>.json for server-side marking.
// Run after editing any monthly exam: node tools/extract_monthly_keys.cjs
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'supabase/functions/mark-monthly-attempt/keys');
const read=f=>fs.readFileSync(path.join(root,'monthly-exams',f),'utf8');
const json=(src,re)=>{const m=src.match(re);if(!m)throw new Error('Not found: '+re);return JSON.parse(m[1]);};
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

function bookletExam(file,examId,version,extra={}){
 const src=read(file),config=json(src,/const CONFIG=(\[.*?\]);/s);
 const sections={};
 for(const c of config)if(c.questions)sections[c.id]=c.questions.map(q=>({id:q.id,key:String(q.key),answer:strip(q.options[q.key])}));
 return {exam_id:examId,exam_version:version,format:'booklet',sections,...extra};
}

const primary=bookletExam('primary-step2/index.html','primary-step2','primary-step2-monthly-2026-v1');

// ITP Writing Task 1 has ten dropdown blanks with no key in the page. Values are option text.
// Proposed by review; items marked confirm:true need a teacher to confirm before release.
const itp=bookletExam('junior/index.html','itp','junior-monthly-2026-v1',{blanks:{section:'writing',task:'task1-blanks',items:[
 ['writing-blank-1','are'],['writing-blank-2','think'],['writing-blank-3','focused',true],['writing-blank-4','— no article'],
 ['writing-blank-5','that'],['writing-blank-6','trust'],['writing-blank-7','face',true],['writing-blank-8','when',true],
 ['writing-blank-9','continue'],['writing-blank-10','symbols']].map(([id,answer,confirm])=>({id,answer,confirm:!!confirm}))}});

const ibtSection=f=>json(read('ibt/'+f),/CONFIG=(\{.*?\});/s);
const ibt={exam_id:'ibt',exam_version:'monthly-ibt-october-2026-v1',format:'sections',sections:{}};
for(const [id,f] of [['vocabulary','Vocabulary.html'],['reading','Reading.html']])
 ibt.sections[id]=ibtSection(f).questions.map(q=>({id:'q'+q.n,key:q.key,answer:strip(q.options[q.key])}));
ibt.arrangements=ibtSection('Writing.html').arrangements.map((a,i)=>({id:'s'+i,context:a.context,answer:a.answer,acceptedOrders:a.acceptedOrders}));

for(const k of [primary,itp,ibt])fs.writeFileSync(path.join(out,k.exam_id+'.json'),JSON.stringify(k,null,1)+'\n');
console.log('Wrote keys to '+path.relative(root,out));

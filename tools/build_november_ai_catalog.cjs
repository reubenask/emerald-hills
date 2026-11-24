// Builds the November 2026 marking catalogs (answer keys, explanations and task briefs)
// from the published November pages, so they can be marked like October's tests.
// Writes supabase/catalog/november-2026.sql (run it in Supabase after supabase/monthly-november-2026.sql).
// Run: node tools/build_november_ai_catalog.cjs   (needs Playwright with a Chromium)
// Picture descriptions and audio transcripts below were written from the page media on Nov 24 2026.
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const version='2026-11-24-v1';
const repeat=['Welcome to the Community Repair Center.','The workshop is in the adjacent building.','We provide adequate equipment for every group.','Please monitor your belongings while you work in the center.','Our volunteers can adapt each activity to accommodate different levels of experience.','Before using a tool, make sure that you have received accurate instructions from a member of staff.','Although our funding is limited, we aim to sustain this service and incorporate more activities next year.'];
const interview=['We are interviewing people about shared spaces in their communities. Describe a public place that you use, such as a park, library, or community center. What do you usually do there?','Some people prefer quiet public spaces, while others prefer places with organized activities. Which type do you prefer, and how does that environment affect your experience?','A town has a finite budget and must choose between improving an existing park and establishing a new community learning center. Which option should it prioritize? Explain your perspective.','Some community centers use digital tools to monitor attendance and provide information, while others rely mainly on staff. How could centers incorporate technology without diminishing the value of human assistance? Give reasons and an example.'];
const announcement='Good afternoon, everyone. On Thursday, November 26th, we will do an outdoor experiment with electromagnets. Meet at the covered tables beside the school garden at 3:30, not in the usual laboratory. Each student should bring a notebook, a pencil, and five steel paper clips in a small plastic box. Wear closed shoes. Please do not bring your own batteries or tools. I will provide battery holders, insulated wire, switches, and iron bolts. We will work in groups of four and compare how many paper clips a coil can lift with different numbers of turns. Take turns connecting the equipment, counting the clips, and recording the results. Ask me to check the circuit before you close the switch. Open the switch between trials and tell me immediately if a wire becomes warm. Never use a wall socket. If it rains, meet at the same time in Room 12 instead. Bring your group\'s result sheet to Friday\'s class.';

async function read(p,exam){
 await p.goto('file://'+path.join(root,'monthly-exams/november-2026',exam,'index.html'));
 return p.evaluate(()=>({
  config:CONFIG,
  writing:[...document.querySelectorAll('[data-section="writing"] .section-body')].map(x=>x.innerText),
  readAloud:document.querySelector('[data-section="speaking"] .passage')?.innerText||'',
  readingEvidence:Object.fromEntries([...document.querySelectorAll('[data-section="reading"] .question-block')].map(q=>[q.querySelector('input').name,q.closest('.section-body').querySelector('.passage')?.innerText||'']))
 }));
}
const objective=page=>page.config.filter(c=>c.questions).map(c=>({id:c.id,title:c.id==='writing'?c.title+' - Read & Choose':c.title,questions:c.questions.map(q=>({...q,...(c.id==='reading'&&page.readingEvidence[q.id]?{passage:page.readingEvidence[q.id]}:{})}))}));
const sections=page=>page.config.map(c=>({id:c.id,title:c.title}));
const sql=c=>"insert into public.monthly_ai_catalog(exam_id,version,content) values ('"+c.id+"','"+version+"', '"+JSON.stringify(c).replaceAll("'","''")+"'::jsonb) on conflict(exam_id) do update set version=excluded.version,content=excluded.content;\n";

(async()=>{
 const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 try{
  const p=await b.newPage(),catalogs=[];
  const pri=await read(p,'primary-step2');
  catalogs.push({id:'primary-step2-november-2026',version,title:'TOEFL Primary Step 2 November 2026',sections:sections(pri),objective:objective(pri),tasks:[
   {id:'writing-story',section:'writing',title:'Picture Story',answerId:'writing-story',rubric:'writing',
    prompt:'Look at pictures 1-4 in order and write a story of about 6-8 sentences: who the people are, what happens, how they help, and how the story ends. Use linking words. Characters: Lily (red raincoat, yellow umbrella), Sam (blue shirt) and Maya (green shirt), and Maya\'s mother. The pictures show: (1) on a cloudy, wet afternoon Lily and Sam walk out of school, Lily carrying a closed yellow umbrella; (2) it is raining hard; under Lily\'s umbrella they see Maya sitting alone and worried at a bus stop, holding her books, with no umbrella; (3) Lily, Maya and Sam walk together through the rain under the yellow umbrella, smiling; (4) they arrive at Maya\'s house and her mother opens the door, smiling and thanking them. Accept reasonable details consistent with the pictures.'},
   {id:'writing-essay',section:'writing',title:'My Favourite ...',answerId:'writing-essay',rubric:'writing',
    prompt:'Choose ONE title: My Favourite Food, My Favourite Place, or My Best Friend. Write an essay with an introduction, three body paragraphs and a conclusion. Give three reasons, explain them and use examples (For example, ...). The page gives a sentence-starter guide (My first reason for choosing ... is that ..., So that is why ..., For this reason, ..., I hope you ...); using those starters is expected and is not copying. Judge whether the student has an introduction, three explained reasons with examples, and a conclusion.'},
   {id:'speaking-1',section:'speaking',title:'Read Aloud',rubric:'readAloud',prompt:'Read the passage aloud clearly.',target:pri.readAloud},
   {id:'speaking-2',section:'speaking',title:'Tell a Picture Story',rubric:'speaking',
    prompt:'Tell the six-picture story using first, next, then, finally. Characters: Ava (yellow shirt), her Dad (blue shirt) and Noah (green shirt). The pictures show: (1) Dad and Ava buy a present, a white box with a red bow, at a gift shop; (2) they sit on a bench at a bus stop with the present next to Ava; (3) the bus comes and they get on, but the present is left behind on the bench; (4) Noah sees the present on the bench and picks it up; (5) Noah runs to the bus door and gives the present back to Ava; (6) Ava holds the present happily and Dad thanks Noah. Accept reasonable details consistent with the pictures.'},
   {id:'speaking-3',section:'speaking',title:'Watch and Retell',rubric:'speaking',
    prompt:'Retell the short animated video: who you saw, what happened, and how it ended. In the video a boy is playing a video game at home. His mother comes home and gives him a present in a box. Inside is a puppy. The boy is happy at first, but then he sees the puppy has only three legs and he puts it down and does not want it. The puppy plays with a red ball, falls over and keeps trying. The boy kicks the ball away, but the puppy brings it back and keeps playing happily, and the boy starts to smile. At the end the boy stands up on crutches: he is also missing a leg. He takes the ball and goes outside to play with the puppy. Accept reasonable retellings of these events.'}
  ]});
  const itp=await read(p,'itp');
  catalogs.push({id:'itp-november-2026',version,title:'TOEFL ITP November 2026',sections:sections(itp),objective:objective(itp),tasks:[
   {id:'writing-email',section:'writing',title:'Email Reply',answerId:'email',prompt:itp.writing[1],rubric:'writing'},
   {id:'writing-opinion',section:'writing',title:'Opinion Paragraph',answerId:'opinion',prompt:itp.writing[2],rubric:'writing'},
   {id:'speaking-1',section:'speaking',title:'Read Aloud',prompt:'Read the passage "How Our Brain Makes Sense of Things" aloud.',target:itp.readAloud,rubric:'readAloud'},
   {id:'speaking-2',section:'speaking',title:'Picture Story',rubric:'speaking',
    prompt:'Tell the six-picture story, joining the events with linking words. Characters: Aiden (blue hoodie), Mia (yellow T-shirt) and Leo (green T-shirt). The pictures show: (1) at a food stall at an outdoor park festival, Aiden pays with a card while Mia and Leo stand beside him; (2) Mia and Leo sit at a table under a red umbrella and keep a seat for Aiden, who is still at the stall; (3) the stall worker gives Aiden a tray with three wraps and three drinks; (4) Aiden walks to a table under a blue umbrella, but a man and a woman he does not know are sitting there and he looks confused; (5) he notices Mia waving to him from the table under the red umbrella; (6) the three friends eat and laugh together under the red umbrella. Credit the problem (going to the wrong table) and how it is solved. Accept reasonable details consistent with the pictures.'},
   {id:'speaking-3',section:'speaking',title:'Non-academic Listen-Speak',rubric:'speaking',
    prompt:'The student heard a teacher\'s announcement once and must explain it to an absent classmate, Sam: when and where to meet, including the plan for rain; what students must bring and what the teacher will provide; the group activity; and an important safety instruction. Check every fact against this announcement; credit accurate facts and point out wrong or missing ones. ANNOUNCEMENT: '+announcement}
  ]});
  const ibt=await read(p,'ibt'),w=ibt.config.find(c=>c.id==='writing');
  catalogs.push({id:'ibt-november-2026',version,title:'TOEFL iBT November 2026',sections:sections(ibt),objective:objective(ibt),arrangements:w.arrangements,tasks:[
   {id:'writing-email',section:'writing',title:'Email',answerId:'email',prompt:ibt.writing[1],rubric:'writing'},
   {id:'writing-discussion',section:'writing',title:'Academic Discussion',answerId:'discussion',prompt:ibt.writing[2],rubric:'writing'},
   ...repeat.map((t,i)=>({id:'repeat-'+(i+1),section:'speaking',title:'Repeat Sentence '+(i+1),prompt:t,target:t,rubric:'repeat'})),
   ...interview.map((t,i)=>({id:'interview-'+(i+1),section:'speaking',title:'Interview Question '+(i+1),prompt:t,rubric:'speaking'}))
  ]});
  fs.mkdirSync(path.join(root,'supabase/catalog'),{recursive:true});
  fs.writeFileSync(path.join(root,'supabase/catalog/november-2026.sql'),catalogs.map(sql).join(''));
  const dir=path.join(root,'supabase/.local');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'monthly-ai-catalog-november.json'),JSON.stringify(Object.fromEntries(catalogs.map(c=>[c.id,c])),null,2));
  console.log(JSON.stringify(catalogs.map(c=>({exam:c.id,objective:c.objective.reduce((n,s)=>n+s.questions.length,0)+(c.arrangements?.length||0),tasks:c.tasks.length}))));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

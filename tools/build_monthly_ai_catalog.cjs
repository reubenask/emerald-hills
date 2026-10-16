const fs=require('fs'),path=require('path');
const {chromium}=require('/Users/reuben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const version='2026-10-15-v1';
const grammarReasons=[
 ...Array(5).fill('Use the present simple for a regular habit. A singular third-person subject takes an -s or -es verb; plural subjects take the base form.'),
 ...Array(5).fill('The time expression places this completed event in the past, so use the past simple form.'),
 ...Array(5).fill('The action is happening now. Use am, is, or are to agree with the subject, followed by the -ing form.'),
 ...Array(5).fill('This action was already in progress at a time in the past or when another event occurred. Use was/were plus the -ing form.'),
 ...Array(5).fill('The event is connected to the present, repeated up to now, or continuing since a starting point. Use have/has plus the past participle.'),
 ...Array(5).fill('The action happened before another past event. Use had plus the past participle (past perfect).'),
 'Moreover introduces another supporting fact.', 'Additionally adds another feature to the first statement.',
 'However introduces a contrast: the rain prevented the desired outdoor activity.', 'Therefore introduces a result of the heavy rain.',
 'Because introduces the reason for staying inside.', 'Although contrasts being tired with nevertheless finishing the homework.',
 'Next marks the following step in a sequence.', 'Similarly compares two animals that share hunting ability.',
 'As well as joins the piano and violin as two instruments she plays.', 'For example introduces particular sports that illustrate the general statement.',
 'Every student is grammatically singular, so the verb is has.', 'A present-simple question with a singular third-person subject uses does plus the base verb live.',
 'A modal verb can is followed by the base form swim; very well describes how she swims.', 'Than requires the comparative adjective heavier; change final y to i before -er.',
 'The superlative most interesting compares this book with all the books in the library.', 'But contrasts the wish to play outside with the rain.',
 'Who introduces a relative clause describing the person, the girl.', 'The window receives the action; use the past passive was plus the past participle broken.',
 'A first conditional uses if plus present simple and will plus the base verb for a possible future result.', 'Three books is plural, so use there are.'
];
const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const readingReasons=['The passage follows Mira through her first outdoor delivery and her reactions to the unfamiliar world, rather than explaining only factory work.','Landscaping concerns looking after outdoor grounds, such as a yard or garden.','Her pause is an act of observation and curiosity, not an attempt to damage or remove the insect.','Mimicry means imitating something; the context describes copying rather than creating something unrelated.','The delivery continues after she checks the dropped package; dropping it does not end her assignment.','The ending moves beyond the delivery itself to Mira\'s growing interest in her surroundings.','The investigation concerns the island animals\' survival after the storm, with the students collecting evidence.','Adjacent means immediately beside or next to something.','The sensors respond to movement and send a signal; they do not directly count every species or control the storm.','A shared dialect could allow separated birds to identify members of their group and reconnect.','A sequence is an ordered series; the discussion concerns the order of the recordings.','The apparent order was unreliable because a technical fault combined calls; it was not proof that the animals changed time.','Fewer predators means fewer grasshoppers are eaten, allowing the population to increase.','The paragraph introduces practical and ethical conduct during fieldwork, including not littering and observing patiently.','The presentation connects several survival mechanisms, including adapting to conditions and maintaining communication and social links.'];
(async()=>{
 const b=await chromium.launch({executablePath:'/Users/reuben/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 try{
 const p=await b.newPage();
 await p.goto('file://'+path.join(root,'monthly-exams/junior/index.html'));
 const itp=await p.evaluate(()=>({config:CONFIG,reading:[...document.querySelectorAll('[data-section="reading"] .passage')].map(x=>x.innerText),readingEvidence:Object.fromEntries([...document.querySelectorAll('[data-section="reading"] .question-block')].map(q=>[q.querySelector('input').name,q.closest('.section-body').querySelector('.passage').innerText])),writing:[...document.querySelectorAll('[data-section="writing"] .section-body')].map(x=>x.innerText),readAloud:document.querySelector('[data-section="speaking"] .passage').innerText}));
 const objectives=itp.config.filter(c=>c.questions).map(c=>({id:c.id,title:c.title,questions:c.questions.map((q,i)=>({...q,explanation:q.explanation||(c.id==='language'?grammarReasons[i]:c.id==='vocabulary'?'In this sentence, the underlined word means "'+q.options[q.key]+'". The other options do not express that meaning.':readingReasons[i]),...(c.id==='reading'?{passage:itp.readingEvidence[q.id]}:{})}))}));
 const source=fs.readFileSync(path.join(root,'TOEFL_Junior_June_2026_Monthly_Test/Writing_Task_1_2_Urban_Green_Spaces.html'),'utf8');
 const choices=JSON.parse(source.match(/const defaultChoices = (\[[\s\S]*?\]);/)[1]);const keys=JSON.parse(source.match(/const defaultAnswerKey = (\[[\s\S]*?\]);/)[1]);
 const clozeReasons=['Rooftops and empty lots is a plural subject, so use are in the present continuous passive are being turned.','City planners is plural and takes the base form think.','In the past places the completed action in the past, requiring focused.','Residents is a general plural noun. No article is needed before it here.','That introduces the clause explaining the reason green spaces matter.','Encouraging takes the noun trust, coordinated with the noun cooperation.','Urban green projects is plural, so use face.','When introduces the circumstances in which continued investment makes the future promising.','They is plural and takes the base form continue.','The gardens and farms are multiple symbols of resilience; use the plural noun, not the adjective symbolic.'];
 objectives.push({id:'writing',title:'Writing - Read & Choose',questions:choices.map((options,i)=>({id:'writing-blank-'+(i+1),text:'Writing passage blank '+(i+1),textAnswer:true,options,answer:options['ABCD'.indexOf(keys[i])],explanation:clozeReasons[i]}))});
 const catalogs={itp:{id:'itp',version,title:'ITP Monthly Examination',sections:itp.config.map(c=>({id:c.id,title:c.title})),objective:objectives,tasks:[
 {id:'writing-email',section:'writing',title:'Email Reply',answerId:'email',prompt:itp.writing[1],rubric:'writing'},
 {id:'writing-opinion',section:'writing',title:'Opinion Paragraph',answerId:'opinion',prompt:itp.writing[2],rubric:'writing'},
 {id:'speaking-1',section:'speaking',title:'Read Aloud',prompt:'Read the supplied passage aloud.',target:itp.readAloud,rubric:'readAloud'},
 {id:'speaking-2',section:'speaking',title:'Picture Narration',prompt:'Tell a connected six-picture story: Daniel collects Emma from school, cooks dinner for her, does homework with her, watches television with her, takes her to bed, then reads her a story as she falls asleep. Accept reasonable details consistent with the pictures.',rubric:'speaking'},
 {id:'speaking-3',section:'speaking',title:'School Listening and Speaking',prompt:'On the phone, explain to an absent classmate the school planting project from the class lesson: what the project is and the choices of seeds, the weekly journal requirements (drawing and writing), and what to bring to the Garden Fair and the date. Check every fact against the lesson transcript; credit accurate facts and point out wrong or missing ones.',rubric:'speaking',sourceAudio:'https://reubenask.github.io/emerald-hills/monthly-exams/junior/assets/garden-lesson.mp3'}
 ]}};
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'iBT 2026/Monthly Exams/speaking-audio-manifest.json'),'utf8'));
 const ibt={id:'ibt',version,title:'iBT Monthly Examination',sections:[{id:'vocabulary',title:'Vocabulary'},{id:'reading',title:'Reading'},{id:'writing',title:'Writing'},{id:'speaking',title:'Speaking'}],objective:[],tasks:[]};
 for(const name of ['Vocabulary','Reading','Writing']){
  await p.goto('file://'+path.join(root,'monthly-exams/ibt',name+'.html'));
  const data=await p.evaluate(()=>({config:CONFIG,bodies:[...document.querySelectorAll('.section-body')].map(x=>x.innerText)}));
  if(name!=='Writing')ibt.objective.push({id:name.toLowerCase(),title:name,questions:data.config.questions.map(q=>({...q,id:name.toLowerCase()+'-'+q.n,sourceId:String(q.n)}))});
  else {
   ibt.arrangements=data.config.arrangements;
   ibt.tasks.push({id:'writing-email',section:'writing',title:'Email',answerId:'email',prompt:data.bodies[1],rubric:'writing'},{id:'writing-discussion',section:'writing',title:'Academic Discussion',answerId:'discussion',prompt:data.bodies[2],rubric:'writing'});
  }
 }
 ibt.tasks.push(...manifest.map((m,i)=>({id:i<7?'repeat-'+(i+1):'interview-'+(i-6),section:'speaking',title:i<7?'Repeat Sentence '+(i+1):'Interview Question '+(i-6),prompt:m.text,...(i<7?{target:m.text}:{}),rubric:i<7?'repeat':'speaking'})));
 catalogs.ibt=ibt;
 const dir=path.join(root,'supabase/.local');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'monthly-ai-catalog.json'),JSON.stringify(catalogs,null,2));
 const sql=Object.values(catalogs).map(c=>"insert into public.monthly_ai_catalog(exam_id,version,content) values ('"+c.id+"','"+version+"', '"+JSON.stringify(c).replaceAll("'","''")+"'::jsonb) on conflict(exam_id) do update set version=excluded.version,content=excluded.content;").join('\n');
 fs.writeFileSync(path.join(dir,'monthly-ai-catalog.sql'),sql);
 console.log(JSON.stringify(Object.values(catalogs).map(c=>({exam:c.id,objective:c.objective.reduce((n,s)=>n+s.questions.length,0),tasks:c.tasks.length}))));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

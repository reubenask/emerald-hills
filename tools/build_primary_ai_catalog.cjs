// Builds the Primary Step 2 marking catalog (answer explanations and task briefs)
// from monthly-exams/primary-step2/index.html. Writes the catalog JSON to supabase/.local/
// (used by the tests) and the upsert to supabase/catalog/primary-step2.sql (run it in Supabase).
// Run: node tools/build_primary_ai_catalog.cjs   (needs Playwright with a Chromium)
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const version='2026-10-16-v1';
const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

const readingReasons=[
 'The story says Anna brought "a book about birds" to school.',
 'The story says "Her grandfather had given it to her."',
 'He gave it to her "for her birthday".',
 'She showed it to Tom "at lunchtime ... in the library".',
 'Tom "could not read some of the long words"; he liked the pictures.',
 'Miss Green asked her to show the book to the class "on Friday", and on Friday she spoke.',
 'She felt nervous "because she had never spoken in front of everyone before".',
 '"Tom offered to hold the book while she talked."',
 'The story says "They practised together after school."',
 'The whole story is about Tom helping Anna share her bird book with the class.',
 'The story begins "On Saturday morning, Jack and his family planned a picnic".',
 'They planned "a picnic by the lake".',
 'The story says "Dad packed sandwiches".',
 '"His little sister Emma brought a red ball."',
 'They went inside because "soon it began to rain".',
 'They "watched ducks swimming on the lake" while they ate.',
 'Emma was disappointed because she wanted to play with her ball and could not: sad because something you wanted did not happen.',
 '"Jack made up a guessing game to cheer her up."',
 'The story says "After lunch, the rain stopped."',
 '"Before going home, everyone picked up their rubbish."'
];
const tenseReasons=[
 ...Array(6).fill('This is a habit or routine (every afternoon, every day, usually, every night). Use the present simple: add -s or -es with he, she, it or a singular noun; use the base form with I, you, we, they or a plural noun.'),
 ...Array(6).fill('The time words (yesterday, last Saturday, last night, two days ago, last month) show a finished past action. Use the past simple.'),
 ...Array(6).fill('Look!, Listen!, right now and at the moment show the action is happening now. Use am, is or are plus the -ing form, matching the subject.'),
 ...Array(6).fill('The action was in progress at a past time or when something else happened. Use was (I, he, she, it) or were (you, we, they) plus the -ing form.'),
 ...Array(6).fill('So far, already, since and twice connect the past to now. Use have (I, you, we, they) or has (he, she, it) plus the past participle.'),
 ...Array(6).fill('This action finished before another past event (by the time, before). Use had plus the past participle.'),
 'Every Tuesday is a routine and our teacher is singular, so use shows.',
 'Last night is finished past time, so use the past simple wrote.'
];

(async()=>{
 const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 try{
  const p=await b.newPage();
  await p.goto('file://'+path.join(root,'monthly-exams/primary-step2/index.html'));
  const page=await p.evaluate(()=>({
   config:CONFIG,
   writing:[...document.querySelectorAll('[data-section="writing"] .section-body')].map(x=>x.innerText),
   readAloud:document.querySelector('[data-section="speaking"] .passage').innerText,
   readingEvidence:Object.fromEntries([...document.querySelectorAll('[data-section="reading"] .question-block')].map(q=>[q.querySelector('input').name,q.closest('.section-body').querySelector('.passage').innerText]))
  }));
  const objective=page.config.filter(c=>c.questions).map(c=>({id:c.id,title:c.title,questions:c.questions.map((q,i)=>({...q,
   explanation:q.explanation||(c.id==='reading'?readingReasons[i]:c.id==='language'?tenseReasons[i]:'In this sentence, the underlined word means "'+strip(q.options[q.key])+'". The other options do not fit the sentence.'),
   ...(c.id==='reading'?{passage:page.readingEvidence[q.id]}:{})}))}));
  const catalog={id:'primary-step2',version,title:'TOEFL Primary Step 2 Monthly Examination',
   sections:page.config.map(c=>({id:c.id,title:c.title})),objective,tasks:[
   {id:'writing-story',section:'writing',title:'Picture Story',answerId:'writing-story1',rubric:'writing',
    prompt:'Look at the four pictures in order and write a story of about 6-8 sentences: who is in the story, what happens, and how it ends. Characters: Maya (the girl), Sam (the boy), Maya\'s mother, and a puppy. The pictures show: (1) Maya walking along a village street finds a small, muddy brown puppy sitting alone under a big tree; (2) at home Maya dries the puppy with a blue towel, with a water bowl and dog bed nearby; (3) Maya and her mother pin a "found puppy" poster with the puppy\'s picture on a notice board while Sam points at it; (4) at Sam\'s front door, Sam happily hugs the puppy, which is his lost dog, while Maya and her mother smile. Accept reasonable details consistent with the pictures.'},
   {id:'writing-sentences',section:'writing',title:'Make Sentences with Linking Words',rubric:'sentences',
    answerIds:['both','similarly','also','in the same way','however','on the other hand','in contrast','while','whereas','overall'].map((w,i)=>({word:w,answerId:'writing-link'+i})),
    prompt:'Write one complete sentence for each linking word or expression, using it correctly for its meaning (addition, similarity, contrast, summary). Do not copy the example "I enjoy drawing, and I also enjoy reading."'},
   {id:'speaking-1',section:'speaking',title:'Read Aloud',rubric:'readAloud',prompt:'Read the passage aloud clearly.',target:page.readAloud},
   {id:'speaking-2',section:'speaking',title:'Tell a Picture Story',rubric:'speaking',
    prompt:'Tell the six-picture story using first, next, then, finally. Characters: Mia (yellow shirt), Leo (green shirt), and a park keeper (blue clothes). The pictures show: (1) Mia and Leo walk through a park by a lake carrying a red kite; (2) Leo flies the kite while Mia watches happily; (3) the kite gets stuck high in a tree and the children look worried; (4) they ask a park keeper for help, pointing at the tree; (5) the park keeper uses a long pole to free the kite; (6) Mia holds the kite and Leo shakes the park keeper\'s hand to thank him. Accept reasonable details consistent with the pictures.'},
   {id:'speaking-3',section:'speaking',title:'Watch and Retell',rubric:'speaking',
    prompt:'Retell the short video "Little Fish\'s Ocean Friends": who you saw, what happened, and how it ended. In the video Little Fish swims through the ocean saying good morning to Starfish, meets Crab ("click click"), then Baby Turtle, who says he is very slow; the friends help and wait for him and he thanks them. They play games among the seaweed and with bubbles from clams, meet a shy Seahorse ("Hello there, don\'t be shy"), and play together all day; it was a perfect day in the ocean. Accept reasonable retellings of these events.'}
  ]};
  const dir=path.join(root,'supabase/.local');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'monthly-ai-catalog-primary.json'),JSON.stringify({'primary-step2':catalog},null,2));
  fs.mkdirSync(path.join(root,'supabase/catalog'),{recursive:true});fs.writeFileSync(path.join(root,'supabase/catalog/primary-step2.sql'),"insert into public.monthly_ai_catalog(exam_id,version,content) values ('primary-step2','"+version+"', '"+JSON.stringify(catalog).replaceAll("'","''")+"'::jsonb) on conflict(exam_id) do update set version=excluded.version,content=excluded.content;\n");
  console.log(JSON.stringify({exam:catalog.id,objective:objective.reduce((n,s)=>n+s.questions.length,0),tasks:catalog.tasks.length}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

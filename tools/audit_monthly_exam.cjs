const {chromium}=require('/Users/reuben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=path.resolve(__dirname,'../monthly-exams/ibt');
// These answers were solved from the questions and passages, independently of the embedded keys.
const vocabulary=['trial','optional','thrown away','easy to reach','track','first','useful','small','change','extend','shelter from direct sunlight','the same everywhere','evaluated','considerable','prove','in agreement','suggest','assign','give first attention to','improve','opposes','hand in','dependable','believable','keep','adaptable','different','show','acquire','limited','differ','make easier','slow','give reasons for','clearly stated','gain an advantage','admits','sufficient','decrease','brief','adjust','help cause','large','possible to carry out','settle','removes','modify','limited-access','possible consequences','work together'];
const reading=['purchase','ancient','role','avoid','recommended','To explain new booking rules','Two hours','The room may be reassigned','Water in a closed bottle','A student using an individual quiet-study desk','Green infrastructure can complement conventional flood control','The amount of water can exceed their capacity','It lets water pass through its surface','Improved water quality','blocked','It can reduce the effectiveness of a rain garden','To show that location affects performance','Some residents may lack time for regular maintenance','Supportive, while recognizing limitations','Use several coordinated approaches to manage rainwater'];
const canonical=['You can find it on the department website','I will submit it after I check the figures','The speaker was unable to travel because of the storm','It is next to the building that houses the library','We need to wait until the equipment has cooled down','She asked us to explain why the results were different','It was more interesting than I had expected','I would like to know how much the trip costs','You should include the documents that were listed in the email','We can finish it if everyone completes their part'];
const alternatives={0:'on the department website You can find it',1:'after I check the figures I will submit it',2:'because of the storm The speaker was unable to travel',4:'until the equipment has cooled down We need to wait',9:'if everyone completes their part We can finish it'};
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/reuben/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1200,height:900}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 p.setDefaultNavigationTimeout(180000);
 const open=async name=>{await p.goto(process.env.MONTHLY_TRIAL_LIVE_BASE?process.env.MONTHLY_TRIAL_LIVE_BASE+'ibt/'+encodeURIComponent(name)+'.html':'file://'+path.join(dir,name+'.html'));if(name!=='Start Here'){await p.locator('#studentName').fill('iBT Trial Student');await p.locator('#studentClass').fill('iBT');await p.locator('#studentDate').fill('2026-10-14');}};
 for(const [name,answers] of [['Vocabulary',vocabulary],['Reading',reading]]){
  await open(name);await p.getByRole('button',{name:'Start Test',exact:true}).click();
  await p.evaluate(answers=>{answers.forEach((answer,i)=>{const block=document.querySelector('[data-question="'+(i+1)+'"]');const labels=[...block.querySelectorAll('.choice-label')];const matches=labels.filter(l=>l.lastElementChild.textContent===answer);if(matches.length!==1)throw Error('Ambiguous or missing option '+(i+1));matches[0].querySelector('input').click();});},answers);
  await p.getByRole('button',{name:'Save & Submit',exact:true}).first().click();assert.deepEqual(await p.evaluate(()=>state.autoScore),{score:answers.length,total:answers.length});assert.equal(await p.locator('.score-big:visible').count(),0);console.log(name+': independently solved '+answers.length+'/'+answers.length+'; no immediate result revealed');
 }
 await open('Writing');await p.getByRole('button',{name:'Start Test',exact:true}).click();
 const cfg=await p.evaluate(()=>CONFIG.arrangements);
 for(let i=0;i<10;i++){
  const supplied=cfg[i].tokens.join(' ').toLowerCase().split(/\s+/).sort();const required=normalize(canonical[i]).split(' ').sort();assert.deepEqual(supplied,required,'Missing or extra word in sentence '+(i+1));
  let remaining=alternatives[i]||canonical[i];const buttons=p.locator('[data-sentence="'+i+'"]');
  for(let step=0;step<4;step++){
   const labels=await buttons.allTextContents();const token=labels.find(t=>remaining.startsWith(t));assert(token,'Cannot construct sentence '+(i+1));
   await buttons.filter({hasText:new RegExp('^'+token+'$')}).first().click();remaining=remaining.slice(token.length).trim();
  }
  assert.equal(remaining,'');
 }
 assert.deepEqual(await p.evaluate(()=>gradeSection()),{score:10,total:10});
 await p.reload();assert.deepEqual(await p.evaluate(()=>gradeSection()),{score:10,total:10});
 await p.evaluate(()=>{const saved=JSON.parse(JSON.stringify(state.orders));state.orders.s0=[1,1,1,1];if(gradeSection().score!==9)throw Error('Duplicate chunks received credit');state.orders.s0=[1,3];if(gradeSection().score!==9)throw Error('Incomplete sentence received credit');state.orders=saved;});
 console.log('Writing: all 10 sentences contain exactly the required words; five valid alternate orders accepted; duplicate and incomplete orders rejected; arrangements survive reload');
 await p.getByRole('button',{name:'Next Page',exact:true}).click();await p.locator('#email').fill('Dear Ms. Carter, Our club booked the workshop for November 14, but the confirmation says November 15. Our speaker is only available on November 14. Could you correct the booking? If our original room is unavailable, Room 204 would work. Thank you for your help.');
 await p.getByRole('button',{name:'Next Page',exact:true}).click();await p.locator('#discussion').fill('In my view, universities should permit AI tools under clear rules. First, these tools can provide explanations that help students begin a difficult topic. For example, a student could ask for an explanation of a scientific concept and then compare it with the course textbook. However, generated information can be inaccurate, so students must check sources and explain how they used the tool. I understand Daniel\'s concern about dependence. To address it, teachers could require students to defend their work in a short conversation. In conclusion, responsible use and accountability would support learning while protecting independent thinking.');await p.getByRole('button',{name:'Save & Submit',exact:true}).first().click();assert.equal(await p.evaluate(()=>state.autoScore.score),10);
 await open('Speaking');const manifest=JSON.parse(fs.readFileSync(path.join(dir,'speaking-audio-manifest.json'),'utf8'));const html=fs.readFileSync(path.join(dir,'Speaking.html'),'utf8');assert(manifest.every(c=>!html.includes(c.text)));
 await p.getByRole('button',{name:'Start Test',exact:true}).click();
 for(let i=0;i<11;i++){
  const id=i<7?'repeat-'+(i+1):'interview-'+(i-6);
  await p.locator('#prompt-'+id).click();assert(await p.locator('#next').isDisabled());
  await p.waitForFunction(id=>document.getElementById('status-'+id).textContent.includes('RECORDING'),id,{timeout:15000});assert(await p.locator('#prompt-'+id).isDisabled());assert(await p.locator('#previous').isDisabled());
  await p.waitForTimeout(1000);await p.locator('#stop-'+id).click();await p.waitForFunction(id=>document.getElementById('status-'+id).textContent.includes('saved'),id,{timeout:10000});
  console.log('Recorded '+id);
  const duration=await p.locator('#source-'+id).evaluate(a=>a.duration);assert(duration>0&&Number.isFinite(duration));
  if(i<10)await p.getByRole('button',{name:'Next Page',exact:true}).click();
 }
 assert.equal(await p.evaluate(async()=> (await getClips()).length),11);assert(await p.evaluate(async()=> (await getClips()).every(c=>c.blob.size>0)));await p.reload();await p.waitForFunction(()=>!document.getElementById('playback-interview-4').hidden);
 await p.getByRole('button',{name:'Save & Submit',exact:true}).first().click();assert.equal(await p.locator('.section-block:visible').count(),0);
 console.log('Speaking: played all 11 embedded prompts and saved 11 simulated-microphone recordings; navigation locked during playback/permission/recording; no transcripts in student HTML');
 await open('Start Here');assert.equal(await p.locator('#completion').textContent(),'4 of 4 sections submitted.');assert(await p.locator('#finalResults').isHidden());await p.locator('#submitAll').click();assert.equal(await p.locator('#subtotal').textContent(),'80 / 80');assert.equal(await p.locator('#finalResults td').filter({hasText:'Pending teacher review'}).count(),3);
 await require('./capture_monthly_trial.cjs').capture(p,'IBT');
 const [download]=await Promise.all([p.waitForEvent('download'),p.locator('#downloadAll').click()]);const pack=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(pack.recordings.length,11);assert(pack.recordings.every(c=>c.data.startsWith('data:audio/')));assert(pack.sections.writing.answers.email.includes('November 14'));assert(pack.sections.writing.answers.discussion.includes('accountability'));
 console.log('Final result: 80/80 automatically marked, three manual-review entries pending; exported package contains both written responses and all 11 audio recordings');
 // Reloading must not award fresh time for writing tasks that expired while the file was closed.
 await open('Writing');await p.getByRole('button',{name:'Restart Test'}).click();await p.waitForFunction(()=>!state.started);await p.getByRole('button',{name:'Start Test',exact:true}).click();await p.evaluate(()=>{state.deadline=Date.now()-20*60000;save();});await p.reload();await p.waitForFunction(()=>state.submitted);assert.equal(await p.evaluate(()=>state.page),2);assert.equal(await p.locator('.section-block:visible').count(),0);
 console.log('Expired writing tasks remain expired after reopening; automatic submission does not reveal answers');
 // Submission while a prompt is playing must cancel playback and prevent a late recording.
 await open('Speaking');await p.getByRole('button',{name:'Restart Test'}).click();await p.waitForFunction(()=>!state.started);await p.getByRole('button',{name:'Start Test',exact:true}).click();await p.locator('#prompt-repeat-1').click();await p.getByRole('button',{name:'Save & Submit',exact:true}).first().click();assert(await p.locator('#source-repeat-1').evaluate(a=>a.paused));assert.equal(await p.evaluate(()=>activePrompt),null);assert.equal(await p.evaluate(()=>activeRecorder),null);
 await p.waitForTimeout(3000);assert.equal(await p.evaluate(async()=> (await getClips()).length),0);assert.equal(await p.locator('.section-block:visible').count(),0);
 console.log('Submitting during prompt playback stops audio and prevents late microphone recording');
 assert.deepEqual(errors,[]);await browser.close();console.log('Full monthly exam audit passed');
})().catch(e=>{console.error(e);process.exit(1);});

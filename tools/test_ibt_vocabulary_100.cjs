const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const {pathToFileURL}=require('url');
const {chromium}=require('/Users/reuben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),file=path.join(root,'monthly-exams/november-2026/ibt/index.html');
const out=path.join(root,'supabase/.local/vocabulary-100/qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/reuben/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true}),page=await context.newPage(),errors=[],requests=[];
 await context.route('**/*',r=>{if(/^https?:/.test(r.request().url())){requests.push(r.request().url());return r.abort();}return r.continue();});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
  await page.goto(pathToFileURL(file).href);await page.waitForSelector('#sectionList button');
  const cfg=await page.evaluate(()=>CONFIG),v=cfg.find(c=>c.id==='vocabulary');assert.equal(v.questions.length,100);assert.equal(v.minutes,55);assert.equal(v.pages,10);assert.equal(cfg.reduce((n,c)=>n+c.minutes,0),125);
  assert.equal(await page.locator('[data-section="vocabulary"] .exam-page').count(),10);
  assert.equal(await page.locator('[data-section="vocabulary"] input[type="radio"]').count(),400);
  assert.equal(new Set(v.questions.map(q=>q.id)).size,100);
  for(const [i,q] of v.questions.entries()){assert.equal(q.n,i+1);assert.equal(q.id,'v'+(i+1));assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert(q.key>=0&&q.key<4);assert(q.explanation.trim());assert(/<u>.*?<\/u>/.test(q.text));}
  const baseHTML=cp.execFileSync('/usr/bin/arch',['-arm64','/usr/bin/git','show','HEAD:monthly-exams/november-2026/ibt/index.html'],{cwd:root,encoding:'utf8',maxBuffer:20000000});
  const bodySections=s=>Object.fromEntries(['reading','writing','speaking'].map((id,i,ids)=>{const start=s.indexOf('<div data-section="'+id+'"');const end=i<2?s.indexOf('<div data-section="'+ids[i+1]+'"',start):s.indexOf('<script type="application/json" id="embedded-save"',start);return [id,s.slice(start,end)];}));
  assert.deepEqual(bodySections(fs.readFileSync(file,'utf8')),bodySections(baseHTML),'Other exam sections and media must be unchanged');
  await page.locator('#studentName').fill('SYNTHETIC LOCAL VOCABULARY CHECK');await page.locator('#studentClass').fill('TEST ONLY');await page.locator('#studentDate').fill('2026-11-25');
  assert(/100\s+questions\s*\/\s*55\s+minutes/i.test(await page.locator('#sectionList').innerText()));
  await page.evaluate(()=>openSection('vocabulary'));await page.locator('#start').click();
  assert((await page.locator('#timerDisplay').innerText()).startsWith('54:')||(await page.locator('#timerDisplay').innerText())==='55:00');
  for(let p=0;p<10;p++){
   assert((await page.locator('#indicator').innerText()).toLowerCase().includes('page '+(p+1)+' of 10'));
   for(const q of v.questions.slice(p*10,p*10+10))await page.locator('input[name="'+q.id+'"][value="'+q.key+'"]').check();
   assert(await page.locator('#finalResults').isHidden());assert(!(await page.locator('[data-section="vocabulary"]').innerText()).includes('Correct answer:'));
   if(p===5){await page.screenshot({path:path.join(out,'Cellular Passage Desktop.png'),fullPage:true});for(const viewport of [{width:390,height:844},{width:768,height:1024}]){await page.setViewportSize(viewport);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'Cellular Passage Mobile.png'),fullPage:true});await page.setViewportSize({width:1366,height:768});}
   if(p===6)await page.screenshot({path:path.join(out,'Cell Meanings.png'),fullPage:true});
   if(p<9)await page.locator('#next').click();
  }
  assert.deepEqual(await page.evaluate(()=>grade('vocabulary')),{score:100,total:100});await page.reload();assert.deepEqual(await page.evaluate(()=>grade('vocabulary')),{score:100,total:100});assert((await page.locator('#indicator').innerText()).toLowerCase().includes('page 10 of 10'));
  const core=await import(pathToFileURL(path.join(root,'supabase/functions/monthly-mark/core.mjs')).href),catalog={objective:[{id:'vocabulary',title:'Vocabulary',questions:v.questions}],sections:[{id:'vocabulary',title:'Vocabulary'}],tasks:[]};
  const answers=Object.fromEntries(v.questions.map(q=>[q.id,String(q.key)]));assert.equal(core.objectiveReport(catalog,answers)[0].score,100);assert.equal(core.objectiveReport(catalog,{})[0].score,0);
  const wrong=Object.fromEntries(v.questions.map(q=>[q.id,String((q.key+1)%4)]));assert.equal(core.objectiveReport(catalog,wrong)[0].score,0);
  await page.evaluate(()=>{for(const c of CONFIG){if(c.id==='reading')for(const q of c.questions)state.answers[q.id]=String(q.key);if(c.arrangements)c.arrangements.forEach((q,i)=>state.orders['s'+i]=q.acceptedOrders[0]);state.sections[c.id].submitted=true;}save();render();});
  await page.locator('#overviewBtn').click();await page.locator('#finalSubmit').click();assert(await page.locator('#finalResults').isVisible());assert((await page.locator('#finalResults').innerText()).includes('100 / 100'));assert((await page.locator('#subtotal').innerText()).includes('140 / 140'));
  await page.evaluate(()=>showDetails());await page.waitForSelector('#details .report-question');assert.equal(await page.locator('#details .report-question').filter({hasText:'Question 100'}).count(),1);assert((await page.locator('#details').innerText()).includes('Why:'));
  const downloadPromise=page.waitForEvent('download');await page.locator('button[onclick="downloadReport()"]').click();const downloaded=await downloadPromise;await downloaded.saveAs(path.join(out,'Synthetic Report.html'));const report=fs.readFileSync(path.join(out,'Synthetic Report.html'),'utf8');assert(report.includes('140 / 140'));assert(report.includes('coverage-title'));assert(report.includes('Question 100'));
  await page.evaluate(async()=>{openSection('vocabulary');await restart();});assert.deepEqual(await page.evaluate(()=>grade('vocabulary')),{score:0,total:100});assert(await page.locator('#finalResults').isHidden());assert.equal(await page.locator('#start').innerText(),'Start Test');await page.locator('#start').click();assert(await page.evaluate(()=>state.sections.vocabulary.deadline-Date.now()>54*60000));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const summary={questionCount:100,minutes:55,examMinutes:125,controls:400,pages:10,allCorrect:'100/100',allWrong:'0/100',allBlank:'0/100',reportSubtotal:'140/140',autosaveAndReopen:'passed',restart:'passed',mobileOverflow:'none',otherSections:'unchanged',pageErrors:errors,networkRequests:requests,liveAiOrEmailCalls:0};fs.writeFileSync(path.join(out,'Checks.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

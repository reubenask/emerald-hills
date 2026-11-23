(()=>{function initialiseSpeakingFocus(){
  const section=document.querySelector('[data-section="speaking"]');
  if(!section)return;
  const pages=[...section.querySelectorAll('.exam-page')].filter(p=>!p.querySelector('.speaking-layout'));
  if(!pages.length)return;
  for(const [i,page]of pages.entries()){
    const body=page.querySelector('.section-body'),recorder=body?.querySelector('.record-panel');
    if(!body||!recorder||body.querySelector(':scope>.exam-focus-layout'))continue;
    body.classList.remove('speak-split');
    for(const old of body.querySelectorAll(':scope>.speak-side,:scope>.speak-main'))old.replaceWith(...old.childNodes);
    const layout=document.createElement('div'),stimulus=document.createElement('div');
    layout.className='exam-focus-layout';stimulus.className='exam-focus-stimulus';
    for(const node of [...body.childNodes])if(node!==recorder)stimulus.append(node);
    layout.append(stimulus,recorder);body.append(layout);
    page.classList.add('exam-focus-page',i===0?'exam-focus-read':i===1?'exam-focus-story':'exam-focus-listen');
  }
  let restart=document.getElementById('examFocusRestart');
  if(!restart){restart=document.createElement('button');restart.id='examFocusRestart';restart.className='btn btn-danger exam-focus-restart';restart.textContent='Restart Speaking';document.body.append(restart);}restart.onclick=()=>window.restart();
  let pending=false;
  function update(){
    pending=false;
    const page=pages.find(p=>!p.hidden&&!section.hidden&&p.classList.contains('exam-focus-page'));
    if(document.body.classList.contains('exam-speaking-focus')!==!!page)document.body.classList.toggle('exam-speaking-focus',!!page);
    const original=document.querySelector('[onclick="restart()"]');
    if(original&&restart.disabled!==original.disabled)restart.disabled=original.disabled;
    if(!page)return;
    if(page.classList.contains('exam-focus-read')){
      const box=page.querySelector('.exam-focus-stimulus'),passage=box.querySelector('.passage'),img=box.querySelector('img');
      if(passage){let size=innerWidth<=760?14.5:innerHeight<700?16:19;passage.style.fontSize=size+'px';if(img)img.style.display=innerWidth<=760||innerHeight<700?'none':'';
        while(box.scrollHeight>box.clientHeight+1&&size>14){size-=.5;passage.style.fontSize=size+'px';}
      }
    }
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
  new MutationObserver(schedule).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
  addEventListener('resize',schedule);schedule();
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialiseSpeakingFocus,{once:true});else initialiseSpeakingFocus();})();

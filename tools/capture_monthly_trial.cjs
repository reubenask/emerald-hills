const fs=require('fs'),path=require('path');
exports.capture=async function(p,label){
 const dir=process.env.MONTHLY_TRIAL_OUTPUT_DIR;if(!dir)return;
 fs.mkdirSync(dir,{recursive:true});const base=path.join(dir,label);
 const student=label==='IBT'?'iBT Trial Student':label==='ITP'?'ITP Trial Student':'Primary Trial Student';
 for(const [id,value] of [['studentName',student],['studentClass',label.replaceAll('_',' ')],['studentDate','2026-10-14']])if(await p.locator('#'+id).count())await p.locator('#'+id).fill(value);
 const result=p.locator('#finalResults');await result.screenshot({path:base+'_Result.png'});
 await p.pdf({path:base+'_Trial_Printout.pdf',format:'A4',printBackground:true,margin:{top:'17mm',bottom:'17mm',left:'12mm',right:'12mm'},displayHeaderFooter:true,headerTemplate:'<div style="font:9px Arial;width:100%;text-align:center;color:#555">TRIAL RUN - synthetic responses and simulated microphone; not a real student assessment</div>',footerTemplate:'<div style="font:9px Arial;width:100%;text-align:center;color:#555">Current exam printout | <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
 const state=await p.evaluate(()=>typeof CONFIG!=='undefined'&&Array.isArray(CONFIG)?{student:state.student,answers:state.answers,sections:state.sections,final:state.final}:null);
 fs.writeFileSync(base+'_Trial_Summary.json',JSON.stringify({exam:label,testDate:'2026-10-14',sourceUrl:p.url(),syntheticResponses:true,simulatedMicrophone:true,resultText:await result.innerText(),...(state?{state}:{})},null,2));
 if(label==='IBT'){
  const [pack]=await Promise.all([p.waitForEvent('download'),p.locator('#downloadAll').click()]);await pack.saveAs(base+'_All_Responses.json');
 }else{
  const [work]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download Work for Teacher',exact:true}).click()]);await work.saveAs(base+'_Student_Work.html');
  const [saved]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download Saved Exam',exact:true}).click()]);await saved.saveAs(base+'_Saved_Exam.html');
 }
 console.log('Trial printout and native downloads saved for '+label+'.');
};

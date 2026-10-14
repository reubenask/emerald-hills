const fs=require('fs'),path=require('path'),cp=require('child_process');
const dir=path.resolve(__dirname,'../Trial Outputs/2026-10-14');fs.mkdirSync(dir,{recursive:true});
const tests=[['Primary_Step_2','audit_monthly_primary_step2.cjs'],['ITP','audit_monthly_junior.cjs'],['IBT','audit_monthly_exam.cjs']];
let failed=false;
for(const [label,file] of tests){
 console.log('Starting full '+label+' trial.');
 const r=cp.spawnSync(process.execPath,[path.join(__dirname,file)],{env:{...process.env,MONTHLY_TRIAL_OUTPUT_DIR:dir,MONTHLY_TRIAL_LIVE_BASE:'https://reubenask.github.io/emerald-hills/monthly-exams/'},encoding:'utf8',timeout:420000,maxBuffer:10*1024*1024});
 const log=(r.stdout||'')+(r.stderr||'')+(r.error?'\n'+r.error.message:'');fs.writeFileSync(path.join(dir,label+'_Audit_Log.txt'),log);console.log(log);console.log(label+' exit: '+r.status);if(r.status!==0)failed=true;
}
console.log('Outputs: '+dir);process.exitCode=failed?1:0;

const fs=require('fs'),path=require('path');
const dir=path.resolve(__dirname,'../supabase/functions/monthly-mark');
const core=fs.readFileSync(path.join(dir,'core.mjs'),'utf8').replace(/^export /gm,'');
const entry=fs.readFileSync(path.join(dir,'index.ts'),'utf8').replace(/^import .*from '\.\/core\.mjs';\n/m,'');
fs.mkdirSync(path.resolve(__dirname,'../supabase/.local'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,'../supabase/.local/monthly-mark-deploy.ts'),core+'\n'+entry);
console.log('Built single-file monthly-mark function (no embedded credentials).');

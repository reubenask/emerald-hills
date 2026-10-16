const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
for(const [exam,files] of [['primary-step2',['monthly-exams/primary-step2/index.html']],['itp',['monthly-exams/junior/index.html']],['ibt',['monthly-exams/ibt/Start Here.html','monthly-exams/ibt/Vocabulary.html','monthly-exams/ibt/Reading.html','monthly-exams/ibt/Writing.html','monthly-exams/ibt/Speaking.html']]])for(const file of files){
 const target=path.join(root,file);if(!fs.existsSync(target))continue;
 let html=fs.readFileSync(target,'utf8');
 html=html.replace(/<html([^>]*)>/,'<html$1 data-cloud-exam="'+exam+'">').replace(/ data-cloud-exam="([a-z0-9-]+)" data-cloud-exam="([a-z0-9-]+)"/,' data-cloud-exam="'+exam+'"');
 const scripts='<script src="../shared/cloud-config.js"></script><script src="../shared/cloud-client.js"></script><script src="../shared/exam-cloud.js"></script>';
 if(!html.includes('shared/exam-cloud.js'))html=html.replace('</body>',scripts+'</body>');
 // Old cover statements describe the manual-only version; retain original section controls.
 html=html.replaceAll('Answer keys are not displayed. Writing and speaking will remain pending teacher review.','Detailed answers, transcripts and AI-assisted feedback are available only in your report after final submission.').replaceAll('The email, discussion, and speaking remain pending teacher review.','The detailed report includes AI-assisted speaking and writing feedback after final submission; unavailable marking remains pending.');
 fs.writeFileSync(target,html);console.log('Installed adult report adapter: '+file);
}

// Read-aloud must be the set passage: a different text scores 0 and is flagged; a real (even imperfect) reading is kept.
import assert from 'node:assert/strict';
import { readAloudMatch, reportEmail } from '../supabase/functions/monthly-mark/core.mjs';
const target='A Useful Job. Lily and Ben are helping in their school garden today. Their teacher has given them a useful job. First, they put young plants into large containers. Ben measures the space between the plants.';
assert.equal(readAloudMatch(target,'Hello, my name is Sam. Last weekend, I went to the park with my friends. First, we played football, and then we had a picnic under a big tree.').matches,false,'unrelated talk');
assert.equal(readAloudMatch(target,'Lily and Ben are helping in the school garden today. Their teacher give them a useful job. First they put young plant into large container.').matches,true,'imperfect real reading');
assert.equal(readAloudMatch(target,'Lily and Ben').matches,false,'too few words to count as a reading');
assert.equal(readAloudMatch(target,'').matches,false,'nothing said');
const mail=reportEmail({exam:'primary-step2-november-2026',student:{name:'T'},objective:[],scorecard:{sections:[],complete:true,overall:50},jobs:[{section:'speaking',title:'Read Aloud',status:'complete',result:{score:0,maxScore:10,offTarget:true,categories:[{name:'Reading accuracy',score:0,maxScore:5}]}}]});
assert.match(mail.subject,/^\[Check needed\]/);assert.match(mail.html,/reading does not match the passage/);
console.log('Read-aloud match: unrelated talk scores 0 and is flagged; a real, imperfect reading is kept.');

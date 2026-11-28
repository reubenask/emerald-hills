// The second check only reads a transcript, so it may not change categories that are judged by listening.
import assert from 'node:assert/strict';
import { RUBRICS, moderatorMayChange } from '../supabase/functions/monthly-mark/core.mjs';
assert.equal(moderatorMayChange('speaking','Intelligibility and delivery'),false);
assert.equal(moderatorMayChange('speaking','Delivery and intelligibility'),false);
assert.equal(moderatorMayChange('speaking','Intelligibility'),false);
assert.equal(moderatorMayChange('speaking','Pacing and intonation'),false);
assert.equal(moderatorMayChange('speaking','Repetition accuracy'),true);
assert.equal(moderatorMayChange('speaking','Read-aloud fluency and accuracy'),true,'junior holistic band can still be moderated');
assert.equal(moderatorMayChange('writing','Grammar'),true);
for(const r of ['speaking','readAloud','repeat'])assert.ok(RUBRICS[r].some(([n])=>!moderatorMayChange('speaking',n)),r+' has a listening-only category');
console.log('Moderation: listening-only speaking categories are kept as first marked.');

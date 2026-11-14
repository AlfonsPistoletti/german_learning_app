// Run: node tools/test-srs.mjs
import assert from 'node:assert/strict';
import { review, startOfDay, DAY, MIN, fmtDelay } from '../src/srs.js';

const now = new Date(2026, 10, 14, 20, 0).getTime();
const midnight = startOfDay(now);

// New card: Again -> 1 min, Hard -> 6 min, Good -> tomorrow, Easy -> 4 days
assert.equal(review(undefined, 0, now).due, now + MIN);
assert.equal(review(undefined, 1, now).due, now + 6 * MIN);
const g1 = review(undefined, 2, now);
assert.deepEqual([g1.ivl, g1.reps, g1.due], [1, 1, midnight + DAY]);
assert.equal(review(undefined, 3, now).ivl, 4);

// Good grows the interval: 1 -> 3 -> 8
const g2 = review(g1, 2, now);
assert.equal(g2.ivl, 3);
assert.equal(review(g2, 2, now).ivl, 8);

// Easy raises ease, Hard lowers it (floor 1.3), Again resets and counts a lapse
assert.equal(review(g2, 3, now).ease, 2.65);
assert.equal(review({ ...g2, ease: 1.35 }, 1, now).ease, 1.3);
const lapse = review(g2, 0, now);
assert.deepEqual([lapse.reps, lapse.ivl, lapse.lapses], [0, 0, 1]);
assert.equal(review(lapse, 2, now).ivl, 1);

assert.equal(fmtDelay(MIN), '1m');
assert.equal(fmtDelay(3 * DAY), '3d');

// Data sanity: unique ids, every entry complete
const { DECKS, VERBS } = await import('../src/data/a1.js');
const ids = DECKS.flatMap(d => d.words.map(w => w[0]));
assert.equal(new Set(ids).size, ids.length, 'duplicate word: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
for (const w of DECKS.flatMap(d => d.words)) assert.ok(w.length === 4 && w[0] && w[1], 'bad entry ' + w);
for (const v of VERBS) assert.equal(v.length, 8, 'bad verb ' + v[0]);
console.log(`ok: srs + ${ids.length} words, ${VERBS.length} verbs`);

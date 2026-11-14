// Run: npm test
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
// Typed answers
const { checkAnswer, missingCap, variants, clockPhrase, timeAnswers, timeFormat, tokens } = await import('../src/answer.js');
assert.equal(missingCap('der apfel', ['der Apfel']), 'Apfel');
assert.equal(missingCap('der Apfel', ['der Apfel']), undefined);
assert.equal(missingCap('aepfel', ['Äpfel']), 'Äpfel'); // also on a close match
assert.equal(missingCap('baum', ['der Baum']), undefined); // wrong answer: no hint
assert.equal(missingCap('gut', ['gut']), undefined);
assert.equal(timeFormat('215'), '2:15');
assert.equal(timeFormat('1015'), '10:15');
assert.equal(timeFormat('10:155'), '10:15'); // max 4 digits
assert.equal(timeFormat('9'), '9');
assert.equal(timeFormat('10:1'), '1:01'); // mid-typing: digits re-grouped
assert.equal(checkAnswer('der Apfel', 'der Apfel'), 'right');
assert.equal(checkAnswer('  Der  apfel. ', 'der Apfel'), 'right');
assert.equal(checkAnswer('die strasse', 'die Straße'), 'close');
assert.equal(checkAnswer('die Strasse', 'die Straße'), 'close');
assert.equal(checkAnswer('aepfel', 'Äpfel'), 'close');
assert.equal(checkAnswer('Apfel', 'der Apfel'), 'wrong'); // article required
assert.equal(checkAnswer('3.49', ['3,49', '3.49']), 'right');
assert.deepEqual(variants('gern(e)'), ['gern(e)', 'gern', 'gerne']);
assert.ok(variants('zum Beispiel (z. B.)').includes('zum Beispiel'));
assert.equal(clockPhrase(2, 15), 'Viertel nach zwei');
assert.equal(clockPhrase(2, 30), 'halb drei');
assert.equal(clockPhrase(2, 45), 'Viertel vor drei');
assert.equal(clockPhrase(11, 55), 'fünf vor zwölf');
assert.equal(clockPhrase(12, 30), 'halb eins');
assert.equal(clockPhrase(1, 0), 'ein Uhr');
assert.ok(timeAnswers(2, 15, true).includes('14:15') && timeAnswers(2, 15, true).includes('02:15'));
assert.ok(timeAnswers(12, 5, true).includes('0:05') && timeAnswers(12, 5, true).includes('12:05'));
assert.deepEqual(timeAnswers(14, 0, false), ['14:00', '14:00']);
assert.deepEqual(tokens('Wo ist die Post?'), ['Wo', 'ist', 'die', 'Post?']);

// Exam data shape
const { INTRO, FORMS, SPEAK } = await import('../src/data/exam.js');
for (const p of INTRO) assert.equal(p.length, 4, 'bad intro ' + p[0]);
for (const f of FORMS) { assert.ok(f.text); for (const fl of f.fields) assert.ok(fl.length === 3 && fl[2].length, 'bad field ' + fl[0]); }
for (const s of SPEAK) assert.ok(s.length === 4 && s.every(Boolean), 'bad speak card ' + s[1]);
// every form answer must actually appear in its text (catches typos)
for (const f of FORMS) for (const [label, , [a]] of f.fields) if (!/^\d$|Nächte/.test(label)) assert.ok(f.text.includes(a.split(' ')[0]), `form answer "${a}" not in text`);

// Listening templates: run each many times, check the task is well-formed
const { TEMPLATES } = await import('../src/data/hoeren.js');
for (const tpl of TEMPLATES) for (let k = 0; k < 300; k++) {
  const t = tpl(), all = [t.text, t.question, t.en, ...t.options].join(' | ');
  assert.ok(!/undefined|NaN/.test(all), `${tpl.name}: ${all}`);
  assert.equal(t.options.length, 3, tpl.name);
  assert.equal(new Set(t.options).size, 3, `${tpl.name} duplicate options: ${t.options}`);
  assert.ok(t.options.includes(t.answer), `${tpl.name}: answer not in options`);
  assert.ok(t.text.includes(t.said), `${tpl.name}: "${t.said}" not spoken in: ${t.text}`);
  for (const o of t.options) assert.ok(t.stmt(o).length > 5, tpl.name);
}
if (process.argv.includes('--samples')) for (const tpl of TEMPLATES) { const t = tpl(); console.log(`\n[${tpl.name}] ${t.text}\n  ${t.question} -> ${t.answer}  (${t.options.join(' / ')})\n  R/F: ${t.stmt(t.options[0])}`); }

console.log(`ok: srs, answers, ${TEMPLATES.length} listening templates, ${ids.length} words, ${VERBS.length} verbs, ${FORMS.length} forms, ${SPEAK.length} speaking cards`);

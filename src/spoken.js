// Every fixed text the app reads aloud, so tools/make-audio.mjs can pre-generate a clip for each.
// Texts not listed here (prices, numbers > 100, her own intro answers) fall back to the device voice.
// When adding a new say(...) call in app.js, add its texts here (or use a helper from this file).
import { DECKS, VERBS, PERSONS } from './data/a1.js';
import { INTRO, SPEAK } from './data/exam.js';
import { POOL } from './data/hoeren.js';
import { clockPhrase } from './answer.js';

export const verbSay = (p, form) => `${PERSONS[p].split('/')[0]} ${form}`;   // "er/sie/es" -> "er ist"
export const officialTime = (hr, m) => `${hr} Uhr${m ? ' ' + m : ''}`;        // "14 Uhr 15"

export function allSpokenTexts() {
  const words = DECKS.flatMap(d => d.words);
  const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  return [...new Set([
    ...words.map(w => w[0]),                                           // headwords
    ...words.map(w => w[3]).filter(Boolean),                           // example sentences
    ...VERBS.flatMap(([, , ...forms]) => forms.map((f, p) => verbSay(p, f))),
    ...SPEAK.map(s => s[2]),                                           // speaking cards: question/request
    ...INTRO.map(p => p[2]),                                           // examiner questions
    ...range(101, i => String(i)),                                     // numbers drill 0-100
    ...range(12, h => range(12, m => clockPhrase(h + 1, 5 * m))).flat(),      // everyday times
    ...range(24, h => range(12, m => officialTime(h, 5 * m))).flat(),         // official times
    ...POOL.map(t => t.text),                                          // listening texts
  ])].filter(t => t.trim());
}

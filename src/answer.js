// Pure helpers for typed answers, listening drills and the sentence builder. Tested in tools/test.mjs.

export const normalize = s => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/\s*[.!?]+$/, '');
const fold = s => normalize(s).replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

// 'right' | 'close' (only ß/ss or umlaut spelling differs: counts as right) | 'wrong'
export function checkAnswer(input, answers) {
  const list = [].concat(answers);
  if (list.some(a => normalize(a) === normalize(input))) return 'right';
  if (list.some(a => fold(a) === fold(input))) return 'close';
  return 'wrong';
}

// First word typed lowercase that the matching answer capitalizes (German nouns), e.g. "der apfel" -> "Apfel"; else undefined.
export function missingCap(input, answers) {
  const a = [].concat(answers).find(x => checkAnswer(input, x) !== 'wrong');
  if (!a) return;
  const aw = a.trim().split(/\s+/), iw = input.trim().split(/\s+/);
  if (aw.length !== iw.length) return;
  const i = aw.findIndex((w, k) => /^\p{Lu}/u.test(w) && /^\p{Ll}/u.test(iw[k]));
  return i < 0 ? undefined : aw[i].replace(/[.!?,]+$/, '');
}

// Accepted spellings of a headword: "gern(e)" -> gern(e), gern, gerne; "zum Beispiel (z. B.)" -> also "zum Beispiel".
export const variants = de => [...new Set([de, de.replace(/\s*\([^)]*\)/g, ''), de.replace(/[()]/g, '')].map(s => s.trim()))];

const NUM = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
// Colloquial German clock time for h = 1..12, m = 0..55 in steps of 5.
export function clockPhrase(h, m) {
  const n = NUM[h], nx = NUM[h % 12 + 1];
  return {
    0: h === 1 ? 'ein Uhr' : `${n} Uhr`, 5: `fünf nach ${n}`, 10: `zehn nach ${n}`, 15: `Viertel nach ${n}`,
    20: `zwanzig nach ${n}`, 25: `fünf vor halb ${nx}`, 30: `halb ${nx}`, 35: `fünf nach halb ${nx}`,
    40: `zwanzig vor ${nx}`, 45: `Viertel vor ${nx}`, 50: `zehn vor ${nx}`, 55: `fünf vor ${nx}`,
  }[m];
}

// Accepted written forms of a clock time: 2:15, 02:15, 14:15 (12-hour phrases are ambiguous).
export function timeAnswers(h, m, ambiguous) {
  const mm = String(m).padStart(2, '0');
  const hours = ambiguous ? [h % 12, h % 12 + 12] : [h];
  return hours.flatMap(x => [`${x}:${mm}`, `${String(x).padStart(2, '0')}:${mm}`]);
}

// Live time input: keep up to 4 digits, colon before the last two ("215" -> "2:15", "1015" -> "10:15").
export function timeFormat(s) {
  const d = s.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, -2)}:${d.slice(-2)}` : d;
}

export const tokens = s => s.trim().split(/\s+/);

// TTS reads "12." as an ordinal ("zwölften"). In spoken texts a number + period is always a sentence end,
// so swap the period for a comma: cardinal number, still a short pause. "15.30 Uhr" (digit follows) is untouched.
// shortcut: would also break real ordinals like "am 3. Mai"; none are spoken today, write them out ("am dritten Mai") if added.
export const ttsText = s => s.replace(/[()]/g, '').replace(/(\d)\.(?=\s|$)/g, '$1,');

// Pre-generated neural voice clips (tools/make-audio.mjs). Changing VOICE or RATE changes every id -> re-run `npm run audio`.
export const VOICE = 'de-DE-ChristophNeural', RATE = '-10%';
// File name of a text's clip: FNV-1a hash of voice + rate + spoken text, base36.
export function clipId(text) {
  let h = 0x811c9dc5;
  for (const ch of `${VOICE}|${RATE}|${ttsText(text)}`) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

import './style.css';
import { createIcons, createElement, Layers, PencilLine, ChartLine, Volume2, ChevronLeft } from 'lucide';
import { DECKS, VERBS, PERSONS } from './data/a1.js';
import { INTRO, FORMS, SPEAK } from './data/exam.js';
import { POOL } from './data/hoeren.js';
import { verbSay, officialTime } from './spoken.js';
import { review, fmtDelay, DAY } from './srs.js';
import { checkAnswer, missingCap, variants, clockPhrase, timeAnswers, timeFormat, tokens, ttsText, clipId } from './answer.js';

createIcons({ icons: { Layers, PencilLine, ChartLine } }); // nav icons: <i data-lucide="..."> in index.html

const NEW_PER_DAY = 10;
const LEARN_AHEAD = 20 * 60e3; // like Anki: show learning cards early when nothing else is due
const REVERSE_AFTER = 3; // days of forward interval before the English -> German card unlocks
const KEY = 'a1-srs-v1';

// ---------- data ----------
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const CARDS = DECKS.flatMap(d => d.words.map(([de, en, pl, ex]) => ({ id: de, de, en, pl, ex, topic: d.topic })));
// New-card order: basics decks first, then the A–Z list in a stable shuffled order.
const NEW_ORDER = [...CARDS].sort((a, b) =>
  (a.topic === 'Word list A–Z') - (b.topic === 'Word list A–Z') || (a.topic === 'Word list A–Z' ? hash(a.id) - hash(b.id) : 0));
const article = de => (de.match(/^(der|die|das) /) || [])[1];
const NOUNS = CARDS.filter(c => article(c.de) && c.pl !== '(pl.)');
// Review items: every card forward (German -> English), plus a typed reverse card (English -> German)
// for words with one clear spelling (no stems like "dein-", no "a / b" alternatives).
const REVERSES = CARDS.filter(c => !/-$|,|\//.test(c.de)).map(c => ({ ...c, id: 'en:' + c.id, base: c.id, rev: true }));
const ITEMS = [...CARDS, ...REVERSES];
// Typed answers accept any word with the same English meaning (doctor: der Arzt / der Doktor).
const answersFor = c => CARDS.filter(o => o.en === c.en).flatMap(o => variants(o.de));
const sentenceOk = s => !/[–„"…]|\.\.\./.test(s);
const ORDER_POOL = CARDS.filter(c => c.ex && sentenceOk(c.ex) && tokens(c.ex).length >= 4 && tokens(c.ex).length <= 9);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Group 1 = preceding non-letter, group 2 = the word (no lookbehind: older iOS Safari can't parse it).
const gapRe = c => new RegExp(`(^|[^\\p{L}])(${esc(c.de.replace(/^(der|die|das|sich) /, ''))})(?![\\p{L}])`, 'iu');
const GAP_POOL = CARDS.filter(c => c.ex && !/[-/(,]/.test(c.de) && gapRe(c).test(c.ex));

// ---------- state ----------
const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD, local time
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cards) return s; } catch {}
  return { cards: {}, day: { date: today(), news: 0 }, streak: { last: '', count: 0 } };
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
function touchDay() { if (S.day.date !== today()) S.day = { date: today(), news: 0 }; }
function bumpStreak() {
  const t = today(), y = new Date(Date.now() - DAY).toLocaleDateString('sv');
  if (S.streak.last === t) return;
  S.streak = { last: t, count: S.streak.last === y ? S.streak.count + 1 : 1 };
}

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
// Children may be arrays or falsy (`cond && el`): flatten and drop null/undefined/false.
const kidsOf = kids => kids.flat(Infinity).filter(k => k != null && k !== false);
function h(tag, props = {}, ...kids) {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...kidsOf(kids));
  return el;
}
const fill = (el, ...kids) => el.replaceChildren(...kidsOf(kids));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const rnd = n => Math.random() * n | 0;

let deVoice;
// Best German voice first: iOS/macOS marks quality in voiceURI (…premium… / …enhanced…), Edge in the name (Natural). Unmarked voices rank last (-1 >>> 0 = max uint).
const voiceRank = v => ['premium', 'enhanced', 'natural'].findIndex(q => (v.voiceURI + ' ' + v.name).toLowerCase().includes(q)) >>> 0;
const loadVoice = () => {
  // Siri voices are not usable from Safari: leaving the voice unset falls back to the system default
  // (possibly a Siri voice) and plays nothing, so always pick an explicit non-Siri voice.
  const de = speechSynthesis.getVoices().filter(v =>
    v.lang.replace('_', '-').startsWith('de') && !/siri/i.test(v.voiceURI + ' ' + v.name));
  deVoice = de.sort((a, b) => voiceRank(a) - voiceRank(b) || b.lang.endsWith('DE') - a.lang.endsWith('DE'))[0];
};
if ('speechSynthesis' in window) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
// Pre-generated neural voice clips (tools/make-audio.mjs); texts without a clip use the device voice.
let CLIPS = new Set(), playing;
fetch('audio/index.json').then(r => r.ok ? r.json() : []).then(ids => { CLIPS = new Set(ids); }).catch(() => {});
function stopAudio() {
  playing?.pause();
  // cancel() restarts the iOS speech engine (audible click), so only call it to cut off running speech.
  if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
}
function say(text) {
  if (!text) return;
  stopAudio();
  const id = clipId(text);
  if (CLIPS.has(id)) {
    playing = new Audio(`audio/${id}.mp3`);
    playing.play().catch(() => deviceSay(text)); // e.g. offline and clip not cached yet
    return;
  }
  deviceSay(text);
}
function deviceSay(text) {
  if (!('speechSynthesis' in window)) return;
  if (!deVoice) loadVoice(); // iOS may fill the voice list late and skip voiceschanged
  const u = new SpeechSynthesisUtterance(ttsText(text));
  u.lang = 'de-DE'; u.rate = 0.9; if (deVoice) u.voice = deVoice;
  speechSynthesis.speak(u);
}
const speakBtn = text => h('button', { className: 'inline-flex items-center justify-center align-middle min-w-11 min-h-11 ml-1.5 cursor-pointer',
  ariaLabel: 'Listen', onclick: () => say(text) }, createElement(Volume2, { 'aria-hidden': 'true' }));
const bigSpeakBtn = text => h('button', { className: 'inline-flex items-center justify-center size-20 rounded-full bg-soft text-accent cursor-pointer',
  ariaLabel: 'Play again', onclick: () => say(text) }, createElement(Volume2, { 'aria-hidden': 'true', width: 40, height: 40 }));

// ---------- shared Tailwind classes (full strings so Tailwind's scanner finds them) ----------
const BTN = 'block w-full min-h-12 mb-2.5 px-4 rounded-2xl cursor-pointer disabled:cursor-default';
const PRIMARY = `${BTN} py-3 text-center font-semibold bg-accent text-white shadow-soft disabled:opacity-50`; // faded only while not yet usable (e.g. Check)
const SECONDARY = `${BTN} py-3 text-center bg-surface border border-line shadow-soft`;
const MENU = `${BTN} py-4.5 text-left font-semibold bg-surface border border-line shadow-soft`;
const OPT = `${BTN} py-3 text-center border`;
const OPT_STATE = { idle: 'bg-surface border-line', right: 'bg-right border-good', wrong: 'bg-wrong border-again' };
const CARD = 'relative bg-surface rounded-3xl border border-line px-5 py-6 mb-4 text-center shadow-soft';
const H2 = 'text-[22px] font-bold text-accent mt-2 mb-4';
const H3 = 'text-[13px] font-semibold uppercase tracking-wide text-muted mt-5 mb-2';
const MUTED = 'text-muted text-[15px] mb-3';
const BIG = 'text-[28px] font-bold my-2';
const FRONT = 'text-[32px] font-bold mt-6 mb-4 wrap-anywhere';
const SENTENCE = 'text-[22px] font-semibold mt-4 mb-3 wrap-anywhere';
const INPUT = 'block w-full min-h-12 mb-3 px-4 rounded-2xl bg-surface border border-line shadow-soft text-center text-[20px] disabled:opacity-70';
const CHIP = 'min-h-11 px-3 rounded-xl bg-surface border border-line shadow-soft text-[17px] cursor-pointer';
const ARTICLE_COLOR = { der: 'text-der', die: 'text-die', das: 'text-das' };
const GRADE_COLOR = ['bg-again', 'bg-hard', 'bg-good', 'bg-easy'];
const VERDICT = { right: ['✓ Richtig!', 'text-good'], close: ['✓ Fast richtig! Spelling:', 'text-good'], wrong: ['✗ Answer:', 'text-again'] };

function word(de) {
  return h('span', { className: ARTICLE_COLOR[article(de)] || '' }, de);
}

// Text input for German answers: no autocorrect, Enter submits, plus a row of ä ö ü ß keys.
function answerInput(onEnter, { keys = true, mode = 'text', placeholder = 'Type in German', format } = {}) {
  const input = h('input', { className: INPUT, type: 'text', inputMode: mode, placeholder, lang: 'de',
    autocomplete: 'off', spellcheck: false, onkeydown: e => { if (e.key === 'Enter') onEnter(); },
    oninput: e => { if (format && !e.inputType?.startsWith('delete')) input.value = format(input.value); } }); // no regrouping while deleting
  input.setAttribute('autocapitalize', 'off'); input.setAttribute('autocorrect', 'off');
  const row = keys && h('div', { className: 'flex justify-center gap-2 mb-3' }, ['ä', 'ö', 'ü', 'ß'].map(ch =>
    h('button', { type: 'button', className: 'min-w-12 min-h-11 rounded-xl bg-surface border border-line shadow-soft text-lg cursor-pointer',
      textContent: ch, ariaLabel: 'Type ' + ch,
      onpointerdown: e => e.preventDefault(), // keep focus (and the iOS keyboard) in the input
      onclick: () => { input.setRangeText(ch, input.selectionStart, input.selectionEnd, 'end'); input.focus(); } })));
  return { input, nodes: [input, row] };
}

const verdictLine = (v, answer) => h('p', { className: `text-[17px] font-semibold mb-3 ${VERDICT[v][1]}` },
  VERDICT[v][0], v === 'right' ? '' : ' ' + answer);
// Correct but a noun typed lowercase: still counts, plus a gentle reminder.
const capsHint = (input, answers) => {
  const w = missingCap(input, answers);
  return w && h('p', { className: 'text-[15px] text-hard mb-3' }, `💡 Remember to capitalize nouns: ${w}, not ${w.toLowerCase()}.`);
};

// Snappy card flip: turn edge-on, run `swap`, turn back (2 × 110 ms).
async function flip(card, swap) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return swap();
  await card.animate([{ transform: 'perspective(800px) rotateY(0)' }, { transform: 'perspective(800px) rotateY(90deg)' }],
    { duration: 110, easing: 'ease-in' }).finished;
  swap();
  await card.animate([{ transform: 'perspective(800px) rotateY(-90deg)' }, { transform: 'perspective(800px) rotateY(0)' }],
    { duration: 110, easing: 'ease-out' }).finished;
}

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const streakLine = () => h('p', { className: 'text-muted mt-2' }, `🔥 ${S.streak.count} ${S.streak.count === 1 ? 'Tag' : 'Tage'} in Folge`);

// Answer feedback on the card: a little bounce when right, a short shake when wrong.
function pop(el, ok) {
  if (calm()) return;
  el.animate(ok ? [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }]
    : [0, -8, 8, -5, 5, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: ok ? 220 : 300, easing: 'ease-out' });
}

// Confetti burst from the top centre; the layer ignores taps and removes itself.
function confetti() {
  if (calm()) return;
  const layer = h('div', { className: 'fixed inset-0 pointer-events-none overflow-hidden z-50', ariaHidden: 'true' });
  const colors = ['accent', 'good', 'easy', 'hard', 'die'];
  const bits = Array.from({ length: 30 }, (_, i) => {
    const s = h('span', { className: 'absolute top-[20%] left-1/2 w-2 h-3 rounded-sm' });
    s.style.background = `var(--color-${colors[i % colors.length]})`;
    layer.append(s);
    const dx = (Math.random() - 0.5) * 360, up = 80 + Math.random() * 120, rot = (Math.random() - 0.5) * 720;
    return s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px,${-up}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${dx}px,${up * 2}px) rotate(${rot}deg)`, opacity: 0 }],
      { duration: 1000 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)' }).finished;
  });
  document.body.append(layer);
  Promise.all(bits).finally(() => layer.remove());
}

// ---------- flashcards ----------
const unlocked = it => !it.rev || (S.cards[it.base]?.ivl ?? 0) >= REVERSE_AFTER;
function nextCard() {
  const now = Date.now();
  let best = null;
  for (const it of ITEMS) {
    const s = S.cards[it.id];
    if (s && s.due <= now + LEARN_AHEAD && (!best || s.due < S.cards[best.id].due)) best = it;
  }
  if (best && S.cards[best.id].due <= now) return best;
  if (S.day.news < NEW_PER_DAY) { const n = NEW_ORDER.find(c => !S.cards[c.id]); if (n) return n; }
  // Unlocked reverse cards don't use the daily new-word quota: they unlock gradually anyway.
  return REVERSES.find(r => !S.cards[r.id] && unlocked(r)) || best;
}

function counts() {
  const now = Date.now();
  const due = ITEMS.filter(it => S.cards[it.id] && S.cards[it.id].due <= now).length;
  return { due, news: Math.max(0, NEW_PER_DAY - S.day.news) };
}

let session = 0; // cards rated since the app opened (in memory only)

function renderCards(justRated) {
  touchDay();
  const root = $('#cards'); fill(root);
  const c = nextCard();
  const { due, news } = counts();
  root.append(h('p', { className: MUTED }, `Due ${due} · New ${news}`));
  if (!c) {
    if (justRated === true) confetti(); // only right after the last card, not on every visit
    const upcoming = Object.values(S.cards).map(s => s.due).sort((a, b) => a - b)[0];
    root.append(h('div', { className: CARD },
      h('p', { className: BIG }, '🎉 Fertig für heute!'),
      h('p', { className: 'mb-4' }, upcoming ? `Next review in ${fmtDelay(upcoming - Date.now())}.` : 'Come back tomorrow.'),
      h('button', { className: SECONDARY, textContent: `Learn ${NEW_PER_DAY} more new words`,
        onclick: () => { S.day.news -= NEW_PER_DAY; save(); renderCards(); } })));
    return;
  }
  const state = S.cards[c.id];
  const now = Date.now();
  const grades = h('div', { className: 'grid grid-cols-4 gap-2', hidden: true },
    ['Again', 'Hard', 'Good', 'Easy'].map((label, g) =>
      h('button', { className: `min-h-12 rounded-2xl px-1 py-2.5 font-semibold text-white cursor-pointer ${GRADE_COLOR[g]}`, onclick: () => rate(c, g) },
        label, h('small', { className: 'block text-[13px] font-normal opacity-85' },
          (r => fmtDelay(r.ivl ? r.ivl * DAY : r.due - now))(review(state, g, now))))));
  const badge = !state && h('span', { className: 'absolute top-3 right-3 rounded-lg bg-accent px-2 py-0.5 text-xs text-white' }, 'new');
  const extras = () => [
    c.pl && h('p', { className: 'text-muted my-1' }, c.pl === '(pl.)' ? 'plural only' : 'Plural: die ' + c.pl),
    c.ex && h('p', { className: 'italic mt-4' }, c.ex, speakBtn(c.ex))];

  if (!c.rev) {
    const back = h('div', { hidden: true }, h('p', { className: 'text-[22px] my-2' }, c.en), extras());
    const card = h('div', { className: `${CARD} min-h-55` }, badge,
      h('p', { className: MUTED }, c.topic),
      h('p', { className: FRONT }, word(c.de), speakBtn(c.de)),
      back);
    const show = h('button', { className: PRIMARY, textContent: 'Show answer', onclick: () => {
      show.hidden = true;
      flip(card, () => { back.hidden = false; grades.hidden = false; });
    }});
    root.append(card, show, grades);
    return;
  }

  // Reverse card: English shown, she types the German.
  const front = h('div', {}, h('p', { className: MUTED }, 'English → Deutsch'), h('p', { className: FRONT }, c.en));
  const card = h('div', { className: `${CARD} min-h-55` }, badge, front);
  const check = () => {
    if (!field.input.value.trim()) return field.input.focus();
    const v = checkAnswer(field.input.value, answersFor(c));
    say(c.de); // inside the tap: iOS only allows speech started by a user gesture
    form.hidden = true;
    flip(card, () => {
      fill(front, h('p', { className: MUTED }, c.en), verdictLine(v, c.de), capsHint(field.input.value, answersFor(c)),
        h('p', { className: FRONT }, word(c.de), speakBtn(c.de)), extras());
      grades.hidden = false;
      if (v === 'wrong') grades.firstChild.classList.add('ring-4', 'ring-again/40');
    }).then(() => pop(card, v !== 'wrong'));
  };
  const field = answerInput(check);
  const form = h('div', {}, field.nodes, h('button', { className: PRIMARY, textContent: 'Check', onclick: check }));
  root.append(card, form, grades);
}

function rate(c, g) {
  if (!S.cards[c.id] && !c.rev) S.day.news++;
  S.cards[c.id] = review(S.cards[c.id], g);
  bumpStreak(); save();
  if (++session % 10) return renderCards(true);
  confetti();
  fill($('#cards'), h('div', { className: CARD },
    h('p', { className: BIG }, `🎉 ${session} Karten geschafft!`),
    h('p', {}, 'Super gemacht!'), streakLine()),
    h('button', { className: PRIMARY, textContent: 'Weiter', onclick: () => renderCards() }));
}

// ---------- exercises ----------
// An exercise's round() returns question objects. Every question has a `kind`:
//   choice: options + answer   typed: answers (+ fix, mode, keys)   order: answer sentence   self: reveal, self-graded
// Optional: context (node above the prompt), prompt, promptClass, hint, speak (said after answering),
// autoplay (said when shown), reveal (node shown after answering).
const ten = make => () => Array.from({ length: 10 }, make);

const meaningQ = (c, listen) => {
  const wrong = pick([...new Set(CARDS.filter(o => o.topic === c.topic).map(o => o.en))].filter(e => e !== c.en), 3);
  return { kind: 'choice', options: shuffle([c.en, ...wrong]), answer: c.en, speak: c.de,
    ...(listen
      ? { prompt: [bigSpeakBtn(c.de)], hint: 'What did you hear?', autoplay: c.de, reveal: h('p', { className: FRONT }, word(c.de)) }
      : { prompt: [word(c.de)] }) };
};
const seenPool = () => { const seen = CARDS.filter(c => S.cards[c.id]); return seen.length >= 20 ? seen : CARDS; };
const listenQ = (say_, answers, hint, mode) =>
  ({ kind: 'typed', prompt: [bigSpeakBtn(say_)], hint, autoplay: say_, answers, mode, keys: false, speak: say_,
     placeholder: 'Type what you hear', reveal: h('p', { className: SENTENCE }, say_) });

const EXERCISES = {
  article: { title: 'der, die oder das?', round: ten(() => {
    const c = pick(NOUNS, 1)[0];
    return { kind: 'choice', prompt: ['___ ' + c.de.slice(4)], hint: c.en, options: ['der', 'die', 'das'], answer: article(c.de), speak: c.de };
  })},
  meaning: { title: 'What does it mean?', round: ten(() => meaningQ(pick(seenPool(), 1)[0])) },
  verbs: { title: 'Conjugate the verb', round: ten(() => {
    const [inf, en, ...forms] = pick(VERBS, 1)[0];
    const p = rnd(6);
    const opts = shuffle([...new Set(forms)].filter(f => f !== forms[p])).slice(0, 3);
    return { kind: 'choice', prompt: [`${PERSONS[p]} ___`], hint: `${inf} (${en})`,
      options: shuffle([forms[p], ...opts]), answer: forms[p], speak: verbSay(p, forms[p]) };
  })},

  hear: { title: 'Listen: which word?', round: ten(() => meaningQ(pick(seenPool(), 1)[0], true)) },
  numbers: { title: 'Listen: numbers', round: ten(() => {
    const r = Math.random(), n = r < 0.7 ? rnd(101) : r < 0.9 ? 100 + rnd(900) : 1000 + rnd(9000);
    return listenQ(String(n), [String(n), n.toLocaleString('de-DE')], 'Type the number', 'numeric');
  })},
  times: { title: 'Listen: times', round: ten(() => {
    // Digits-only keypad; the colon is inserted while typing ("1015" -> "10:15"), a bare hour counts as ":00".
    const time = { format: timeFormat, fix: s => (t => /^\d{1,2}$/.test(t) ? t + ':00' : t)(timeFormat(s)) };
    if (Math.random() < 0.6) { // colloquial: "Viertel nach zwei" (12-hour, so 2:15 and 14:15 both count)
      const hr = 1 + rnd(12), m = 5 * rnd(12);
      return { ...listenQ(clockPhrase(hr, m), timeAnswers(hr, m, true), 'Type the time, e.g. 14:30', 'numeric'), ...time };
    }
    const hr = rnd(24), m = 5 * rnd(12); // official: "14 Uhr 15"
    return { ...listenQ(officialTime(hr, m), timeAnswers(hr, m, false), 'Type the time, e.g. 14:30', 'numeric'), ...time };
  })},
  // Exam-style Hören: a short announcement or phone message; 70% multiple choice (Teil 1/3), 30% Richtig/Falsch (Teil 2).
  listen: { title: 'Listen: announcements & messages', round: ten(() => {
    const t = pick(POOL, 1)[0], rf = Math.random() < 0.3, claim = rf && t.options[rnd(3)];
    return { kind: 'choice', prompt: [bigSpeakBtn(t.text)], autoplay: t.text,
      hint: h('span', {}, rf ? `${t.stmt(claim)} Richtig oder falsch?` : t.question,
        h('small', { className: 'block text-[15px] mt-1' }, rf ? '(true or false?)' : t.en)),
      options: rf ? ['Richtig', 'Falsch'] : t.options,
      answer: rf ? (claim === t.answer ? 'Richtig' : 'Falsch') : t.answer,
      reveal: h('p', { className: 'text-left text-[17px] leading-relaxed bg-soft rounded-2xl p-4 mt-3' }, t.text) };
  })},
  prices: { title: 'Listen: prices', round: ten(() => {
    const e = rnd(100), ct = [0, 10, 20, 49, 50, 75, 95, 99, rnd(100)][rnd(9)], cc = String(ct).padStart(2, '0');
    const answers = [`${e},${cc}`, `${e}.${cc}`, ...(ct ? [] : [String(e)])];
    return { ...listenQ(`${e} Euro${ct ? ' ' + ct : ''}`, answers, 'Type the price, e.g. 3,49', 'decimal'), fix: s => s.replace(/€|euro|\s/gi, '') };
  })},

  order: { title: 'Build the sentence', round: ten(() => {
    const c = pick(ORDER_POOL, 1)[0];
    return { kind: 'order', answer: c.ex, hint: `with: ${c.de} (${c.en})`, speak: c.ex };
  })},
  gap: { title: 'Fill the gap', round: ten(() => {
    const c = pick(GAP_POOL, 1)[0];
    const m = c.ex.match(gapRe(c)), at = m.index + m[1].length;
    return { kind: 'typed', prompt: [c.ex.slice(0, at) + '____' + c.ex.slice(at + m[2].length)], promptClass: SENTENCE,
      hint: c.en, answers: [m[2]], speak: c.ex };
  })},

  intro: { title: 'Introduce yourself', needsSetup: () => !INTRO.some(([k]) => S.profile?.[k]), setup: renderIntroSetup,
    round: () => shuffle(INTRO.filter(([k]) => S.profile?.[k])).map(([k, kw, q]) => ({
      kind: 'self', prompt: [kw], hint: q, autoplay: q,
      reveal: h('p', { className: SENTENCE }, S.profile[k], speakBtn(S.profile[k])), revealSay: S.profile[k] })) },
  forms: { title: 'Fill in a form', round: () => {
    const f = pick(FORMS, 1)[0];
    return f.fields.map(([label, en, answers]) => ({ kind: 'typed', answers,
      context: h('p', { className: 'text-left text-[17px] leading-relaxed bg-soft rounded-2xl p-4 mb-2' }, f.text),
      prompt: [label], promptClass: 'text-[24px] font-bold mt-4 mb-1', hint: en, placeholder: 'Your answer' }));
  }},
  speaking: { title: 'Speaking cards', round: () => pick(SPEAK, 10).map(([theme, w, q, a]) => ({
    kind: 'self', context: h('p', { className: MUTED }, `Thema: ${theme}`), prompt: [w],
    hint: theme === 'Bitten' ? 'Make a request with this word.' : 'Ask a question with this word.',
    reveal: h('div', {}, h('p', { className: SENTENCE }, q, speakBtn(q)), h('p', { className: 'text-muted' }, '– ' + a)), revealSay: q })) },
};

const SECTIONS = [
  ['Words', ['article', 'meaning', 'verbs']],
  ['Listening', ['listen', 'hear', 'numbers', 'times', 'prices']],
  ['Sentences', ['order', 'gap']],
  ['Exam: Start Deutsch 1', ['intro', 'forms', 'speaking']],
];

function renderExerciseMenu() {
  const root = $('#exercises');
  fill(root, h('h2', { className: H2 }, 'Exercises'),
    ...SECTIONS.flatMap(([title, keys]) => [h('h3', { className: H3 }, title),
      ...keys.map(k => h('button', { className: MENU, textContent: EXERCISES[k].title, onclick: () => runExercise(k) }))]),
    S.profile && h('button', { className: `${SECONDARY} mt-2`, textContent: 'Edit my introduction', onclick: renderIntroSetup }));
}

// Header row with a back chevron at top left, away from the answer buttons.
const exerciseHeader = text => h('div', { className: 'flex items-center gap-1 mb-3 -ml-2' },
  h('button', { className: 'inline-flex items-center justify-center min-w-11 min-h-11 text-accent cursor-pointer',
    ariaLabel: 'Back to exercises', onclick: renderExerciseMenu }, createElement(ChevronLeft, { 'aria-hidden': 'true' })),
  h('p', { className: 'text-muted text-[15px]' }, text));

function renderIntroSetup() {
  const fields = INTRO.map(([k, kw, q, frame]) => {
    const input = h('input', { className: `${INPUT} text-left text-[17px]`, value: S.profile?.[k] || '', placeholder: frame, lang: 'de' });
    return { k, input, node: h('label', { className: 'block mb-1' }, h('span', { className: 'block text-[15px] font-semibold mb-1' }, `${kw}: ${q}`), input) };
  });
  fill($('#exercises'), exerciseHeader('Introduce yourself'),
    h('p', { className: MUTED }, 'Write your own answers once, in full sentences. Then practise saying them out loud. In the exam you introduce yourself with these keywords.'),
    ...fields.map(f => f.node),
    h('button', { className: PRIMARY, textContent: 'Save and practise', onclick: () => {
      S.profile = Object.fromEntries(fields.map(f => [f.k, f.input.value.trim()]));
      save(); runExercise('intro');
    }}));
}

function runExercise(key, qs, i = 0, score = 0) {
  const ex = EXERCISES[key], root = $('#exercises');
  if (!qs) { if (ex.needsSetup?.()) return ex.setup(); qs = ex.round(); }
  if (i === qs.length) {
    bumpStreak(); save();
    const good = score >= qs.length * 0.8;
    if (good) confetti();
    fill(root, exerciseHeader(ex.title),
      h('div', { className: CARD },
        h('p', { className: BIG }, `${score} / ${qs.length}`),
        h('p', {}, score === qs.length ? 'Perfekt! 🌟' : good ? 'Sehr gut! 💪' : 'Weiter üben! 🙂'),
        streakLine()),
      h('button', { className: PRIMARY, textContent: 'Again', onclick: () => runExercise(key) }));
    return;
  }
  const q = qs[i];
  const next = h('button', { className: PRIMARY, textContent: 'Next', hidden: true, onclick: () => runExercise(key, qs, i + 1, score) });
  const revealEl = q.reveal && h('div', { hidden: true }, q.reveal);
  const card = h('div', { className: `${CARD} ${q.context ? '' : 'min-h-55'}` },
    q.prompt && h('p', { className: q.promptClass || FRONT }, q.prompt),
    q.hint && h('p', { className: 'text-[20px] text-muted my-2' }, q.hint),
    revealEl);
  const done = ok => {
    pop(card, ok);
    if (revealEl) revealEl.hidden = false;
    say(q.speak);
    next.onclick = () => runExercise(key, qs, i + 1, score + ok);
    next.hidden = false;
  };
  fill(root,
    exerciseHeader(`${ex.title} · ${i + 1}/${qs.length}`),
    q.context,
    card,
    ...KINDS[q.kind](q, done, ok => runExercise(key, qs, i + 1, score + ok), revealEl),
    next);
  say(q.autoplay); // runs inside the tap that opened this question, as iOS requires
}

const KINDS = {
  choice(q, done) {
    const opts = q.options.map(o => h('button', { className: `${OPT} ${OPT_STATE.idle}`, textContent: o, onclick: () => {
      for (const b of opts) {
        b.disabled = true;
        if (b.textContent === q.answer) b.className = `${OPT} ${OPT_STATE.right}`;
        else if (b.textContent === o) b.className = `${OPT} ${OPT_STATE.wrong}`;
      }
      done(o === q.answer);
    }}));
    return [h('div', {}, opts)];
  },
  typed(q, done) {
    const out = h('div', {});
    const check = () => {
      if (!field.input.value.trim() || field.input.disabled) return;
      const v = checkAnswer((q.fix || (s => s))(field.input.value), q.answers);
      field.input.disabled = true; btn.hidden = true;
      fill(out, verdictLine(v, q.answers[0]), capsHint(field.input.value, q.answers));
      done(v !== 'wrong');
    };
    const field = answerInput(check, { keys: q.keys !== false, mode: q.mode, placeholder: q.placeholder, format: q.format });
    const btn = h('button', { className: PRIMARY, textContent: 'Check', onclick: check });
    return [...field.nodes, out, btn];
  },
  order(q, done) {
    const words = tokens(q.answer).map((w, id) => ({ w, id }));
    let pool = shuffle(words);
    for (let n = 0; n < 5 && pool.map(x => x.w).join(' ') === q.answer; n++) pool = shuffle(words);
    let placed = [];
    const line = h('div', { className: 'flex flex-wrap gap-2 min-h-16 p-2 mb-3 rounded-2xl border-2 border-dashed border-line' });
    const rest = h('div', { className: 'flex flex-wrap justify-center gap-2 mb-4' });
    const out = h('div', {});
    const btn = h('button', { className: PRIMARY, textContent: 'Check', disabled: true, onclick: () => {
      const ok = placed.map(x => x.w).join(' ') === q.answer;
      [line, rest].forEach(el => el.querySelectorAll('button').forEach(b => b.disabled = true));
      line.classList.add(ok ? 'border-good' : 'border-again');
      out.replaceChildren(verdictLine(ok ? 'right' : 'wrong', q.answer));
      btn.hidden = true;
      done(ok);
    }});
    const draw = () => {
      line.replaceChildren(...placed.map(x => h('button', { className: CHIP, textContent: x.w,
        onclick: () => { placed = placed.filter(p => p !== x); pool.push(x); draw(); } })));
      rest.replaceChildren(...pool.map(x => h('button', { className: CHIP, textContent: x.w,
        onclick: () => { pool = pool.filter(p => p !== x); placed.push(x); draw(); } })));
      btn.disabled = pool.length > 0;
    };
    draw();
    return [line, rest, out, btn];
  },
  self(q, done, advance, revealEl) {
    const grade = h('div', { className: 'grid grid-cols-2 gap-2', hidden: true },
      h('button', { className: SECONDARY, textContent: 'Not yet', onclick: () => advance(false) }),
      h('button', { className: PRIMARY, textContent: 'Got it', onclick: () => advance(true) }));
    const show = h('button', { className: PRIMARY, textContent: 'Say it out loud, then reveal', onclick: () => {
      show.hidden = true; grade.hidden = false;
      say(q.revealSay);
      if (revealEl) revealEl.hidden = false;
    }});
    return [show, grade];
  },
};

// ---------- progress ----------
function renderProgress() {
  const root = $('#progress');
  const learned = id => S.cards[id] && S.cards[id].reps > 0;
  const mature = CARDS.filter(c => S.cards[c.id] && S.cards[c.id].ivl >= 21).length;
  const total = CARDS.filter(c => learned(c.id)).length;
  fill(root,
    h('h2', { className: H2 }, 'Progress'),
    h('div', { className: 'grid grid-cols-3 gap-2 mb-5' },
      [[[today(), new Date(Date.now() - DAY).toLocaleDateString('sv')].includes(S.streak.last) ? S.streak.count : 0, 'day streak'],
       [total, `of ${CARDS.length} words`],
       [mature, 'mastered (21d+)']].map(([n, label]) =>
        h('div', { className: 'bg-surface rounded-2xl border border-line shadow-soft px-2 py-3 text-center text-[13px] text-muted' },
          h('b', { className: 'block text-[26px] text-ink' }, n), label))),
    ...DECKS.map(d => {
      const n = d.words.filter(w => learned(w[0])).length;
      return h('div', { className: 'mb-3' },
        h('span', {}, d.topic, h('small', { className: 'text-muted' }, ` ${n}/${d.words.length}`)),
        h('div', { className: 'mt-1 h-2 rounded-full bg-soft overflow-hidden', role: 'progressbar',
            ariaLabel: d.topic, ariaValueMin: '0', ariaValueMax: String(d.words.length), ariaValueNow: String(n) },
          h('div', { className: 'h-full rounded-full bg-accent', style: `width:${(100 * n / d.words.length).toFixed(1)}%` })));
    }),
    h('h2', { className: H2 }, 'Backup'),
    h('p', { className: MUTED }, 'Progress is saved on this device only. Export it to move it to another device or keep a copy.'),
    h('button', { className: SECONDARY, textContent: 'Export progress', onclick: exportData }),
    h('label', { className: SECONDARY }, 'Import progress',
      h('input', { className: 'hidden', type: 'file', accept: 'application/json,.json', onchange: e => importData(e.target.files[0]) })));
}

async function exportData() {
  const file = new File([JSON.stringify(S)], `deutsch-a1-${today()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch {} // user cancelled the share sheet
    return;
  }
  const a = h('a', { href: URL.createObjectURL(file), download: file.name });
  a.click(); URL.revokeObjectURL(a.href);
}

async function importData(file) {
  if (!file) return;
  try {
    const s = JSON.parse(await file.text());
    if (!s || typeof s.cards !== 'object' || !s.day || !s.streak) throw new Error('not a backup file');
    if (!confirm('Replace the progress on this device with the backup?')) return;
    S = s; save(); renderProgress();
    alert('Progress imported.');
  } catch (e) { alert('Import failed: ' + e.message); }
}

// ---------- navigation ----------
const RENDER = { cards: renderCards, exercises: renderExerciseMenu, progress: renderProgress };
function show(view) {
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== view);
  document.querySelectorAll('nav button').forEach(b =>
    b.dataset.view === view ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  RENDER[view]();
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => show(b.dataset.view));
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#cards').hidden) renderCards(); });
show('cards');

// Production only: in dev the SW would cache Vite's dev modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js');
  // A new version took over: reload once so the page runs the fresh files.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) location.reload(); });
}

import './style.css';
import { createIcons, createElement, Layers, PencilLine, ChartLine, Volume2, ChevronLeft } from 'lucide';
import { DECKS, VERBS, PERSONS } from './data/a1.js';
import { review, fmtDelay, DAY } from './srs.js';

createIcons({ icons: { Layers, PencilLine, ChartLine } }); // nav icons: <i data-lucide="..."> in index.html

const NEW_PER_DAY = 10;
const LEARN_AHEAD = 20 * 60e3; // like Anki: show learning cards early when nothing else is due
const KEY = 'a1-srs-v1';

// ---------- data ----------
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const CARDS = DECKS.flatMap(d => d.words.map(([de, en, pl, ex]) => ({ id: de, de, en, pl, ex, topic: d.topic })));
// New-card order: basics decks first, then the A–Z list in a stable shuffled order.
const NEW_ORDER = [...CARDS].sort((a, b) =>
  (a.topic === 'Word list A–Z') - (b.topic === 'Word list A–Z') || (a.topic === 'Word list A–Z' ? hash(a.id) - hash(b.id) : 0));
const article = de => (de.match(/^(der|die|das) /) || [])[1];
const NOUNS = CARDS.filter(c => article(c.de) && c.pl !== '(pl.)');

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
function h(tag, props = {}, ...kids) {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...kids.flat().filter(k => k != null && k !== false));
  return el;
}
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);

let deVoice;
// Best German voice first: iOS/macOS marks quality in voiceURI (…premium… / …enhanced…), Edge in the name (Natural). Unmarked voices rank last (-1 >>> 0 = max uint).
const voiceRank = v => ['premium', 'enhanced', 'natural'].findIndex(q => (v.voiceURI + ' ' + v.name).toLowerCase().includes(q)) >>> 0;
const loadVoice = () => {
  const de = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-').startsWith('de'));
  deVoice = de.sort((a, b) => voiceRank(a) - voiceRank(b) || b.lang.endsWith('DE') - a.lang.endsWith('DE'))[0];
};
if ('speechSynthesis' in window) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
function say(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text.replace(/[()]/g, ''));
  u.lang = 'de-DE'; u.rate = 0.9; if (deVoice) u.voice = deVoice;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const speakBtn = text => 'speechSynthesis' in window
  ? h('button', { className: 'inline-flex items-center justify-center align-middle min-w-11 min-h-11 ml-1.5 cursor-pointer',
      ariaLabel: 'Listen', onclick: () => say(text) },
      createElement(Volume2, { 'aria-hidden': 'true' }))
  : null;

// ---------- shared Tailwind classes (full strings so Tailwind's scanner finds them) ----------
const BTN = 'block w-full min-h-12 mb-2.5 px-4 rounded-2xl cursor-pointer disabled:cursor-default';
const PRIMARY = `${BTN} py-3 text-center font-semibold bg-accent text-white shadow-soft`;
const SECONDARY = `${BTN} py-3 text-center bg-surface border border-line shadow-soft`;
const MENU = `${BTN} py-4.5 text-left font-semibold bg-surface border border-line shadow-soft`;
const OPT = `${BTN} py-3 text-center border`;
const OPT_STATE = { idle: 'bg-surface border-line', right: 'bg-right border-good', wrong: 'bg-wrong border-again' };
const CARD = 'relative bg-surface rounded-3xl border border-line px-5 py-6 mb-4 text-center shadow-soft';
const H2 = 'text-[22px] font-bold text-accent mt-2 mb-4';
const MUTED = 'text-muted text-[15px] mb-3';
const BIG = 'text-[28px] font-bold my-2';
const FRONT = 'text-[32px] font-bold mt-6 mb-4 wrap-anywhere';
const ARTICLE_COLOR = { der: 'text-der', die: 'text-die', das: 'text-das' };
const GRADE_COLOR = ['bg-again', 'bg-hard', 'bg-good', 'bg-easy'];

function word(de) {
  return h('span', { className: ARTICLE_COLOR[article(de)] || '' }, de);
}

// ---------- flashcards ----------
function nextCard() {
  const now = Date.now();
  let best = null;
  for (const c of CARDS) {
    const s = S.cards[c.id];
    if (s && s.due <= now + LEARN_AHEAD && (!best || s.due < S.cards[best.id].due)) best = c;
  }
  if (best && S.cards[best.id].due <= now) return best;
  if (S.day.news < NEW_PER_DAY) { const n = NEW_ORDER.find(c => !S.cards[c.id]); if (n) return n; }
  return best;
}

function counts() {
  const now = Date.now();
  const due = CARDS.filter(c => S.cards[c.id] && S.cards[c.id].due <= now).length;
  return { due, news: Math.max(0, NEW_PER_DAY - S.day.news) };
}

function renderCards() {
  touchDay();
  const root = $('#cards'); root.replaceChildren();
  const c = nextCard();
  const { due, news } = counts();
  root.append(h('p', { className: MUTED }, `Due ${due} · New ${news}`));
  if (!c) {
    const upcoming = Object.values(S.cards).map(s => s.due).sort((a, b) => a - b)[0];
    root.append(h('div', { className: CARD },
      h('p', { className: BIG }, '🎉 Fertig für heute!'),
      h('p', { className: 'mb-4' }, upcoming ? `Next review in ${fmtDelay(upcoming - Date.now())}.` : 'Come back tomorrow.'),
      h('button', { className: SECONDARY, textContent: `Learn ${NEW_PER_DAY} more new words`,
        onclick: () => { S.day.news -= NEW_PER_DAY; save(); renderCards(); } })));
    return;
  }
  const state = S.cards[c.id];
  const back = h('div', { hidden: true },
    h('p', { className: 'text-[22px] my-2' }, c.en),
    c.pl && h('p', { className: 'text-muted my-1' }, c.pl === '(pl.)' ? 'plural only' : 'Plural: die ' + c.pl),
    c.ex && h('p', { className: 'italic mt-4' }, c.ex, speakBtn(c.ex)));
  const now = Date.now();
  const grades = h('div', { className: 'grid grid-cols-4 gap-2', hidden: true },
    ['Again', 'Hard', 'Good', 'Easy'].map((label, g) =>
      h('button', { className: `min-h-12 rounded-2xl px-1 py-2.5 font-semibold text-white cursor-pointer ${GRADE_COLOR[g]}`, onclick: () => rate(c, g) },
        label, h('small', { className: 'block text-[13px] font-normal opacity-85' },
          (r => fmtDelay(r.ivl ? r.ivl * DAY : r.due - now))(review(state, g, now))))));
  const reveal = () => { back.hidden = false; grades.hidden = false; };
  const show = h('button', { className: PRIMARY, textContent: 'Show answer', onclick: async () => {
    show.hidden = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return reveal();
    // Snappy flip: turn the card edge-on, swap in the answer, turn it back (2 × 110 ms).
    await card.animate([{ transform: 'perspective(800px) rotateY(0)' }, { transform: 'perspective(800px) rotateY(90deg)' }],
      { duration: 110, easing: 'ease-in' }).finished;
    reveal();
    card.animate([{ transform: 'perspective(800px) rotateY(-90deg)' }, { transform: 'perspective(800px) rotateY(0)' }],
      { duration: 110, easing: 'ease-out' });
  }});
  const card = h('div', { className: `${CARD} min-h-55` },
      !state && h('span', { className: 'absolute top-3 right-3 rounded-lg bg-accent px-2 py-0.5 text-xs text-white' }, 'new'),
      h('p', { className: MUTED }, c.topic),
      h('p', { className: FRONT }, word(c.de), speakBtn(c.de)),
      back);
  root.append(card, show, grades);
}

function rate(c, g) {
  if (!S.cards[c.id]) S.day.news++;
  S.cards[c.id] = review(S.cards[c.id], g);
  bumpStreak(); save(); renderCards();
}

// ---------- exercises ----------
const EXERCISES = {
  article: { title: 'der, die oder das?', make() {
    const c = pick(NOUNS, 1)[0];
    return { prompt: ['___ ' + c.de.slice(4)], hint: c.en,
      options: ['der', 'die', 'das'], answer: article(c.de), speak: c.de };
  }},
  meaning: { title: 'What does it mean?', make() {
    const seen = CARDS.filter(c => S.cards[c.id]);
    const pool = seen.length >= 20 ? seen : CARDS;
    const c = pick(pool, 1)[0];
    const wrong = pick([...new Set(CARDS.filter(o => o.topic === c.topic).map(o => o.en))].filter(e => e !== c.en), 3);
    return { prompt: [word(c.de)], options: shuffle([c.en, ...wrong]), answer: c.en, speak: c.de };
  }},
  verbs: { title: 'Conjugate the verb', make() {
    const [inf, en, ...forms] = pick(VERBS, 1)[0];
    const p = Math.random() * 6 | 0;
    const opts = shuffle([...new Set(forms)].filter(f => f !== forms[p])).slice(0, 3);
    return { prompt: [`${PERSONS[p]} ___`], hint: `${inf} (${en})`,
      options: shuffle([forms[p], ...opts]), answer: forms[p], speak: `${PERSONS[p].split('/')[0]} ${forms[p]}` };
  }},
};

function renderExerciseMenu() {
  const root = $('#exercises');
  root.replaceChildren(h('h2', { className: H2 }, 'Exercises'),
    ...Object.entries(EXERCISES).map(([k, ex]) =>
      h('button', { className: MENU, textContent: ex.title, onclick: () => runExercise(k) })));
}

// Header row with a back chevron at top left, away from the answer buttons.
const exerciseHeader = text => h('div', { className: 'flex items-center gap-1 mb-3 -ml-2' },
  h('button', { className: 'inline-flex items-center justify-center min-w-11 min-h-11 text-accent cursor-pointer',
    ariaLabel: 'Back to exercises', onclick: renderExerciseMenu }, createElement(ChevronLeft, { 'aria-hidden': 'true' })),
  h('p', { className: 'text-muted text-[15px]' }, text));

function runExercise(kind, i = 0, score = 0) {
  const ROUND = 10, ex = EXERCISES[kind], root = $('#exercises');
  if (i === ROUND) {
    bumpStreak(); save();
    root.replaceChildren(exerciseHeader(ex.title),
      h('div', { className: CARD },
        h('p', { className: BIG }, `${score} / ${ROUND}`),
        h('p', {}, score >= 8 ? 'Sehr gut! 💪' : 'Weiter üben! 🙂')),
      h('button', { className: PRIMARY, textContent: 'Again', onclick: () => runExercise(kind) }));
    return;
  }
  const q = ex.make();
  const next = h('button', { className: PRIMARY, textContent: 'Next', hidden: true });
  const opts = q.options.map(o => h('button', { className: `${OPT} ${OPT_STATE.idle}`, textContent: o, onclick: () => {
    const ok = o === q.answer;
    for (const b of opts) {
      b.disabled = true;
      if (b.textContent === q.answer) b.className = `${OPT} ${OPT_STATE.right}`;
      else if (b.textContent === o) b.className = `${OPT} ${OPT_STATE.wrong}`;
    }
    say(q.speak);
    next.onclick = () => runExercise(kind, i + 1, score + ok);
    next.hidden = false;
  }}));
  root.replaceChildren(
    exerciseHeader(`${ex.title} · ${i + 1}/${ROUND}`),
    h('div', { className: `${CARD} min-h-55` }, h('p', { className: FRONT }, q.prompt),
      q.hint && h('p', { className: 'text-[22px] my-2' }, q.hint)),
    h('div', {}, opts), next);
}

// ---------- progress ----------
function renderProgress() {
  const root = $('#progress');
  const learned = id => S.cards[id] && S.cards[id].reps > 0;
  const mature = CARDS.filter(c => S.cards[c.id] && S.cards[c.id].ivl >= 21).length;
  const total = CARDS.filter(c => learned(c.id)).length;
  root.replaceChildren(
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

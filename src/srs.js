// Anki-style SM-2 scheduler. grade: 0 Again, 1 Hard, 2 Good, 3 Easy.
// Card state: { ease, ivl (days), reps, lapses, due (ms) }. undefined = new card.
export const MIN = 60e3, DAY = 864e5;

export function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

export function review(prev, grade, now = Date.now()) {
  const s = prev ? { ...prev } : { ease: 2.5, ivl: 0, reps: 0, lapses: 0 };
  if (grade === 0) {
    if (s.reps > 0) s.lapses++;
    s.reps = 0; s.ivl = 0; s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + MIN;
    return s;
  }
  // Hard on a card still in learning: show it again in a few minutes.
  if (s.reps === 0 && grade === 1) { s.due = now + 6 * MIN; return s; }
  if (grade === 1) s.ease = Math.max(1.3, s.ease - 0.15);
  if (grade === 3) s.ease += 0.15;
  const ivl = s.ivl;
  if (s.reps === 0) s.ivl = grade === 3 ? 4 : 1;
  else if (grade === 1) s.ivl = Math.max(ivl + 1, Math.round(ivl * 1.2));
  else s.ivl = Math.max(ivl + 1, Math.round(ivl * s.ease * (grade === 3 ? 1.3 : 1)));
  s.reps++;
  s.due = startOfDay(now) + s.ivl * DAY; // due from midnight, like Anki's day buckets
  return s;
}

export function fmtDelay(ms) {
  if (ms < 60 * MIN) return Math.max(1, Math.round(ms / MIN)) + 'm';
  if (ms < DAY) return Math.round(ms / (60 * MIN)) + 'h';
  const d = Math.round(ms / DAY);
  return d < 31 ? d + 'd' : (d / 30).toFixed(1).replace('.0', '') + 'mo';
}

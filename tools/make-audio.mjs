// Pre-generates neural voice clips with edge-tts (unofficial, free Microsoft Edge voices).
// Run locally: `npm run audio` (needs `python -m pip install edge-tts`). Only missing clips are generated;
// clips no longer used are deleted; public/audio/index.json lists the clips the app may play.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { allSpokenTexts } from '../src/spoken.js';
import { clipId, ttsText, VOICE, RATE } from '../src/answer.js';

const DIR = 'public/audio', JOBS = 4, TRIES = 3;
fs.mkdirSync(DIR, { recursive: true });

const clips = new Map(); // id -> spoken text
for (const t of allSpokenTexts()) {
  const id = clipId(t), spoken = ttsText(t);
  if (clips.has(id) && clips.get(id) !== spoken) throw new Error(`clip id collision: "${spoken}" / "${clips.get(id)}"`);
  clips.set(id, spoken);
}
const file = id => path.join(DIR, id + '.mp3');
const exists = id => fs.existsSync(file(id)) && fs.statSync(file(id)).size > 0;

// Remove clips nothing refers to any more (old voice, changed texts).
let removed = 0;
for (const f of fs.readdirSync(DIR)) if (f.endsWith('.mp3') && !clips.has(f.slice(0, -4))) { fs.unlinkSync(path.join(DIR, f)); removed++; }

const tts = (id, text) => new Promise((resolve, reject) => {
  const tmp = path.join(DIR, id + '.part');
  // --text=… so a text starting with "-" is never read as an option
  const p = spawn('python', ['-m', 'edge_tts', '--voice', VOICE, `--rate=${RATE}`, `--text=${text}`, '--write-media', tmp], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err += d; });
  p.on('error', reject);
  p.on('close', code => {
    if (code === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 0) { fs.renameSync(tmp, file(id)); resolve(); }
    else { fs.rmSync(tmp, { force: true }); reject(new Error(err.trim().split('\n').pop() || 'exit ' + code)); }
  });
});

const todo = [...clips].filter(([id]) => !exists(id));
console.log(`${clips.size} clips, ${clips.size - todo.length} present, ${todo.length} to generate, ${removed} removed (voice ${VOICE}, rate ${RATE})`);
let done = 0, failed = 0;
async function worker() {
  for (let job; (job = todo.shift());) {
    const [id, text] = job;
    for (let n = 1; n <= TRIES; n++) {
      try { await tts(id, text); break; } catch (e) {
        if (n === TRIES) { failed++; console.warn(`failed "${text.slice(0, 60)}": ${e.message}`); }
        else await new Promise(r => setTimeout(r, 2000 * n));
      }
    }
    if (++done % 50 === 0) console.log(`  ${done} done`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));

const ids = [...clips.keys()].filter(exists).sort();
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(ids));
const mb = ids.reduce((s, id) => s + fs.statSync(file(id)).size, 0) / 1e6;
console.log(`index.json: ${ids.length} clips, ${mb.toFixed(1)} MB${failed ? `, ${failed} FAILED (they fall back to the device voice; re-run to retry)` : ''}`);

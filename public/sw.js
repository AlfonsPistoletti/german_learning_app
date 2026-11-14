// Network-first: online she always gets the latest push, offline the last cached copy.
// No version bump needed on deploy. Bump CACHE only to drop old files.
// shortcut: no fetch timeout, so a very slow network waits for the request; add a race timeout if that bites.
const CACHE = 'a1-v2';

self.addEventListener('install', e => {
  // Vite gives the JS/CSS bundles hashed names, so read them from the built index.html.
  e.waitUntil((async () => {
    const html = await (await fetch('./', { cache: 'no-cache' })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map(m => m[1]);
    await (await caches.open(CACHE)).addAll(['./', ...new Set(assets)]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/audio\/[^/]+\.mp3$/.test(url.pathname)) return e.respondWith(audioClip(e.request));
  e.respondWith(fetch(e.request)
    .then(res => {
      if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// Audio clips never change (file name = hash of the text): cache-first, stored whole.
// <audio> asks for byte ranges and the Cache API can't store 206 responses,
// so cache the full file and cut the requested range out of it (Safari needs real 206 answers).
async function audioClip(req) {
  const cache = await caches.open(CACHE);
  let res = await cache.match(req.url);
  if (!res) {
    res = await fetch(req.url); // no Range header -> full 200 response
    if (res.status === 200) await cache.put(req.url, res.clone());
  }
  const range = req.headers.get('range');
  if (!range || res.status !== 200) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const [, s, e] = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = s ? +s : e ? Math.max(0, size - e) : 0;             // "bytes=-500" = last 500 bytes
  const end = s && e ? Math.min(+e, size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
}

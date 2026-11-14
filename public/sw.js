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
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request)
    .then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

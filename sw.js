/* Ghast service worker — exists so Chrome treats the page as an installable app,
   and so it still opens with no connection. Bump CACHE after editing index.html. */
const CACHE = 'ghast-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  // Navigations: try the network, fall back to the cached page when offline.
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Everything else: cache first, refresh in the background.
  e.respondWith(
    caches.match(r).then(hit => hit || fetch(r).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(r, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

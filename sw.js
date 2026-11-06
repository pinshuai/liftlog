// Bump CACHE whenever any app file changes so phones pick up the new version.
const CACHE = 'liftlog-v8';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/store.js',
  'js/util.js',
  'js/ui.js',
  'js/rest.js',
  'js/exercises.js',
  'js/icons.js',
  'js/views/workout.js',
  'js/views/history.js',
  'js/views/exercises.js',
  'js/views/settings.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' bypasses the browser HTTP cache (GitHub Pages sends max-age=600),
  // so a new version never gets filled with stale copies of the previous files.
  const fresh = FILES.map((f) => new Request(f, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});

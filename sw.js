// Ilova qobig'ini keshlaydi, shuning uchun internetsiz ham ishlaydi.
// Fayllar avval tarmoqdan olinadi, shuning uchun yangilanishlar darhol ko'rinadi.
// CACHE_VERSION faqat eski keshni tozalash uchun ishlatiladi.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `xarajat-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/utils.js',
  './js/categories.js',
  './js/parser.js',
  './js/pwa.js',
  './js/views/home.js',
  './js/views/products.js',
  './js/views/stats.js',
  './js/views/savings.js',
  './js/views/debts.js',
  './js/views/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('xarajat-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Avval tarmoqdan olinadi, shuning uchun yangi kod darhol ko'rinadi.
  // Internet bo'lmasa keshdagi nusxa ishlatiladi.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => cached ?? caches.match('./index.html'))),
  );
});

/* 英语教练 · Service Worker：离线优先 + 内容更新 */
const VERSION = '1.0.0';
const CACHE = `ec-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './css/app.css',
  './js/app.js',
  './js/icons.js',
  './js/core/util.js',
  './js/core/ui.js',
  './js/core/store.js',
  './js/core/speech.js',
  './js/core/games.js',
  './js/core/tap.js',
  './js/data/index.js',
  './js/data/vocab-core.js',
  './js/data/vocab-work.js',
  './js/data/vocab-hvac.js',
  './js/data/vocab-bas.js',
  './js/data/dict-extra.js',
  './js/data/dialogues.js',
  './js/data/dialogues-pro.js',
  './js/data/patterns.js',
  './js/data/pro.js',
  './js/data/plan.js',
  './js/views/today.js',
  './js/views/learn.js',
  './js/views/speak.js',
  './js/views/words.js',
  './js/views/games.js',
  './js/views/pro.js',
  './js/views/me.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png',
  './icons/icon-120.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/splash-1125x2436.png',
  './icons/splash-1170x2532.png',
  './icons/splash-1179x2556.png',
  './icons/splash-1242x2688.png',
  './icons/splash-1284x2778.png',
  './icons/splash-1290x2796.png',
  './icons/splash-2048x2732.png',
  './icons/splash-750x1334.png',
  './icons/splash-828x1792.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('ec-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

const isHTML = (req) => req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (isHTML(request)) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) {
      e.waitUntil((async () => {
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) cache.put(request, fresh.clone());
        } catch {}
      })());
      return hit;
    }
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok && url.origin === location.origin) cache.put(request, fresh.clone());
      return fresh;
    } catch {
      return new Response('', { status: 504, statusText: 'offline' });
    }
  })());
});

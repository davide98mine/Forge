/* Forge Web — funziona anche senza internet. Cambia VERSION a ogni aggiornamento. */
const VERSION = 'forge-1.0.3';
const FILES = ['./', 'index.html', 'style.css?v=4', 'logic.js?v=4', 'ui.js?v=4', 'screens.js?v=4', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'fonts/barlow_cond_bold.ttf', 'fonts/inter_regular.ttf', 'fonts/inter_semibold.ttf', 'fonts/spacegrotesk_medium.ttf', 'fonts/spacegrotesk_bold.ttf',
  'fonts/plexsans_regular.ttf', 'fonts/plexsans_semibold.ttf', 'fonts/plexsans_bold.ttf', 'fonts/plexmono_bold.ttf',
  'fonts/jakarta_medium.ttf', 'fonts/jakarta_bold.ttf', 'fonts/jakarta_extrabold.ttf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // rete prima (cosi' gli aggiornamenti arrivano subito), copia salvata se offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});

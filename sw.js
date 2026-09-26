/* offline cache for the installed app. The page itself is network-first (updates
   arrive on the next online start), everything else cache-first with a background
   refresh. React, Lucide and the fonts come from CDNs, so they are precached too —
   without them the app cannot start offline. API calls always go to the network. */
const CACHE = 'brain-v17';
const LOCAL = ['./', 'index.html', 'support.js', 'image-slot.js', 'slot-shim.js', 'scroll-top.js', 'gooey-controls.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'assets/spruengli.png', 'fonts/Gilroy-Light.otf', '_ds/organic-a0755eee-50a0-4980-8d1b-154cd88e8b42/styles.css', '_ds/organic-a0755eee-50a0-4980-8d1b-154cd88e8b42/_ds_bundle.js', '.image-slots.state.json'];
const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js',
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Jost:wght@400;500;700;900&family=Roboto+Slab:wght@300;400;700&display=swap"
];
const LIVE = /supabase\.co|anthropic\.com|generativelanguage\.googleapis|groq\.com|accounts\.google/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    ...LOCAL.map(u => c.add(u).catch(() => {})),
    ...CDN.map(u => fetch(u, { mode: 'cors', credentials: 'omit' }).then(r => r.ok && c.put(u, r)).catch(() => {}))
  ])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || LIVE.test(r.url)) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put('index.html', res.clone())); return res; })
      .catch(() => caches.match('index.html').then(h => h || caches.match('./'))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(r, { ignoreVary: true }) || await c.match(r.url, { ignoreVary: true });
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  }));
});

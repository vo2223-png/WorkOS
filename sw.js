/* offline cache for the installed app: the app shell is cached on install and
   refreshed in the background; API calls (Supabase, KI) always go to the network */
const CACHE = 'brain-v1';
const SHELL = ['./', 'index.html', 'support.js', 'image-slot.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'assets/spruengli.png', 'fonts/Gilroy-Light.otf', '_ds/organic-a0755eee-50a0-4980-8d1b-154cd88e8b42/styles.css', '_ds/organic-a0755eee-50a0-4980-8d1b-154cd88e8b42/_ds_bundle.js', '.image-slots.state.json'];
const LIVE = /supabase\.co|anthropic\.com|googleapis\.com\/v1beta|generativelanguage|groq\.com/;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || LIVE.test(r.url)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (r.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});

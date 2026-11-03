/* Service worker of the English app.
   - The app page, manifest and icons: from the network when online (so updates arrive), from the cache when offline.
   - Sound files: kept whole in the cache the first time they are used (or all at once from Settings) and then served
     from there, including the parts of a file the page asks for, so the app works without internet.
   - Fonts from Google Fonts: cached after the first visit. */
const VERSION = '__VERSION__';
const SHELL = 'shell-' + VERSION;
const AUDIO = 'audio-v1';
const FONTS = 'fonts-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(fonts(req)); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.mp3')) { e.respondWith(audio(e, req, url)); return; }
  e.respondWith(shell(req));
});

async function shell(req) {
  try {
    const r = await fetch(req);
    if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
    return r;
  } catch (err) {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
    return Response.error();
  }
}

async function fonts(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') cache.put(req, r.clone());
    return r;
  } catch (err) { return Response.error(); }
}

async function audio(e, req, url) {
  const key = url.origin + url.pathname;
  const cache = await caches.open(AUDIO);
  const whole = await cache.match(key);
  const range = req.headers.get('range');
  if (whole) return range ? part(whole, range) : whole;
  if (!range) {
    try {
      const r = await fetch(key);
      if (r.ok && r.status === 200) await cache.put(key, r.clone());
      return r;
    } catch (err) { return new Response(null, { status: 504 }); }
  }
  /* not kept yet: answer the asked part from the network now, and keep the whole file for next time */
  e.waitUntil(fetch(key).then((r) => (r.ok && r.status === 200 ? cache.put(key, r) : null)).catch(() => {}));
  try { return await fetch(req); } catch (err) { return new Response(null, { status: 504 }); }
}

async function part(resp, range) {
  const buf = await resp.clone().arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d+)-(\d*)/.exec(range);
  if (!m) return resp;
  const a = Number(m[1]);
  const b = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (a >= size || a > b) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(a, b + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes ' + a + '-' + b + '/' + size, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' }
  });
}

/* Service worker of the English app.
   - The app page, manifest and icons: from the network when online (so updates arrive), from the cache when offline.
   - Sound files: kept whole in the cache the first time they are used (or all at once from Settings) and then served
     from there, including the parts of a file the page asks for, so the app works without internet.
   - Fonts from Google Fonts: cached after the first visit.
   - The daily reminder: Periodic Background Sync (Chrome, installed app) wakes this worker when the phone chooses. It shows
     one notification a day, only after the planned time, never 22:00-07:00, and not when something was practised that day
     or the app is on screen. The page keeps what is needed in the cache 'habit-v1' (habit-state.json: on, t, last). */
const VERSION = '__VERSION__';
const SHELL = 'shell-' + VERSION;
const AUDIO = 'audio-v1';
const FONTS = 'fonts-v1';
const HABIT = 'habit-v1';
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

/* ---- the daily reminder ---- */
self.addEventListener('periodicsync', (e) => { if (e.tag === 'daily-nudge') e.waitUntil(nudge()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    const w = wins.find((x) => x.url.indexOf(self.registration.scope) === 0);
    if (w) return w.focus().then((f) => (f && f.navigate ? f.navigate(url) : null)).catch(() => null);
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
/* days and minutes on this phone's clock, as the page counts them */
function localDay(d) { return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
function toMin(t) { const m = /^(\d\d):(\d\d)$/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : 19 * 60; }
async function readJson(c, key) { try { const r = await c.match(key); return r ? await r.json() : null; } catch (err) { return null; } }
async function nudge() {
  const c = await caches.open(HABIT), base = self.registration.scope;
  const st = await readJson(c, new URL('habit-state.json', base).href);
  if (!st || !st.on) return;
  const now = new Date(), day = localDay(now), min = now.getHours() * 60 + now.getMinutes();
  if (min < 7 * 60 || min >= 22 * 60) return;                          /* quiet hours */
  if (min < Math.min(Math.max(toMin(st.t), 7 * 60), 21 * 60)) return;   /* before the planned time (a time in the quiet hours counts as 07:00 or 21:00) */
  if (Number(st.last) >= day) return;                                    /* practised today */
  const seenKey = new URL('habit-shown.json', base).href, seen = await readJson(c, seenKey);
  if (seen && Number(seen.d) >= day) return;                             /* once a day */
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (wins.some((w) => w.visibilityState === 'visible')) return;         /* the app is on screen */
  await c.put(seenKey, new Response(JSON.stringify({ d: day }), { headers: { 'content-type': 'application/json' } }));
  await self.registration.showNotification('ฝึกภาษาอังกฤษ', {
    body: 'วันนี้ยังไม่ได้เรียน 5 นาทีก็พอ', tag: 'daily-nudge', lang: 'th', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: './#go=next' }
  });
}

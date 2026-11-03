// Check the installable app: served from a sub-path like GitHub Pages, service worker in control, sound through the worker,
// all sound kept for offline use, then the app and its sound working with the network off. node src/tests/pwatest.js <repo dir>
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(process.argv[2]);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let hits = { mp3: 0, part: 0 };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith('/english-app/')) { res.writeHead(404); res.end(); return; }
  u = u.slice('/english-app'.length);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const buf = fs.readFileSync(f), type = TYPES[path.extname(f)] || 'application/octet-stream';
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (path.extname(f) === '.mp3') hits.mp3++;
  if (m) {
    hits.part++;
    const a = +m[1], b = m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': 'bytes ' + a + '-' + b + '/' + buf.length, 'content-length': b - a + 1 });
    res.end(buf.subarray(a, b + 1)); return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': buf.length, 'accept-ranges': 'bytes' }); res.end(buf);
});
const AI = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'audio-index.json'), 'utf8'));
const NFILES = Object.keys(AI.f).reduce((n, k) => n + AI.f[k].length, 0);
const fails = [];
function check(ok, msg) { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/english-app/';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  await ctx.addInitScript(() => {
    window.__au = { starts: 0 };
    const ABS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype;
    if (ABS) { const st = ABS.start; ABS.start = function () { window.__au.starts++; return st.apply(this, arguments); }; }
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
  await page.goto(base); await page.waitForSelector('#app h1');
  check(/วันนี้/.test(await page.textContent('#app h1')), 'app opens on today');
  const man = await page.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); const r = await fetch(l.href); const j = await r.json(); const ic = await Promise.all(j.icons.map((i) => fetch(new URL(i.src, l.href)).then((x) => x.ok))); return { name: j.short_name, start: j.start_url, display: j.display, icons: ic }; });
  check(man.name && man.display === 'standalone' && man.icons.every(Boolean), 'manifest and icons load ' + JSON.stringify(man));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForSelector('#app h1');
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  // a word clip through the worker
  await page.click('.tab[data-tab="vocab"]'); await page.click('#resume');
  await page.click('.word .listen[data-k="w"]'); await sleep(900);
  check(await page.evaluate(() => window.__au.starts) === 1, 'word clip played through the worker');
  // settings: keep all sound
  await page.click('.tab[data-tab="today"]'); await page.click('#open-prefs');
  check(await page.$('#off-all') !== null, 'offline download offered inside the app');
  await page.click('#off-all');
  await page.waitForFunction(() => /ครบแล้ว/.test((document.getElementById('off-note') || {}).textContent || ''), null, { timeout: 120000 });
  const n = await page.evaluate(async () => (await (await caches.open('audio-v1')).keys()).length);
  check(n === NFILES, 'all ' + NFILES + ' sound files kept: ' + n);
  // offline
  await ctx.setOffline(true);
  const before = hits.mp3;
  await page.reload(); await page.waitForSelector('#app h1');
  check(/วันนี้/.test(await page.textContent('#app h1')), 'app opens with the network off');
  await page.click('.tab[data-tab="read"]'); await page.click('#r-resume');
  await page.click('.line:nth-child(2) .listen'); await sleep(900);
  const s1 = await page.evaluate(() => window.__au.starts);
  check(s1 === 1, 'story line plays offline (from the kept file)');
  await page.click('.tab[data-tab="gram"]'); await page.click('#g-resume'); await page.click('.exs .ex .listen'); await sleep(900);
  check(await page.evaluate(() => window.__au.starts) === 2, 'grammar example plays offline');
  check(hits.mp3 === before, 'no sound request reached the server while offline');
  await page.screenshot({ path: path.join(require('os').tmpdir(), 'pwa-offline.png') });
  await ctx.setOffline(false);
  check(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); server.close();
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(1); });

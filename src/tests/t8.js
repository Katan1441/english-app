// End-to-end check of phase 9 (the habit engine) in headless Chromium, and of the service worker's reminder in Node with its
// APIs stubbed: the study plan in the first run, on the path and in settings; the daily notification (asked only from
// settings, studied today -> none, quiet hours -> none, once a day); the app shortcuts in the manifest and the page;
// the weekly report on seeded data; the new record in the backup code; the layout.
// node t8.js <trainer dir> <shots dir>
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const root = process.argv[2], shots = process.argv[3], repo = path.join(__dirname, '..', '..');
fs.mkdirSync(shots, { recursive: true });
const src = fs.readFileSync(path.join(root, 'vocab-trainer.html'), 'utf8');
fs.writeFileSync(path.join(root, 'wrapped.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#fafafa}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + src + '</body></html>');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  const size = fs.statSync(p).size, m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || ''), type = TYPES[path.extname(p)] || 'application/octet-stream';
  if (m && path.extname(p) === '.mp3') {
    const a = +m[1], b = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': 'bytes ' + a + '-' + b + '/' + size, 'content-length': b - a + 1 });
    fs.createReadStream(p, { start: a, end: b }).pipe(res); return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size });
  fs.createReadStream(p).pipe(res);
});
/* the phone's notification and background-sync APIs, stubbed; o.nt: 'none' (no Notification at all), o.perm, o.sync */
const MOCK = (o) => {
  window.__nt = { req: 0, reg: [], unreg: 0 };
  if (o.nt === 'none') { try { Object.defineProperty(window, 'Notification', { value: undefined, configurable: true, writable: true }); } catch (e) { window.Notification = undefined; } return; }
  function N() {}
  N.permission = 'default';
  N.requestPermission = function () { window.__nt.req++; N.permission = o.perm || 'granted'; return Promise.resolve(N.permission); };
  window.Notification = N;
  const reg = o.sync === false ? {} : { periodicSync: { register: (tag, op) => { window.__nt.reg.push([tag, op && op.minInterval]); return Promise.resolve(); }, unregister: (tag) => { window.__nt.unreg++; window.__nt.last = tag; return Promise.resolve(); } } };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), controller: null, register: () => Promise.resolve(reg) } });
  if (navigator.permissions) { const q = navigator.permissions.query.bind(navigator.permissions); navigator.permissions.query = (d) => (d && d.name === 'periodic-background-sync' ? Promise.resolve({ state: o.sync === false ? 'denied' : 'granted' }) : q(d)); }
};

const fails = [];
function check(ok, msg) { if (!ok) { fails.push(msg); console.log('FAIL', msg); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const J = JSON.stringify;
const wkOf = (d) => Math.floor((d + 3) / 7), wkStart = (w) => w * 7 - 3;

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 1, hasTouch: true, acceptDownloads: true });
    await ctx.addInitScript(MOCK, opts.nt || {});
    const st = Object.assign(opts.fresh ? {} : { 'vocab3000-ui-v1': J({ ob: 1, pn: 1 }) }, opts.store || {});
    await ctx.addInitScript((s) => { if (!localStorage.getItem('__seeded')) { Object.keys(s).forEach((k) => localStorage.setItem(k, s[k])); localStorage.setItem('__seeded', '1'); } }, st);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push('console ' + m.text()); });
    await page.goto(base + (opts.hash || ''));
    await page.waitForSelector('#app > *');
    return { ctx, page };
  }
  const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const txt = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const viewOf = (page) => page.evaluate(() => document.body.getAttribute('data-view'));
  const store = (page, k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k);
  const mirror = (page) => page.evaluate(async () => { const c = await caches.open('habit-v1'); const r = await c.match(new URL('habit-state.json', location.href).href); return r ? r.json() : null; });
  const nt = (page) => page.evaluate(() => window.__nt);
  const leave = async (page) => { await page.click('#quit'); if (await has(page, '#dlg-leave')) await page.click('#dlg-leave'); };

  /* 1. the first run asks when to study (step 3 of 4); the plan shows on the path; nothing asks for notifications */
  let { ctx, page } = await open({ fresh: true });
  await page.click('#ob-why-work'); await page.click('#ob-min-10');
  check(/เรียนตอนไหนดี/.test(await txt(page, '#app h1')) && /ขั้นที่ 3 จาก 4/.test(await txt(page, '.eyebrow')) && (await page.$$('.opt[data-act="ob-plan"]')).length === 3, 'first run: when to study, three anchors');
  await page.click('#ob-plan-0');
  check(await has(page, '#ob-plan-0.is-sel') && (await page.inputValue('#ob-plan-time')) === '07:30' && /หลังกินข้าวเช้า ฉันจะเรียน 10 นาที/.test(await txt(page, '#ob-plan-line')), 'an anchor is picked with its usual time: ' + await txt(page, '#ob-plan-line'));
  await page.fill('#ob-plan-own', 'หลังเลิกเรียน');
  check(!(await has(page, '.opt.is-sel[data-act="ob-plan"]')) && /หลังเลิกเรียน ฉันจะเรียน 10 นาที/.test(await txt(page, '#ob-plan-line')), 'own words replace the anchor');
  await page.fill('#ob-plan-own', '');
  await page.click('#ob-plan-2');
  await page.fill('#ob-plan-time', '20:45'); await page.dispatchEvent('#ob-plan-time', 'change');
  check(/ก่อนนอน ฉันจะเรียน 10 นาที 20:45/.test(await txt(page, '#ob-plan-line')), 'the time can be changed: ' + await txt(page, '#ob-plan-line'));
  await page.screenshot({ path: path.join(shots, 'p9-ob-plan.png') });
  await page.click('#ob-plan-go');
  check(/เริ่มจากไหน/.test(await txt(page, '#app h1')) && /ขั้นที่ 4 จาก 4/.test(await txt(page, '.eyebrow')), 'then where to start');
  let hb = await store(page, 'vocab3000-habit-v1'), ui = await store(page, 'vocab3000-ui-v1');
  check(hb && hb.p && hb.p.a === 2 && hb.p.t === '20:45' && ui.rt === '20:45', 'the plan is saved, its time is the reminder time ' + J(hb && hb.p) + ' ' + (ui && ui.rt));
  await page.click('#ob-zero');
  check((await viewOf(page)) === 'run', 'the first lesson opens');
  /* answering marks today as practised for the reminder, and counts for the weekly report: the cards, then one question
     answered right (a new word learned) */
  for (let i = 0; i < 40 && !(await has(page, '.opt:not(:disabled)')); i++) {
    if (await has(page, '#reveal')) await page.click('#reveal'); else if (await has(page, '#card-yes')) await page.click('#card-yes'); else if (await has(page, '#next-btn')) await page.click('#next-btn'); else await sleep(100);
  }
  const right = await page.evaluate(() => {
    const ruled = document.querySelector('#card .ruled'), say = document.querySelector('#card [data-act="say"][data-n]'), want = ruled ? ruled.textContent.trim() : null, wn = say ? +say.getAttribute('data-n') : 0;
    let n = 0, ans = null;
    window.__VOCAB__.forEach((cd) => cd[2].split('\n').forEach((l) => { const f = l.split('|'); n++; if (!ans && ((want && f[0] === want) || (!want && n === wn))) ans = f[2].replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, '').trim() || f[2]; }));
    return ans;
  });
  const opts1 = await page.$$eval('.opt span:first-child', (a) => a.map((e) => e.textContent));
  check(opts1.indexOf(right) >= 0, 'the right option is found: ' + right + ' in ' + J(opts1));
  if (await has(page, '.listen.big')) await page.click('.listen.big');
  await page.click('#opt-' + Math.max(0, opts1.indexOf(right)));
  await sleep(1300);
  const m1 = await mirror(page);
  check(m1 && m1.last === DAY && m1.on === 0 && m1.t === '20:45', 'the copy for the service worker knows today was practised ' + J(m1));
  hb = await store(page, 'vocab3000-habit-v1');
  check(hb.d[DAY] && J(hb.d[DAY]) === J([1, 1, 1]) && hb.k[wkOf(DAY)] === 0 && hb.s === DAY, 'a word learned and an answer right the first time are counted, the week start too ' + J(hb.d) + ' ' + J(hb.k));
  await leave(page);
  check((await viewOf(page)) === 'path' && /^ก่อนนอน ฉันจะเรียน 10 นาที 20:45$/.test(await txt(page, '#p-plan')), 'the plan is one line on the path: ' + await txt(page, '#p-plan'));
  check((await nt(page)).req === 0, 'no notification permission asked on first open');
  await page.screenshot({ path: path.join(shots, 'p9-path-plan.png') });
  await ctx.close();
  /* skipping the plan step leaves no plan; the path invites to set one */
  ({ ctx, page } = await open({ fresh: true }));
  await page.click('#ob-why-study'); await page.click('#ob-min-5'); await page.click('#ob-plan-go'); await page.click('#ob-zero'); await leave(page);
  hb = await store(page, 'vocab3000-habit-v1');
  check(!(hb && hb.p) && await has(page, '#p-plan.none') && /ตั้งเวลาเรียนประจำวัน/.test(await txt(page, '#p-plan')), 'no plan picked: none saved, a quiet link on the path');
  await ctx.close();

  /* 2. settings: anchors, own words, time, removing the plan; the calendar uses the same time */
  ({ ctx, page } = await open({}));
  await page.click('#p-plan');
  check((await viewOf(page)) === 'prefs' && await has(page, '#plan-sec') && /ยังไม่ได้ตั้งแผน/.test(await txt(page, '#pl-line')), 'the plan link opens its settings');
  await page.click('#pl-a-1');
  hb = await store(page, 'vocab3000-habit-v1');
  check(hb.p.a === 1 && hb.p.t === '19:00' && await has(page, '#pl-a-1[aria-pressed="true"]') && /ระหว่างเดินทาง ฉันจะเรียน 10 นาที 19:00/.test(await txt(page, '#pl-line')), 'an anchor in settings keeps the time ' + J(hb.p));
  await page.fill('#pl-own', 'หลังเลิกงาน'); await page.dispatchEvent('#pl-own', 'change');
  await page.fill('#rm-time', '18:15'); await page.dispatchEvent('#rm-time', 'change');
  hb = await store(page, 'vocab3000-habit-v1'); ui = await store(page, 'vocab3000-ui-v1');
  check(hb.p.a === -1 && hb.p.o === 'หลังเลิกงาน' && hb.p.t === '18:15' && ui.rt === '18:15' && /T181500\//.test(await page.evaluate(() => document.getElementById('rm-gcal').getAttribute('href'))), 'own words and a new time: plan, reminder time and calendar link ' + J(hb.p));
  check(/หลังเลิกงาน ฉันจะเรียน 10 นาที 18:15/.test(await txt(page, '#pl-line')), 'the plan line follows: ' + await txt(page, '#pl-line'));
  await page.click('#pref-xg-30');
  await page.click('.crumb .back');
  check(/^หลังเลิกงาน ฉันจะเรียน 15 นาที 18:15$/.test(await txt(page, '#p-plan')), 'minutes follow the daily goal: ' + await txt(page, '#p-plan'));
  await page.click('#p-plan'); await page.click('#pl-clear');
  check(!(await store(page, 'vocab3000-habit-v1')).p && /ยังไม่ได้ตั้งแผน/.test(await txt(page, '#pl-line')), 'the plan can be removed');
  await ctx.close();

  /* 3. the daily notification, asked from settings only */
  ({ ctx, page } = await open({ nt: { perm: 'granted' } }));
  await page.click('#p-prefs');
  check(await has(page, '#nt-on') && /22:00–07:00/.test(await txt(page, '#nt-pref')) && /มือถือเป็นคนเลือกเวลา/.test(await txt(page, '#nt-pref')), 'the setting explains quiet hours and that the phone picks the time');
  await page.click('#nt-on');
  await page.waitForSelector('#nt-off', { timeout: 6000 }).catch(() => {});
  let n = await nt(page);
  ui = await store(page, 'vocab3000-ui-v1');
  check(n.req === 1 && J(n.reg) === J([['daily-nudge', 3600000]]) && ui.nt === 1 && /เปิดอยู่ จะเตือนหลัง 19:00/.test(await txt(page, '#nt-state')), 'turned on: permission asked once, the sync registered ' + J(n) + ' nt=' + ui.nt);
  await sleep(200);
  check((await mirror(page)).on === 1, 'the service worker copy says on');
  await page.screenshot({ path: path.join(shots, 'p9-prefs-nt.png'), fullPage: true });
  await page.click('#nt-off');
  await sleep(300);
  n = await nt(page); ui = await store(page, 'vocab3000-ui-v1');
  check(n.unreg === 1 && n.last === 'daily-nudge' && ui.nt === 0 && (await mirror(page)).on === 0 && await has(page, '#nt-on'), 'turned off: unregistered, copy says off');
  await ctx.close();
  ({ ctx, page } = await open({ nt: { perm: 'denied' } }));
  await page.click('#p-prefs'); await page.click('#nt-on');
  await page.waitForFunction(() => /ยังไม่ได้อนุญาต/.test((document.getElementById('nt-note') || {}).textContent || ''), null, { timeout: 6000 }).catch(() => {});
  n = await nt(page);
  check(/ยังไม่ได้อนุญาต/.test(await txt(page, '#nt-note')) && !n.reg.length && !(await store(page, 'vocab3000-ui-v1')).nt, 'permission refused: told kindly, nothing registered');
  await ctx.close();
  ({ ctx, page } = await open({ nt: { perm: 'granted', sync: false } }));
  await page.click('#p-prefs'); await page.click('#nt-on');
  await page.waitForFunction(() => /ติดตั้งแอป/.test((document.getElementById('nt-note') || {}).textContent || ''), null, { timeout: 7000 }).catch(() => {});
  check(/ติดตั้งแอป/.test(await txt(page, '#nt-note')) && /ปฏิทิน/.test(await txt(page, '#nt-note')) && !(await store(page, 'vocab3000-ui-v1')).nt, 'no background sync (not installed): says so, points to the calendar');
  await ctx.close();
  ({ ctx, page } = await open({ nt: { nt: 'none' } }));
  await page.click('#p-prefs');
  check(!(await has(page, '#nt-on')) && /แจ้งเตือนเองไม่ได้/.test(await txt(page, '#nt-note')) && await has(page, '#rm-gcal'), 'no notifications on this browser: the calendar stays');
  await ctx.close();

  /* 4. the service worker's reminder, with its APIs stubbed */
  const swSrc = fs.readFileSync(path.join(repo, 'sw.js'), 'utf8'), SCOPE = 'https://x.test/app/';
  function sw(when, state, o) {
    o = o || {};
    const listeners = {}, shown = [], opened = [], focused = [], kept = new Map();
    if (state) kept.set(SCOPE + 'habit-state.json', J(state));
    if (o.seen !== undefined) kept.set(SCOPE + 'habit-shown.json', J({ d: o.seen }));
    const RealDate = Date, fixed = new RealDate(when[0], when[1], when[2], when[3], when[4]).getTime();
    class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } }
    class Resp { constructor(body) { this.b = body; } async json() { return JSON.parse(this.b); } async text() { return this.b; } clone() { return new Resp(this.b); } }
    const cache = { match: async (k) => (kept.has(String(k)) ? new Resp(kept.get(String(k))) : undefined), put: async (k, r) => { kept.set(String(k), r.b); } };
    const win = o.win ? { url: SCOPE, visibilityState: o.win, focus() { focused.push(1); return Promise.resolve({ navigate: (u) => { opened.push('nav ' + u); return Promise.resolve(); } }); } } : null;
    const ctx2 = { caches: { open: async () => cache, keys: async () => [], delete: async () => true, match: async () => undefined }, Response: Resp, Date: FakeDate, URL, console, Promise, fetch: async () => { throw new Error('offline'); } };
    ctx2.self = { addEventListener: (t, f) => { listeners[t] = f; }, location: { origin: 'https://x.test' }, skipWaiting: () => {},
      registration: { scope: SCOPE, showNotification: async (t, op) => { shown.push({ t, op }); } },
      clients: { matchAll: async () => (win ? [win] : []), openWindow: async (u) => { opened.push(u); }, claim: async () => {} } };
    vm.createContext(ctx2); vm.runInContext(swSrc, ctx2);
    const day = Math.floor((fixed - new RealDate(fixed).getTimezoneOffset() * 60000) / 86400000);
    return {
      day, shown, opened, focused, kept,
      fire: () => new Promise((res, rej) => listeners.periodicsync({ tag: 'daily-nudge', waitUntil: (p) => p.then(res, rej) })),
      click: (data) => new Promise((res, rej) => listeners.notificationclick({ notification: { data, close() {} }, waitUntil: (p) => p.then(res, rej) }))
    };
  }
  const T = new Date(), Y = T.getFullYear(), Mo = T.getMonth(), Dd = T.getDate(), at = (h, mi) => [Y, Mo, Dd, h, mi || 0];
  const d0 = sw(at(19, 30), null).day;
  const s1 = sw(at(19, 30), { on: 1, t: '19:00', last: d0 - 1 });
  await s1.fire();
  check(s1.shown.length === 1 && s1.shown[0].t === 'ฝึกภาษาอังกฤษ' && s1.shown[0].op.body === 'วันนี้ยังไม่ได้เรียน 5 นาทีก็พอ' && s1.shown[0].op.data.url === './#go=next' && s1.shown[0].op.tag === 'daily-nudge', 'after the planned time, nothing practised: one notification ' + J(s1.shown));
  await s1.fire();
  check(s1.shown.length === 1 && JSON.parse(s1.kept.get(SCOPE + 'habit-shown.json')).d === d0, 'once a day only');
  const cases = [
    ['practised today', at(19, 30), { on: 1, t: '19:00', last: d0 }, {}],
    ['quiet hours, late', at(22, 30), { on: 1, t: '19:00', last: d0 - 1 }, {}],
    ['quiet hours, early', at(6, 30), { on: 1, t: '19:00', last: d0 - 1 }, {}],
    ['before the planned time', at(18, 0), { on: 1, t: '19:00', last: d0 - 1 }, {}],
    ['turned off', at(19, 30), { on: 0, t: '19:00', last: d0 - 1 }, {}],
    ['nothing copied yet', at(19, 30), null, {}],
    ['already shown today', at(20, 0), { on: 1, t: '19:00', last: d0 - 1 }, { seen: d0 }],
    ['the app is on screen', at(19, 30), { on: 1, t: '19:00', last: d0 - 1 }, { win: 'visible' }],
    ['a planned time in the quiet hours, too early', at(20, 30), { on: 1, t: '23:00', last: d0 - 1 }, {}]
  ];
  for (const [name, when, st, o] of cases) { const s = sw(when, st, o); await s.fire(); check(s.shown.length === 0, 'no notification: ' + name); }
  let s2 = sw(at(21, 15), { on: 1, t: '23:00', last: d0 - 1 });
  await s2.fire();
  check(s2.shown.length === 1, 'a planned time in the quiet hours is reminded at 21:00');
  s2 = sw(at(7, 5), { on: 1, t: '05:30', last: d0 - 1 }, { win: 'hidden' });
  await s2.fire();
  check(s2.shown.length === 1, 'an early planned time is reminded from 07:00; a hidden app window does not stop it');
  s2 = sw(at(19, 30), null);
  await s2.click({ url: './#go=next' });
  check(J(s2.opened) === J([SCOPE + '#go=next']), 'tapping it opens the app at the next lesson ' + J(s2.opened));
  s2 = sw(at(19, 30), null, { win: 'hidden' });
  await s2.click({ url: './#go=next' });
  check(s2.focused.length === 1 && J(s2.opened) === J(['nav ' + SCOPE + '#go=next']), 'an open app is brought forward instead ' + J(s2.opened));

  /* 5. the shortcuts in the manifest: names, addresses in scope, icons of the stated size; the badge has transparency */
  const man = JSON.parse(fs.readFileSync(path.join(repo, 'manifest.webmanifest'), 'utf8'));
  const png = (f) => { const bf = fs.readFileSync(path.join(repo, f)); return bf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? { w: bf.readUInt32BE(16), h: bf.readUInt32BE(20), ct: bf[25] } : null; };
  const scs = man.shortcuts || [];
  check(J(scs.map((x) => x.name)) === J(['เรียนต่อ', 'ทบทวนคำ', 'ฝึกพูด']) && J(scs.map((x) => x.url)) === J(['./#go=next', './#go=review', './#go=say']), 'three shortcuts: ' + J(scs.map((x) => [x.name, x.url])));
  const scope = new URL(man.scope, 'https://x.test/app/manifest.webmanifest').href;
  check(scs.every((x) => new URL(x.url, 'https://x.test/app/manifest.webmanifest').href.indexOf(scope) === 0 && x.short_name && x.description), 'shortcut addresses inside the app scope, with short names');
  check(scs.every((x) => x.icons.length >= 1 && x.icons.some((i) => i.sizes === '96x96') && x.icons.every((i) => { const p = png(i.src); return p && i.sizes === p.w + 'x' + p.h && i.type === 'image/png'; })), 'shortcut icons exist with the stated sizes');
  const bd = png('icons/badge-96.png');
  check(bd && bd.w === 96 && bd.h === 96 && bd.ct === 6 && /icons\/badge-96\.png/.test(swSrc) && /icons\/icon-192\.png/.test(swSrc), 'the notification badge (96 px, transparent) and icon exist');

  /* 6. the page follows a shortcut address, never breaking off a lesson; the first run comes first */
  const t2 = DAY;
  const learned = { w: {}, s: {} };
  const D1 = await (async () => { const o = await open({}); const a = await o.page.evaluate(() => { const out = []; window.__VOCAB__.slice(0, 1).forEach((cd) => cd[2].split('\n').slice(0, 3).forEach((l, i) => out.push(i + 1))); return out; }); await o.ctx.close(); return a; })();
  D1.forEach((nn) => { learned.w[nn] = [2, t2 - 1, t2 - 3, 0, 1700000000]; });
  ({ ctx, page } = await open({ hash: '#go=next' }));
  check((await viewOf(page)) === 'run' && (await page.evaluate(() => location.hash)) === '', 'shortcut "เรียนต่อ": the next lesson starts, the address is cleaned');
  await page.evaluate(() => { location.hash = '#go=say'; });
  await sleep(300);
  check((await viewOf(page)) === 'run', 'a shortcut never breaks off a lesson');
  await ctx.close();
  ({ ctx, page } = await open({ hash: '#go=say' }));
  check((await viewOf(page)) === 'pr-say', 'shortcut "ฝึกพูด": speaking practice');
  await page.evaluate(() => { location.hash = '#go=review'; });
  await sleep(400);
  check((await viewOf(page)) === 'prac' && /ยังไม่มีคำที่ถึงเวลาทบทวน/.test(await txt(page, '#toast')), 'shortcut "ทบทวนคำ" with nothing due: the practice tab and a note');
  await ctx.close();
  ({ ctx, page } = await open({ hash: '#go=review', store: { 'vocab3000-progress-v1': J(learned) } }));
  check((await viewOf(page)) === 'run' && /ทบทวน/.test(await txt(page, '.run-title')), 'shortcut "ทบทวนคำ": the due words come up: ' + await txt(page, '.run-title'));
  await ctx.close();
  ({ ctx, page } = await open({ fresh: true, hash: '#go=next' }));
  check(await has(page, '#ob-why-work'), 'a first-time learner sees the first-run questions first');
  await ctx.close();

  /* 7. the weekly report on seeded data: last week against the week before */
  const cw = wkOf(DAY), ws = wkStart(cw), L = ws - 7, B = ws - 14;
  function seedWeek(o) {
    const days = {}, xp = { d: {}, c: {}, p: {}, s: {}, b: 1 }, d = {};
    (o.lastDays || [0, 1, 2, 3, 4]).forEach((i, k) => { days[L + i] = [1, 1, 0, 0, 0, 0]; xp.d[L + i] = [40, 50, 60, 40, 40][k] || 40; d[L + i] = [8, 36, 40]; });
    [0, 1, 2].forEach((i, k) => { days[B + i] = [1, 1, 0, 0, 0, 0]; xp.d[B + i] = [30, 40, 50][k]; d[B + i] = [[8, 25, 30], [8, 25, 30], [9, 25, 30]][k]; });
    xp.s[L] = 4; xp.s[L + 1] = 4; xp.s[L + 2] = 4; xp.s[B] = 4;
    return {
      'vocab3000-days-v1': J(days), 'vocab3000-xp-v1': J(xp),
      'vocab3000-habit-v1': J({ d, k: { [cw - 2]: 5, [cw - 1]: 9, [cw]: 12 }, s: o.s || ws - 21 })
    };
  }
  ({ ctx, page } = await open({ store: seedWeek({}) }));
  check(/รายงานสัปดาห์ที่แล้ว/.test(await txt(page, '#p-week-box')) && /เรียน 5 วัน ได้ 230 XP/.test(await txt(page, '#p-week-box')), 'a new week: the report card on the path ' + await txt(page, '#p-week-box'));
  await page.screenshot({ path: path.join(shots, 'p9-week-card.png') });
  await page.click('#p-week');
  const row = async (id) => [await txt(page, '#wk-' + id + ' .wk-v'), await txt(page, '#wk-' + id + ' .wk-d')];
  check((await viewOf(page)) === 'week' && (await txt(page, '#wk-h')) === 'สัปดาห์ที่แล้ว', 'the report of last week opens');
  const got = { days: await row('days'), xp: await row('xp'), nw: await row('new'), long: await row('long'), acc: await row('acc'), said: await row('said') };
  check(J(got) === J({ days: ['5 วัน', '+2 วัน'], xp: ['230', '+110'], nw: ['40 คำ', '+15 คำ'], long: ['12 คำ', '+3 คำ'], acc: ['90%', '+7%'], said: ['12 ประโยค', '+8 ประโยค'] }), 'weekly numbers against the week before ' + J(got));
  check(/รักษาจังหวะนี้ไว้/.test(await txt(page, '#wk-tip')) && (await page.getAttribute('#wk-act', 'data-act')) === 'p-go-cur', 'one suggestion with a button: ' + await txt(page, '#wk-tip'));
  check(await overflow(page) <= 0, 'report layout at 390');
  await page.screenshot({ path: path.join(shots, 'p9-week.png'), fullPage: true });
  await page.click('#wk-now');
  check((await txt(page, '#wk-h')) === 'สัปดาห์นี้' && /^0 วัน/.test(await txt(page, '#wk-days .wk-v')) && /−5 วัน/.test(await txt(page, '#wk-days .wk-d')), 'this week so far, against last week');
  await page.click('.crumb .back');
  check(!(await has(page, '#p-week-box')) && (await store(page, 'vocab3000-ui-v1')).wk === cw, 'seen: the card does not come back this week');
  await page.reload(); await page.waitForSelector('#app h1');
  check(!(await has(page, '#p-week-box')), 'not after a reload either');
  await page.click('#open-me'); await page.click('#open-week');
  check((await viewOf(page)) === 'week' && (await txt(page, '#wk-h')) === 'สัปดาห์นี้', 'on demand from the me screen');
  await ctx.close();
  ({ ctx, page } = await open({ store: seedWeek({ lastDays: [0, 3] }) }));
  await page.click('#p-week-x');
  check(!(await has(page, '#p-week-box')) && (await store(page, 'vocab3000-ui-v1')).wk === cw, 'the card can be closed');
  await page.click('#open-me'); await page.click('#open-week'); await page.click('#wk-last');
  check(/ลองตั้งเวลาเรียนประจำวัน/.test(await txt(page, '#wk-tip')) && (await page.getAttribute('#wk-act', 'data-act')) === 'plan', 'two days studied: the suggestion is a study plan ' + await txt(page, '#wk-tip'));
  await page.click('#wk-act');
  check((await viewOf(page)) === 'prefs' && await has(page, '#plan-sec'), 'its button opens the plan settings');
  await ctx.close();
  ({ ctx, page } = await open({ store: seedWeek({ s: DAY }) }));
  await page.click('#p-week');
  check((await txt(page, '#wk-new .wk-d')) === '—' && (await txt(page, '#wk-acc .wk-d')) === '—' && /เริ่มนับตั้งแต่/.test(await txt(page, '.block .note')), 'counting started this week: no comparison for new words and accuracy, and a note');
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-xp-v1': J({ d: { [DAY]: 5 }, c: {}, p: {}, s: {}, b: 1 }) } }));
  check(!(await has(page, '#p-week-box')), 'no card when last week had no practice');
  await ctx.close();

  /* 8. the backup code carries the plan and the counts; restoring keeps the newer plan; an old code still restores */
  const planNew = { a: 0, o: '', t: '06:50', u: Math.floor(Date.now() / 1000) };
  ({ ctx, page } = await open({ store: Object.assign(seedWeek({}), { 'vocab3000-habit-v1': J({ p: planNew, d: { [DAY]: [3, 4, 5] }, k: { [cw]: 12 }, s: ws - 21 }) }) }));
  await page.click('#open-me'); await page.click('#open-prefs'); await page.click('#bk-copy');
  const code = await page.evaluate(() => document.getElementById('bk-out').value);
  const doc = JSON.parse(Buffer.from(code.slice(4), 'base64').toString('utf8'));
  check(doc.d.habit && doc.d.habit.p.t === '06:50' && J(doc.d.habit.d[DAY]) === J([3, 4, 5]), 'the backup code carries the plan and the counts');
  check(!/"nt"|"wk"/.test(J(doc.d.habit)), 'device settings stay out of the backup');
  await ctx.close();
  ({ ctx, page } = await open({}));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', code); await page.click('#bk-restore');
  hb = await store(page, 'vocab3000-habit-v1'); ui = await store(page, 'vocab3000-ui-v1');
  check(hb.p && hb.p.t === '06:50' && ui.rt === '06:50' && J(hb.d[DAY]) === J([3, 4, 5]) && hb.k[cw] === 12, 'restored on another phone: plan, its time and the counts ' + J(hb));
  await page.click('.crumb .back'); await page.click('.crumb .back');
  check(/^หลังกินข้าวเช้า ฉันจะเรียน 10 นาที 06:50$/.test(await txt(page, '#p-plan')), 'the restored plan shows on the path');
  await ctx.close();
  const older = JSON.parse(J(doc)); older.d.habit.p = { a: 2, o: '', t: '22:00', u: planNew.u - 1000 }; older.d.habit.d[DAY] = [1, 1, 2];
  ({ ctx, page } = await open({ store: { 'vocab3000-habit-v1': J({ p: planNew, d: { [DAY]: [3, 4, 5] }, k: {}, s: DAY }) } }));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', 'EN1:' + Buffer.from(J(older), 'utf8').toString('base64')); await page.click('#bk-restore');
  hb = await store(page, 'vocab3000-habit-v1');
  check(hb.p.t === '06:50' && J(hb.d[DAY]) === J([3, 4, 5]), 'an older plan and smaller counts never replace newer ones ' + J(hb.p) + ' ' + J(hb.d[DAY]));
  delete older.d.habit;
  await page.fill('#bk-in', 'EN1:' + Buffer.from(J(older), 'utf8').toString('base64')); await page.click('#bk-restore');
  check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')), 'an old code without the habit record still restores');
  await ctx.close();

  /* 9. layout at 390 and 320 px, light and dark: the plan step, the path with the plan and the card, settings, the report */
  for (const [w, dark] of [[390, false], [390, true], [320, false], [320, true]]) {
    const tag = w + (dark ? '-dark' : '');
    ({ ctx, page } = await open({ fresh: true, dark, viewport: { width: w, height: 720 } }));
    await page.click('#ob-why-work'); await page.click('#ob-min-20'); await page.click('#ob-plan-1');
    check(await overflow(page) <= 0, 'plan step overflow at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p9-ob-' + tag + '.png'), fullPage: true });
    await ctx.close();
    ({ ctx, page } = await open({ dark, viewport: { width: w, height: 720 }, store: Object.assign(seedWeek({}), { 'vocab3000-habit-v1': J({ p: { a: -1, o: 'หลังเลิกเรียนและกินข้าวเย็นเสร็จ', t: '19:30', u: 1 }, d: {}, k: { [cw - 1]: 9, [cw]: 12 }, s: ws - 21 }) }) }));
    check(await overflow(page) <= 0, 'path with the plan and the card at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p9-path-' + tag + '.png') });
    await page.click('#p-plan');
    check(await overflow(page) <= 0, 'plan settings at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p9-prefs-' + tag + '.png'), fullPage: true });
    await page.click('.crumb .back'); await page.click('#p-week');
    check(await overflow(page) <= 0, 'weekly report at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p9-week-' + tag + '.png'), fullPage: true });
    await ctx.close();
  }

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(1); });

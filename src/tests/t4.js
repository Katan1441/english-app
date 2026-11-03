// End-to-end check of the learning path (phase 2) in headless Chromium: first run, the path built from existing progress,
// lessons run as nodes, the end screen, XP, combo, vibration, quests, checkpoints and test-out, stories and say-alongs,
// leaving a lesson, the backup code with the new records, and the layout.
// node t4.js <trainer dir> <shots dir>
const fs = require('fs'), path = require('path'), http = require('http');
const root = process.argv[2], shots = process.argv[3];
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

/* __dayShift moves the clock by whole days; navigator.vibrate is recorded in __vib; speech recognition is a stand-in that hears
   window.__sr.say (or nothing with __noSR); no recorder, so the speaking panel only listens. */
const MOCK = `
(function(){
  var sh = (window.__dayShift || 0) * 86400000;
  if (sh) { var RD = Date; class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + sh); } static now() { return RD.now() + sh; } } window.Date = FD; }
  window.__vib = [];
  try { Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: function (p) { window.__vib.push(p); return true; } }); } catch (e) {}
  window.__sr = { say: null };
  try { window.MediaRecorder = undefined; } catch (e) {}
  if (window.__noSR) { window.webkitSpeechRecognition = undefined; window.SpeechRecognition = undefined; }
  else {
    function FakeSR() { this.lang = ''; this.onresult = null; this.onerror = null; this.onend = null; this._t = null; }
    FakeSR.prototype.start = function () {
      var self = this, cfg = window.__sr || {};
      this._t = setTimeout(function () {
        if (cfg.say) { var r = cfg.say.map(function (t) { return { transcript: t, confidence: .9 }; }); r.isFinal = true; self.onresult && self.onresult({ resultIndex: 0, results: [r] }); }
        else self.onerror && self.onerror({ error: 'no-speech' });
        self.onend && self.onend();
      }, 60);
    };
    FakeSR.prototype.stop = function () {};
    FakeSR.prototype.abort = function () { clearTimeout(this._t); };
    window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
  }
})();`;

const fails = [];
function check(ok, msg) { if (!ok) { fails.push(msg); console.log('FAIL', msg); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: opts.still ? 'reduce' : 'no-preference', deviceScaleFactor: 1, hasTouch: true });
    await ctx.addInitScript((flags) => { Object.assign(window, flags); }, opts.flags || {});
    await ctx.addInitScript(MOCK);
    if (opts.store) await ctx.addInitScript((st) => { if (!localStorage.getItem('__seeded')) { Object.keys(st).forEach((k) => localStorage.setItem(k, st[k])); localStorage.setItem('__seeded', '1'); } }, opts.store);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push('console ' + m.text()); });
    await page.goto(base);
    await page.waitForSelector('#app h1');
    return { ctx, page };
  }
  const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const txt = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const viewOf = (page) => page.evaluate(() => document.body.getAttribute('data-view'));
  const store = (page, k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k);
  const cur = (page) => page.evaluate(() => { const e = document.querySelector('.pnode.cur'); return e ? e.getAttribute('data-id') : null; });
  const ids = (page, sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((e) => e.getAttribute('data-id')), sel);
  const news = async (page) => { if (await has(page, '#p-news-ok')) await page.click('#p-news-ok'); };
  const focusUnit = (page, i) => page.evaluate((u) => { const e = document.querySelector('[data-act="p-unit"][data-u="' + u + '"]'); if (e) e.click(); return !!e; }, i);
  const D = await (async () => {
    const { ctx, page } = await open({});
    const out = await page.evaluate(() => {
      const a = []; let n = 0;
      window.__VOCAB__.forEach((cd, ci) => cd[2].split('\n').forEach((l, i) => { const f = l.split('|'); n++; a.push({ n, w: f[0], t: f[2], ask: f[2].replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, '').trim() || f[2], x: f[4], xt: f[5], c: ci, si: Math.floor(i / 10) }); }));
      return a;
    });
    await ctx.close();
    return out;
  })();

  /* One action on a question screen of a path lesson. how(kind) -> 'ok' | 'bad'. Returns false at the end screen. */
  async function step(page, how, label) {
    const v = await viewOf(page);
    if (v === 'p-end') return false;
    if (v === 'g-lesson') { await page.click('#p-gstart'); return true; }
    if (v === 'p-words') { await page.click('#p-words-go'); return true; }
    if (v === 'story') {
      const qs = await page.evaluate(() => { const s = window.__R__.stories.find((x) => document.querySelector('#app h2').textContent === x.en); return s.q.map((q) => q.a); });
      for (let i = 0; i < qs.length; i++) if (await has(page, '#rq-' + i + '-0:not(:disabled)')) await page.click('#rq-' + i + '-' + (how('story', 'r' + i) === 'bad' ? (qs[i] + 1) % 3 : qs[i]));
      await page.click('#p-story-done'); return true;
    }
    if (v === 'g-run') {
      if (await has(page, '#next-btn')) { await page.click('#next-btn'); return true; }
      const info = await page.evaluate(() => {
        const all = []; window.__G__.lessons.forEach((l) => l.q.forEach((q) => all.push(q)));
        const sen = document.querySelector('#card .sentence'), th = document.querySelector('#card .sentence-th, #card .prompt-th');
        const opts = Array.from(document.querySelectorAll('.opt span:first-child')).map((e) => e.textContent), bank = Array.from(document.querySelectorAll('#bank .tok')).map((e) => e.textContent);
        const kind = bank.length ? 'o' : (document.querySelector('#type-answer') ? 'w' : (opts.length && sen ? 'c' : 's'));
        let c = all.filter((q) => q.th === (th ? th.textContent : '') && q.k === kind);
        if (opts.length) c = c.filter((q) => q.opts && q.opts.slice().sort().join('|') === opts.slice().sort().join('|'));
        if (bank.length) c = c.filter((q) => q.en.replace(/[.?!]+$/, '').split(/\s+/).sort().join('|') === bank.slice().sort().join('|'));
        if (sen && c.length > 1) c = c.filter((q) => sen.textContent.replace(/\s+/g, ' ').trim().indexOf(q.en.split('___')[0].trim()) === 0);
        return c[0] ? { k: c[0].k, ans: c[0].ans, en: c[0].en, opts, key: c[0].id } : null;
      });
      check(!!info, label + ': grammar question not found');
      if (!info) { await page.click('#quit'); return false; }
      const bad = how('g', 'g|' + info.key) === 'bad';
      if (info.k === 'c' || info.k === 's') { let i = info.opts.indexOf(info.ans); if (bad) i = info.opts.findIndex((o) => o !== info.ans); await page.click('#opt-' + i); }
      else if (info.k === 'o') {
        let toks = info.en.replace(/[.?!]+$/, '').split(/\s+/); if (bad) toks = toks.slice().reverse();
        for (const t of toks) await page.evaluate((t2) => { const x = Array.from(document.querySelectorAll('#bank .tok')).find((y) => !y.disabled && y.textContent === t2); if (x) x.click(); }, t);
        await page.click('#check-order');
      } else { await page.fill('#type-answer', bad ? 'zzz' : info.ans[0]); await page.click('#check-type'); }
      return true;
    }
    if (v !== 'run') { check(false, label + ': unexpected screen ' + v); return false; }
    const st = await page.evaluate(() => {
      const q = (s) => !!document.querySelector(s), t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; };
      let kind = '';
      if (q('#next-btn')) kind = 'next'; else if (q('#reveal')) kind = 'card0'; else if (q('#card-yes')) kind = 'card1';
      else if (q('#bank')) kind = 'order'; else if (q('#judge-yes')) kind = 'judge'; else if (q('#giveup')) kind = 'mean';
      else if (q('#typed')) kind = 'copy'; else if (q('#hintline')) kind = 'type'; else if (q('#self-check')) kind = 'write';
      else if (q('.sentence') && q('.opts')) kind = 'cloze'; else if (q('.opts') && (q('#show-word') || q('.listen.big'))) kind = 'listen';
      else if (q('.opts') && q('.ruled')) kind = 'e2t'; else if (q('.opts')) kind = 't2e';
      const say = document.querySelector('#card .listen[data-act="say"]');
      return { kind, ruled: t('.ruled'), th: t('.prompt-th'), sth: t('.sentence-th'), hint: t('#hintline'), sayN: say ? +say.getAttribute('data-n') : 0,
        opts: Array.from(document.querySelectorAll('.opt span:first-child')).map((e) => e.textContent), typed: q('#typed') ? document.getElementById('typed').getAttribute('aria-label') : '' };
    });
    const k = st.kind, bad = how(k, k === 'next' || k === 'card0' || k === 'card1' ? undefined : k + '|' + st.ruled + '|' + st.th + '|' + st.sth + '|' + st.sayN + '|' + st.typed) === 'bad';
    const pick = async (right) => { let i = st.opts.indexOf(right); check(i >= 0 || bad, label + ' ' + k + ': right option missing ' + right); if (bad || i < 0) i = st.opts.findIndex((o) => o !== right); await page.click('#opt-' + i); };
    if (k === 'next') await page.click('#next-btn');
    else if (k === 'card0') await page.click('#reveal');
    else if (k === 'card1') await page.click('#card-yes');
    else if (k === 'e2t') { const e = D.find((x) => x.w === st.ruled && st.opts.indexOf(x.ask) >= 0) || D.find((x) => x.w === st.ruled); await pick(e.ask); }
    else if (k === 'listen') { const e = D.find((x) => x.n === st.sayN); await page.click('.listen.big'); await pick(e.ask); }
    else if (k === 't2e') { const e = D.find((x) => x.ask === st.th && st.opts.indexOf(x.w) >= 0); await pick(e ? e.w : '?'); }
    else if (k === 'cloze') { const e = D.find((x) => x.xt === st.sth && st.opts.indexOf(x.w) >= 0); await pick(e ? e.w : '?'); }
    else if (k === 'copy') { await page.fill('#type-answer', bad ? st.typed + 'x' : st.typed); await page.click('#check-type'); if (bad) { await page.fill('#type-answer', st.typed); await page.click('#check-type'); } }
    else if (k === 'type') { const f = st.hint.replace(/\s/g, '').charAt(0).toLowerCase(), e = D.find((x) => x.ask === st.th && x.w.charAt(0).toLowerCase() === f); await page.fill('#type-answer', bad || !e ? 'zzzz' : e.w); await page.click('#check-type'); }
    else if (k === 'mean') { const e = D.find((x) => x.w === st.ruled); await page.fill('#type-answer', bad ? 'คำตอบมั่ว' : e.t.replace(/\([^)]*\)/g, ' ').split(/[,\/]/)[0].trim()); await page.click('#check-type'); }
    else if (k === 'judge') await page.click(bad ? '#judge-no' : '#judge-yes');
    else if (k === 'order') {
      const e = D.find((x) => x.xt === st.th); let toks = e.x.replace(/[{}]/g, '').replace(/[.?!]+$/, '').split(/\s+/); if (bad) toks = toks.slice().reverse();
      for (const t of toks) await page.evaluate((t2) => { const x = Array.from(document.querySelectorAll('#bank .tok')).find((y) => !y.disabled && y.textContent === t2); if (x) x.click(); }, t);
      await page.click('#check-order');
    } else if (k === 'write') { await page.fill('#type-answer', 'We often see ' + st.ruled + ' here.'); await page.click('#self-check'); }
    else { check(false, label + ': unknown question screen'); return false; }
    return true;
  }
  async function play(page, how, label, each) {
    for (let i = 0; i < 400; i++) {
      if (each) await each(page);
      if (!(await step(page, how, label))) return;
    }
    check(false, label + ': lesson did not end');
  }
  /* answer plans: how(kind, key) -> 'ok' | 'bad'; failOnce() answers each question wrong the first time it is asked, right when it comes back */
  const allOk = () => 'ok';
  const failOnce = () => { const seenQ = new Set(); return (k, key) => { if (key === undefined || seenQ.has(key)) return 'ok'; seenQ.add(key); return 'bad'; }; };

  /* 1. first run: three questions, the first node opens, its end screen, the next node */
  let { ctx, page } = await open({});
  check(/เรียนเพื่ออะไร/.test(await txt(page, '#app h1')) && /ขั้นที่ 1 จาก 3/.test(await txt(page, '.eyebrow')), 'first run: what for');
  check(await has(page, '.tab[data-tab="path"][aria-current="page"]') && await page.evaluate(() => getComputedStyle(document.getElementById('tabbar')).display !== 'none'), 'first run: path tab marked, menu still usable');
  await page.screenshot({ path: path.join(shots, 'p-ob1.png') });
  await page.click('#ob-why-work');
  check(/วันละกี่นาที/.test(await txt(page, '#app h1')) && (await page.$$('.opt[data-act="ob-min"]')).length === 4, 'first run: minutes a day');
  await page.click('#ob-back');
  check(await has(page, '#ob-why-work.is-sel'), 'first run: back keeps the choice');
  await page.click('#ob-why-work'); await page.click('#ob-min-15');
  check(/เริ่มจากไหน/.test(await txt(page, '#app h1')) && await has(page, '#ob-zero') && await has(page, '#ob-check'), 'first run: where to start');
  await page.click('#ob-zero');
  let ui = await store(page, 'vocab3000-ui-v1');
  check(ui.why === 'work' && ui.xg === 30 && ui.ob === 1, 'first run: answers saved ' + JSON.stringify(ui));
  check((await viewOf(page)) === 'run' && await has(page, '#reveal') && await page.evaluate(() => getComputedStyle(document.getElementById('tabbar')).display === 'none'), 'first run: the first node opens straight away, no menu');
  check(/ขั้นที่ 1 บัตรคำ/.test(await txt(page, '.run-title b')) && await page.evaluate(() => document.querySelector('.runbar .bar i').style.width) === '0%', 'node 1 starts with the cards');
  // combo chip and praise at three right in a row, vibration on each answer
  let sawCombo = false, sawPraise = false;
  await play(page, allOk, 'node 1', async (p) => {
    if (!sawCombo && await has(p, '#combo')) { sawCombo = /ถูกติดกัน 3/.test(await txt(p, '#combo')); sawPraise = await has(p, '#sheet #praise'); if (sawCombo) await p.screenshot({ path: path.join(shots, 'p-combo.png') }); }
  });
  check(sawCombo && sawPraise, 'combo chip and praise at 3 right in a row');
  const vib = await page.evaluate(() => window.__vib);
  check(vib.filter((x) => x === 12).length >= 15 && vib.some((x) => Array.isArray(x) && x.length === 3 && x[2] === 90), 'vibration: short buzz per right answer, a longer one at the end ' + JSON.stringify(vib.slice(-3)));
  check((await viewOf(page)) === 'p-end', 'end screen after the last step');
  let xp = await page.evaluate(() => +document.getElementById('xp-up').getAttribute('data-xp'));
  check(xp === 35 && await has(page, '#p-full') && (await txt(page, '#p-acc')) === '100%' && /\d+:\d\d/.test(await txt(page, '#p-time')) && +(await txt(page, '#p-best')) >= 10, 'end screen: 20 right + 10 + 5 perfect = 35 XP, full mark, accuracy, time, best run: ' + xp);
  await sleep(1300);
  check((await txt(page, '#xp-up')) === '+35', 'XP counted up to the total');
  check(await has(page, '#p-next-node') && await has(page, '#p-back'), 'end screen: next and back to the path');
  check(await overflow(page) <= 0, 'end screen overflow');
  await page.screenshot({ path: path.join(shots, 'p-end.png') });
  let xs = await store(page, 'vocab3000-xp-v1');
  check(xs.b === 1 && xs.d[DAY] === 35 && xs.c[DAY] >= 10 && xs.p[DAY] === 1, 'XP record: today, best run, a perfect node ' + JSON.stringify(xs));
  check(Object.keys(await store(page, 'vocab3000-days-v1')).length === 1 && (await store(page, 'vocab3000-days-v1'))[DAY][1] === 3, 'days: three words steps logged');
  await page.click('#p-back');
  check((await viewOf(page)) === 'path' && (await cur(page)) === 'v:36.1.0' && await has(page, '.pnode.done[data-id="v:36.0.0"]'), 'path: node 1 done, the next node is current: ' + await cur(page));
  check(/35\/30/.test(await txt(page, '#p-xp')) && /^1/.test(await txt(page, '#p-streak .pstat-t')), 'header: XP against the goal and the streak');
  await page.click('#p-quests');
  check(await has(page, '#sheet .quest.done#quest-xp') && (await page.$$('#sheet .quest')).length === 3, 'quests: the XP goal is done');
  await page.click('#p-close');
  // the next node: right from the end screen, then leave it through the dialog
  await page.click('.pnode.cur'); check(/เริ่ม/.test(await txt(page, '#p-start')) && /ประมาณ \d+ นาที/.test(await txt(page, '#sheet')), 'node sheet: title, minutes, start');
  await page.click('#p-start');
  check((await viewOf(page)) === 'run', 'node 2 started');
  await page.click('#quit');
  check(await has(page, '#dlg') && /ออกจากบทนี้ไหม/.test(await txt(page, '#dlg')) && /ที่ทำไปแล้วยังเก็บไว้/.test(await txt(page, '#dlg')), 'leaving asks first, in the app');
  await page.screenshot({ path: path.join(shots, 'p-quit.png') });
  await page.click('#dlg-stay');
  check(!(await has(page, '#dlg')) && (await viewOf(page)) === 'run', 'stay: the lesson goes on');
  await page.click('#quit'); await page.keyboard.press('Escape');
  check(!(await has(page, '#dlg')), 'Escape closes the question');
  await page.click('#quit'); await page.click('#dlg-leave');
  check((await viewOf(page)) === 'path' && (await cur(page)) === 'v:36.1.0', 'leave: back on the path, the node still waits');
  await ctx.close();

  /* 1b. first run, "I know some": the level check, then the path starts at the level it suggests */
  ({ ctx, page } = await open({}));
  await page.click('#ob-why-study'); await page.click('#ob-min-5'); await page.click('#ob-check');
  check((await viewOf(page)) === 'lvl', 'the level check starts');
  for (let i = 0; i < 60 && (await has(page, '#card')); i++) { await page.click('#lvl-skip'); await sleep(20); }
  check(await has(page, '.big-lv') && /เริ่มเรียนที่ระดับ A1/.test(await txt(page, '#p-place')), 'result offers to start at its level');
  await page.click('#p-place');
  ui = await store(page, 'vocab3000-ui-v1');
  check((await viewOf(page)) === 'run' && ui.ob === 1 && ui.xg === 10 && !(await store(page, 'vocab3000-path-v1')), 'started at A1 straight away, no start level stored for A1');
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }), 'vocab3000-path-v1': JSON.stringify({ k: {}, x: {}, t: {}, s: 1 }) } }));
  check(await page.evaluate(() => document.querySelector('.pnode.cur').closest('.psec').id) === 'sec-A2', 'a start level from the check: the next node is in A2');
  await ctx.close();

  /* 2. a learner with progress: what was done shows as done, the current node is the first unfinished one, XP estimated */
  const seed = {
    'vocab3000-progress-v1': JSON.stringify({ w: { 3201: [2, DAY + 1, DAY - 1, 0, 9000] }, s: { '36-0': 511, '36-1': 511, '36-2': 511 } }),
    'vocab3000-grammar-v1': JSON.stringify({ v: 1, l: { l1: [9, 10, 1000] }, x: {} }),
    'vocab3000-read-v1': JSON.stringify({ r1: [3, 3, 7000] }),
    'vocab3000-days-v1': JSON.stringify({ [DAY - 2]: [1, 3, 1, 0, 0, 0], [DAY - 1]: [0, 6, 0, 1, 0, 1] }),
    'vocab3000-level-v1': JSON.stringify([{ t: DAY - 2, o: 'A1', v: 600, vl: 'A1', gl: 'A1', g: [2, 1, 0, 0], gt: [3, 3, 3, 3] }]),
  };
  ({ ctx, page } = await open({ store: seed }));
  check(/เส้นทางการเรียน/.test(await txt(page, '#sheet')) && /แท็บเดิมยังอยู่ครบ/.test(await txt(page, '#sheet')), 'existing learner: one note about the new path, no first-run questions');
  await page.screenshot({ path: path.join(shots, 'p-news.png') });
  check((await cur(page)) === 'v:37.0.0', 'current node is the first unfinished one: ' + await cur(page));
  const dn = await ids(page, '.pnode.done');
  check(['v:36.0.0', 'v:36.1.0', 'g:l1', 'v:36.0.1', 'v:36.2.0', 'v:36.1.1', 'x:1', 'v:36.0.2'].every((id) => dn.indexOf(id) >= 0), 'finished sets, the passed lesson and the review before them are done: ' + dn.join(' '));
  check(dn.indexOf('x:3') < 0, 'a review further on is not done yet');
  xs = await store(page, 'vocab3000-xp-v1');
  check(xs.b === 1 && xs.d[DAY - 2] === 5 + 12 + 5 && xs.d[DAY - 1] === 24 + 15 && !xs.d[DAY], 'XP estimated once for past days ' + JSON.stringify(xs.d));
  check(/^2/.test(await txt(page, '#p-streak .pstat-t')), 'streak from the past days: ' + await txt(page, '#p-streak'));
  await focusUnit(page, 3);
  check(await has(page, '.pnode.done[data-id="r:r1"]') && await has(page, '#unit-4'), 'the story already read is done in its unit');
  await page.click('[data-act="p-node"][data-id="r:r1"]');
  check(/ทำอีกครั้ง/.test(await txt(page, '#p-start')), 'a done node offers to do it again');
  await page.click('h1');
  check(!(await has(page, '#sheet')), 'tap outside closes the sheet');
  await page.click('#open-me'); await page.click('.crumb .back'); await page.click('.tab[data-tab="vocab"]'); await page.click('.tab[data-tab="path"]');
  const after = await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), Object.keys(seed));
  check(after.every((v, i) => v === seed[Object.keys(seed)[i]]), 'progress records are byte for byte as they were');
  await news(page);
  check((await store(page, 'vocab3000-ui-v1')).pn === 1 && !(await has(page, '#sheet')), 'the note is shown once');
  await ctx.close();

  /* 3. checkpoints: a failed one is kept and does not stop the path; test-out skips a unit; a retry keeps the better result */
  const u1 = { '36-0': 511, '36-1': 511, '36-2': 511, '37-0': 511, '37-1': 63, '37-2': 35 };
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': JSON.stringify({ w: {}, s: u1 }), 'vocab3000-grammar-v1': JSON.stringify({ v: 1, l: { l1: [10, 10, 1000] }, x: {} }), 'vocab3000-ui-v1': JSON.stringify({ pn: 1, ob: 1 }) } }));
  check((await cur(page)) === 'k:1', 'unit 1 finished: its checkpoint is next: ' + await cur(page));
  await page.click('.pnode.cur');
  check(/12 ข้อ/.test(await txt(page, '#sheet')) && /80%/.test(await txt(page, '#sheet')), 'checkpoint sheet: 12 questions, pass at 80%');
  await page.click('#p-start');
  let kinds = {};
  await play(page, failOnce(), 'checkpoint fail', async (p) => { const v = await viewOf(p); kinds[v] = 1; });
  check(kinds.run && kinds['g-run'], 'checkpoint mixes words and grammar ' + Object.keys(kinds).join(','));
  check(/ยังไม่ผ่านการทดสอบ/.test(await txt(page, '#app h2')) && /ได้ 0 จาก 12 ข้อ/.test(await txt(page, '.pend')) && await has(page, '#p-next-node') && await has(page, '#p-again'), 'failed checkpoint: told kindly, next and retry offered');
  let pr = await store(page, 'vocab3000-path-v1');
  check(pr && pr.k['1'] && pr.k['1'][0] === 0 && pr.k['1'][1] === 12, 'failed checkpoint stored ' + JSON.stringify(pr));
  await page.click('#p-back');
  check((await cur(page)) === 'v:38.0.0' && await has(page, '.pnode.tried[data-id="k:1"]'), 'the next unit is open, the checkpoint shows as tried: ' + await cur(page));
  // test out of unit 2
  await page.click('#p-testout-2');
  check(/ทดสอบข้ามหน่วยที่ 2/.test(await txt(page, '#sheet')), 'test-out sheet');
  await page.click('#p-start');
  await play(page, allOk, 'test-out');
  check(/ผ่านหน่วยที่ 2 แล้ว/.test(await txt(page, '#app h2')) && await has(page, '#p-full'), 'test-out passed with full marks');
  pr = await store(page, 'vocab3000-path-v1');
  check(pr.k['2'][0] === 12 && pr.k['2'][1] === 12, 'test-out result stored ' + JSON.stringify(pr.k));
  xp = await page.evaluate(() => +document.getElementById('xp-up').getAttribute('data-xp'));
  check(xp === 12 + 20 + 10 + 5, 'checkpoint XP: 12 right + 20 passed + 10 + 5 = 47: ' + xp);
  check(await page.evaluate(() => !!document.querySelector('.confetti')), 'a finished unit gets confetti');
  await page.click('#p-back');
  const c3 = await cur(page);
  check(c3 && (await page.evaluate((id) => document.querySelector('[data-id="' + id + '"]').closest('.pnodes').getAttribute('aria-label'), c3)) === 'วงของหน่วยที่ 3' && await has(page, '.pnode.done[data-id="k:2"]'), 'unit 2 skipped: the current node is in unit 3: ' + c3);
  check(/ผ่านแล้ว/.test(await txt(page, '#unit-2')), 'unit 2 banner says passed');
  // retry the first checkpoint and pass it
  await page.click('[data-act="p-node"][data-id="k:1"]'); await page.click('#p-start');
  await play(page, allOk, 'checkpoint retry');
  pr = await store(page, 'vocab3000-path-v1');
  check(pr.k['1'][0] === 12 && await has(page, '#p-full'), 'retry: the better result replaces the old one ' + JSON.stringify(pr.k));
  await page.click('#p-back');
  check(await has(page, '.pnode.done[data-id="k:1"]'), 'checkpoint 1 now passed (trophy)');
  // backup code with the new records
  await page.click('#open-me'); await page.click('#open-prefs'); await page.click('#bk-copy');
  const code = await page.evaluate(() => document.getElementById('bk-out').value);
  const doc = JSON.parse(Buffer.from(code.slice(4), 'base64').toString('utf8'));
  check(doc.d.xp && doc.d.xp.d && doc.d.xp.d[DAY] > 0 && doc.d.path && doc.d.path.k && doc.d.path.k['2'], 'backup code carries xp and path ' + Object.keys(doc.d).join(','));
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }), 'vocab3000-path-v1': JSON.stringify({ k: { 2: [9, 12, 5] }, x: {}, t: {}, s: 0 }) } }));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', code); await page.click('#bk-restore');
  check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')), 'restore message');
  pr = await store(page, 'vocab3000-path-v1'); xs = await store(page, 'vocab3000-xp-v1');
  check(pr.k['1'][0] === 12 && pr.k['2'][0] === 12 && xs.d[DAY] === doc.d.xp.d[DAY], 'path and XP restored, the better result kept ' + JSON.stringify(pr.k));
  await page.click('.tab[data-tab="path"]');
  check(await has(page, '.pnode.done[data-id="k:2"]'), 'restored checkpoint shows on the path');
  await ctx.close();
  // a code made before this phase (no xp, no path) still restores
  const old = 'EN1:' + Buffer.from(JSON.stringify({ v: 1, t: 100, d: { c37: { v: 1, w: { 3201: [1, DAY + 1, DAY, 0, 5000] }, s: { 0: 511 } }, read: { v: 1, r: { r2: [2, 3, 900] } } } }), 'utf8').toString('base64');
  ({ ctx, page } = await open({}));
  await page.click('#ob-skip'); await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', old); await page.click('#bk-restore');
  check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')) && (await store(page, 'vocab3000-progress-v1')).s['36-0'] === 511 && (await store(page, 'vocab3000-read-v1')).r2, 'an old backup code still restores');
  await page.click('.tab[data-tab="path"]');
  check((await cur(page)) === 'v:36.1.0', 'restored progress shows on the path');
  await ctx.close();

  /* 3b. a grammar lesson node: the lesson text inside the lesson, then its questions; failing keeps it open, a retry passes */
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': JSON.stringify({ w: {}, s: { '36-0': 511, '36-1': 35 } }), 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  check((await cur(page)) === 'g:l1', 'grammar lesson is next: ' + await cur(page));
  await page.click('.pnode.cur'); await page.click('#p-start');
  check((await viewOf(page)) === 'g-lesson' && await has(page, '.runbar #quit') && !(await has(page, '.crumb')) && await has(page, '#p-gstart') && (await page.$$('.exs .ex')).length >= 5, 'lesson text inside the lesson, with a lesson bar');
  await play(page, failOnce(), 'grammar fail');
  check(/ยังไม่ผ่านบทนี้/.test(await txt(page, '#app h2')) && await has(page, '#p-again') && !(await has(page, '#p-full')), 'failed lesson: try again offered');
  check((await store(page, 'vocab3000-grammar-v1')).l.l1[0] === 0, 'the lesson result is saved as usual');
  await page.click('#p-again');
  await play(page, allOk, 'grammar pass');
  check(/จบบทนี้แล้ว/.test(await txt(page, '#app h2')) && await page.evaluate(() => +document.getElementById('xp-up').getAttribute('data-xp')) === 25, 'passed lesson: 10 right + 10 + 5 = 25 XP');
  await page.click('#p-next-node');
  check((await viewOf(page)) === 'run', 'next goes straight into the next node');
  await page.click('#quit'); await page.click('#dlg-leave');
  check((await cur(page)) === 'v:36.2.0' && await has(page, '.pnode.done[data-id="g:l1"]'), 'lesson node done, the path moved on: ' + await cur(page));
  await ctx.close();

  /* 3c. a review node: due words, then grammar questions answered wrong before; done afterwards */
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': JSON.stringify({ w: { 3001: [1, DAY, DAY - 1, 0, 5000], 3002: [1, DAY - 1, DAY - 2, 0, 5001] }, s: { '36-0': 63, '36-1': 63, '36-2': 35 } }),
    'vocab3000-grammar-v1': JSON.stringify({ v: 1, l: { l1: [9, 10, 1000] }, x: { 'l1-1': 2 } }), 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  check((await cur(page)) === 'x:1', 'words are due: the review is next: ' + await cur(page));
  await page.click('.pnode.cur');
  check(/ถึงเวลาทบทวน 2 คำ/.test(await txt(page, '#sheet')), 'review sheet counts the due words');
  await page.click('#p-start');
  kinds = {};
  await play(page, allOk, 'review', async (p) => { kinds[await viewOf(p)] = 1; });
  check(kinds.run && kinds['g-run'], 'review: words, then grammar ' + Object.keys(kinds).join(','));
  check(await page.evaluate(() => +document.getElementById('xp-up').getAttribute('data-xp')) === 3 + 10 + 5, 'review XP: 3 right + 10 + 5 = 18');
  pr = await store(page, 'vocab3000-path-v1');
  check(pr.x['1'] === DAY && (await store(page, 'vocab3000-grammar-v1')).x['l1-1'] === 1, 'review stored, the grammar miss count went down');
  await page.click('#p-back');
  check((await cur(page)) === 'v:36.0.2' && await has(page, '.pnode.done[data-id="x:1"]'), 'review done, the path moved on: ' + await cur(page));
  await ctx.close();

  /* 4. a story from the path: new words first, then the story with a lesson bar, the questions, the end screen */
  ({ ctx, page } = await open({ store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  await focusUnit(page, 3);
  await page.click('[data-act="p-node"][data-id="r:r1"]');
  check(/อยู่ข้างหน้า/.test(await txt(page, '#sheet')) && /ทำเลย/.test(await txt(page, '#p-start')), 'a node ahead says so and offers to do it now');
  await page.click('#p-start');
  check((await viewOf(page)) === 'p-words' && /คำใหม่ในเรื่องนี้/.test(await txt(page, '#app h2')), 'new words before the story');
  const nw = (await page.$$('#p-words .word')).length;
  check(nw >= 3 && nw <= 12, 'a short list of new words: ' + nw);
  check(await overflow(page) <= 0, 'new words overflow');
  await page.screenshot({ path: path.join(shots, 'p-words.png'), fullPage: true });
  await page.click('#p-words-go');
  check((await viewOf(page)) === 'story' && await has(page, '.runbar #quit') && !(await has(page, '.crumb')), 'the story opens inside the lesson (lesson bar, no back link)');
  await page.click('.line:nth-child(1) .tw[data-w="1"]');
  check(await has(page, '#wsheet') && !(await has(page, '#wsheet .word-go')), 'word panel without a jump out of the lesson');
  await page.click('[data-act="r-wclose"]');
  await step(page, allOk, 'story');
  check((await viewOf(page)) === 'p-end', 'story questions lead to the end screen');
  xp = await page.evaluate(() => +document.getElementById('xp-up').getAttribute('data-xp'));
  check(xp === 3 + 15 + 10 + 5, 'story XP: 3 right + 15 story + 10 + 5 = 33: ' + xp);
  check((await store(page, 'vocab3000-read-v1')).r1[0] === 3, 'story result saved as usual');
  // the say-along after it: speech recognition hears each line
  await page.click('#p-next-node');
  check((await viewOf(page)) === 'p-say', 'say-along follows the story');
  const lines = await page.evaluate(() => Array.from(document.querySelectorAll('#p-say-lines .line')).map((l) => ({ id: l.id, text: l.querySelector('.mic').getAttribute('data-text') })));
  check(lines.length >= 3 && lines.length <= 5, 'three to five lines to say: ' + lines.length);
  await page.screenshot({ path: path.join(shots, 'p-say.png'), fullPage: true });
  for (const l of lines) {
    await page.evaluate((t) => { window.__sr = { say: [t.toLowerCase().replace(/[.,!?]/g, '')] }; }, l.text);
    await page.click('#' + l.id + ' .mic'); await page.click('#spk-mic'); await sleep(200);
    await page.click('#spk-close');
  }
  check((await page.$$('#p-say-lines .line.said')).length === lines.length, 'every line marked as said');
  await page.click('#p-say-done');
  xp = await page.evaluate(() => +document.getElementById('xp-up').getAttribute('data-xp'));
  check(xp === lines.length * 2 + 15, 'say-along XP: 2 per line + 10 + 5: ' + xp);
  pr = await store(page, 'vocab3000-path-v1'); xs = await store(page, 'vocab3000-xp-v1');
  check(pr.t.r1[0] === lines.length && pr.t.r1[1] === lines.length && xs.s[DAY] === lines.length, 'say-along stored, sentences counted for today');
  // skip without speaking: allowed, not wrong
  await page.click('#p-back'); await focusUnit(page, 3);
  await page.click('[data-act="p-node"][data-id="t:r1"]'); await page.click('#p-start'); await page.click('#p-say-skip');
  check((await viewOf(page)) === 'p-end' && /ไว้ฝึกพูดครั้งหน้า/.test(await txt(page, '#app h2')) && (await store(page, 'vocab3000-path-v1')).t.r1[0] === lines.length, 'skipping speaking is fine and keeps the earlier result');
  await ctx.close();
  // no speech recognition: no say-along nodes
  ({ ctx, page } = await open({ flags: { __noSR: true }, store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  await focusUnit(page, 3);
  check(await has(page, '[data-id="r:r1"]') && !(await has(page, '[data-id="t:r1"]')), 'without speech recognition the say-along is left out');
  await ctx.close();

  /* 5. vibration off; quests stay the same all day and change the next day */
  ({ ctx, page } = await open({ store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1, vib: false }) } }));
  await page.click('.pnode.cur'); await page.click('#p-start');
  for (let i = 0; i < 25 && !(await has(page, '#opt-0')); i++) await step(page, allOk, 'vib off');
  await step(page, allOk, 'vib off');
  check((await page.evaluate(() => window.__vib.length)) === 0, 'vibration setting off: no buzz');
  await ctx.close();
  // cannot listen now: the rest of the listening step shows the word, nothing counts as wrong, the node still finishes
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': JSON.stringify({ w: {}, s: { '36-0': 3 } }), 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  await page.click('.pnode.cur'); await page.click('#p-start');
  check(/ฟังแล้วเลือก/.test(await txt(page, '.run-title b')) && await has(page, '#no-listen'), 'only the listening step is left, with a skip');
  await page.click('#no-listen');
  check(await has(page, '.ruled') && !(await has(page, '#no-listen')) && /ไม่นับว่าผิด/.test(await txt(page, '#card')), 'cannot listen: the word is shown, not counted as wrong');
  await step(page, allOk, 'no listening');
  check(await has(page, '#sheet.mid') && !(await has(page, '#sheet.no')), 'the answer is not marked wrong');
  await page.click('#next-btn');
  check(await has(page, '.ruled') && !(await has(page, '.listen.big')), 'the next listening item shows the word too');
  await play(page, allOk, 'no listening');
  check((await txt(page, '#p-acc')) === '-' && !(await has(page, '#p-full')) && +(await page.evaluate(() => document.getElementById('xp-up').getAttribute('data-xp'))) === 10, 'end screen: nothing scored, the node still counts as finished');
  check((await store(page, 'vocab3000-progress-v1')).s['36-0'] === 35 && Object.keys((await store(page, 'vocab3000-progress-v1')).w).length === 0, 'the step bit is set, no word record changed');
  await ctx.close();
  const qIds = async (shift) => {
    const o = await open({ flags: { __dayShift: shift }, store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } });
    await o.page.click('#p-quests');
    const a = await ids(o.page, '#sheet .quest'), q1 = await o.page.evaluate(() => Array.from(document.querySelectorAll('#sheet .quest')).map((e) => e.id).join(','));
    await o.page.reload(); await o.page.waitForSelector('#app h1'); await o.page.click('#p-quests');
    const q2 = await o.page.evaluate(() => Array.from(document.querySelectorAll('#sheet .quest')).map((e) => e.id).join(','));
    await o.ctx.close();
    return [q1, q2, a.length];
  };
  const qa = await qIds(0), qb = await qIds(1), qc = await qIds(2);
  check(qa[0] === qa[1] && qb[0] === qb[1] && qa[2] === 3, 'quests are the same all day: ' + qa[0]);
  check(qa[0] !== qb[0] && qb[0] !== qc[0] && /^quest-xp,/.test(qa[0]), 'quests change from day to day, the XP goal is always one: ' + [qa[0], qb[0], qc[0]].join(' / '));

  /* 6. the path at 390 and 320 px, light and dark; no bobbing with reduced motion */
  for (const [w, dark] of [[390, false], [390, true], [320, false], [320, true]]) {
    ({ ctx, page } = await open({ dark, viewport: { width: w, height: 720 }, store: { 'vocab3000-progress-v1': JSON.stringify({ w: {}, s: { '36-0': 511, '36-1': 35 } }), 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
    check(await overflow(page) <= 0, 'path overflow at ' + w + (dark ? ' dark' : ''));
    const box = await page.evaluate(() => { const r = document.querySelector('.pnode.cur').getBoundingClientRect(); return { l: r.left, r: r.right, top: r.top, vh: window.innerHeight }; });
    check(box.l >= 0 && box.r <= w && box.top > 0 && box.top < box.vh, 'current node in sight and inside the screen at ' + w + ' ' + JSON.stringify(box));
    await page.screenshot({ path: path.join(shots, 'p-path-' + w + (dark ? '-dark' : '') + '.png') });
    const tap = await page.evaluate(() => Array.from(document.querySelectorAll('.pnode, .ubtn, .pstat, #open-me')).every((e) => { const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }));
    check(tap, 'tap targets at least 44 px at ' + w);
    await page.click('#open-me');
    check(await overflow(page) <= 0, 'me screen overflow at ' + w + (dark ? ' dark' : ''));
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p-me-320' + (dark ? '-dark' : '') + '.png'), fullPage: true });
    await ctx.close();
  }
  ({ ctx, page } = await open({ still: true, store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.pbub')).animationName) === 'none', 'reduced motion: the start bubble does not bob');
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-ui-v1': JSON.stringify({ ob: 1, pn: 1 }) } }));
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.pbub')).animationName) === 'bob', 'normal motion: the start bubble bobs');

  /* 7. the whole path: every set three times, every lesson and story once, units of about 12-18 nodes ending in a checkpoint */
  const seen = {}, order = [];
  for (let u = 0; u < 100; u += 5) {
    if (u && !(await focusUnit(page, u))) break;
    (await ids(page, '.pnode')).forEach((id) => { if (!seen[id]) { seen[id] = 1; order.push(id); } });
  }
  const units = await page.evaluate(() => document.querySelectorAll('[data-act="p-unit"]').length + document.querySelectorAll('.ubanner').length);
  const cnt = (t) => order.filter((id) => id.indexOf(t + ':') === 0).length;
  check(cnt('v') === 1080 && cnt('g') === 64 && cnt('r') === 30 && cnt('t') === 30 && cnt('k') === units && units >= 70 && units <= 100, 'path: 1080 word nodes, 64 lessons, 30 stories, 30 say-alongs, a checkpoint per unit (' + units + ' units), ' + order.length + ' nodes');
  check(order.length >= 1400 && order.length <= 1600, 'about 1,500 nodes: ' + order.length);
  const gOrder = order.filter((id) => id[0] === 'g').map((id) => +id.slice(3));
  check(gOrder.every((x, i) => x === i + 1), 'lessons in their order');
  const rOrder = order.filter((id) => id[0] === 'r').map((id) => +id.slice(3));
  check(rOrder.every((x, i) => x === i + 1), 'stories in their order');
  check(order.every((id, i) => id[0] !== 't' || order[i - 1] === 'r:' + id.slice(2)), 'each say-along right after its story');
  const pos = {}; order.forEach((id, i) => { pos[id] = i; });
  check(order.filter((id) => id[0] === 'v' && id.slice(-2) === '.0').every((id) => pos[id.slice(0, -1) + '1'] > pos[id] && pos[id.slice(0, -1) + '2'] > pos[id.slice(0, -1) + '1']), 'each set: stage 1, then 2, then 3');
  await ctx.close();

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(1); });

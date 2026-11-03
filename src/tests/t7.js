// End-to-end check of phase 5 in headless Chromium: longer intervals for well-known words, the test-out offered after
// lessons that went (nearly) all right and the choice steps first after lessons that went badly, skill levels on the ฉัน
// screen, the exit test of a level with its certificate picture, the new records in the backup code, and the layout.
// node t7.js <trainer dir> <shots dir>
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
const MOCK = `
(function(){
  window.__tts = []; window.__sr = { say: null };
  try { window.MediaRecorder = undefined; } catch (e) {}
  if (window.speechSynthesis) window.speechSynthesis.speak = function (u) { window.__tts.push(u.text); setTimeout(function () { try { u.onend && u.onend(); } catch (e) {} }, 30); };
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
})();`;

const fails = [];
function check(ok, msg) { if (!ok) { fails.push(msg); console.log('FAIL', msg); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const J = JSON.stringify;

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 1, hasTouch: true, acceptDownloads: true });
    await ctx.addInitScript(MOCK);
    const st = Object.assign({ 'vocab3000-ui-v1': J({ ob: 1, pn: 1 }) }, opts.store || {});
    await ctx.addInitScript((s) => { if (!localStorage.getItem('__seeded')) { Object.keys(s).forEach((k) => localStorage.setItem(k, s[k])); localStorage.setItem('__seeded', '1'); } }, st);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push('console ' + m.text()); });
    await page.goto(base);
    await page.waitForSelector('#app h1, #app h2');
    return { ctx, page };
  }
  const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const txt = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const viewOf = (page) => page.evaluate(() => document.body.getAttribute('data-view'));
  const store = (page, k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k);
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


  /* a whole run, including the lines to say (heard right unless the plan is bad) */
  async function play(page, how, label) {
    for (let i = 0; i < 400; i++) {
      const v = await viewOf(page);
      if (v === 'p-say') {
        const ls = await page.evaluate(() => Array.from(document.querySelectorAll('#p-say-lines .line')).map((l) => ({ id: l.id, text: l.querySelector('.mic').getAttribute('data-text') })));
        for (const l of ls) {
          const sv = how('say');   /* 'none': the phone hears nothing */
          await page.evaluate((t) => { window.__sr.say = t; }, sv === 'none' ? null : [sv === 'bad' ? 'zzz qqq' : l.text]);
          await page.click('#' + l.id + ' .mic'); await page.click('#spk-mic'); await sleep(350); await page.click('#spk-close');
        }
        await page.click('#p-say-done'); continue;
      }
      if (!(await step(page, how, label))) return true;
    }
    check(false, label + ': did not end');
    return false;
  }
  /* answer plans: everything right; or each question wrong the first time it is asked (it comes back until right) */
  const ok = () => 'ok', failOnce = () => { const seenQ = new Set(); return (k, key) => { if (key === undefined || seenQ.has(key)) return 'ok'; seenQ.add(key); return 'bad'; }; };

  /* 1. longer intervals: top-level words last right 40, 3 and 200 days ago come back after 80, 15 and 180 days */
  const ws = D.filter((w) => w.x && w.c === 36).slice(0, 3);
  const seed1 = { w: {} }; [40, 3, 200].forEach((g, i) => { seed1.w[ws[i].n] = [5, DAY, DAY - g, 0, 1700000000]; });
  let { ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: seed1.w, s: {} }) } });
  await page.click('#p-due');
  await play(page, ok, 'review of top-level words');
  const p1 = await store(page, 'vocab3000-progress-v1');
  const gaps = ws.map((w) => p1.w[w.n][1] - DAY);
  check(J(gaps) === J([80, 15, 180]) && ws.every((w) => p1.w[w.n][0] === 5 && p1.w[w.n][2] === DAY), 'next review after twice the gap, 15 to 180 days: ' + J(gaps));
  await page.click('#p-back'); await page.click('#open-me');
  check(/^2/.test(await txt(page, '#me-long')) && /จำได้นาน \(เกิน 30 วัน\)/.test(await txt(page, '#me-long')), 'me: two words now come back after more than 30 days ' + await txt(page, '#me-long'));
  await ctx.close();

  /* 2. the test-out: offered on the next word lesson after nearly all right; passing marks its stage done, failing does not */
  const high = J({ h: { v: [[10, 10], [10, 10], [10, 10], [10, 10], [10, 10]] } });
  ({ ctx, page } = await open({}));
  await page.click('.pnode.cur');
  check(!(await has(page, '#p-fast')), 'no test-out without a history of good lessons');
  await ctx.close();
  for (const plan of ['ok', 'bad']) {
    ({ ctx, page } = await open({ store: { 'vocab3000-adapt-v1': high } }));
    const cur = await page.evaluate(() => document.querySelector('.pnode.cur').getAttribute('data-id'));
    await page.click('.pnode.cur');
    check(/^v:/.test(cur) && await has(page, '#p-fast'), 'the word lesson offers a test-out: ' + cur);
    if (plan === 'ok') await page.screenshot({ path: path.join(shots, 'p5-fast-offer.png') });
    await page.click('#p-fast');
    check(/ทดสอบข้ามบท/.test(await txt(page, '.run-title b')) && /6/.test(await txt(page, '.count')), 'six questions to test out: ' + await txt(page, '.count'));
    await play(page, plan === 'ok' ? ok : failOnce(), 'test-out ' + plan);
    const pr = await store(page, 'vocab3000-progress-v1'), m = /^v:(\d+)\.(\d+)\.(\d+)$/.exec(cur), bits = ((pr && pr.s) || {})[m[1] + '-' + m[2]] || 0;
    if (plan === 'ok') check(/ผ่าน ข้ามบทนี้ได้แล้ว/.test(await txt(page, '#app h2')) && (bits & 35) === 35, 'passed: the stage steps are marked done ' + bits);
    else check(/ยังไม่ผ่าน/.test(await txt(page, '#app h2')) && (bits & 35) === 0, 'failed: nothing is marked ' + bits);
    await page.click('#p-back');
    check((await has(page, '.pnode.done[data-id="' + cur + '"]')) === (plan === 'ok'), 'the lesson shows ' + (plan === 'ok' ? 'done' : 'not done') + ' on the path');
    await ctx.close();
  }

  /* 3. after lessons that went badly, choice steps come before typing in the next word lesson (and a review is offered) */
  const low = J({ h: { v: [[3, 10], [4, 10], [2, 10], [5, 10], [3, 10]] } });
  async function stage1(extra) {
    const s = {}, g = {}, st = Object.assign({ 'vocab3000-adapt-v1': low }, extra || {});
    let o = await open({ store: st }), id = '';
    for (let i = 0; i < 10; i++) {
      id = await o.page.evaluate(() => document.querySelector('.pnode.cur').getAttribute('data-id'));
      const m = /^v:(\d+)\.(\d+)\.(\d)$/.exec(id);
      if (m && m[3] === '1') break;
      if (m && m[3] === '0') s[m[1] + '-' + m[2]] = 35;
      else if (/^g:/.test(id)) g[id.slice(2)] = [10, 10, 1700000000];
      else break;
      await o.ctx.close();
      o = await open({ store: Object.assign({}, st, { 'vocab3000-progress-v1': J({ w: {}, s }), 'vocab3000-grammar-v1': J({ v: 1, l: g, x: {} }) }) });
    }
    return { o, id };
  }
  let r3 = await stage1();
  check(/^v:\d+\.\d+\.1$/.test(r3.id), 'a spelling stage is next: ' + r3.id);
  await r3.o.page.click('#p-go');
  check((await txt(r3.o.page, '.run-title b')) === 'เลือกคำศัพท์', 'low accuracy: the choice step comes first: ' + await txt(r3.o.page, '.run-title b'));
  await r3.o.ctx.close();
  r3 = await stage1({ 'vocab3000-adapt-v1': J({ h: {} }) });
  await r3.o.page.click('#p-go');
  check((await txt(r3.o.page, '.run-title b')) === 'พิมพ์ตาม', 'usual order otherwise: ' + await txt(r3.o.page, '.run-title b'));
  await r3.o.ctx.close();

  /* 3b. a lesson on the path adds to the history of its kind and still keeps its own record (a word lesson, a checkpoint) */
  ({ ctx, page } = await open({}));
  const first = await page.evaluate(() => document.querySelector('.pnode.cur').getAttribute('data-id'));
  await page.click('#p-go');
  await play(page, ok, 'first word lesson');
  let ad = await store(page, 'vocab3000-adapt-v1'), pr3 = await store(page, 'vocab3000-progress-v1');
  const fm = /^v:(\d+)\.(\d+)\.0$/.exec(first);
  check(!!fm && ad && ad.h && ad.h.v && ad.h.v.length === 1 && ad.h.v[0][1] > 0 && ad.h.v[0][0] === ad.h.v[0][1], 'a word lesson is added to the history ' + J(ad));
  check(!!fm && ((pr3.s[fm[1] + '-' + fm[2]] || 0) & 35) === 35, 'the word lesson keeps its step bits ' + J(pr3.s));
  await page.click('#p-back');
  await page.click('#p-testout-2'); await page.click('#p-start');
  await play(page, ok, 'test-out of unit 2');
  ad = await store(page, 'vocab3000-adapt-v1');
  const pk = await store(page, 'vocab3000-path-v1');
  check(pk && pk.k && pk.k['2'] && pk.k['2'][0] === 12 && ad.h.k && ad.h.k.length === 1 && ad.h.v.length === 1, 'the checkpoint keeps its result and joins the history ' + J(pk && pk.k) + ' ' + J(ad));
  await ctx.close();

  /* 4. skill levels on the me screen */
  ({ ctx, page } = await open({}));
  await page.click('#open-me');
  const lv0 = await page.evaluate(() => Array.from(document.querySelectorAll('.sk-lv')).map((e) => e.textContent));
  check(lv0.length === 5 && lv0.every((x) => x === 'ก่อน A1') && /0%/.test(await txt(page, '#me-b2')), 'nothing done: every skill before A1 ' + J(lv0));
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-path-v1': J({ k: {}, x: {}, t: {}, s: 2 }) } }));
  await page.click('#open-me');
  const lv2 = await page.evaluate(() => Array.from(document.querySelectorAll('.sk-lv')).map((e) => e.textContent));
  check(lv2.every((x) => x === 'A2') && !/ 0%/.test(await txt(page, '#me-b2')), 'started at B1: A1 and A2 count for every skill ' + J(lv2) + ' ' + await txt(page, '#me-b2'));
  await page.screenshot({ path: path.join(shots, 'p5-me.png'), fullPage: true });
  await ctx.close();

  /* 5. the A1 exit test: 30 items, passed, certificate picture saved; a worse second try keeps the best result */
  ({ ctx, page } = await open({}));
  await page.click('#open-me'); await page.click('#exit-A1');
  check(/สอบผ่านระดับ A1/.test(await txt(page, '.run-title b')), 'exit test starts: ' + await txt(page, '.run-title b'));
  await play(page, ok, 'exit test A1');
  const ex = await store(page, 'vocab3000-exit-v1');
  check(ex && ex.A1 && ex.A1[1] === 30 && ex.A1[0] / ex.A1[1] >= 0.75 && ex.A1[12] === 3, 'exit result: 30 items with 3 to say ' + J(ex));
  check(/ผ่านระดับ A1 แล้ว/.test(await txt(page, '#app h2')) && await has(page, '#p-cert'), 'passed: the certificate is offered');
  await page.click('#p-cert');
  check((await viewOf(page)) === 'cert' && /ผ่านระดับ A1/.test(await txt(page, '#cert-h')), 'the certificate screen');
  await page.screenshot({ path: path.join(shots, 'p5-cert.png'), fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cert-save')]);
  const png = fs.readFileSync(await dl.path());
  check(dl.suggestedFilename() === 'english-certificate-A1.png' && png.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && png.length > 20000, 'certificate saved as a PNG picture ' + png.length);
  fs.writeFileSync(path.join(shots, 'p5-certificate.png'), png);
  await page.click('#cert-again');
  const f2 = failOnce();
  await play(page, (k, key) => (k === 'say' ? 'none' : f2(k, key)), 'exit test A1 again, every first answer wrong, nothing heard');
  const ex2 = await store(page, 'vocab3000-exit-v1');
  check(/ยังไม่ผ่านระดับ A1/.test(await txt(page, '#app h2')) && ex2.A1[0] === ex.A1[0] && await has(page, '#p-exit-again'), 'a worse try keeps the best result ' + J(ex2.A1));
  check(/ได้ 0 จาก 27 ข้อ/.test(await txt(page, '.pend')), 'lines the phone could not hear are left out, not wrong: ' + await txt(page, '.pend'));
  await page.click('#p-back');
  check((await viewOf(page)) === 'me' && /ดูใบผ่าน/.test(await txt(page, '#exit-A1')), 'back on the me screen, the level shows as passed');

  /* 6. the backup code carries the exit results and the lesson history; an old code without them still restores */
  await page.click('#open-prefs'); await page.click('#bk-copy');
  const code = await page.evaluate(() => document.getElementById('bk-out').value);
  const doc = JSON.parse(Buffer.from(code.slice(4), 'base64').toString('utf8'));
  check(doc.d.exit && doc.d.exit.e.A1[0] === ex.A1[0], 'the backup code carries the exit results');
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-adapt-v1': high } }));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', code); await page.click('#bk-restore');
  const back = await store(page, 'vocab3000-exit-v1');
  check(back && back.A1 && back.A1[0] === ex.A1[0], 'restored exit results ' + J(back));
  delete doc.d.exit; delete doc.d.adapt;
  await page.fill('#bk-in', 'EN1:' + Buffer.from(JSON.stringify(doc), 'utf8').toString('base64')); await page.click('#bk-restore');
  check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')), 'an old code without them still restores');
  await page.click('.crumb .back');
  check(await has(page, '#exit-A1'), 'me screen after restoring');
  await ctx.close();

  /* 7. layout of the me screen and the certificate at 390 and 320 px, light and dark */
  const passed = J({ A1: [27, 30, Math.floor(Date.now() / 1000), 8, 9, 9, 10, 4, 5, 3, 3, 3, 3] });
  for (const [w, dark] of [[390, false], [390, true], [320, false], [320, true]]) {
    ({ ctx, page } = await open({ dark, viewport: { width: w, height: 720 }, store: { 'vocab3000-exit-v1': passed } }));
    const tag = w + (dark ? '-dark' : '');
    await page.click('#open-me');
    check(await overflow(page) <= 0, 'me screen overflow at ' + tag);
    await page.click('#exit-A1');
    check((await viewOf(page)) === 'cert' && await overflow(page) <= 0, 'certificate layout at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p5-cert-' + tag + '.png'), fullPage: true });
    await ctx.close();
  }

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(1); });

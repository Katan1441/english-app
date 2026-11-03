// End-to-end check of the grammar page in headless Chromium. node gt.js <site dir> <shots dir>
const fs = require('fs'), path = require('path'), http = require('http');
const root = process.argv[2], shots = process.argv[3];
fs.mkdirSync(shots, { recursive: true });
const src = fs.readFileSync(path.join(root, 'vocab-trainer.html'), 'utf8');
fs.writeFileSync(path.join(root, 'wrapped.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>' + src + '</body></html>');
const served = { parts: 0, files: 0, bytes: 0 };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  const size = fs.statSync(p).size, mp3 = p.endsWith('.mp3'), type = mp3 ? 'audio/mpeg' : 'text/html; charset=utf-8';
  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (m && mp3) { const a = +m[1], b = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1); served.parts++; served.bytes += b - a + 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': 'bytes ' + a + '-' + b + '/' + size, 'content-length': b - a + 1 }); fs.createReadStream(p, { start: a, end: b }).pipe(res); return; }
  if (mp3) { served.files++; served.bytes += size; }
  res.writeHead(200, { 'content-type': type, 'content-length': size }); fs.createReadStream(p).pipe(res);
});
const MOCK = `
(function(){
  var KEY='__mockdb'; function load(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}} } function save(o){ localStorage.setItem(KEY, JSON.stringify(o)); }
  window.__dbWrites = 0; window.__au = { starts: 0, el: 0, tts: 0 };
  function snap(id, d){ return {id:id, exists: d!==undefined, data:function(){return d}}; }
  function docRef(col, id){ var p = col + '/' + id; return { id:id, path:p,
    get:function(){ return Promise.resolve(snap(id, load()[p])); },
    set:function(d){ var o=load(); o[p]=JSON.parse(JSON.stringify(d)); save(o); window.__dbWrites++; return new Promise(function(r){setTimeout(r,20)}); } }; }
  function docs(col){ var o=load(), a=[]; Object.keys(o).forEach(function(p){ if(p.indexOf(col+'/')===0) a.push(snap(p.slice(col.length+1), o[p])); }); return a; }
  var db = { collection:function(col){ return { path:col, doc:function(id){ return docRef(col,id) },
    get:function(){ return Promise.resolve({docs:docs(col)}); },
    onSnapshot:function(next){ setTimeout(function(){ next({docs:docs(col)}) }, 10); return function(){}; } }; } };
  var user = { id:function(){ return Promise.resolve('u_test1234567890abcdefgh') } };
  var perms = { state:function(){ return Promise.resolve('granted') } };
  window.claude = { use:function(n){ if (window.__noClaude) return Promise.resolve(null); return Promise.resolve(n==='db'?db:n==='user'?user:n==='permissions'?perms:null) } };
  if (window.__noSpeech) { try { delete window.SpeechSynthesisUtterance; } catch(e){} try { Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true}); } catch(e){} }
  else if (window.speechSynthesis) { window.speechSynthesis.speak = function(u){ window.__au.tts++; }; }
  var ABS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype;
  if (ABS) { var st = ABS.start; ABS.start = function(){ window.__au.starts++; window.__au.dur = this.buffer ? this.buffer.duration : 0; return st.apply(this, arguments); }; }
  var HP = HTMLMediaElement.prototype, pl = HP.play; HP.play = function(){ window.__au.el++; return pl.apply(this, arguments); };
})();`;
const fails = []; const check = (ok, msg) => { if (!ok) { fails.push(msg); console.log('FAIL', msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 2, hasTouch: true });
    await ctx.addInitScript((f) => { Object.assign(window, f); }, opts.flags || {});
    await ctx.addInitScript(MOCK);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push('console ' + m.text()); });
    if (opts.route) await opts.route(page);
    await page.goto(base); await page.waitForSelector('#app h1');
    if (!opts.vocab) { await page.click('.tab[data-tab="gram"]'); await page.waitForSelector('#g-resume'); }
    return { ctx, page };
  }
  const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const txt = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  // Answer the current question. how: 'ok' | 'bad'
  async function answer(page, how) {
    const st = await page.evaluate(() => {
      const G = window.__G__, card = document.querySelector('#card'); if (!card) return null;
      const id = window.__curId && window.__curId();
      return { has: !!card };
    });
    const q = await page.evaluate(() => {
      const ask = document.querySelector('#card .ask').textContent;
      const s = document.querySelector('#card .sentence'), th = document.querySelector('#card .sentence-th, #card .prompt-th');
      return { ask, sentence: s ? s.textContent : '', th: th ? th.textContent : '', opts: Array.from(document.querySelectorAll('.opt span:first-child')).map((e) => e.textContent), bank: Array.from(document.querySelectorAll('#bank .tok')).map((e) => e.textContent), typing: !!document.querySelector('#type-answer') };
    });
    return q;
  }
  // find the question object from the page data by what is on screen
  async function solve(page, how, label) {
    const info = await page.evaluate(() => {
      const G = window.__G__; const all = []; G.lessons.forEach((l) => l.q.forEach((q) => all.push(q)));
      const ask = document.querySelector('#card .ask').textContent;
      const sen = document.querySelector('#card .sentence'); const th = document.querySelector('#card .sentence-th, #card .prompt-th');
      const opts = Array.from(document.querySelectorAll('.opt span:first-child')).map((e) => e.textContent);
      const bank = Array.from(document.querySelectorAll('#bank .tok')).map((e) => e.textContent);
      const thT = th ? th.textContent : '';
      const typing = !!document.querySelector('#type-answer');
      const kind = bank.length ? 'o' : typing ? 'w' : (opts.length && sen ? 'c' : 's');
      let cands = all.filter((q) => q.th === thT && q.k === kind);
      if (sen) cands = cands.filter((q) => q.en && q.en.replace('___', '') === sen.textContent.replace(/\s+/g, ' ').replace(/^\s|\s$/g, '').replace('  ', ' ') || (q.en && q.en.split('___')[0].trim() && sen.textContent.indexOf(q.en.split('___')[0].trim()) === 0) || (q.en && !q.en.split('___')[0].trim() && sen.textContent.replace(/\s+/g, ' ').trim().endsWith(q.en.split('___')[1].trim())));
      if (opts.length) cands = cands.filter((q) => q.opts && q.opts.slice().sort().join('|') === opts.slice().sort().join('|'));
      if (bank.length) cands = cands.filter((q) => q.k === 'o' && q.en.replace(/[.?!]+$/, '').split(/\s+/).sort().join('|') === bank.slice().sort().join('|'));
      const c0 = cands[0]; const q = c0 ? { id: c0.id, k: c0.k, ans: c0.ans, opts: c0.opts, en: c0.en, th: c0.th } : null;
      return { n: cands.length, q, opts, bank, ask };
    });
    check(info.n >= 1, label + ': question not found ' + JSON.stringify(info).slice(0, 200));
    const q = info.q; if (!q) return null;
    if (q.k === 'c' || q.k === 's') {
      let i = info.opts.indexOf(q.ans); if (how === 'bad') i = info.opts.findIndex((o) => o !== q.ans);
      await page.click('#opt-' + i);
    } else if (q.k === 'o') {
      let toks = q.en.replace(/[.?!]+$/, '').split(/\s+/); if (how === 'bad') toks = toks.slice().reverse();
      for (const t of toks) { const ok = await page.evaluate((t2) => { const b2 = Array.from(document.querySelectorAll('#bank .tok')).find((x) => !x.disabled && x.textContent === t2); if (b2) b2.click(); return !!b2; }, t); check(ok, label + ': token missing ' + t); }
      await page.click('#check-order');
    } else {
      await page.fill('#type-answer', how === 'bad' ? 'zzz' : q.ans[0]); await page.click('#check-type');
    }
    await page.waitForSelector('#next-btn');
    const okShown = await has(page, '.fb.ok');
    check(okShown === (how !== 'bad'), label + ': wrong feedback for ' + q.id + ' (' + q.k + ') how=' + how);
    return q;
  }
  async function runAll(page, plan, label) {
    const seen = {}; let i = 0, guard = 0;
    while (await has(page, '#card')) {
      if (++guard > 80) { check(false, label + ' runaway'); break; }
      const q = await solve(page, plan(i++), label); if (q) seen[q.k] = (seen[q.k] || 0) + 1;
      await page.click('#next-btn');
    }
    return seen;
  }

  /* 1. phone: home, lesson page, all lessons answered right */
  let { ctx, page } = await open({});
  const NL = await page.evaluate(() => window.__G__.lessons.length);
  const NLV = await page.evaluate(() => window.__G__.levels.map((l) => l.id).join(','));
  console.log('grammar levels', NLV, 'lessons', NL);
  check(NL >= 18 && (await page.$$('.rows .row')).length === NL, 'grammar home: ' + NL + ' lessons');
  check((await page.$$('section.block h2')).length === NLV.split(',').length, 'grammar home: one section per level');
  const soon = (await txt(page, '.soon')) || '';
  check(NLV.split(',').every((lv) => soon.indexOf(lv) < 0) && (NLV.split(',').length === 4 ? !soon : /B2/.test(soon)), 'grammar home: coming-soon note names only missing levels: ' + soon);
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-ui-v1') || '{}').tab) === 'gram', 'tab remembered');
  check(await overflow(page) <= 0, 'home overflow');
  await page.screenshot({ path: path.join(shots, 'g-home.png'), fullPage: true });
  await page.click('#g-resume');
  check(/บทที่ 1/.test(await txt(page, '.eyebrow')), 'lesson 1 opened');
  check((await page.$$('.exs .ex')).length >= 5 && (await page.$$('.pattern tr')).length >= 3 && (await page.$$('.mist')).length >= 2, 'lesson: examples, patterns, mistakes');
  check(await overflow(page) <= 0, 'lesson overflow');
  await page.screenshot({ path: path.join(shots, 'g-lesson.png'), fullPage: true });
  await page.click('.exs .ex .listen'); await sleep(700);
  let au = await page.evaluate(() => window.__au);
  check(au.starts === 1 && au.dur > 0.5 && served.files === 0, 'sound: example clip from a part of the file ' + JSON.stringify(au));
  await page.click('#g-start'); await page.waitForSelector('#card');
  const shotKinds = {};
  for (let li = 0; li < NL; li++) {
    if (li > 0) { await page.click('#g-done-next'); await page.click('#g-start'); await page.waitForSelector('#card'); }
    let i = 0;
    while (await has(page, '#card')) {
      const k = await page.evaluate(() => document.querySelector('#bank') ? 'o' : document.querySelector('#type-answer') ? 'w' : document.querySelector('#card .sentence') ? 'c' : 's');
      if (!shotKinds[k] && li === 3) { shotKinds[k] = 1; await page.screenshot({ path: path.join(shots, 'g-q-' + k + '.png') }); check(await overflow(page) <= 0, 'question overflow ' + k); }
      await solve(page, 'ok', 'lesson ' + (li + 1));
      if (li === 3 && i === 0) await page.screenshot({ path: path.join(shots, 'g-fb.png') });
      await page.click('#next-btn'); i++;
    }
    check(/ผ่านบทนี้แล้ว/.test(await txt(page, 'h2')) && /^10/.test(await txt(page, '.score')), 'lesson ' + (li + 1) + ' passed with 10');
  }
  check(!(await has(page, '#g-done-next')), 'last lesson: no next button');
  await page.screenshot({ path: path.join(shots, 'g-done.png') });
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-grammar-v1')));
  check(Object.keys(prog.l).length === NL && Object.values(prog.l).every((r) => r[0] === 10), 'progress: ' + NL + ' lessons at 10');
  await sleep(3000);
  check(await page.evaluate((NL) => { const o = JSON.parse(localStorage.getItem('__mockdb') || '{}'); const k = Object.keys(o).find((p) => /\/gram$/.test(p)); return k && Object.keys(o[k].l).length === NL; }, NL), 'sync: grammar progress written to the account store as doc gram');
  au = await page.evaluate(() => window.__au);
  check(au.starts >= 150 && au.tts === 0 && au.el === 0, 'auto sound after answers ' + JSON.stringify(au) + ' ' + JSON.stringify(served));
  await ctx.close();

  /* 2. wrong answers come back at the end; best kept; review asks missed first */
  ({ ctx, page } = await open({ dark: true }));
  await page.click('#g-resume'); await page.click('#g-start'); await page.waitForSelector('#card');
  const seen = await runAll(page, (i) => (i === 0 || i === 3 ? 'bad' : 'ok'), 'lesson1 with misses');
  check(/ยังไม่ผ่าน|ผ่านบทนี้แล้ว/.test(await txt(page, 'h2')) && /^8/.test(await txt(page, '.score')), 'two misses -> 8 of 10: ' + (await txt(page, '.score')));
  check((await page.$$('.missed li')).length === 2, 'done: two missed listed');
  await page.screenshot({ path: path.join(shots, 'g-done-dark.png'), fullPage: true });
  const p2 = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-grammar-v1')));
  check(Object.keys(p2.x).length === 2, 'misses recorded ' + JSON.stringify(p2.x));
  await page.click('button[data-act="g-home"]');
  check(await has(page, '#g-review'), 'home: review offered');
  await page.click('#g-review'); await page.waitForSelector('#card');
  const firstIds = [];
  const rv = await runAll(page, () => 'ok', 'review');
  check(/จบการทบทวน/.test(await txt(page, 'h2')), 'review finished');
  const p3 = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-grammar-v1')));
  check(Object.values(p3.x).every((n) => n === 0), 'review answered right lowers misses ' + JSON.stringify(p3.x));
  await ctx.close();

  /* 3. narrow phone and no sound at all */
  ({ ctx, page } = await open({ viewport: { width: 320, height: 640 }, flags: { __noSpeech: true }, route: async (p) => { await p.route('**/audio/**', (r) => r.abort()); } }));
  await page.click('#g-resume');
  check(await overflow(page) <= 0, 'lesson overflow at 320');
  await page.click('.exs .ex .listen'); await sleep(300); await page.click('.exs .ex .listen').catch(() => {}); await sleep(500);
  check((await page.$$('.listen')).length === 0 && /เล่นเสียงในหน้านี้ไม่ได้/.test(await txt(page, '#sndnote') || ''), 'no sound: buttons gone, notice shown');
  await page.click('#g-start'); await page.waitForSelector('#card');
  check(!(await has(page, '#auto')), 'no sound: no auto chip');
  await ctx.close();

  /* 4. no Claude runtime */
  ({ ctx, page } = await open({ flags: { __noClaude: true } }));
  check(/เบราว์เซอร์ของเครื่องนี้/.test(await txt(page, '#syncnote') || ''), 'no runtime: local saving note');
  await page.click('.tab[data-tab="vocab"]'); check(/ฝึกศัพท์/.test(await txt(page, 'h1')), 'back to the vocabulary tab');
  await ctx.close();

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(1); });

// End-to-end check of the trainer in headless Chromium, served over HTTP so the audio files load the way they do when published.
// node t2.js <trainer dir> <shots dir>
const fs = require('fs'), path = require('path'), http = require('http');
const root = process.argv[2], shots = process.argv[3];
fs.mkdirSync(shots, { recursive: true });
const src = fs.readFileSync(path.join(root, 'vocab-trainer.html'), 'utf8');
fs.writeFileSync(path.join(root, 'wrapped.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#fafafa}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + src + '</body></html>');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
// How the server answers a request for part of a sound file: 'ok' sends the part (206), 'ignore' sends the whole file (200),
// 'bad' answers 500, 'shift' sends a part that starts one byte too late.
let rangeMode = 'ok';
const served = { files: 0, parts: 0, bytes: 0 };
const resetServed = () => { served.files = 0; served.parts = 0; served.bytes = 0; };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  const type = TYPES[path.extname(p)] || 'application/octet-stream', size = fs.statSync(p).size, mp3 = path.extname(p) === '.mp3';
  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (m && mp3 && rangeMode !== 'ignore') {
    if (rangeMode === 'bad') { res.writeHead(500); res.end('no'); return; }
    let a = +m[1], b = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
    if (a > b) { res.writeHead(416, { 'content-range': 'bytes */' + size }); res.end(); return; }
    const sh = rangeMode === 'shift' && a + 1 <= b ? 1 : 0;
    served.parts++; served.bytes += b - a + 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': 'bytes ' + a + '-' + b + '/' + size, 'content-length': b - a + 1 });
    if (sh) { const buf = Buffer.concat([fs.readFileSync(p).subarray(a + 1, b + 1), Buffer.from([0])]); res.end(buf); return; }
    fs.createReadStream(p, { start: a, end: b }).pipe(res); return;
  }
  if (mp3) { served.files++; served.bytes += size; }
  res.writeHead(200, { 'content-type': type, 'content-length': size });
  fs.createReadStream(p).pipe(res);
});
const MOCK = `
(function(){
  var KEY='__mockdb';
  function load(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}} }
  function save(o){ localStorage.setItem(KEY, JSON.stringify(o)); }
  window.__dbWrites = 0; window.__ai = []; window.__au = { starts: 0, dur: 0, el: 0, tts: 0 };
  function snap(id, d){ return {id:id, exists: d!==undefined, data:function(){return d}}; }
  function docRef(col, id){ var p = col + '/' + id; return { id:id, path:p,
    set:function(d){ var o=load(); o[p]=JSON.parse(JSON.stringify(d)); save(o); window.__dbWrites++; return new Promise(function(r){setTimeout(r,20)}); } }; }
  function docs(col){ var o=load(), a=[]; Object.keys(o).forEach(function(p){ if(p.indexOf(col+'/')===0) a.push(snap(p.slice(col.length+1), o[p])); }); return a; }
  var db = { collection:function(col){ return { path:col, doc:function(id){ return docRef(col,id) },
    get:function(){ return Promise.resolve({docs:docs(col)}); },
    onSnapshot:function(next){ setTimeout(function(){ next({docs:docs(col)}) }, 10); return function(){}; } }; } };
  var user = { id:function(){ return Promise.resolve('u_test1234567890abcdefgh') } };
  var perms = { state:function(){ return Promise.resolve(window.__permState || 'granted') } };
  function sample(){ return Promise.reject({code:'invalid_request'}); }
  sample.json = function(input, opts){
    window.__ai.push({ input: input, opts: Object.keys(opts||{}).sort().join(','), tier: opts && opts.modelTier, cache: opts && opts.cache });
    var m = /-----\\n([\\s\\S]*?)\\n-----/.exec(input), s = m ? m[1] : '';
    return new Promise(function(res, rej){
      var t = setTimeout(function(){
        if (/ratelimit/.test(s)) return rej({code:'rate_limited', message:'x'});
        if (/denied/.test(s)) return rej({code:'not_granted', message:'x'});
        if (/almostt/.test(s)) return res({verdict:'almost', corrected:'I have a fixed sentence.', thai:'ฉันมีประโยคที่แก้แล้ว', note:'<b>ลองเติมจุด</b> ท้ายประโยค'});
        if (/wrongg/.test(s)) return res({verdict:'wrong', corrected:'This is right.', thai:'อันนี้ถูก', note:'ยังไม่ใช่'});
        res({verdict:'ok', corrected:s, thai:'คำแปลทดสอบ', note:'ดีมาก'});
      }, /slowww/.test(s) ? 4000 : 60);
      if (opts && opts.signal) opts.signal.addEventListener('abort', function(){ clearTimeout(t); rej({code:'cancelled', message:'x'}); });
    });
  };
  window.claude = { use:function(n){ if (window.__noClaude) return Promise.resolve(null); return Promise.resolve(n==='db'?db:n==='user'?user:n==='permissions'?perms:n==='sample'?sample:null) } };
  if (window.__noSpeech) { try { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; } catch(e){} try { Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true}); } catch(e){} }
  else if (window.speechSynthesis) { var sp = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = function(u){ window.__au.tts++; window.__au.last = u.text; }; }
  var ABS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype;
  if (ABS) { var st = ABS.start; ABS.start = function(){ window.__au.starts++; window.__au.dur = this.buffer ? this.buffer.duration : 0; return st.apply(this, arguments); }; }
  var HP = HTMLMediaElement.prototype, pl = HP.play; HP.play = function(){ window.__au.el++; return pl.apply(this, arguments); };
  if (window.__noDecode && window.BaseAudioContext) { BaseAudioContext.prototype.decodeAudioData = function(ab, ok, bad){ var e = new Error('no decoder'); if (bad) setTimeout(function(){ bad(e) }, 0); return Promise.reject(e); }; }
  if (window.__stuckCtx && window.AudioContext) { Object.defineProperty(AudioContext.prototype, 'state', { get: function(){ return 'suspended' } }); AudioContext.prototype.resume = function(){ return new Promise(function(){}) }; }
})();`;

const fails = [];
function check(ok, msg) { if (!ok) { fails.push(msg); console.log('FAIL', msg); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch());
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 2, hasTouch: !!opts.touch });
    await ctx.addInitScript((flags) => { Object.assign(window, flags); }, opts.flags || {});
    await ctx.addInitScript(MOCK);
    if (opts.store) await ctx.addInitScript((st) => { if (!localStorage.getItem('__seeded')) { Object.keys(st).forEach((k) => localStorage.setItem(k, st[k])); localStorage.setItem('__seeded', '1'); } }, opts.store);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push('console ' + m.text()); });
    if (opts.route) await opts.route(page);
    await page.goto(base);
    await page.waitForSelector('#app h1');
    // the page opens on the today tab; these checks start from the words tab
    await page.click('.tab[data-tab="vocab"]');
    await page.waitForFunction(() => /ฝึกศัพท์/.test((document.querySelector('#app h1') || {}).textContent || ''));
    return { ctx, page };
  }
  const data = (page) => page.evaluate(() => {
    const out = []; let n = 0;
    window.__VOCAB__.forEach((cd, ci) => cd[2].split('\n').forEach((l, i) => { const f = l.split('|'); n++; out.push({ n, w: f[0], p: f[1], t: f[2], ask: f[2].replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, '').trim() || f[2], x: f[4], xt: f[5], c: ci, si: Math.floor(i / 10) }); }));
    return out;
  });
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const txt = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  // the bottom menu leads home; topic groups on the home screen fold, so open them before clicking a topic
  const home = async (page) => { await page.click('.tab[data-tab="vocab"]'); await page.waitForFunction(() => /ฝึกศัพท์/.test((document.querySelector('#app h1') || {}).textContent || '')); };
  const openGroups = (page) => page.evaluate(() => document.querySelectorAll('details.group').forEach((d) => { d.open = true; }));

  // Answers questions until the summary appears. pool: the entries that can be asked. plan(i, kind) -> 'ok' | 'bad' decides how to answer.
  async function run(page, pool, plan, label) {
    let i = 0, seen = {}, guard = 0;
    for (;;) {
      if (++guard > 400) { check(false, label + ': runner did not finish'); break; }
      const st = await page.evaluate(() => {
        const q = (s) => !!document.querySelector(s);
        const h2 = document.querySelector('#app h2');
        if (!q('#card')) return { kind: q('#done-next') || (h2 && /^จบ/.test(h2.textContent)) ? 'DONE' : 'OTHER' };
        const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; };
        let kind = 'next';
        if (q('#next-btn')) kind = 'next';
        else if (q('#reveal')) kind = 'card0'; else if (q('#card-yes')) kind = 'card1';
        else if (q('#bank')) kind = 'order';
        else if (q('#judge-yes')) kind = 'judge';
        else if (q('#giveup')) kind = 'mean';
        else if (q('#typed')) kind = 'copy';
        else if (q('#hintline')) kind = 'type';
        else if (q('#ai-check') || q('#self-check')) kind = 'write';
        else if (q('.sentence') && q('.opts')) kind = 'cloze';
        else if (q('.opts') && (q('#show-word') || q('.listen.big'))) kind = 'listen';
        else if (q('.opts') && q('.ruled')) kind = 'e2t';
        else if (q('.opts')) kind = 't2e';
        const say = document.querySelector('#card .listen[data-act="say"]');
        return { kind, ruled: t('.ruled'), th: t('.prompt-th'), sth: t('.sentence-th'), hint: t('#hintline'), sayN: say ? +say.getAttribute('data-n') : 0,
          opts: Array.from(document.querySelectorAll('.opt span:first-child')).map((e) => e.textContent), bank: Array.from(document.querySelectorAll('#bank .tok')).map((e) => e.textContent), aiBtn: q('#ai-check') };
      });
      const k = st.kind;
      if (k === 'DONE') break;
      if (k === 'OTHER') { check(false, label + ': left the run view unexpectedly'); break; }
      seen[k] = (seen[k] || 0) + 1;
      if (k === 'next') { await page.click('#next-btn'); continue; }
      if (k === 'card0') { await page.click('#reveal'); continue; }
      const how = plan(i++, k);
      if (k === 'card1') { await page.click(how === 'bad' ? '#card-no' : '#card-yes'); continue; }
      const pickOpt = async (label2) => { let ix = st.opts.indexOf(label2); if (how === 'bad' || ix < 0) { if (ix < 0 && how !== 'bad') check(false, label + ' ' + k + ': expected option missing: ' + label2 + ' in ' + st.opts.join(' / ')); ix = st.opts.findIndex((o) => o !== label2); } await page.click('#opt-' + ix); };
      if (k === 'e2t') { const e = pool.find((x) => x.w === st.ruled); check(!!e, label + ' e2t: unknown word ' + st.ruled); await pickOpt(e.ask); continue; }
      if (k === 'listen') {
        const e = pool.find((x) => x.n === st.sayN); check(!!e, label + ' listen: no entry for say button');
        if (how === 'peek') await page.click('#show-word'); else await page.click('.listen.big');
        await pickOpt(e.ask); continue;
      }
      if (k === 't2e') { const c = pool.filter((x) => x.ask === st.th && st.opts.indexOf(x.w) >= 0)[0]; check(!!c, label + ' t2e: no candidate for ' + st.th); await pickOpt(c.w); continue; }
      if (k === 'cloze') { const e = pool.find((x) => x.xt === st.sth); check(!!e, label + ' cloze: unknown sentence ' + st.sth); await pickOpt(e.w); continue; }
      if (k === 'copy') { const w = await page.getAttribute('#typed', 'aria-label'); if (how === 'bad') { await page.fill('#type-answer', w + 'x'); await page.click('#check-type'); } await page.fill('#type-answer', w); await page.click('#check-type'); continue; }
      if (k === 'type') {
        const first = st.hint.replace(/\s/g, '').charAt(0).toLowerCase();
        const c = pool.filter((x) => x.ask === st.th && x.w.charAt(0).toLowerCase() === first)[0] || pool.filter((x) => x.ask === st.th)[0];
        check(!!c, label + ' type: no candidate for ' + st.th);
        if (how === 'hint') { await page.click('#hint'); }
        await page.fill('#type-answer', how === 'bad' ? 'zzzz' : c.w); await page.click('#check-type'); continue;
      }
      if (k === 'mean') {
        const e = pool.find((x) => x.w === st.ruled); check(!!e, label + ' mean: unknown word ' + st.ruled);
        if (how === 'giveup') { await page.click('#giveup'); continue; }
        const alt = e.t.replace(/\([^)]*\)/g, ' ').split(/[,\/]/)[0].trim();
        await page.fill('#type-answer', how === 'bad' || how === 'judge' ? 'คำตอบมั่ว' : alt); await page.click('#check-type'); continue;
      }
      if (k === 'judge') { if (!run.shot) { run.shot = 1; await page.screenshot({ path: path.join(shots, 'm-judge.png') }); } await page.click(how === 'bad' ? '#judge-no' : '#judge-yes'); if (run.shot === 1) { run.shot = 2; await page.screenshot({ path: path.join(shots, 'm-judged.png') }); } continue; }
      if (k === 'order') {
        const e = pool.find((x) => x.xt === st.th); check(!!e, label + ' order: unknown sentence ' + st.th);
        let toks = e.x.replace(/[{}]/g, '').replace(/[.?!]+$/, '').split(/\s+/);
        if (how === 'bad') toks = toks.slice().reverse();
        for (const t of toks) {
          const ok = await page.evaluate((t2) => { const b2 = Array.from(document.querySelectorAll('#bank .tok')).find((x) => !x.disabled && x.textContent === t2); if (b2) b2.click(); return !!b2; }, t);
          check(ok, label + ' order: token not available ' + t);
        }
        if (how === 'undo') { await page.click('#build .tok'); await page.evaluate(() => document.querySelector('#bank .tok:not(:disabled)').click()); }
        await page.click('#check-order'); continue;
      }
      if (k === 'write') {
        const e = pool.find((x) => x.w === st.ruled); check(!!e, label + ' write: unknown word ' + st.ruled);
        const extra = how === 'almost' ? ' almostt' : how === 'wrong' ? ' wrongg' : '';
        await page.fill('#type-answer', 'We often see ' + e.w + ' here' + extra + '.');
        if (how === 'self' && st.aiBtn) await page.click('button[data-act="self-check"]'); else await page.click('#type-form button[type="submit"]');
        await page.waitForSelector('#next-btn', { timeout: 5000 });
        if (how === 'almost' || how === 'wrong') { check(await has(page, '#rewrite'), label + ' write: no retry button'); }
        continue;
      }
    }
    return seen;
  }

  /* ---- 1. phone, light: whole first set, nine steps ---- */
  let { ctx, page } = await open({ touch: true });
  const D = await data(page);
  check(D.length === 3600 && D.every((e) => e.x && e.xt && /\{.+\}/.test(e.x)), 'data: 3600 entries with examples');
  const FIRST = await page.evaluate(() => window.__VOCAB__.findIndex((cd) => cd[3] === 'A'));
  check(FIRST === 36, 'data: basic words are topics 37 and up in the data, first one ' + FIRST);
  check((await page.$$('.rows .row')).length === 55, 'home: 55 topics');
  check((await page.$$('section.block h2')).length >= 3 && await page.evaluate(() => document.querySelector('.rows .row').getAttribute('data-c')) === String(FIRST), 'home: three groups, basic words listed first');
  check(await page.evaluate(() => document.querySelector('.rows .row[data-c="0"] .row-no').textContent) === '15' && /ฝึกศัพท์ 3,600 คำ/.test(await txt(page, 'h1')), 'home: PDF topic 1 shown as topic 15, title counts 3,600 words');
  check(!(await has(page, '#review')), 'home: no review button before learning');
  check(await overflow(page) <= 0, 'home overflow');
  await page.click('#resume');
  check((await page.$$('.step')).length === 9 && (await page.$$('.stage')).length === 3, 'set: 9 steps in 3 stages');
  check((await page.$$('.word .ex')).length === 10, 'set: example under each word');
  check(await overflow(page) <= 0, 'set overflow');
  await page.screenshot({ path: path.join(shots, 'm-set.png'), fullPage: true });
  // sound: a word clip from the recorded pack
  await page.click('.word .listen[data-k="w"]'); await sleep(600);
  let au = await page.evaluate(() => window.__au);
  check(au.starts === 1 && au.dur > 0.2, 'sound: word clip played from the pack ' + JSON.stringify(au));
  check(served.parts === 1 && served.files === 0 && served.bytes < 120000, 'sound: only the ten words of the set were fetched ' + JSON.stringify(served));
  const set0 = D.filter((e) => e.c === FIRST && e.si === 0);
  const setL = D.filter((e) => e.c === 0 && e.si === 0);
  const order = ['card', 'e2t', 'listen', 'copy', 't2e', 'type', 'cloze', 'order', 'write'];
  for (let s = 0; s < order.length; s++) {
    const nm = await txt(page, '#start-next') || await txt(page, '#done-next');
    await page.click((await has(page, '#start-next')) ? '#start-next' : '#done-next');
    await page.waitForSelector('#card');
    if (s === 2) await page.screenshot({ path: path.join(shots, 'm-listen.png') });
    if (s === 6) await page.screenshot({ path: path.join(shots, 'm-cloze.png') });
    if (s === 7) await page.screenshot({ path: path.join(shots, 'm-order.png') });
    check(await overflow(page) <= 0, order[s] + ' overflow');
    const plan = (i, k) => {
      if (order[s] === 'listen') return i === 1 ? 'peek' : (i === 3 ? 'bad' : 'ok');
      if (order[s] === 'type') return i === 2 ? 'hint' : (i === 4 ? 'bad' : 'ok');
      if (order[s] === 'order') return i === 0 ? 'bad' : (i === 1 ? 'undo' : 'ok');
      if (order[s] === 'write') return i === 0 ? 'almost' : (i === 1 ? 'self' : 'ok');
      return i % 5 === 3 ? 'bad' : 'ok';
    };
    const seen = await run(page, set0, plan, 'set/' + order[s]);
    if (s === 8) await page.screenshot({ path: path.join(shots, 'm-done.png'), fullPage: true });
    check(await has(page, '.score'), order[s] + ': summary shown (' + nm + ') ' + JSON.stringify(seen));
  }
  check(/ครบ 9 ขั้น/.test(await txt(page, '#done-next') || ''), 'set: all nine steps done -> ' + (await txt(page, '#done-next')));
  au = await page.evaluate(() => window.__au);
  console.log('nine steps of one set: sound requests', JSON.stringify(served), 'clips started', au.starts);
  const hasS = await page.evaluate(() => !!(window.__AUDIO__ && window.__AUDIO__.s && window.__AUDIO__.s[0]));
  check(served.files === 0 && served.bytes < 450000 && au.starts >= 30 && au.el === 0 && (!hasS || au.tts === 0), 'set: sound came from small parts of the files ' + JSON.stringify(served) + ' ' + JSON.stringify(au));
  if (!hasS) console.log('note: no sentence sound files in this build, sentences used the device voice');
  const aiCalls = await page.evaluate(() => window.__ai);
  check(aiCalls.length >= 2 && aiCalls.every((c) => c.tier === 'quick' && c.cache === false && /signal/.test(c.opts)), 'write: Claude asked with quick tier, no cache, a signal: ' + aiCalls.length);
  check(aiCalls.every((c) => /-----\nWe often see/.test(c.input)), 'write: learner text sent between dashes');
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-progress-v1')));
  check(prog.s[FIRST + '-0'] === 511, 'progress: set mask 511, got ' + prog.s[FIRST + '-0']);
  check(Object.keys(prog.w).length === 10 && Object.values(prog.w).every((r) => r[0] === 1), 'progress: 10 words at level 1');
  await page.waitForTimeout(3600);
  check(await page.evaluate(() => window.__dbWrites) >= 1, 'sync: progress written to the account store');

  /* ---- 2. review by typing ---- */
  await home(page);
  if (!(await has(page, '#review'))) { await page.goto(base); await page.waitForSelector('#review'); }
  check(/ทบทวนคำที่เรียนแล้ว/.test(await txt(page, '#review')), 'home: review button after learning');
  await page.click('#review');
  check((await page.$$('.step')).length === 4 && (await page.$$('.chip.pick')).length === 3, 'review setup: 4 formats, 3 sizes');
  await page.screenshot({ path: path.join(shots, 'm-rev.png'), fullPage: true });
  check(await overflow(page) <= 0, 'review setup overflow');
  await page.click('#rev-mean'); await page.waitForSelector('#card');
  await page.screenshot({ path: path.join(shots, 'm-mean.png') });
  let seenR = await run(page, set0, (i) => (i === 1 ? 'judge' : i === 3 ? 'giveup' : i === 5 ? 'bad' : 'ok'), 'review/mean');
  check(seenR.mean >= 10 && seenR.judge >= 1, 'review mean: asked by typing the meaning ' + JSON.stringify(seenR));
  await page.click('button[data-act="rev"]');
  await page.click('#rev-type'); await page.waitForSelector('#card');
  seenR = await run(page, set0, (i) => (i === 2 ? 'bad' : 'ok'), 'review/type');
  check(seenR.type >= 10, 'review type ' + JSON.stringify(seenR));
  await page.click('#done-next'); await page.waitForSelector('#card');   // same format again
  await page.click('#quit'); await page.waitForSelector('#rev-both');
  await page.click('#rev-both'); await page.waitForSelector('#card');
  seenR = await run(page, set0, () => 'ok', 'review/both');
  check(seenR.mean >= 4 && seenR.type >= 4, 'review both ' + JSON.stringify(seenR));
  await page.click('button[data-act="rev"]'); await page.click('#rev-pick'); await page.waitForSelector('#card');
  seenR = await run(page, set0, () => 'ok', 'review/pick');
  check((seenR.e2t || 0) + (seenR.listen || 0) + (seenR.cloze || 0) + (seenR.t2e || 0) + (seenR.type || 0) >= 10, 'review pick ' + JSON.stringify(seenR));
  // extra practice on the same day must not move levels up; the misses above moved due dates to today
  const prog2 = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-progress-v1')));
  check(Object.values(prog2.w).every((r) => r[0] === 1), 'review: levels unchanged on the same day ' + JSON.stringify(Object.values(prog2.w).map((r) => r[0])));
  // search with example for few results, topic test
  await home(page); await page.fill('#q', 'grandparent'); await sleep(100);
  check((await page.$$('#results .word .ex')).length >= 1, 'search: example shown for a narrow search');
  await openGroups(page); await page.click('.rows .row[data-c="0"]'); await page.click('#cat-test'); await page.waitForSelector('#card');
  const cat0 = D.filter((e) => e.c === 0);
  const seenT = await run(page, cat0, (i) => (i % 4 === 1 ? 'bad' : 'ok'), 'topic test');
  check(seenT.cloze >= 5 && seenT.e2t >= 5 && seenT.t2e >= 5, 'topic test mixes three question kinds ' + JSON.stringify(seenT));
  await ctx.close();

  /* ---- 3. desktop dark, old five-step progress, words due for review at different levels ---- */
  const t = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const oldW = {}; setL.forEach((e, i) => { oldW[e.n] = [1 + (i % 5), t - 1, t - 3, 0, 1000 + i]; });
  ({ ctx, page } = await open({ dark: true, viewport: { width: 1180, height: 900 }, store: { 'vocab3000-progress-v1': JSON.stringify({ w: oldW, s: { '0-0': 31 } }) } }));
  check(/ถึงเวลา 10 คำ/.test(await txt(page, '#review')), 'legacy: due count on the review button: ' + (await txt(page, '#review')));
  check((await txt(page, '#tab-due')) === '10' && await has(page, '.tab[data-tab="vocab"][aria-current="page"]'), 'legacy: due count on the review tab, words tab marked');
  check(/ขั้นที่ 1|ชุดที่ 1/.test(await txt(page, '#resume')), 'legacy: resume offered');
  await page.click('#resume');
  check(/ขั้นที่ 3 ฟังแล้วเลือก/.test(await txt(page, '#start-next')), 'legacy: next step is listening: ' + (await txt(page, '#start-next')));
  check((await page.$$('.step.done')).length === 5, 'legacy: five steps shown as done');
  await page.screenshot({ path: path.join(shots, 'd-set-dark.png'), fullPage: false });
  await home(page); await page.click('#review'); await page.click('#rev-pick'); await page.waitForSelector('#card');
  const seenP = await run(page, setL, () => 'ok', 'legacy review/pick');
  check(seenP.type >= 1 && seenP.t2e >= 1 && seenP.cloze >= 1, 'legacy pick review uses level-based kinds ' + JSON.stringify(seenP));
  const prog3 = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-progress-v1')));
  check(setL.every((e, i) => prog3.w[e.n][0] === Math.min(5, 2 + (i % 5))), 'legacy: due words answered right moved up one level ' + JSON.stringify(setL.map((e) => prog3.w[e.n][0])));
  // write step: error paths
  await home(page); await openGroups(page); await page.click('.rows .row[data-c="0"]'); await page.click('.rows .row[data-s="0"]');
  await page.click('.step[data-mode="write"]'); await page.waitForSelector('#type-answer');
  const ww = await txt(page, '.ruled');
  await page.fill('#type-answer', 'hello'); await page.click('#ai-check'); check(/3 คำ/.test(await txt(page, '#type-note')), 'write: short text stopped locally');
  await page.fill('#type-answer', 'I like this very much.'); await page.click('#ai-check'); check(/ยังไม่เห็นคำว่า/.test(await txt(page, '#type-note')), 'write: missing word stopped locally');
  const before = await page.evaluate(() => window.__ai.length);
  await page.fill('#type-answer', 'I see the ' + ww + ' ratelimit today.'); await page.click('#ai-check'); await sleep(250);
  check(/ถี่เกินไป/.test(await txt(page, '#type-note')) && await has(page, '#ai-check'), 'write: rate limit message, control kept');
  await page.fill('#type-answer', 'I see the ' + ww + ' slowww today.'); await page.click('#ai-check'); await sleep(100);
  check(await has(page, '#ai-stop'), 'write: stop button while waiting'); await page.click('#ai-stop'); await sleep(100);
  check(await has(page, '#ai-check') && !(await has(page, '#ai-stop')), 'write: stopped, form back');
  await page.fill('#type-answer', 'I see the ' + ww + ' wrongg <b>x</b> today.'); await page.click('#ai-check'); await page.waitForSelector('#next-btn');
  check(await page.evaluate(() => !Array.from(document.querySelectorAll('.fb b')).some((e) => e.textContent === 'x') && document.querySelector('.fb').textContent.indexOf('<b>x</b>') !== -1), 'write: learner text shown as text');
  await page.screenshot({ path: path.join(shots, 'd-write-dark.png') });
  await page.click('#rewrite');
  await page.fill('#type-answer', 'I see the ' + ww + ' denied today.'); await page.click('#ai-check'); await sleep(250);
  check(!(await has(page, '#ai-check')) && await has(page, '#self-check'), 'write: Claude refused -> self check only');
  check(await page.evaluate(() => window.__ai.length) === before + 4, 'write: one call per press');
  await ctx.close();

  /* ---- 4. no sound at all: listening step skipped ---- */
  ({ ctx, page } = await open({ flags: { __noSpeech: true }, route: async (p) => { await p.route('**/audio/**', (r) => r.abort()); } }));
  await page.click('#resume');
  await page.click('.word .listen[data-k="w"]'); await sleep(300);
  await page.click('.word .listen[data-k="w"]').catch(() => {}); await sleep(500);
  const noSound = await page.evaluate(() => ({ btn: document.querySelectorAll('.listen:not(.mic)').length, mic: document.querySelectorAll('.listen.mic').length, dis: !!document.querySelector('.step[data-mode="listen"]:disabled'), note: (document.querySelector('#sndnote') || {}).textContent }));
  check(noSound.btn === 0 && noSound.mic > 0 && noSound.dis, 'no sound: listen buttons gone (mic stays) and listening step disabled ' + JSON.stringify(noSound));
  check(/เล่นเสียงในหน้านี้ไม่ได้.*รหัส F E\d/.test(noSound.note || '') && await has(page, '#snd-retry'), 'no sound: notice with codes and a retry button in the set view ' + JSON.stringify(noSound.note));
  await home(page);
  check(/เล่นเสียงในหน้านี้ไม่ได้/.test(await txt(page, '#sndnote') || ''), 'no sound: notice on home');
  // the files become reachable again: retry brings the sound back
  await page.unroute('**/audio/**');
  await page.click('#snd-retry'); await sleep(100);
  check(!(await txt(page, '#sndnote')), 'retry: notice cleared');
  await page.click('#resume');
  check((await page.$$('.word .listen[data-k="w"]')).length === 10 && !(await has(page, '.step[data-mode="listen"]:disabled')), 'retry: buttons and listening step are back');
  await page.click('.word .listen[data-k="w"]'); await sleep(700);
  au = await page.evaluate(() => window.__au);
  check(au.starts === 1, 'retry: clip plays from the pack again ' + JSON.stringify(au));
  await ctx.close();

  /* ---- 5. pack cannot be fetched as data but plays through an audio element ---- */
  ({ ctx, page } = await open({ route: async (p) => { await p.route('**/audio/**', (r) => (r.request().resourceType() === 'media' ? r.continue() : r.abort())); } }));
  await page.click('#resume'); await page.click('.word .listen[data-k="w"]'); await sleep(900);
  au = await page.evaluate(() => window.__au);
  check(au.el >= 1 && au.starts === 0, 'fallback: clip played through an audio element ' + JSON.stringify(au));
  await ctx.close();

  /* ---- 5b. the file arrives but cannot be decoded: audio element instead ---- */
  ({ ctx, page } = await open({ flags: { __noDecode: true, __noSpeech: true } }));
  await page.click('#resume'); await page.click('.word .listen[data-k="w"]'); await sleep(900);
  au = await page.evaluate(() => window.__au);
  check(au.el >= 1 && au.starts === 0 && (await page.$$('.word .listen[data-k="w"]')).length === 10, 'decode failure: clip played through an audio element ' + JSON.stringify(au));
  check(await page.evaluate(() => Array.from(document.querySelectorAll('audio')).length === 0), 'decode failure: no stray audio tags in the page');
  await ctx.close();

  /* ---- 5c. the audio context never starts although the learner tapped: audio element after a moment ---- */
  ({ ctx, page } = await open({ flags: { __stuckCtx: true, __noSpeech: true } }));
  await page.click('#resume'); await page.click('.word .listen[data-k="w"]'); await sleep(500);
  au = await page.evaluate(() => window.__au);
  check(au.el === 0 && au.starts === 0, 'stuck context: still waiting after half a second ' + JSON.stringify(au));
  await sleep(1300);
  au = await page.evaluate(() => window.__au);
  check(au.el >= 1 && au.starts === 0, 'stuck context: clip played through an audio element ' + JSON.stringify(au));
  await page.click('.word:nth-child(2) .listen[data-k="w"]'); await sleep(400);
  check((await page.evaluate(() => window.__au)).el >= 2, 'stuck context: later clips go straight to the audio element');
  await ctx.close();

  /* ---- 5d. sound worked, then the connection drops: buttons stay, a short message, recovery ---- */
  ({ ctx, page } = await open({ flags: { __noSpeech: true } }));
  await page.click('#resume'); await page.click('.word .listen[data-k="w"]'); await sleep(600);
  check((await page.evaluate(() => window.__au)).starts === 1, 'drop: first clip played');
  await page.route('**/audio/**', (r) => r.abort());
  await home(page); await openGroups(page); await page.click('.rows .row[data-c="1"]'); await page.click('.rows .row[data-s="0"]');
  await page.click('.word .listen[data-k="w"]'); await sleep(400);
  await page.click('.word .listen[data-k="w"]'); await sleep(400);
  await page.click('.word .listen[data-k="w"]'); await sleep(400);
  check((await page.$$('.word .listen[data-k="w"]')).length === 10, 'drop: listen buttons stay');
  check(/โหลดเสียงไม่สำเร็จ/.test(await txt(page, '#sndnote') || ''), 'drop: message shown: ' + (await txt(page, '#sndnote')));
  await page.unroute('**/audio/**');
  await page.route('**/audio/**', async (r) => { await sleep(700); r.continue(); });
  await page.click('.word .listen[data-k="w"]'); await sleep(350);
  check(await has(page, '.listen.wait'), 'slow file: pressed button marked as waiting');
  await sleep(1200);
  au = await page.evaluate(() => window.__au);
  check(au.starts === 2 && !(await has(page, '.listen.wait')) && !(await txt(page, '#sndnote')), 'drop: sound back, mark and message cleared ' + JSON.stringify(au));
  await ctx.close();

  /* ---- 5e. a host that does not serve parts of a file: the whole file is taken once ---- */
  for (const mode of ['ignore', 'bad', 'shift']) {
    rangeMode = mode; resetServed();
    ({ ctx, page } = await open({ flags: { __noSpeech: true } }));
    await page.click('#resume'); await sleep(400);
    await page.click('.word .listen[data-k="w"]'); await sleep(700);
    await page.click('.word:nth-child(2) .listen[data-k="w"]'); await sleep(500);
    await page.click('#start-next'); await page.waitForSelector('#card'); await sleep(500);
    au = await page.evaluate(() => window.__au);
    check(au.starts >= 3 && au.el === 0 && served.files === 1, 'parts ' + mode + ': clips play from the whole file, fetched once ' + JSON.stringify(au) + ' ' + JSON.stringify(served));
    check(!(await txt(page, '#sndnote')), 'parts ' + mode + ': no notice');
    await ctx.close();
  }
  rangeMode = 'ok'; resetServed();

  /* ---- 5f. review across topics fetches a few small parts, not whole topics ---- */
  {
    const t5 = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000), w5 = {};
    D.filter((e) => e.si === 0 && e.n % 10 === 3 && e.c < 12).forEach((e, i) => { w5[e.n] = [1 + (i % 4), t5 - 1, t5 - 2, 0, 1000 + i]; });
    ({ ctx, page } = await open({ flags: { __noSpeech: true }, store: { 'vocab3000-progress-v1': JSON.stringify({ w: w5, s: {} }) } }));
    await page.click('#review'); await page.click('#rev-mean'); await page.waitForSelector('#card'); await sleep(900);
    au = await page.evaluate(() => window.__au);
    check(au.starts === 1 && served.files === 0 && served.parts >= 10 && served.bytes < 200000, 'review: one small part per word ' + JSON.stringify(served) + ' ' + JSON.stringify(au));
    await ctx.close();
  }

  /* ---- 5g. a phone without a speech engine: words and sentences come from the files, normal and slow ---- */
  resetServed();
  ({ ctx, page } = await open({ touch: true, flags: { __noSpeech: true } }));
  await page.click('#resume');
  check((await page.$$('.word .listen[data-k="w"]')).length === 10 && (await page.$$('.word .listen[data-k="s"]')).length === 10 && (await page.$$('.word .listen[data-k="ss"]')).length === 10, 'phone: word, sentence and slow sentence buttons');
  check(!(await has(page, '.step:disabled')), 'phone: all nine steps available');
  await page.click('.word:nth-child(3) .listen[data-k="s"]'); await sleep(700);
  au = await page.evaluate(() => window.__au);
  check(au.starts === 1 && au.dur > 1.0 && au.tts === 0, 'phone: sentence clip played from the file ' + JSON.stringify(au));
  await page.click('.word:nth-child(3) .listen[data-k="ss"]'); await sleep(500);
  check((await page.evaluate(() => window.__au)).starts === 2, 'phone: slow sentence clip played');
  check(served.files === 0 && served.bytes < 80000, 'phone: only small parts fetched ' + JSON.stringify(served));
  await page.screenshot({ path: path.join(shots, 'm-set-phone.png') });
  await ctx.close();

  /* ---- 6. no Claude runtime at all (opened outside the viewer) ---- */
  ({ ctx, page } = await open({ flags: { __noClaude: true } }));
  await page.click('#resume'); await page.click('.step[data-mode="write"]'); await page.waitForSelector('#type-answer');
  check(!(await has(page, '#ai-check')) && await has(page, '#self-check'), 'no Claude: self check offered');
  const w6 = await txt(page, '.ruled');
  await page.fill('#type-answer', 'my ' + w6 + ' is here'); await page.click('#self-check'); await page.waitForSelector('#next-btn');
  check(/ยังไม่ผ่าน ขึ้นต้น/.test(await txt(page, '.checks')), 'self check: capital letter reported');
  await ctx.close();

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(1); });

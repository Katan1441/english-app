// End-to-end check of the trainer in headless Chromium, served over HTTP so the audio files load the way they do when published.
// node t3.js <trainer dir> <shots dir>
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

// t3: the parts added in version 11 — today tab, answer panel, sounds, settings, reading and listening, level check, saving.
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch());
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 1, hasTouch: !!opts.touch });
    await ctx.addInitScript((flags) => { Object.assign(window, flags); }, opts.flags || {});
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(() => {
      // count answer sounds (oscillators) separately from clips
      window.__fx = 0;
      const OS = window.OscillatorNode && OscillatorNode.prototype;
      if (OS) { const st = OS.start; OS.start = function () { window.__fx++; return st.apply(this, arguments); }; }
    });
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

  /* 1. a first visit opens on today */
  let { ctx, page } = await open({ touch: true });
  check(/วันนี้/.test(await txt(page, '#app h1')), 'opens on the today tab');
  check(await has(page, '.tab[data-tab="today"][aria-current="page"]'), 'today tab marked');
  check((await page.$$('.plan li')).length === 4 && !(await has(page, '.plan li.done#plan-voc')), 'today: four tasks, words not done yet');
  check(/0/.test(await txt(page, '.streak-n')), 'today: streak starts at 0');
  check(await overflow(page) <= 0, 'today overflow');
  await page.screenshot({ path: path.join(shots, 't-today.png'), fullPage: true });
  // learn: the words button goes to the next set; one step done counts for today
  await page.click('#today-voc');
  check(await has(page, '#start-next'), 'today -> set view');
  await page.click('#start-next'); await page.waitForSelector('#card');
  for (let i = 0; i < 40 && (await has(page, '#card')); i++) {
    if (await has(page, '#reveal')) await page.click('#reveal');
    if (await has(page, '#card-yes')) await page.click('#card-yes');
  }
  check(await has(page, '.score'), 'card step finished');
  const days = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-days-v1') || '{}'));
  const dk = Object.keys(days);
  check(dk.length === 1 && days[dk[0]][1] === 1, 'activity: one vocabulary step logged ' + JSON.stringify(days));
  await page.click('.tab[data-tab="today"]');
  check(/1/.test(await txt(page, '.streak-n')) && await has(page, '.day.now.on'), 'streak 1 and today marked in the week');
  // the answer panel: e2t step
  await page.click('#today-voc'); await page.click('#start-next'); await page.waitForSelector('#card');
  await page.click('#opt-0'); await page.waitForSelector('#sheet'); await sleep(450);
  const sh = await page.evaluate(() => { const s = document.getElementById('sheet'), r = s.getBoundingClientRect(), n = document.getElementById('next-btn').getBoundingClientRect(); return { fixed: getComputedStyle(s).position, bottom: Math.round(r.bottom), vh: window.innerHeight, nextVisible: n.bottom <= window.innerHeight && n.top >= 0, pad: parseInt(document.getElementById('app').style.paddingBottom, 10) || 0, h: Math.round(r.height) }; });
  check(sh.fixed === 'fixed' && sh.bottom === sh.vh && sh.nextVisible && sh.pad >= sh.h, 'answer panel at the bottom, next button visible, page keeps room ' + JSON.stringify(sh));
  check(await page.evaluate(() => window.__fx) >= 2, 'answer sound played');
  await page.screenshot({ path: path.join(shots, 't-sheet.png') });
  await page.click('#next-btn');
  check(!(await has(page, '#sheet')), 'panel gone on the next question');
  await page.click('#quit');
  await ctx.close();

  /* 2. settings: sounds off, bigger text, goal */
  ({ ctx, page } = await open({}));
  await page.click('#open-prefs');
  check(await has(page, '#pref-fx-0') && await has(page, '#pref-fs-125') && await has(page, '#pref-goal-18'), 'settings shown');
  await page.click('#pref-fx-0'); await page.click('#pref-fs-125'); await page.click('#pref-goal-5');
  const ui = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-ui-v1')));
  check(ui.fx === false && ui.fs === 125 && ui.goal === 5, 'settings saved ' + JSON.stringify(ui));
  check(await page.evaluate(() => document.documentElement.style.fontSize) === '125%', 'text size applied');
  check(await overflow(page) <= 0, 'settings overflow at large text');
  await page.screenshot({ path: path.join(shots, 't-prefs.png'), fullPage: true });
  await page.click('.crumb .back');
  check(/จาก 5 ขั้น/.test(await txt(page, '#plan-voc')), 'goal shown on today: ' + await txt(page, '#plan-voc'));
  await page.reload(); await page.waitForSelector('#app h1');
  check(await page.evaluate(() => document.documentElement.style.fontSize) === '125%', 'text size kept after reload');
  // with answer sounds off no oscillator starts
  await page.click('.tab[data-tab="vocab"]'); await page.click('#resume'); await page.click('.step[data-mode="e2t"]'); await page.waitForSelector('#card');
  const fx0 = await page.evaluate(() => window.__fx);
  await page.click('#opt-1'); await page.waitForSelector('#sheet'); await sleep(100);
  check(await page.evaluate(() => window.__fx) === fx0, 'answer sound off');
  await ctx.close();

  /* 3. reading and listening */
  ({ ctx, page } = await open({ touch: true, flags: { __noSpeech: true } }));
  await page.click('.tab[data-tab="read"]');
  check((await page.$$('.rows .row')).length === 30 && (await page.$$('section.block h2')).length === 3, 'reading list: 30 stories in 3 levels');
  check(await overflow(page) <= 0, 'reading list overflow');
  await page.screenshot({ path: path.join(shots, 't-read.png'), fullPage: true });
  await page.click('#r-resume');
  check(/Hello, I'm Ploy/.test(await txt(page, '#app h2')) && (await page.$$('.line')).length === 8, 'story 1 opened with 8 lines');
  check(await overflow(page) <= 0, 'story overflow');
  // one line
  let au0 = await page.evaluate(() => window.__au.starts);
  await page.click('.line:nth-child(2) .listen'); await sleep(800);
  check(await page.evaluate(() => window.__au.starts) === au0 + 1, 'line sound played from the story file');
  // play all: lines follow one another and are marked
  await page.click('#r-play'); await sleep(4200);
  const pl = await page.evaluate(() => ({ starts: window.__au.starts, cur: (document.querySelector('.line.cur') || {}).id || '', btn: document.getElementById('r-play').textContent }));
  check(pl.starts >= au0 + 3 && /line-[1-9]/.test(pl.cur) && /หยุด/.test(pl.btn), 'play all moves on line by line ' + JSON.stringify(pl));
  await page.click('#r-play');
  check(!(await has(page, '.line.cur')) && /ฟังทั้งเรื่อง/.test(await txt(page, '#r-play')), 'stop clears the mark');
  // a word: in the list (went > go form rule is tested on story 13 below)
  await page.click('.line:nth-child(3) .tw[data-w="0"]');
  check(await has(page, '#wsheet') && /I/.test(await txt(page, '#wsheet .wsheet-head b')), 'word panel opened');
  await page.click('[data-act="r-wclose"]');
  await page.click('.line:nth-child(5) .tw[data-w="4"]');   // "small" in "I live in a small room in a dorm."
  check(/small/.test(await txt(page, '#wsheet .wsheet-head b')) && await has(page, '#wsheet .went .pos'), 'word panel shows the dictionary entry');
  await page.click('[data-act="r-wclose"]');
  await page.click('.line:nth-child(5) .tw[data-w="8"]');   // dorm: from the glossary
  check(/หอพัก/.test(await txt(page, '#wsheet')), 'glossary word explained: ' + await txt(page, '#wsheet'));
  await page.click('h2');
  check(!(await has(page, '#wsheet')), 'tap elsewhere closes the word panel');
  // translation of one line, then all lines
  await page.click('.line:nth-child(1) .l-tr');
  check((await page.$$('.l-th')).length === 1, 'one line translated');
  await page.click('#r-th');
  check((await page.$$('.l-th')).length === 8, 'all lines translated');
  await page.click('#r-th');
  // questions
  const qs = await page.evaluate(() => window.__R__.stories[0].q.map((q) => q.a));
  for (let i = 0; i < qs.length; i++) await page.click('#rq-' + i + '-' + qs[i]);
  check(await has(page, '#r-result') && /^3/.test(await txt(page, '#r-result .score')), 'questions answered: 3 of 3');
  const rd = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-read-v1')));
  check(rd.r1 && rd.r1[0] === 3, 'story result saved ' + JSON.stringify(rd));
  await page.screenshot({ path: path.join(shots, 't-story.png'), fullPage: true });
  await page.click('#r-nextstory');
  check(/My Room/.test(await txt(page, '#app h2')), 'next story opened');
  // phrase and word forms on story 13 (went > go, "the next day")
  await page.goto(base); await page.waitForSelector('#app h1');
  await page.click('.tab[data-tab="read"]');
  await page.evaluate(() => document.querySelectorAll('details.group').forEach((d) => { d.open = true; }));
  await page.click('.row[data-id="r13"]');
  await page.click('.line:nth-child(1) .tw[data-w="3"]');   // went
  check(/ไป/.test(await txt(page, '#wsheet')), 'went explained: ' + await txt(page, '#wsheet'));
  await page.click('[data-act="r-wclose"]');
  await page.click('.line:nth-child(2) .tw[data-w="1"]');   // took > take
  check(/take/.test(await txt(page, '#wsheet')), 'took explained through take: ' + await txt(page, '#wsheet'));
  await page.click('[data-act="r-wclose"]');
  await page.click('.line:nth-child(9) .tw[data-w="9"]');   // "back" in "took the train back" -> phrase or word
  check(await has(page, '#wsheet .went') || /ไม่มีคำนี้/.test(await txt(page, '#wsheet')), 'any word gives an answer');
  await page.click('.tab[data-tab="today"]');
  check(await has(page, '#plan-read.done'), 'today: reading task done');
  await ctx.close();

  /* 4. level check */
  ({ ctx, page } = await open({}));
  await page.click('#open-level');
  await page.click('#lvl-start'); await page.waitForSelector('#card');
  const n = await page.evaluate(() => document.querySelector('.count').textContent);
  check(/3[0-9]/.test(n), 'level check has about 36 questions: ' + n);
  check(await page.evaluate(() => getComputedStyle(document.getElementById('tabbar')).display === 'none'), 'menu hidden during the check');
  await page.screenshot({ path: path.join(shots, 't-level-q.png') });
  for (let i = 0; i < 60 && (await has(page, '#card')); i++) { await page.click('#lvl-skip'); await sleep(30); }
  check(await has(page, '.big-lv') && /ก่อน A1/.test(await txt(page, '.big-lv')), 'all skipped: before A1 ' + await txt(page, '.big-lv'));
  const lv = await page.evaluate(() => JSON.parse(localStorage.getItem('vocab3000-level-v1')));
  check(Array.isArray(lv) && lv.length === 1 && lv[0].o === 'pre' && lv[0].v === 0, 'level result saved ' + JSON.stringify(lv));
  await page.screenshot({ path: path.join(shots, 't-level.png'), fullPage: true });
  await page.click('.crumb .back');
  check(/ก่อน A1/.test(await txt(page, '#open-level')), 'today shows the level');
  await page.waitForTimeout(3600);
  const db = await page.evaluate(() => JSON.parse(localStorage.getItem('__mockdb') || '{}'));
  const keys = Object.keys(db).map((k) => k.split('/').pop());
  check(keys.indexOf('days') >= 0 && keys.indexOf('level') >= 0, 'saved with the account: ' + keys.join(','));
  await ctx.close();

  /* 5. the account copy wins on a fresh device: days, stories, level */
  ({ ctx, page } = await open({ store: { '__mockdb': JSON.stringify({ 'data/users/u_test1234567890abcdefgh/days': { v: 1, d: { [String(Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) - 1)]: [1, 9, 1, 0, 0, 1] } }, 'data/users/u_test1234567890abcdefgh/read': { v: 1, r: { r2: [2, 3, 1000] } }, 'data/users/u_test1234567890abcdefgh/level': { v: 1, h: [{ t: 20000, o: 'A1', v: 800, vl: 'A1', gl: 'A1', g: [3, 1, 0, 0], gt: [5, 5, 5, 5] }] } }) } }));
  await sleep(600);
  check(/1/.test(await txt(page, '.streak-n')) && /A1/.test(await txt(page, '#open-level')), 'streak and level came from the account: ' + await txt(page, '.streak-n') + ' / ' + await txt(page, '#open-level'));
  await page.click('.tab[data-tab="read"]');
  await page.evaluate(() => document.querySelectorAll('details.group').forEach((d) => { d.open = true; }));
  check(/2\/3/.test(await txt(page, '.row[data-id="r2"] .row-side')), 'story score from the account');
  await ctx.close();

  /* 6. dark, narrow phone: today and a story fit */
  ({ ctx, page } = await open({ dark: true, viewport: { width: 320, height: 640 } }));
  check(await overflow(page) <= 0, 'today overflow at 320');
  await page.click('.tab[data-tab="read"]'); await page.click('#r-resume');
  check(await overflow(page) <= 0, 'story overflow at 320');
  await page.screenshot({ path: path.join(shots, 't-story-dark.png') });
  await ctx.close();

  /* 7. backup code: copy from one device, restore on another (merged, nothing newer lost) */
  {
    const t7 = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    const w7 = { 3001: [2, t7 + 1, t7 - 1, 0, 5000], 3002: [1, t7, t7 - 2, 0, 5001] };
    ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': JSON.stringify({ w: w7, s: { '36-0': 511, '36-1': 7 } }), 'vocab3000-read-v1': JSON.stringify({ r1: [3, 3, 7000] }), 'vocab3000-days-v1': JSON.stringify({ [String(t7)]: [1, 3, 0, 1, 0, 0] }) }, flags: { __noClaude: true } }));
    await page.click('#open-prefs'); await page.click('#bk-copy');
    const code = await page.evaluate(() => document.getElementById('bk-out').value);
    check(/^EN1:[A-Za-z0-9+/=]+$/.test(code) && code.length < 4000, 'backup code made: ' + code.length + ' chars');
    await ctx.close();
    ({ ctx, page } = await open({ flags: { __noClaude: true }, store: { 'vocab3000-progress-v1': JSON.stringify({ w: { 3001: [4, t7 + 7, t7, 0, 9000] }, s: {} }) } }));
    await page.click('#open-prefs');
    await page.fill('#bk-in', 'not a code'); await page.click('#bk-restore');
    check(/ไม่ถูกต้อง/.test(await txt(page, '#bk-note')), 'a wrong code is refused');
    await page.fill('#bk-in', code); await page.click('#bk-restore');
    check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')), 'restore message: ' + await txt(page, '#bk-note'));
    const pr = await page.evaluate(() => ({ p: JSON.parse(localStorage.getItem('vocab3000-progress-v1')), r: JSON.parse(localStorage.getItem('vocab3000-read-v1') || '{}'), d: JSON.parse(localStorage.getItem('vocab3000-days-v1') || '{}') }));
    check(pr.p.w[3001][0] === 4 && pr.p.w[3002][0] === 1 && pr.p.s['36-0'] === 511 && pr.r.r1 && pr.r.r1[0] === 3 && Object.keys(pr.d).length === 1, 'restored and merged, newer word record kept ' + JSON.stringify(pr));
    await page.reload(); await page.waitForSelector('#app h1');
    check(/1/.test(await txt(page, '.streak-n')), 'streak restored');
    await ctx.close();
  }

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(1); });

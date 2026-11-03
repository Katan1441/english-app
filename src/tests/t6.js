// End-to-end check of phase 4 in headless Chromium: the new data validates (sounds, dialogues, drills, writing, work words),
// the new lessons sit inside the existing units, one lesson of each new kind can be done from start to end (speech
// recognition stubbed, the phone's voice recorded), drill misses join the mistakes list, the work words play with the
// phone's voice and do not move existing topics or progress, the lesson records travel in the backup code, and the layout.
// node t6.js <trainer dir> <shots dir>
const fs = require('fs'), path = require('path'), http = require('http');
const root = process.argv[2], shots = process.argv[3];
fs.mkdirSync(shots, { recursive: true });
const src = fs.readFileSync(path.join(root, 'vocab-trainer.html'), 'utf8');
fs.writeFileSync(path.join(root, 'wrapped.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#fafafa}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + src + '</body></html>');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
const mp3 = [];
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (/\.mp3$/.test(p)) mp3.push(path.basename(p));
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
/* the phone's voice is recorded in __tts; speech recognition hears window.__sr.say; no recorder */
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
const THAI = /[฀-๿]/, EN = /[A-Za-z]/;
const ne = (x) => typeof x === 'string' && x.trim().length > 0;

/* 1. the data files, without a browser */
const DATA = path.join(__dirname, '..', 'data');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const SN = rd('sounds.json'), TK = rd('talk.json'), DR = rd('drills.json'), WR = rd('write.json'), V = rd('vocab.js'), AU = rd('audio-index.json'), G = rd('gram.json');
const uniq = (a) => new Set(a).size === a.length;
const byLv = (a) => { const o = {}; a.forEach((x) => { o[x.lv] = (o[x.lv] || 0) + 1; }); return J(o); };
check(SN.length === 14 && uniq(SN.map((x) => x.id)) && byLv(SN) === J({ A1: 6, A2: 5, B1: 3 }), 'sounds: 14 lessons, 6 in A1, 5 in A2, 3 in B1 ' + byLv(SN));
SN.forEach((x) => {
  check(ne(x.title) && THAI.test(x.title) && ne(x.en) && x.how.length >= 3 && x.how.every((t) => THAI.test(t)) && x.words.length >= 5 && x.words.every((w) => EN.test(w)) && x.say.length >= 3, x.id + ': explanation, words and lines');
  check(x.items ? x.items.every((q) => q.opts.length === 2 && (q.a === 0 || q.a === 1) && ne(q.say)) : x.pairs.length >= 5 && x.pairs.every((p) => p.length === 2 && p[0] !== p[1]), x.id + ': pairs to tell apart');
});
check(TK.length === 16 && uniq(TK.map((x) => x.id)) && byLv(TK) === J({ A1: 4, A2: 6, B1: 6 }), 'dialogues: 16, 4 A1, 6 A2, 6 B1 ' + byLv(TK));
TK.forEach((x) => {
  const mine = x.l.filter((l) => l.sp === x.me).length;
  check(x.who.A && x.who.B && ne(x.who.A.th) && ne(x.who.B.en) && (x.me === 'A' || x.me === 'B') && x.l.length >= 8 && x.l.length <= 12 && mine >= 3 &&
    x.l.every((l) => (l.sp === 'A' || l.sp === 'B') && ne(l.en) && !THAI.test(l.en) && THAI.test(l.th)) && x.tags.length > 0, x.id + ': two roles, 8-12 lines in English and Thai, at least 3 for the learner');
});
const GL = {}; G.lessons.forEach((l) => { GL[l.id] = l; });
check(DR.length === 10 && DR.every((t) => t.items.length === 10) && uniq(DR.map((t) => t.id)) && uniq([].concat(...DR.map((t) => t.items.map((q) => q.id)))), 'drills: 10 types of 10 sentences, ids unique');
DR.forEach((t) => {
  check(GL[t.after] && t.lessons.every((id) => GL[id]) && THAI.test(t.th), t.id + ': linked to grammar lessons that exist');
  t.items.forEach((q) => {
    const ws = q.s.split(' '), tok = (ws[q.w] || '').replace(/_/g, ' ').replace(/[.,!?]+$/, '');
    check(q.w >= 0 && q.w < ws.length && q.o.length === 3 && uniq(q.o) && q.o[0].toLowerCase() !== tok.toLowerCase() && THAI.test(q.th) && THAI.test(q.why), q.id + ': a wrong word, three different choices, Thai and why');
  });
});
check(WR.length === 27 && uniq(WR.map((x) => x.id)) && byLv(WR) === J({ A2: 10, B1: 10, B2: 7 }), 'writing: 27 tasks from A2 ' + byLv(WR));
WR.forEach((x) => {
  const n = x.model.split(/(?<=[.!?])\s+/).filter((y) => y.trim()).length;
  check(THAI.test(x.brief) && THAI.test(x.th) && x.bank.length >= 5 && n >= 3 && n <= 6 && x.check.length >= 3 && x.check.every((c) => THAI.test(c)), x.id + ': brief, word bank, model of 3-5 sentences, checks');
});
check(V.length === 62 && V.slice(55).every((cd) => cd[3] === 'W') && V.slice(0, 55).every((cd) => cd[3] !== 'W'), 'work words: 7 topics appended after the first 55');
const lines = (cd) => cd[2].split('\n');
check(V.slice(0, 55).reduce((a, cd) => a + lines(cd).length, 0) === 3600 && V.slice(55).reduce((a, cd) => a + lines(cd).length, 0) === 150, '3600 words as before plus 150 work words');
const heads = {}; let dup = 0;
V.forEach((cd) => lines(cd).forEach((l) => { const w = l.split('|')[0].toLowerCase(); if (heads[w]) dup++; heads[w] = 1; }));
check(V.slice(55).every((cd) => lines(cd).every((l) => { const f = l.split('|'); return f.length === 6 && f.every(ne) && f[4].indexOf('{' + f[0] + '}') >= 0 && THAI.test(f[2]) && THAI.test(f[5]); })), 'work words: every line complete, the word marked in its example');
check(AU.w.length === 62 && AU.s.length === 62 && AU.w.slice(55).every((x) => x === '') && AU.s.slice(55).every((x) => x === '') && AU.w.slice(0, 55).every(Boolean), 'sound index: empty entries for the new topics, the old ones untouched');

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 1, hasTouch: true });
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
  const lib = async (page, card, id) => { await page.click('.tab[data-tab="prac"]'); await page.click(card); await page.click('#lib-' + id); };

  /* 2. the path: the new lessons inside the existing units, in their levels, drills right after their grammar lesson */
  let { ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: {}, s: { '36-0': 511 } }) } });
  check(await has(page, '.pnode.done[data-id="v:36.0.0"]') && await has(page, '.pnode.done[data-id="v:36.0.2"]'), 'progress on an existing topic still shows on the path');
  const order = [], units = {};
  for (let u = 0; u < 100; u += 5) {
    if (u) { const ok = await page.evaluate((x) => { const e = document.querySelector('[data-act="p-unit"][data-u="' + x + '"]'); if (e) e.click(); return !!e; }, u); if (!ok) break; }
    const got = await page.evaluate(() => Array.from(document.querySelectorAll('.punit')).map((s) => [s.id, Array.from(s.querySelectorAll('.pnode')).map((e) => e.getAttribute('data-id'))]));
    got.forEach(([uid, ns]) => { if (!units[uid]) { units[uid] = ns; ns.forEach((id) => order.push(id)); } });
  }
  const unitOf = {}; Object.keys(units).forEach((uid) => units[uid].forEach((id) => { unitOf[id] = +uid.slice(5); }));
  const cnt = (t) => order.filter((id) => id.indexOf(t + ':') === 0).length;
  check(Object.keys(units).length === 82 && cnt('p') === 14 && cnt('d') === 16 && cnt('e') === 10 && cnt('w') === 27 && order.length === 1632, 'path: 82 units, 14 sounds, 16 dialogues, 10 drills, 27 writing tasks, ' + order.length + ' nodes');
  const lvOfUnit = (no) => (no <= 24 ? 'A1' : no <= 48 ? 'A2' : no <= 68 ? 'B1' : 'B2');
  check(SN.every((x) => lvOfUnit(unitOf['p:' + x.id]) === x.lv) && TK.every((x) => lvOfUnit(unitOf['d:' + x.id]) === x.lv) && WR.every((x) => lvOfUnit(unitOf['w:' + x.id]) === x.lv), 'each new lesson sits in its level');
  check(DR.every((t) => order.indexOf('e:' + t.id) === order.indexOf('g:' + t.after) + 1), 'each drill right after its grammar lesson');
  check(order.filter((id) => /^v:(5[5-9]|6[01])\./.test(id)).length === 45 && order.filter((id) => /^v:(5[5-9]|6[01])\./.test(id)).every((id) => lvOfUnit(unitOf[id]) === 'B1'), 'the 45 work-word nodes are in B1');
  check(unitOf['g:l8'] === 10 && unitOf['g:l45'] === 59 && unitOf['k:82'] === 82 && unitOf['r:r1'] !== undefined, 'existing lessons keep their units');
  await ctx.close();

  /* 3. a sound lesson from the practice tab: how, pairs by ear, saying, the end screen; recorded once done */
  ({ ctx, page } = await open({}));
  await lib(page, '#pr-snd', 's5');
  check((await viewOf(page)) === 'p-snd' && (await page.$$('#sn-how li')).length >= 3 && await has(page, '#sn-w-0'), 'sound lesson opens with how to make the sound and words to hear');
  await page.click('#sn-w-0');
  check((await page.evaluate(() => window.__tts.slice(-1)[0])) === SN[4].words[0], 'a word plays with the phone voice');
  await page.screenshot({ path: path.join(shots, 'p4-sound.png'), fullPage: true });
  await page.click('#sn-next');
  let pairs = 0;
  for (let i = 0; i < 10 && await has(page, '#sn-o-0'); i++) {
    await page.click(i === 0 ? '#sn-o-1' : '#sn-o-0'); await page.waitForSelector('#next-btn'); pairs++;
    if (i === 0) { check(await has(page, '#sheet'), 'a pair answered shows the answer panel'); await page.screenshot({ path: path.join(shots, 'p4-pairs.png') }); }
    await page.click('#next-btn');
  }
  check(pairs === SN[4].pairs.length && (await viewOf(page)) === 'p-snd' && await has(page, '#sn-lines'), 'all pairs answered, then the lines to say: ' + pairs);
  const say0 = await page.evaluate(() => document.querySelector('#sn-l-0 .mic').getAttribute('data-text'));
  await page.evaluate((t) => { window.__sr.say = [t]; }, say0);
  await page.click('#sn-l-0 .mic'); await page.click('#spk-mic'); await sleep(400);
  check(/ครบทุกคำ|ถูก/.test(await txt(page, '#spk-msg') || ''), 'saying a line: the recogniser result shows');
  await page.click('#spk-close'); await page.click('#sn-done');
  check((await viewOf(page)) === 'p-end' && /กลับหน้าฝึก/.test(await txt(page, '#p-back')), 'sound lesson ends on the end screen, back to the practice tab');
  let les = await store(page, 'vocab3000-lessons-v1');
  check(les && les.p && les.p.s5 && les.p.s5[1] === pairs, 'the sound lesson is recorded ' + J(les));
  await ctx.close();

  /* 4. a dialogue: typed (case, short forms and punctuation do not count), said through the mic, skipped; the hint */
  ({ ctx, page } = await open({}));
  const d1 = TK[0], mine = d1.l.filter((l) => l.sp === d1.me);
  await lib(page, '#pr-talk', 'd1');
  check((await viewOf(page)) === 'p-talk' && await has(page, '#tk-card') && (await page.$$('#tk-lines .line')).length === 1, 'dialogue: the other role speaks first, then it is your turn');
  await sleep(500);
  check((await page.evaluate(() => window.__tts.slice())).indexOf(d1.l[0].en) >= 0, 'the other role is read by the phone');
  await page.click('#tk-hint-btn');
  check(/_/.test(await txt(page, '#tk-hint')) && (await txt(page, '#tk-hint')).split(' ').length === mine[0].en.split(' ').length, 'the first hint shows first letters');
  await page.click('#tk-hint-btn');
  check((await txt(page, '#tk-hint')) === mine[0].en, 'the second hint shows the whole line');
  await page.fill('#tk-in', mine[0].en.toLowerCase().replace(/[.,!?]/g, '').replace(/\bI'm\b/gi, 'i am'));
  await page.click('#tk-check');
  check(await has(page, '#tk-next') && /ผ่าน/.test(await txt(page, '#tk-msg')), 'typed line passes: ' + await txt(page, '#tk-msg'));
  await page.screenshot({ path: path.join(shots, 'p4-talk.png'), fullPage: true });
  await page.click('#tk-next');
  await page.fill('#tk-in', 'hello'); await page.click('#tk-check');
  check(!(await has(page, '#tk-next')) && await has(page, '#tk-diff .miss'), 'a wrong line does not pass, missing words are marked');
  await page.evaluate((t) => { window.__sr.say = [t]; }, mine[1].en);
  await page.click('#tk-card .mic'); await page.click('#spk-mic'); await sleep(400); await page.click('#spk-close');
  check(await has(page, '#tk-next'), 'a line said through the mic passes');
  await page.click('#tk-next');
  for (let i = 2; i < mine.length; i++) { if (i === 2) await page.click('#tk-skip'); else { await page.fill('#tk-in', mine[i].en); await page.click('#tk-check'); await page.click('#tk-next'); } }
  check(await has(page, '#tk-end') && (await page.$$('#tk-lines .line')).length === d1.l.length, 'all lines shown at the end');
  await page.click('#tk-end');
  les = await store(page, 'vocab3000-lessons-v1');
  check((await viewOf(page)) === 'p-end' && les.d && les.d.d1 && les.d.d1[1] === mine.length - 1, 'dialogue recorded (a skipped line is not counted) ' + J(les.d));
  await ctx.close();

  /* 5. a drill: a wrong tap is marked, the right word then the fix; a miss joins the mistakes list */
  ({ ctx, page } = await open({}));
  await lib(page, '#pr-fix', 'e1');
  let missed = null, firstId = null;
  for (let i = 0; i < 10; i++) {
    const s = await page.evaluate(() => Array.from(document.querySelectorAll('#fx-s .fx-w')).map((e) => e.textContent).join(' '));
    const q = DR[0].items.find((x) => x.s.replace(/_/g, ' ') === s);
    check(!!q, 'drill sentence found: ' + s);
    if (!q) break;
    if (i === 0) { firstId = q.id; const other = q.w === 0 ? 1 : 0; await page.click('#fx-w-' + other); check(await has(page, '#fx-w-' + other + '.is-wrong'), 'a wrong tap is struck through'); }
    await page.click('#fx-w-' + q.w);
    check(await has(page, '#fx-o-0'), 'the right word opens the choices');
    if (i === 1) { await page.click('#fx-o-1'); missed = q.id; check(await has(page, '#sheet.no'), 'a wrong fix is marked'); }
    else await page.click('#fx-o-0');
    if (i === 2) { check(await has(page, '#sheet.ok') && /<b>/.test(await page.evaluate(() => document.getElementById('fx-fixed').innerHTML)), 'the corrected sentence shows the fix'); await page.screenshot({ path: path.join(shots, 'p4-drill.png') }); }
    await page.click('#next-btn');
  }
  check((await viewOf(page)) === 'p-end', 'drill ends on the end screen');
  les = await store(page, 'vocab3000-lessons-v1');
  check(les.e && les.e.e1 && les.e.e1[0] === 8 && les.e.e1[1] === 10 && les.x[missed] === 1 && les.x[firstId] === 1, 'drill result 8 of 10 (a wrong tap counts as a miss) and the misses kept ' + J(les));
  await page.click('#p-back');
  await page.click('#pr-mist');
  check(await has(page, '#md-' + missed), 'a missed drill sentence is in the mistakes list');
  await ctx.close();

  /* 6. writing: at least three sentences, the word bank, the model, the self-check; the end screen */
  ({ ctx, page } = await open({}));
  await lib(page, '#pr-write', 'w1');
  check((await viewOf(page)) === 'p-write' && await has(page, '#wr-done:disabled'), 'writing: done waits for three sentences');
  await page.click('#wr-b-0');
  check(/My name is/.test(await page.evaluate(() => document.getElementById('wr-in').value)), 'a word bank chip goes into the text');
  await page.fill('#wr-in', 'My name is Kiew. I am from Chiang Rai.');
  await page.dispatchEvent('#wr-in', 'input');
  check(await has(page, '#wr-done:disabled') && /2/.test(await txt(page, '#wr-count')), 'two sentences are not enough');
  await page.fill('#wr-in', 'My name is Kiew. I am from Chiang Rai. I like music and football.');
  await page.dispatchEvent('#wr-in', 'input');
  await page.click('#wr-model');
  check(/Kiew/.test(await txt(page, '#wr-model-text')), 'the model answer can be shown');
  for (let i = 0; i < WR[0].check.length; i++) await page.click('#wr-c-' + i);
  await page.screenshot({ path: path.join(shots, 'p4-write.png'), fullPage: true });
  await page.click('#wr-done');
  les = await store(page, 'vocab3000-lessons-v1');
  check((await viewOf(page)) === 'p-end' && les.w.w1[0] === WR[0].check.length && les.w.w1[1] === WR[0].check.length && await has(page, '#p-full'), 'writing recorded with every check ticked (full) ' + J(les.w));
  await ctx.close();

  /* 7. work words: in their own group, read by the phone's voice, no sound file asked for; old topics unmoved */
  ({ ctx, page } = await open({}));
  await page.click('.tab[data-tab="vocab"]');
  check(/ศัพท์งานและเทคโนโลยี/.test(await page.evaluate(() => document.getElementById('app').textContent)), 'vocabulary: the work words group');
  const before = mp3.length;
  await page.evaluate(() => document.querySelectorAll('details.group').forEach((d) => { d.open = true; }));
  await page.click('.rows .row[data-c="55"]');
  await sleep(300);
  if (!(await page.$('[data-act="say"][data-k="w"]')) && await page.$('[data-act="open-set"]')) { await page.click('[data-act="open-set"]'); await sleep(300); }
  const sayBtn = await page.$('[data-act="say"][data-k="w"]');
  check(!!sayBtn, 'a listen button for a work word');
  if (sayBtn) await sayBtn.click();
  await sleep(300);
  const tts = await page.evaluate(() => window.__tts.slice());
  check(tts.some((t) => /millimeter|milligram|diameter|radius|thickness|accuracy|tolerance|gauge|percentage|maximum/.test(t)), 'a work word plays with the phone voice: ' + tts.slice(-2).join(' | '));
  check(!mp3.slice(before).some((f) => /^[ws]5[6-9]|^[ws]6[0-2]/.test(f)), 'no sound file for the new topics was requested: ' + mp3.slice(before).join(' '));
  check(await page.evaluate(() => window.__VOCAB__[36][0]) === 'Greetings & Polite Words' && await page.evaluate(() => window.__VOCAB__.length) === 62, 'topic indexes unchanged');
  await ctx.close();

  /* 8. the lesson records travel in the backup code; an old code without them still restores */
  ({ ctx, page } = await open({ store: { 'vocab3000-lessons-v1': J({ p: { s1: [5, 6, 1700000000] }, d: {}, e: { e2: [9, 10, 1700000000] }, w: {}, x: { 'e2-3': 2 } }) } }));
  await page.click('#open-me'); await page.click('#open-prefs'); await page.click('#bk-copy');
  const code = await page.evaluate(() => document.getElementById('bk-out').value);
  const doc = JSON.parse(Buffer.from(code.slice(4), 'base64').toString('utf8'));
  check(doc.d.lessons && doc.d.lessons.p.s1[0] === 5 && doc.d.lessons.x['e2-3'] === 2, 'the backup code carries the lesson records');
  await ctx.close();
  ({ ctx, page } = await open({}));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', code); await page.click('#bk-restore');
  const back = await store(page, 'vocab3000-lessons-v1');
  check(back && back.p.s1[0] === 5 && back.e.e2[0] === 9 && back.x['e2-3'] === 2, 'restored lesson records ' + J(back));
  delete doc.d.lessons;
  await page.fill('#bk-in', 'EN1:' + Buffer.from(JSON.stringify(doc), 'utf8').toString('base64')); await page.click('#bk-restore');
  check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')), 'an old code without lesson records still restores');
  await ctx.close();

  /* 9. layout of the new screens at 390 and 320 px, light and dark */
  for (const [w, dark] of [[390, false], [390, true], [320, false], [320, true]]) {
    ({ ctx, page } = await open({ dark, viewport: { width: w, height: 720 } }));
    const tag = w + (dark ? '-dark' : '');
    await lib(page, '#pr-snd', 's8');
    check(await overflow(page) <= 0, 'sound lesson overflow at ' + tag);
    await page.click('#sn-next');
    check(await overflow(page) <= 0 && await page.evaluate(() => Array.from(document.querySelectorAll('.pair-opts .opt')).every((e) => e.getBoundingClientRect().height >= 44)), 'pairs layout at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p4-pairs-' + tag + '.png') });
    await page.click('#quit'); await page.click('#dlg-leave');
    await page.click('#pr-talk'); await page.click('#lib-d11');
    check(await overflow(page) <= 0, 'dialogue overflow at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p4-talk-' + tag + '.png'), fullPage: true });
    await page.click('#quit'); await page.click('#dlg-leave');
    await page.click('#pr-fix'); await page.click('#lib-e10');
    check(await overflow(page) <= 0 && await page.evaluate(() => Array.from(document.querySelectorAll('.fx-w')).every((e) => e.getBoundingClientRect().height >= 44)), 'drill layout at ' + tag);
    await page.click('#quit'); await page.click('#dlg-leave');
    await page.click('#pr-write'); await page.click('#lib-w21');
    check(await overflow(page) <= 0, 'writing overflow at ' + tag);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'p4-write-' + tag + '.png'), fullPage: true });
    await ctx.close();
  }

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(1); });

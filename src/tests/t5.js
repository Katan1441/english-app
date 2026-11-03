// End-to-end check of phase 3 in headless Chromium: the practice tab (ฝึก), the mistakes list and its round, speaking
// practice, dictation with a word-by-word check, the match race and its best time, rest days that keep a streak, the
// welcome back after a break, the pace note, badges (earned and celebrated once), the calendar reminder, the backup as a
// file, the new records in the backup code (and old codes without them), and the layout.
// node t5.js <trainer dir> <shots dir>
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
/* speech recognition is a stand-in that hears window.__sr.say; no recorder, so the speaking panel only listens */
const MOCK = `
(function(){
  window.__sr = { say: null };
  try { window.MediaRecorder = undefined; } catch (e) {}
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
  const ids = (page, sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((e) => e.id), sel);
  const gone = async (page, sel, ms) => { for (let i = 0; i < ms / 100; i++) { if (!(await has(page, sel))) return true; await sleep(100); } return false; };

  /* the words of the app, to seed records */
  const D = await (async () => {
    const { ctx, page } = await open({});
    const out = await page.evaluate(() => {
      const a = []; let n = 0;
      window.__VOCAB__.forEach((cd, ci) => cd[2].split('\n').forEach((l, i) => { const f = l.split('|'); n++; a.push({ n, w: f[0], t: f[2], x: f[4] || '', c: ci }); }));
      const g = []; window.__G__.lessons.forEach((l) => l.q.forEach((q) => { if (q.k === 'c') g.push(q.id); }));
      return { words: a, gc: g };
    });
    await ctx.close();
    return out;
  })();
  const rec = (lv, due, right, wrong) => [lv, due, right, wrong, 1700000000];
  /* any question of a round: a choice when there is one, else move on; the listening skip when offered */
  async function playRound(page, label) {
    for (let i = 0; i < 80; i++) {
      const v = await viewOf(page);
      if (v === 'p-end') return true;
      if (await has(page, '#next-btn')) { await page.click('#next-btn'); continue; }
      if (await has(page, '.opt:not(:disabled)')) { await page.click('.opt:not(:disabled)'); await page.waitForSelector('#next-btn', { timeout: 4000 }).catch(() => {}); continue; }
      if (await has(page, '#no-listen')) { await page.click('#no-listen'); continue; }
      if (await has(page, '#reveal')) { await page.click('#reveal'); continue; }
      if (await has(page, '#card-yes')) { await page.click('#card-yes'); continue; }
      check(false, label + ': stuck on ' + v + ' ' + (await page.evaluate(() => (document.querySelector('#card') || document.body).innerText.slice(0, 120))));
      return false;
    }
    return false;
  }

  /* 1. the practice tab: in the menu, five cards; with nothing learned yet the cards that need words are off */
  let { ctx, page } = await open({});
  check((await page.$$('#tabbar .tab:not([hidden])')).length === 5 && await has(page, '.tab[data-tab="prac"]'), 'menu: five tabs with ฝึก');
  await page.click('.tab[data-tab="prac"]');
  check((await viewOf(page)) === 'prac' && await has(page, '.tab[data-tab="prac"][aria-current="page"]'), 'practice tab opens and is marked');
  check((await ids(page, '.pcard')).join() === 'pr-due,pr-mist,pr-say,pr-dict,pr-match,pr-snd,pr-talk,pr-fix,pr-write', 'nine practice cards (four lesson lists from phase 4): ' + (await ids(page, '.pcard')).join());
  check(await has(page, '#pr-due:disabled') && await has(page, '#pr-mist:disabled') && await has(page, '#pr-match:disabled') && !(await has(page, '#pr-say:disabled')) && await has(page, '#pr-none'), 'nothing learned: review, mistakes and the race wait, with a note');
  await ctx.close();

  /* 2. mistakes: words missed since they were last right (latest miss first, then the lowest level), grammar by misses */
  const W = (i) => D.words[i].n;
  const gq = D.gc.slice(0, 3);
  const mStore = {
    'vocab3000-progress-v1': J({ w: { [W(0)]: rec(2, DAY, DAY - 5, DAY - 1), [W(1)]: rec(1, DAY, DAY - 6, DAY - 1), [W(2)]: rec(3, DAY + 3, DAY - 2, DAY - 3), [W(3)]: rec(2, DAY, DAY - 9, DAY - 4), [W(4)]: rec(1, DAY, 0, DAY - 2), [W(5)]: rec(3, DAY + 5, DAY - 1, 0) }, s: {} }),
    'vocab3000-grammar-v1': J({ v: 1, l: {}, x: { [gq[0]]: 3, [gq[1]]: 1, [gq[2]]: 5 } })
  };
  ({ ctx, page } = await open({ store: mStore }));
  await page.click('.tab[data-tab="prac"]'); await page.click('#pr-mist');
  const mw = await ids(page, '#mist-words .mrow'), mg = await ids(page, '#mist-gram .mrow');
  check(mw.join() === ['mw-' + W(1), 'mw-' + W(0), 'mw-' + W(4), 'mw-' + W(3)].join(), 'mistakes: latest miss first, lower level first on the same day: ' + mw.join());
  check(mg.join() === ['mg-' + gq[2], 'mg-' + gq[0], 'mg-' + gq[1]].join(), 'grammar mistakes by misses: ' + mg.join());
  check(await overflow(page) <= 0, 'mistakes screen overflow');
  await page.screenshot({ path: path.join(shots, 'pr-mist.png'), fullPage: true });
  await page.click('#mist-go');
  check((await viewOf(page)) === 'run' && /ฝึกข้อที่ผิดบ่อย/.test(await txt(page, '.run-title b')), 'one tap starts the mistakes round: ' + await txt(page, '.run-title b'));
  const before = await store(page, 'vocab3000-progress-v1');
  check(await playRound(page, 'mistakes round'), 'mistakes round reaches the end screen');
  check(/ฝึกข้อที่ผิดบ่อยเสร็จแล้ว/.test(await txt(page, '#app h2')) && /กลับหน้าฝึก/.test(await txt(page, '#p-back')), 'end of the mistakes round, back to the practice tab');
  const after = await store(page, 'vocab3000-progress-v1'), pr = await store(page, 'vocab3000-prac-v1');
  check([W(0), W(1), W(3), W(4)].every((n) => after.w[n][4] !== before.w[n][4]), 'answers in the round update the word records');
  check(pr && pr.r && pr.r[DAY] === 1, 'the mistakes round is counted for today ' + J(pr));
  await page.click('#p-back');
  check((await viewOf(page)) === 'prac', 'back on the practice tab');
  /* a round left in the middle goes back to the practice tab too */
  await page.click('#pr-mist'); await page.click('#mist-go'); await page.click('#quit'); await page.click('#dlg-leave');
  check((await viewOf(page)) === 'prac', 'leaving a practice round returns to the practice tab');
  await ctx.close();

  /* 3. speaking practice: five sentences, a sentence said right is marked and counted */
  const learned = {}; for (let i = 0; i < 20; i++) learned[D.words[i].n] = rec(1, DAY + 2, DAY - 1, 0);
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: learned, s: {} }) } }));
  await page.click('.tab[data-tab="prac"]'); await page.click('#pr-say');
  check((await page.$$('#pr-say-lines .line')).length === 5 && (await page.$$('#pr-say-lines .line .mic')).length === 5, 'speaking practice: five sentences, each with a mic');
  const line0 = await page.evaluate(() => document.querySelector('#prs-0 .mic').getAttribute('data-text'));
  await page.evaluate((t) => { window.__sr.say = [t]; }, line0);
  await page.click('#prs-0 .mic'); await page.click('#spk-mic'); await sleep(400);
  await page.click('#spk-close');
  check(await has(page, '#prs-0.said') && (await store(page, 'vocab3000-xp-v1')).s[DAY] === 1, 'a sentence said right is marked and counted');
  check(await overflow(page) <= 0, 'speaking practice overflow');
  await ctx.close();

  /* 4. dictation: typed with short forms and without capitals or full stops still counts; a missing word is struck through */
  const plain = D.words.filter((w) => /\b(He|She|It) is\b|\bI am\b/.test(w.x.replace(/[{}]/g, ''))).slice(0, 5);
  check(plain.length === 5, 'five example sentences with "is" or "am" to type with short forms');
  const contract = (t) => t.replace(/[{}]/g, '').replace(/\bI am\b/g, "I'm").replace(/\b(He|She|It) is\b/g, "$1's").replace(/[.!?,]/g, '').toLowerCase();
  const dw = {}; plain.forEach((w) => { dw[w.n] = rec(1, DAY + 2, DAY - 1, 0); });
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: dw, s: {} }) } }));
  await page.click('.tab[data-tab="prac"]'); await page.click('#pr-dict');
  check((await viewOf(page)) === 'dict' && await page.evaluate(() => getComputedStyle(document.getElementById('tabbar')).display === 'none'), 'dictation fills the screen');
  const xp0 = (await store(page, 'vocab3000-xp-v1') || { d: {} }).d[DAY] || 0;
  const items = [];
  for (let i = 0; i < 5; i++) {
    if (!(await has(page, '#dt-play'))) break;
    const T = await page.evaluate(() => document.getElementById('dt-play').getAttribute('data-text'));
    items.push(T);
    if (i === 1) { await page.fill('#dt-in', T.split(' ').slice(0, -1).join(' ')); await page.click('#dt-check'); check(await has(page, '#sheet.no') && (await page.$$('#dt-diff .miss')).length >= 1, 'a missing word is struck through'); }
    else if (i === 2) { await page.click('#dt-skip'); check(await has(page, '#sheet.mid') && /ไม่นับว่าผิด/.test(await txt(page, '#sheet')), 'skip: the sentence is shown, not counted as wrong'); }
    else { await page.fill('#dt-in', contract(T)); await page.click('#dt-check'); check(await has(page, '#sheet.ok') && !(await has(page, '#dt-diff .miss')), 'typed with short forms counts: ' + contract(T)); }
    if (i === 0) { check(await overflow(page) <= 0, 'dictation overflow'); await page.screenshot({ path: path.join(shots, 'pr-dict.png') }); }
    await page.click('#dt-next');
  }
  check(items.length >= 4 && items.some((t) => /\bI am\b|\b(He|She|It) is\b/.test(t)), 'the sentences had long forms to shorten: ' + items.length);
  const right = items.length - 2;
  check(/^\d+/.test(await txt(page, '#dt-result .score')) && +(await txt(page, '#dt-result .score')).match(/^\d+/)[0] === right, 'dictation summary: ' + right + ' right');
  const pr2 = await store(page, 'vocab3000-prac-v1'), xp1 = (await store(page, 'vocab3000-xp-v1')).d[DAY] || 0;
  check(pr2.d[DAY] === right && xp1 - xp0 === right, 'dictation: sentences right counted and 1 XP each ' + J(pr2) + ' xp ' + (xp1 - xp0));
  await ctx.close();

  /* 5. the match race: pairs matched, a wrong pair adds 2 seconds, a better time is kept and says so */
  const mwds = {}; const used = {}; let k = 0;
  for (const w of D.words) { const th = w.t.replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, '').trim(); if (!used[th]) { used[th] = 1; mwds[w.n] = rec(1, DAY + 2, DAY - 1, 0); if (++k >= 15) break; } }
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: mwds, s: {} }), 'vocab3000-prac-v1': J({ m: 3600000, d: {}, r: {} }) } }));
  await page.click('.tab[data-tab="prac"]'); await page.click('#pr-match');
  check((await viewOf(page)) === 'match' && (await page.$$('.mr.en')).length === 5 && (await page.$$('.mr:not(.en)')).length === 5, 'race: five words and five meanings');
  await page.screenshot({ path: path.join(shots, 'pr-match.png') });
  check(await overflow(page) <= 0, 'race overflow');
  const xpm0 = (await store(page, 'vocab3000-xp-v1') || { d: {} }).d[DAY] || 0;
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 5; i++) {
      const n = await page.evaluate((x) => document.getElementById('mr-e-' + x).getAttribute('data-n'), i);
      if (r === 0 && i === 0) {
        await page.click('#mr-e-0');
        const other = await page.evaluate((nn) => Array.from(document.querySelectorAll('.mr:not(.en)')).find((e) => e.getAttribute('data-n') !== nn).id, n);
        await page.click('#' + other);
        check(await has(page, '.mr.is-wrong'), 'a wrong pair is marked');
      }
      await page.click('#mr-e-' + i);
      const tid = await page.evaluate((nn) => Array.from(document.querySelectorAll('.mr:not(.en)')).find((e) => e.getAttribute('data-n') === nn).id, n);
      await page.click('#' + tid);
    }
    await sleep(500);
  }
  check(await has(page, '#mr-result') && /ทำลายสถิติตัวเอง/.test(await txt(page, '#app h2')) && /จับคู่ผิด 1 ครั้ง/.test(await txt(page, '#mr-result')), 'race finished: own record broken, one wrong pair: ' + await txt(page, '#app h2'));
  const pm = await store(page, 'vocab3000-prac-v1'), xpm1 = (await store(page, 'vocab3000-xp-v1')).d[DAY];
  check(pm.m > 2000 && pm.m < 3600000, 'best time kept, with the 2 seconds for the wrong pair: ' + pm.m);
  check(xpm1 - xpm0 === 14, 'race XP: one per pair matched first time (14 of 15): ' + (xpm1 - xpm0));
  await page.click('#mr-back');
  check(/สถิติของคุณ/.test(await txt(page, '#pr-match')), 'the card shows the best time');
  await page.click('#pr-match'); await page.click('#mr-e-0');
  check(await has(page, '#mr-e-0.is-sel') && /^0:0/.test(await txt(page, '#mr-time')), 'a new race starts from zero');
  await page.click('#dt-quit');
  check((await viewOf(page)) === 'prac', 'leaving the race goes back to the practice tab');
  await ctx.close();

  /* 6. rest days: 8 days in a row earn one; yesterday missed uses it and the streak goes on; not for gaps before rest days existed */
  const days = {}; for (let d = DAY - 9; d <= DAY - 2; d++) days[d] = [0, 1, 0, 0, 0, 0];
  ({ ctx, page } = await open({ store: { 'vocab3000-days-v1': J(days), 'vocab3000-streak-v1': J({ s: DAY - 30, u: {} }) } }));
  check(/^8/.test(await txt(page, '#p-streak .pstat-t')), 'a missed day covered by a rest day keeps the streak: ' + await txt(page, '#p-streak .pstat-t'));
  const sk = await store(page, 'vocab3000-streak-v1');
  check(sk.u && sk.u[DAY - 1] === 1, 'the covered day is stored ' + J(sk));
  await page.click('#open-me');
  check(await has(page, '.day.rest') && /วันพัก/.test(await page.evaluate(() => document.querySelector('.week').getAttribute('aria-label'))), 'the week strip marks the rest day');
  check(/เรียน 7 วันติดกัน|มีวันพัก/.test(await txt(page, '#me-rest')), 'the me screen explains rest days');
  await page.reload(); await page.waitForSelector('#app h1');
  check(/^8/.test(await txt(page, '#p-streak .pstat-t')), 'still 8 after a reload');
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-days-v1': J(days) } }));
  check(/^0/.test(await txt(page, '#p-streak .pstat-t')), 'a gap from before rest days existed is not covered: ' + await txt(page, '#p-streak .pstat-t'));
  await ctx.close();
  const days2 = {}; for (let d = DAY - 10; d <= DAY - 3; d++) days2[d] = [0, 1, 0, 0, 0, 0];
  ({ ctx, page } = await open({ store: { 'vocab3000-days-v1': J(days2), 'vocab3000-streak-v1': J({ s: DAY - 30, u: {} }) } }));
  check(/^0/.test(await txt(page, '#p-streak .pstat-t')) && Object.keys((await store(page, 'vocab3000-streak-v1')).u).length === 0, 'two missed days in a row end the streak, and no rest day is spent on them');
  await ctx.close();

  /* 7. welcome back after three idle days: five easy items; not after two */
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: learned, s: {} }), 'vocab3000-days-v1': J({ [DAY - 4]: [1, 0, 0, 0, 0, 0] }) } }));
  check(await has(page, '#p-wb-box') && /ยินดีต้อนรับกลับ/.test(await txt(page, '#p-wb-box')), 'welcome back after 4 idle days');
  await page.screenshot({ path: path.join(shots, 'pr-welcome.png') });
  await page.click('#p-wb');
  check((await viewOf(page)) === 'run' && /เริ่มเบาๆ 5 ข้อ/.test(await txt(page, '.run-title b')) && /5/.test(await txt(page, '.count')), 'five easy review items: ' + await txt(page, '.count'));
  await ctx.close();
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: learned, s: {} }), 'vocab3000-days-v1': J({ [DAY - 2]: [1, 0, 0, 0, 0, 0] }) } }));
  check(!(await has(page, '#p-wb-box')), 'no welcome back after two days');
  await ctx.close();

  /* 8. the pace note once on a big day */
  ({ ctx, page } = await open({ store: { 'vocab3000-xp-v1': J({ d: { [DAY]: 60 }, c: {}, p: {}, s: {}, b: 1 }) } }));
  await sleep(200);
  check(/วันนี้ทำเยอะแล้ว พักบ้างก็ได้/.test(await txt(page, '#toast') || ''), 'pace note after three times the goal');
  check((await store(page, 'vocab3000-ui-v1')).pace === DAY, 'shown once today (ui.pace)');
  await page.reload(); await page.waitForSelector('#app h1'); await sleep(200);
  check(!/วันนี้ทำเยอะแล้ว/.test(await txt(page, '#toast') || ''), 'not again the same day');
  await ctx.close();

  /* 9. badges: earned once, celebrated once, shown on the me screen */
  const known = {}; for (let i = 0; i < 50; i++) known[D.words[i].n] = rec(3, DAY + 5, DAY - 1, 0);
  ({ ctx, page } = await open({ store: { 'vocab3000-progress-v1': J({ w: known, s: {} }) } }));
  await sleep(200);
  check(/ได้เหรียญใหม่/.test(await txt(page, '#bdg-pop') || ''), 'a new badge is celebrated: ' + await txt(page, '#bdg-pop'));
  check(await page.evaluate(() => getComputedStyle(document.getElementById('bdg-pop')).pointerEvents === 'none'), 'the celebration does not block taps');
  const bg = await store(page, 'vocab3000-badges-v1');
  check(bg && bg.c && bg.c.w50 === DAY, 'the badge is stored as celebrated ' + J(bg));
  await page.click('#open-me');
  check(await has(page, '#bdg-w50.got') && !(await has(page, '#bdg-w100.got')) && /50\/100/.test(await txt(page, '#bdg-w100')), 'me: earned badge and progress towards the next');
  check((await page.$$('.badges .bdg')).length >= 20, 'about 20 badges: ' + (await page.$$('.badges .bdg')).length);
  await page.screenshot({ path: path.join(shots, 'pr-badges.png'), fullPage: true });
  await page.reload(); await page.waitForSelector('#app h1'); await sleep(300);
  check(!(await has(page, '#bdg-pop')), 'celebrated only once');
  await ctx.close();

  /* 10. settings: a daily reminder in the calendar, the backup as a file both ways */
  const full = {
    'vocab3000-progress-v1': J({ w: known, s: { '36-0': 511 } }),
    'vocab3000-prac-v1': J({ m: 41000, d: { [DAY]: 2 }, r: { [DAY]: 1 } }),
    'vocab3000-streak-v1': J({ s: DAY - 30, u: { [DAY - 7]: 1 } }),
    'vocab3000-badges-v1': J({ c: { first: DAY - 3, w50: DAY } })
  };
  ({ ctx, page } = await open({ store: full }));
  await page.click('#open-me'); await page.click('#open-prefs');
  const href = await page.evaluate(() => document.getElementById('rm-gcal').getAttribute('href'));
  check(/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(href) && /recur=RRULE%3AFREQ%3DDAILY/.test(href) && /T190000\//.test(href), 'Google Calendar link with a daily rule at 19:00');
  await page.fill('#rm-time', '07:30'); await page.dispatchEvent('#rm-time', 'change');
  check(/T073000\//.test(await page.evaluate(() => document.getElementById('rm-gcal').getAttribute('href'))) && (await store(page, 'vocab3000-ui-v1')).rt === '07:30', 'a new time updates the link and is kept');
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rm-ics')]);
  const ics = fs.readFileSync(await dl.path(), 'utf8');
  check(/BEGIN:VEVENT/.test(ics) && /RRULE:FREQ=DAILY/.test(ics) && /BEGIN:VALARM/.test(ics) && /DTSTART:\d{8}T073000/.test(ics) && /\.ics$/.test(dl.suggestedFilename()), 'the .ics file has a daily rule and an alarm');
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bk-save')]);
  const name = dl.suggestedFilename(), file = path.join(shots, 'backup-test.txt');
  fs.copyFileSync(await dl.path(), file);
  const code = fs.readFileSync(file, 'utf8').trim();
  check(/^english-backup-\d{4}-\d{2}-\d{2}\.txt$/.test(name) && /^EN1:/.test(code), 'backup saved as a dated text file: ' + name);
  const doc = JSON.parse(Buffer.from(code.slice(4), 'base64').toString('utf8'));
  check(doc.d.prac && doc.d.streak && doc.d.badges && doc.d.prac.m === 41000, 'the backup code carries the practice records, rest days and badges');
  await page.screenshot({ path: path.join(shots, 'pr-prefs.png'), fullPage: true });
  await ctx.close();
  ({ ctx, page } = await open({}));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.setInputFiles('#bk-file', file); await sleep(500);
  check(/นำความคืบหน้าจากไฟล์กลับมาแล้ว/.test(await txt(page, '#bk-note')), 'restored from the file: ' + await txt(page, '#bk-note'));
  const rp = await store(page, 'vocab3000-prac-v1'), rs = await store(page, 'vocab3000-streak-v1'), rb = await store(page, 'vocab3000-badges-v1'), rw = await store(page, 'vocab3000-progress-v1');
  check(rp.m === 41000 && rp.r[DAY] === 1 && rs.u[DAY - 7] === 1 && rb.c.first === DAY - 3 && Object.keys(rw.w).length === 50, 'the file brought back words, practice, rest days and badges');
  /* a better local time is not replaced by a slower one from a code */
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vocab3000-prac-v1')); p.m = 30000; localStorage.setItem('vocab3000-prac-v1', JSON.stringify(p)); });
  await page.reload(); await page.waitForSelector('#app h1'); await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', code); await page.click('#bk-restore');
  check((await store(page, 'vocab3000-prac-v1')).m === 30000, 'restoring keeps the better race time');
  await ctx.close();
  /* an old code without the new records still restores */
  delete doc.d.prac; delete doc.d.streak; delete doc.d.badges;
  const old = 'EN1:' + Buffer.from(JSON.stringify(doc), 'utf8').toString('base64');
  ({ ctx, page } = await open({}));
  await page.click('#open-me'); await page.click('#open-prefs');
  await page.fill('#bk-in', old); await page.click('#bk-restore');
  check(/นำความคืบหน้ากลับมาแล้ว/.test(await txt(page, '#bk-note')) && Object.keys((await store(page, 'vocab3000-progress-v1')).w).length === 50, 'an old code without the new records still restores');
  await ctx.close();

  /* 11. layout of the new screens at 390 and 320 px, light and dark */
  for (const [w, dark] of [[390, false], [390, true], [320, false], [320, true]]) {
    ({ ctx, page } = await open({ dark, viewport: { width: w, height: 720 }, store: { 'vocab3000-progress-v1': J({ w: mwds, s: {} }) } }));
    const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('#tabbar .tab:not([hidden])')).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), e.scrollWidth <= e.clientWidth + 1]; }));
    check(tabs.length === 5 && tabs.every((t) => t[0] >= 44 && t[1] >= 44 && t[2]), 'five tabs fit at ' + w + ' ' + J(tabs));
    await page.click('.tab[data-tab="prac"]');
    check(await overflow(page) <= 0, 'practice tab overflow at ' + w + (dark ? ' dark' : ''));
    check(await page.evaluate(() => Array.from(document.querySelectorAll('.pcard')).every((e) => e.getBoundingClientRect().height >= 44)), 'practice cards tall enough at ' + w);
    if (w === 320) await page.screenshot({ path: path.join(shots, 'pr-home-320' + (dark ? '-dark' : '') + '.png'), fullPage: true });
    await page.click('#pr-match');
    check(await overflow(page) <= 0 && await page.evaluate(() => Array.from(document.querySelectorAll('.mr')).every((e) => e.getBoundingClientRect().height >= 44)), 'race layout at ' + w + (dark ? ' dark' : ''));
    if (w === 320) await page.screenshot({ path: path.join(shots, 'pr-match-320' + (dark ? '-dark' : '') + '.png') });
    await page.click('#dt-quit'); await page.click('#pr-dict');
    check(await overflow(page) <= 0, 'dictation layout at ' + w + (dark ? ' dark' : ''));
    if (w === 320 && dark) await page.screenshot({ path: path.join(shots, 'pr-dict-320-dark.png') });
    await ctx.close();
  }

  await b.close(); server.close();
  check(errors.length === 0, 'console errors: ' + errors.slice(0, 5).join(' | '));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(1); });

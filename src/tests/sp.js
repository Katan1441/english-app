// End-to-end check of speaking practice (the mic buttons and the speaking panel) in headless Chromium.
// Speech recognition, the microphone and the recorder are replaced by stand-ins that say what each test needs.
// node sp.js <trainer dir> <shots dir>
const fs = require('fs'), path = require('path'), http = require('http');
const root = process.argv[2], shots = process.argv[3];
fs.mkdirSync(shots, { recursive: true });
const src = fs.readFileSync(path.join(root, 'vocab-trainer.html'), 'utf8');
fs.writeFileSync(path.join(root, 'wrapped.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#fafafa}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + src + '</body></html>');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  const size = fs.statSync(p).size, m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  const type = TYPES[path.extname(p)] || 'application/octet-stream';
  if (m && path.extname(p) === '.mp3') {
    const a = +m[1], b = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': 'bytes ' + a + '-' + b + '/' + size, 'content-length': b - a + 1 });
    fs.createReadStream(p, { start: a, end: b }).pipe(res); return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size });
  fs.createReadStream(p).pipe(res);
});

/* window.__sr = { say: [guesses], err: 'code', interim: 'text' } decides what the next recognition round reports.
   __noSR: no recognition; __noRec: no recorder; __micBusy: recognition fails with audio-capture while a recording is on. */
const MOCK = `
(function(){
  window.__sp = { starts: 0, langs: [], gum: 0, recs: 0, recStops: 0, tracksLive: 0, aborts: 0, mine: 0, tts: 0, clips: 0 };
  window.__sr = { say: null };
  if (window.__noSR) { try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; } catch(e){} window.webkitSpeechRecognition = undefined; window.SpeechRecognition = undefined; }
  else {
    function FakeSR(){ this.lang=''; this.onresult=null; this.onerror=null; this.onend=null; this._t=[]; }
    FakeSR.prototype.start = function(){
      var self=this, cfg=window.__sr || {};
      __sp.starts++; __sp.langs.push(self.lang + '/' + self.interimResults + '/' + self.continuous);
      function res(list, fin){ var r = list.map(function(t){ return { transcript: t, confidence: .9 }; }); r.isFinal = fin; return r; }
      if (cfg.interim) self._t.push(setTimeout(function(){ var rs=[res([cfg.interim], false)]; self.onresult && self.onresult({ resultIndex:0, results: rs }); }, 30));
      self._t.push(setTimeout(function(){
        if (window.__micBusy && __sp.tracksLive > 0) { self.onerror && self.onerror({ error:'audio-capture' }); self.onend && self.onend(); return; }
        if (cfg.err) { self.onerror && self.onerror({ error: cfg.err }); self.onend && self.onend(); return; }
        if (cfg.hold) return;
        if (cfg.say) { var rs=[res(cfg.say, true)]; self.onresult && self.onresult({ resultIndex:0, results: rs }); }
        else self.onerror && self.onerror({ error:'no-speech' });
        self.onend && self.onend();
      }, 120));
    };
    FakeSR.prototype.stop = function(){ var self=this; this._t.forEach(clearTimeout); var cfg=window.__sr||{};
      setTimeout(function(){ if (cfg.say) { var r = cfg.say.map(function(t){ return { transcript:t }; }); r.isFinal=true; self.onresult && self.onresult({ resultIndex:0, results:[r] }); } self.onend && self.onend(); }, 20); };
    FakeSR.prototype.abort = function(){ __sp.aborts++; this._t.forEach(clearTimeout); };
    window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
  }
  if (window.__noRec) { try { window.MediaRecorder = undefined; } catch(e){} }
  else {
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
    navigator.mediaDevices.getUserMedia = function(){
      __sp.gum++;
      if (window.__gumDeny) return Promise.reject(new Error('NotAllowedError'));
      __sp.tracksLive++;
      var live = true;
      return Promise.resolve({ getTracks: function(){ return [{ stop: function(){ if (live) { live = false; __sp.tracksLive--; } } }]; } });
    };
    window.MediaRecorder = function(s){ this.state='inactive'; this.mimeType='audio/webm'; __sp.recs++; };
    MediaRecorder.prototype.start = function(){ this.state='recording'; };
    MediaRecorder.prototype.stop = function(){ var self=this; self.state='inactive'; __sp.recStops++;
      setTimeout(function(){ self.ondataavailable && self.ondataavailable({ data: new Blob(['x'], { type:'audio/webm' }) }); self.onstop && self.onstop(); }, 10); };
  }
  if (window.speechSynthesis) window.speechSynthesis.speak = function(u){ __sp.tts++; __sp.ttsText = u.text; };
  var HP = HTMLMediaElement.prototype, pl = HP.play;
  HP.play = function(){ if (String(this.src).indexOf('blob:') === 0) { __sp.mine++; return Promise.resolve(); } return pl.apply(this, arguments); };
  var ABS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype;
  if (ABS) { var st = ABS.start; ABS.start = function(){ __sp.clips++; return st.apply(this, arguments); }; }
})();`;

const fails = [];
function check(ok, msg) { if (!ok) { fails.push(msg); console.log('FAIL', msg); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/wrapped.html';
  const pw = require('playwright');
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] }).catch(() => pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = [];
  async function open(opts) {
    const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 1, hasTouch: true });
    await ctx.addInitScript((flags) => { Object.assign(window, flags); }, opts.flags || {});
    await ctx.addInitScript(MOCK);
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
  const sp = (page) => page.evaluate(() => window.__sp);
  const say = (page, cfg) => page.evaluate((c) => { window.__sr = c; }, cfg);
  const marks = (page) => page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#spk-target span'), (s) => (s.className === 'ok' ? '+' : '-') + s.textContent));
  // learning records apart from settings and XP (saying a sentence right earns XP, nothing else)
  const progress = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => /^vocab3000-/.test(k) && k !== 'vocab3000-ui-v1' && k !== 'vocab3000-xp-v1').sort().map((k) => k + '=' + localStorage.getItem(k)).join('\n'));
  const xpNow = (page) => page.evaluate(() => { const x = JSON.parse(localStorage.getItem('vocab3000-xp-v1') || '{}'), t = String(Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000)); return { d: (x.d || {})[t] || 0, s: (x.s || {})[t] || 0 }; });
  // a mic button on the page for any text, the way the app writes them
  const micFor = (page, text, kind) => page.evaluate(([t, k]) => {
    const old = document.getElementById('test-mic'); if (old) old.remove();
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'test-mic'; btn.className = 'listen round mic';
    btn.setAttribute('data-act', 'sp-open'); btn.setAttribute('data-sk', k || 'g'); btn.setAttribute('data-sc', '-1'); btn.setAttribute('data-sn', '-1'); btn.setAttribute('data-text', t);
    document.getElementById('app').appendChild(btn);
  }, [text, kind]);

  /* 1. story lines: say a line, see it marked word by word, retry, hear the model and your own voice */
  let { ctx, page } = await open({});
  const before = await progress(page);
  await page.click('.tab[data-tab="read"]');
  await page.click('#r-resume');
  const lines = (await page.$$('.line')).length;
  check(lines === 8 && (await page.$$('.line .l-side .listen.mic')).length === lines, 'story: a mic button on every line');
  check(await overflow(page) <= 0, 'story with mic buttons overflow');
  const line1 = await page.evaluate(() => document.querySelector('#line-0 .mic').getAttribute('data-text'));
  check(line1 === 'Hello! My name is Ploy.', 'story: mic carries the line text ' + line1);
  await page.click('#line-0 .mic');
  check(await has(page, '#spk[role="dialog"]') && /ฝึกพูด/.test(await txt(page, '#spk-title')), 'panel opens');
  check((await txt(page, '#spk-target')) === line1, 'panel shows the line');
  check(/กดปุ่มไมค์/.test(await txt(page, '#spk-msg')), 'panel tells what to do');
  check(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'spk-mic', 'focus on the mic button');
  check(await page.evaluate(() => !!document.querySelector('.spk-th') && document.querySelector('.spk-th').textContent.length > 0), 'panel shows the Thai meaning');
  // the whole line heard
  await say(page, { say: ['hello my name is ploy'], interim: 'hello' });
  await page.click('#spk-mic'); await sleep(40);
  check(/หยุด/.test(await txt(page, '#spk-mic')) && /กำลังฟัง/.test(await txt(page, '#spk-msg')), 'listening: button turns into stop');
  await sleep(300);
  let st = await sp(page);
  check(st.starts === 1 && st.langs[0] === 'en-US/true/false', 'recognition started in English ' + JSON.stringify(st.langs));
  check(st.gum === 1 && st.recs === 1, 'voice recorded at the same time ' + JSON.stringify(st));
  let mk = await marks(page);
  check(mk.length > 0 && mk.every((x) => x[0] === '+'), 'every word green ' + mk.join(' '));
  check(/ครบทุกคำ/.test(await txt(page, '#spk-msg')) && await has(page, '#spk-msg.ok'), 'praise for a full match');
  check(/hello my name is ploy/.test(await txt(page, '#spk-heard')), 'shows what was heard');
  check(st.tracksLive === 0, 'microphone released after the round');
  check(!(await page.evaluate(() => document.getElementById('spk-mine').hidden)), 'own recording can be played');
  await page.click('#spk-mine'); await sleep(100);
  check((await sp(page)).mine === 1, 'own recording played');
  const clips0 = (await sp(page)).clips;
  await page.click('#spk-model'); await sleep(900);
  check((await sp(page)).clips === clips0 + 1, 'model clip played from the story file');
  // retry with a word missing: that word is marked
  check(/พูดอีกครั้ง/.test(await txt(page, '#spk-mic')), 'retry button');
  await say(page, { say: ['hello my name ploy', 'hello my aim is boy'] });
  await page.click('#spk-mic'); await sleep(350);
  mk = await marks(page);
  check(mk.join(' ') === '+Hello! +My +name -is +Ploy.', 'missed word marked red ' + mk.join(' '));
  check(/ได้ยินถูก 4 จาก 5 คำ/.test(await txt(page, '#spk-msg')), 'count of heard words');
  await page.screenshot({ path: path.join(shots, 'sp-story.png') });
  // stop before the recognizer ends on its own
  await say(page, { say: ['hello my name is ploy'], hold: true });
  await page.click('#spk-mic'); await sleep(200);
  await page.click('#spk-mic'); await sleep(200);
  check((await marks(page)).every((x) => x[0] === '+'), 'stop: what was heard so far is checked');
  // closing: Escape, the X and the shade; navigation closes it too
  await page.keyboard.press('Escape');
  check(!(await has(page, '#spk')), 'Escape closes the panel');
  check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('mic')), 'focus back on the mic button');
  await page.click('#line-1 .mic'); await page.click('#spk-close');
  check(!(await has(page, '#spk')), 'close button closes the panel');
  await page.click('#line-1 .mic'); await page.mouse.click(195, 40);
  check(!(await has(page, '#spk')), 'tap outside closes the panel');
  await say(page, { say: ['x'], hold: true });
  await page.click('#line-1 .mic'); await page.click('#spk-mic'); await sleep(100);
  await page.evaluate(() => { document.querySelector('.tab[data-tab="path"]').click(); });
  await sleep(100);
  st = await sp(page);
  check(!(await has(page, '#spk')) && st.aborts >= 1 && st.tracksLive === 0, 'leaving the page stops listening and closes the panel ' + JSON.stringify(st));
  check((await progress(page)) === before, 'speaking leaves progress untouched');
  const xp1 = await xpNow(page);
  check(xp1.s === 1 && xp1.d === 2, 'a line said right earns 2 XP once per opening of the panel, retries do not add more ' + JSON.stringify(xp1));
  await ctx.close();

  /* 2. how words are compared: contractions, numbers, punctuation, case, best of several guesses */
  ({ ctx, page } = await open({}));
  const cases = [
    ["I don't like it.", ['i do not like it'], '+I +don\'t +like +it.'],
    ["She's 20 years old.", ['she is twenty years old'], '+She\'s +20 +years +old.'],
    ['It is twenty-one.', ['it is 21'], '+It +is +twenty-one.'],
    ["We can't go at 7:30.", ['we cannot go at 7:30'], "+We +can't +go +at +7:30."],
    ['Okay, see you!', ['OK see you'], '+Okay, +see +you!'],
    ['The cat sat on the mat.', ['the cat on mat', 'the cat sat on a mat'], '+The +cat +sat +on -the +mat.'],
    ['Tom\'s bag is red.', ['toms bag is red'], "+Tom's +bag +is +red."],
    ['I go to school.', ['school to go i'], '-I -go -to +school.'],
  ];
  await page.click('.tab[data-tab="gram"]');
  for (const [text, guesses, want] of cases) {
    await micFor(page, text);
    await page.click('#test-mic');
    await say(page, { say: guesses });
    await page.click('#spk-mic'); await sleep(300);
    const got = (await marks(page)).join(' ');
    check(got === want, 'compare "' + text + '" with ' + JSON.stringify(guesses) + ': ' + got + ' (want ' + want + ')');
    await page.keyboard.press('Escape');
  }
  // one word: its own wording
  await micFor(page, 'apple', 'w');
  await page.click('#test-mic');
  check(/คำนี้/.test(await txt(page, '#spk-title')), 'one word: title says word');
  await say(page, { say: ['apple'] }); await page.click('#spk-mic'); await sleep(300);
  check(/ออกเสียงคำนี้ได้ถูกต้อง/.test(await txt(page, '#spk-msg')), 'one word: praise');
  await page.keyboard.press('Escape');

  /* 3. recognition problems are explained in Thai */
  const probs = [['no-speech', /ไม่ได้ยินเสียงพูด/], ['not-allowed', /อนุญาตให้ใช้ไมโครโฟน/], ['network', /อินเทอร์เน็ต/], ['aborted', /ไม่ได้ยินเสียงพูด/], ['weird', /ลองกดอีกครั้ง/]];
  for (const [code, re] of probs) {
    await micFor(page, 'Good morning.');
    await page.click('#test-mic');
    await say(page, { err: code });
    await page.click('#spk-mic'); await sleep(300);
    check(re.test(await txt(page, '#spk-msg')) && await has(page, '#spk-msg.no') && /พูดอีกครั้ง/.test(await txt(page, '#spk-mic')), 'error ' + code + ' explained: ' + await txt(page, '#spk-msg'));
    await page.keyboard.press('Escape');
  }
  // grammar examples: a mic on every example, model falls back to the phone voice when there is no clip
  await page.click('#g-resume');
  const exs = await page.evaluate(() => ({ ex: document.querySelectorAll('.exs .ex').length, mic: document.querySelectorAll('.exs .ex .mic').length, ok: document.querySelectorAll('.mist .mic').length, mist: document.querySelectorAll('.mist').length }));
  check(exs.ex > 0 && exs.mic === exs.ex && exs.ok === exs.mist, 'grammar: a mic on every example and every right sentence ' + JSON.stringify(exs));
  check(await overflow(page) <= 0, 'grammar lesson with mic buttons overflow');
  await micFor(page, 'A sentence with no clip.');
  await page.click('#test-mic'); await page.click('#spk-model'); await sleep(200);
  check((await sp(page)).ttsText === 'A sentence with no clip.', 'no clip: the phone voice reads the model');
  await page.keyboard.press('Escape');
  await ctx.close();

  /* 4. words: list rows, example sentences and the flash card */
  ({ ctx, page } = await open({}));
  await page.click('.tab[data-tab="vocab"]');
  await page.click('#resume');
  const wr = await page.evaluate(() => ({ rows: document.querySelectorAll('.words .word').length, wmic: document.querySelectorAll('.word .word-side .mic[data-sk="w"]').length, smic: document.querySelectorAll('.word .ex .mic[data-sk="s"]').length }));
  check(wr.rows === 10 && wr.wmic === 10 && wr.smic === 10, 'word list: a mic for each word and each example ' + JSON.stringify(wr));
  check(await overflow(page) <= 0, 'word list with mic buttons overflow');
  const sText = await page.evaluate(() => document.querySelector('.word .ex .mic').getAttribute('data-text'));
  check(!/[{}]/.test(sText) && sText.length > 3, 'example mic carries the plain sentence ' + sText);
  await page.click('.word .word-side .mic');
  await say(page, { say: [await txt(page, '#spk-target')] });
  await page.click('#spk-mic'); await sleep(300);
  check(await has(page, '#spk-msg.ok'), 'word said right');
  const c1 = (await sp(page)).clips;
  await page.click('#spk-model'); await sleep(900);
  check((await sp(page)).clips === c1 + 1, 'word model clip played');
  await page.keyboard.press('Escape');
  await page.click('.step[data-mode="card"]'); await page.waitForSelector('#card');
  check(await has(page, '#card .prompt-row .mic'), 'flash card has a mic');
  await page.click('#card .prompt-row .mic');
  // keys go to the panel, not to the practice behind it
  await page.keyboard.press('1');
  check(await has(page, '#spk') && await has(page, '#card #reveal'), 'keys do not reach the card while the panel is open');
  await page.keyboard.press('Escape');
  await page.click('#reveal');
  check(await has(page, '#card .ex .mic'), 'card example has a mic');
  await page.click('#card-yes');
  check(await has(page, '#card'), 'practice goes on after speaking');
  await ctx.close();

  /* 5. no speech recognition (for example Firefox): explained, recording still works; nothing at all: button off */
  ({ ctx, page } = await open({ flags: { __noSR: true } }));
  await page.click('.tab[data-tab="read"]'); await page.click('#r-resume');
  await page.click('#line-0 .mic');
  check(/ตรวจเสียงพูดไม่ได้/.test(await txt(page, '#spk-msg')) && /Chrome/.test(await txt(page, '#spk-msg')), 'no recognition: explained in Thai');
  check(/อัดเสียงตัวเอง/.test(await txt(page, '#spk-mic')) && !(await page.evaluate(() => document.getElementById('spk-mic').disabled)), 'no recognition: record button');
  await page.click('#spk-mic'); await sleep(100);
  check(/กำลังอัดเสียง/.test(await txt(page, '#spk-msg')), 'recording only: message');
  await page.click('#spk-mic'); await sleep(100);
  check(/อัดเสียงแล้ว/.test(await txt(page, '#spk-msg')) && !(await page.evaluate(() => document.getElementById('spk-mine').hidden)) && (await sp(page)).tracksLive === 0, 'recording only: can play it back');
  await page.keyboard.press('Escape');
  await ctx.close();
  ({ ctx, page } = await open({ flags: { __noSR: true, __noRec: true }, viewport: { width: 320, height: 640 } }));
  await page.click('.tab[data-tab="read"]'); await page.click('#r-resume');
  await page.click('#line-0 .mic');
  check(await page.evaluate(() => document.getElementById('spk-mic').disabled) && await page.evaluate(() => document.activeElement && document.activeElement.id) === 'spk-close', 'nothing to listen with: mic off, focus on close');
  check(await has(page, '#spk-model:not([disabled])'), 'nothing to listen with: model still plays');
  check(await overflow(page) <= 0, 'panel overflow at 320');
  await page.screenshot({ path: path.join(shots, 'sp-nosr-320.png') });
  await ctx.close();

  /* 6. microphone shared badly: recognition fails while recording, so it listens again alone; mic refused for recording */
  ({ ctx, page } = await open({ flags: { __micBusy: true } }));
  await micFor(page, 'Thank you.');
  await page.click('#test-mic');
  await say(page, { say: ['thank you'] });
  await page.click('#spk-mic'); await sleep(500);
  st = await sp(page);
  check(st.starts === 2 && await has(page, '#spk-msg.ok') && st.tracksLive === 0, 'busy mic: listened again without recording ' + JSON.stringify(st));
  check(await page.evaluate(() => document.getElementById('spk-mine').hidden), 'busy mic: no half recording offered');
  await page.click('#spk-mic'); await sleep(400);
  check((await sp(page)).gum === 1 && (await sp(page)).starts === 3, 'busy mic: later rounds skip the recording');
  await page.keyboard.press('Escape');
  await ctx.close();
  ({ ctx, page } = await open({ flags: { __gumDeny: true } }));
  await micFor(page, 'Thank you.');
  await page.click('#test-mic');
  await say(page, { say: ['thank you'] });
  await page.click('#spk-mic'); await sleep(400);
  check(await has(page, '#spk-msg.ok') && await page.evaluate(() => document.getElementById('spk-mine').hidden), 'recording refused: still checked, no own-voice button');
  await page.keyboard.press('Escape');
  await ctx.close();

  /* 7. dark, narrow: the panel with a result */
  ({ ctx, page } = await open({ dark: true, viewport: { width: 320, height: 640 } }));
  await page.click('.tab[data-tab="read"]'); await page.click('#r-resume');
  check(await overflow(page) <= 0, 'story overflow at 320 dark');
  await page.click('#line-2 .mic');
  const t2 = await txt(page, '#spk-target');
  await say(page, { say: [t2.split(' ').slice(1).join(' ')] });
  await page.click('#spk-mic'); await sleep(400);
  check(await overflow(page) <= 0, 'panel with result overflow at 320 dark');
  const pnl = await page.evaluate(() => { const r = document.querySelector('.spk-panel').getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: window.innerHeight, top: Math.round(r.top) }; });
  check(pnl.bottom === pnl.vh && pnl.top >= 0, 'panel sits at the bottom inside the screen ' + JSON.stringify(pnl));
  await page.screenshot({ path: path.join(shots, 'sp-dark-320.png') });
  await ctx.close();

  check(errors.length === 0, 'page errors: ' + errors.join(' | '));
  await b.close(); server.close();
  if (fails.length) { console.log('FAILED ' + fails.length); process.exit(1); }
  console.log('ALL PASSED');
})().catch((e) => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1); });

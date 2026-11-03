// Checks the stories data without a browser: every story is complete, recorded stories point at clips that exist, stories
// without clips (read by the phone's voice) have the length of their level, and at most 5% of their word tokens are outside
// the app's words and the reader glossary (names left out), using the reader's own word-form rules from the app.
// node src/tests/stories.js   (from the repository folder)
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(R, 'trainer.src.html'), 'utf8');
const D = JSON.parse(fs.readFileSync(path.join(R, 'data', 'vocab.js'), 'utf8'));
const RD = JSON.parse(fs.readFileSync(path.join(R, 'data', 'read.json'), 'utf8'));
const AU = JSON.parse(fs.readFileSync(path.join(R, 'data', 'audio-index.json'), 'utf8'));
const fails = [];
function check(ok, msg) { if (!ok) { fails.push(msg); console.log('FAIL', msg); } }
const THAI = /[฀-๿]/;
const nonEmpty = (x) => typeof x === 'string' && x.trim().length > 0;

const forms = new Function('RD', /function forms\(w\) \{[\s\S]*?\n  \}/.exec(html)[0] + '; return forms;')(RD);
const TOKRE = /([A-Za-zÀ-ÿ]+(?:'[A-Za-zÀ-ÿ]+)?)/;
const words = (t) => t.split(TOKRE).filter((x, i) => i % 2);
const head = {};
D.forEach((cd) => cd[2].split('\n').forEach((l) => { head[l.split('|')[0].toLowerCase()] = 1; }));
const kind = (tok) => {
  const low = tok.toLowerCase(), fs2 = forms(low);
  if (RD.contr[low] || fs2.some((f) => head[f])) return 'word';
  if (fs2.some((f) => RD.gl[f])) return 'glossary';
  return /^[A-ZÀ-Þ]/.test(tok) ? 'name' : 'outside';
};
const LEN = { A1: [60, 100], A2: [100, 160], B1: [160, 260], B2: [260, 400] };
const clips = String(AU.r && AU.r[0] || '').split(',').filter(Boolean).length;

const S = RD.stories, ids = {};
check(S.length >= 48, 'at least 48 stories: ' + S.length);
let nextClip = 0;
S.forEach((s, i) => {
  const at = s.id || '#' + i;
  check(s.id === 'r' + (i + 1) && !ids[s.id], at + ': ids run r1, r2, ... without gaps or repeats');
  ids[s.id] = 1;
  check(LEN[s.lv] !== undefined, at + ': level ' + s.lv);
  check(nonEmpty(s.en) && !THAI.test(s.en) && nonEmpty(s.th) && THAI.test(s.th), at + ': English and Thai titles');
  const talk = s.v === 'talk';
  check(talk ? !!(s.who.A && s.who.B && nonEmpty(s.who.A.en) && nonEmpty(s.who.A.th) && nonEmpty(s.who.B.en) && nonEmpty(s.who.B.th)) : (s.v === 'f1' || s.v === 'm1') && Object.keys(s.who).length === 0, at + ': narrator or two speakers');
  check(Array.isArray(s.l) && s.l.length >= 6, at + ': at least 6 lines');
  s.l.forEach((l, k) => {
    check(nonEmpty(l.en) && !THAI.test(l.en) && nonEmpty(l.th) && THAI.test(l.th), at + ' line ' + (k + 1) + ': English and Thai');
    check(talk ? (l.sp === 'A' || l.sp === 'B') : l.sp === '', at + ' line ' + (k + 1) + ': speaker');
  });
  check(Array.isArray(s.q) && s.q.length === 3, at + ': three questions');
  (s.q || []).forEach((q, k) => {
    check(nonEmpty(q.q) && THAI.test(q.q) && Array.isArray(q.o) && q.o.length === 3 && q.o.every(nonEmpty) && new Set(q.o).size === 3 &&
      Number.isInteger(q.a) && q.a >= 0 && q.a < 3 && nonEmpty(q.why), at + ' question ' + (k + 1) + ': question, three different options, answer, reason');
  });
  if (typeof s.a === 'number') {
    // recorded: its lines are the next clips of the story pack
    check(s.a === nextClip && s.a + s.l.length <= clips, at + ': clips ' + s.a + '-' + (s.a + s.l.length - 1) + ' follow on and exist (' + clips + ' clips)');
    nextClip = s.a + s.l.length;
  } else {
    // read by the phone's voice: added after the recorded ones, with the length of its level and the word rule
    check(i >= 30, at + ': stories without clips come after the recorded ones');
    const n = s.l.reduce((a, l) => a + l.en.split(/\s+/).filter(Boolean).length, 0), r = LEN[s.lv];
    check(r && n >= r[0] && n <= r[1], at + ': ' + n + ' words for ' + s.lv + ' (' + (r || []).join('-') + ')');
    const toks = []; s.l.forEach((l) => words(l.en).forEach((t) => toks.push(t)));
    const counted = toks.filter((t) => kind(t) !== 'name'), out = counted.filter((t) => kind(t) === 'outside');
    check(out.length <= counted.length * 0.05, at + ': ' + out.length + ' of ' + counted.length + ' words outside the app words and the glossary: ' + [...new Set(out)].join(' '));
  }
});
check(Object.keys(RD.gl).every((k) => k === k.toLowerCase() && nonEmpty(RD.gl[k]) && THAI.test(RD.gl[k])), 'glossary: lowercase keys, Thai meanings');
const knownBase = (w) => nonEmpty(w) && (head[w] || RD.gl[w] || forms(w).some((f) => head[f]));
const badForms = Object.keys(RD.irr).filter((k) => !knownBase(RD.irr[k]));
check(badForms.length === 0, 'word forms point at words the app knows or explains: ' + badForms.join(' '));
const by = {}; S.forEach((s) => { by[s.lv] = (by[s.lv] || 0) + 1; });
console.log('stories by level', JSON.stringify(by), 'recorded', S.filter((s) => typeof s.a === 'number').length, 'phone voice', S.filter((s) => typeof s.a !== 'number').length);
console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASSED');

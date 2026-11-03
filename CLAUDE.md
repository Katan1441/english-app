# English app (ฝึกภาษาอังกฤษ) — guide for Claude Code

An installable web app (PWA on GitHub Pages: https://katan1441.github.io/english-app/) for a Thai university student
who is learning English from below A1. Everything the learner sees is in Thai; English is what is being learned.

## Talking with the owner

- Katan (คิว) is a beginner in English. Reply in **short, plain Thai**. Honest assessments, no padding, no jargon.
- Before a big or hard-to-undo change, say in one or two Thai sentences what you will do. When done, say what changed
  and how to get it on the phone (push to `main` → wait 1–2 minutes → open the app while online).

## What is in the app

- **เรียน (the path)**, the landing tab (`data-tab="path"`, view `path`): one learning path built at runtime from the
  existing content (`pathBuild`), 1,632 nodes in 82 units over the levels A1–B2. Header: streak,
  today's XP against the goal (ring), quests button, and `#open-me` for the **ฉัน** screen (view `me`: streak card with the
  7-day strip, quests, progress tiles, `#open-level`, `#open-prefs`). Only the current unit and two on each side are drawn;
  other units are rows (`data-act="p-unit"`). Every circle has a short label (`.pn-l`); tapping one opens a sheet (what it
  is, minutes, what you will do; `#sheet`, `#p-start`). A "เรียนต่อ" button above the menu (`#p-go`) starts the next lesson
  in one tap; when words are due a card (`#p-due`) reviews them like a lesson (a node that is not on the path, `virt`,
  nothing stored). The header has `#p-prefs` (settings) and `#open-me`. Each drawn unit is a `section.punit#unit-N`: its
  banner (`.ubanner`, sticky while its circles scroll by) shows "ทำแล้ว x จาก y บท" and has "ไวยากรณ์" (its grammar lesson)
  and, on units ahead, "ทดสอบข้าม" (its checkpoint); a trail (`pathTrail`, an SVG drawn after layout and on resize) links
  the circles, a screentone ribbon where walked, dotted ahead. First run with no progress: three questions
  (`#ob-why-*`, `#ob-min-*`, `#ob-zero` / `#ob-check` → level check → `#p-place`), then the first node opens. Existing
  learners see a one-time note (`UI.pn`).
- **A node runs as parts** (`PRUN`, `nodeParts`): a word stage = its three steps in a row; a grammar lesson = the lesson
  text (path mode) then its 10 questions; a story = "คำใหม่ในเรื่องนี้" (`p-words`) then the story; a say-along
  (`p-say`, needs speech recognition) = 3–5 story lines said with the speaking panel; a review = due words plus missed
  grammar questions; a checkpoint = 12 questions from the unit (words, grammar, one listening item), pass at 80%.
  Inside, the title names the part and "ส่วนที่ i จาก n" (a checkpoint or a review counts as one round); the bar weighs
  reading the lesson text or new words lightly (`partW`). The close button asks in the app (`#dlg`); a combo chip
  (`#combo`) and praise show at 3, 5, 10, 15, 20 right in a row;
  `navigator.vibrate` on answers (setting "สั่นเมื่อตอบ", `UI.vib`); the end screen (`p-end`) shows XP (counts up),
  accuracy, time, best run, "เต็ม" at 100%, the next lesson's name, "เรียนบทต่อไป" / "กลับเส้นทาง"; confetti only for a
  perfect node, a passed unit or a finished level. On screen a node is a "บท" (lesson) everywhere.
- **XP and quests**: +1 per answer right the first time (anywhere; a flash card marked as known and an own sentence that
  passes count too), +10 per node finished, +5 when perfect, +15 per story,
  +20 per checkpoint passed, +2 per sentence said right (once per opening of the speaking panel). Daily XP goal
  10/20/30/50 (`UI.xg`). Three quests a day (`questsFor(day)`: the XP goal plus a pair picked from the day number);
  all three done → `DAYS[t][5] = 1` and a toast.
- **ฝึก (practice tab, phase 3)**, `data-tab="prac"`, view `prac`: five cards. `#pr-due` (due review, the same round as
  `#p-due`), `#pr-mist` → view `mist`: words answered wrong since last right (`mistWords`: latest miss first, then lowest
  level) and grammar questions by misses (`mistGram`), top 20 each, `#mist-go` runs 10 of them as a practice round (missed
  words, at most 4 grammar questions; the weakest words when nothing was missed); `#pr-say` → `pr-say`: five example
  sentences with mic buttons; `#pr-dict` → `dict`: dictation of five sentences (learned words' examples, one story line),
  checked with `spGrade` (case, punctuation and short forms do not count), `#dt-skip` "ตอนนี้ฟังไม่ได้"; `#pr-match` →
  `match`: three rounds of five English–Thai pairs against one's best time, +2 s per wrong pair. A practice round is a
  virtual review node (`pracStart`, `virt`, `from: 'prac'`, its own `parts`); its end screen and leaving it go back to the
  tab. Also phase 3: rest days (`streak()`, `STRK`), the welcome back card after 3 idle days (`#p-wb`, five easy items),
  the pace note once a day at 3x the goal (`paceCheck`, `UI.pace`), 24 badges (`BADGES`, computed; a non-blocking panel
  `#bdg-pop` when new; grid on ฉัน, `#bdg-<id>`), the calendar reminder in settings (`#rm-time`, `#rm-gcal`, `#rm-ics`,
  `UI.rt`) and the backup as a file (`#bk-save`, `#bk-load` / `#bk-file`).
- **Phase 4 lessons** (data in `src/data/sounds.json`, `talk.json`, `drills.json`, `write.json`, built into
  `window.__P4__`), each a path node placed into the existing units by `p4Place` and listed on the ฝึก tab (`#pr-snd`,
  `#pr-talk`, `#pr-fix`, `#pr-write` → view `lib`, rows `#lib-<id>`, a lesson started there returns to the tab):
  **ฝึกเสียง** `p:<s1-s14>` (view `p-snd`: how to make the sound, minimal pairs by the phone's voice `#sn-o-0/1` with
  "ตอนนี้ฟังไม่ได้" `#sn-skip`, lines to say with the speaking panel); **บทสนทนา** `d:<d1-d16>` (view `p-talk`: the
  learner plays Ploy or Ton, the other role is read by the phone, hints `#tk-hint-btn`, said or typed `#tk-in`/`#tk-check`,
  passes at 70% of the content words, `tkGrade`; `#tk-skip`); **หาที่ผิด** `e:<e1-e10>` (view `p-fix`: tap the wrong word
  `#fx-w-i`, two wrong taps show it, pick the fix `#fx-o-0` is right; "_" joins words into one tap target; misses kept in
  `LES.x` join the mistakes list); **เขียน** `w:<w1-w27>` (view `p-write`: brief, word bank, model, self-check list
  `#wr-c-i`, at least 3 sentences for `#wr-done`; Claude's check `#wr-ai` only inside claude.ai). Results in
  `vocab3000-lessons-v1`; a lesson is done once it has a record.
- **Adapting (phase 5)**: the share right of the last 5 lessons of each node type is kept (`ADAPT`, `adaptAcc`, at least 3
  lessons). At 95% or more a word lesson not done yet offers "ข้ามไปเร็วขึ้น" (`#p-fast`, on its sheet and on the end screen
  for the next one): 6 questions of that set and stage, 5 right marks the stage's step bits (`fastEnd`). Under 70% the end
  screen offers "ทบทวนก่อนไปต่อ" (`#p-easy`) and word lessons put the choice steps before typing (`CHOICE`). A word at
  memory level 5 answered right comes back after twice the days since it was last right, 15 to 180 (`mark`); ฉัน counts
  "จำได้นาน (เกิน 30 วัน)" (`#me-long`). ฉัน also shows a CEFR level per skill (`skillLevels`, `#me-skills`, `.sk-lv`: a level
  counts at 60% of that skill's lessons in it, the levels before the start level count) with a "เป้าหมาย B2" bar (`#me-b2`),
  and the exit tests (`#exit-A1` … `#exit-B2`): 30 items of the level (words, listening, grammar choices, a story with its
  questions, 3 lines to say when the phone can listen; a line it could not hear is left out), run as a lesson outside the
  path (`exitStart`, `from: 'me'`), 75% passes; the best result is kept; view `cert` shows the certificate, `#cert-save`
  saves it as a PNG drawn on a canvas. Path lessons (not reviews, practice rounds or say-alongs) add to `ADAPT` in `pathEnd`
  after their own record is kept.
- **คำศัพท์**: 3,750 words in 62 topics (group A basics first, then 36 topics from the Oxford 3000 PDF, group C, and group
  W: 150 work and technology words in topics 55–61 added in phase 4, read by the phone's voice, "เสียงจากเครื่อง"),
  sets of 10, nine practice steps per set, spaced review, search, Thai readings with the stressed syllable marked.
- **ไวยากรณ์**: 64 lessons (A1 18, A2 18, B1 16, B2 12), each with explanation, patterns, examples with sound,
  common Thai mistakes and 10 questions (pass = 8).
- **อ่าน-ฟัง**: 48 graded stories/dialogues (A1 12, A2 12, B1 12, B2 12), play-all with line highlight, tap any word for
  its meaning (dictionary + word forms + glossary), 3 questions each. r1–r30 have a recorded clip per line (`s.a` = first
  clip in the `rd1` pack); r31–r48 (added in phase 4) have no `a` and are read by the phone's voice, marked "เสียงจากเครื่อง"
  (`rRec`, `rC`, `rK`, `rCan`: clip file -1 makes `Snd.playRef` use `Snd.native`). The cast: Ploy (Chiang Mai, marketing),
  Ton (Khon Kaen, engineering, car-parts factory, boss Khun Nok), Anna (exchange student from England), Khun Mint (Ploy's
  mentor); the later stories follow them from the internship to first jobs and Ploy's scholarship.
- Answer panel slides up from the bottom after each answer; short answer sounds (oscillators) and confetti;
  settings (auto voice, answer sounds, vibration, text size, XP goal), backup code, offline sound download. The listening
  question has "ตอนนี้ฟังไม่ได้" (`#no-listen`): the rest of that round shows the word, not scored, not wrong.
- **ฝึกพูด (speaking)**: an inked mic button (`micBtn`, `data-act="sp-open"`) next to every word, example sentence,
  flash card, grammar example and story line opens the speaking panel (`Spk`, `#spk`). Speech recognition
  (`SpeechRecognition`/`webkitSpeechRecognition`, `en-US`) hears the learner; `spGrade` marks each word green or red
  (contractions, numbers and hyphens are normalised; best of up to 5 guesses). The voice is recorded at the same time
  (MediaRecorder) for "ฟังเสียงตัวเอง"; if the phone cannot share the mic, it listens again without recording.
  No recognition → explained in Thai, recording only. A sentence said right (80% of its words heard, all of a short one)
  earns 2 XP and counts in `XP.s` for the day; nothing else is saved and the days record is not touched.

## Files

- `src/trainer.src.html` — the whole app in one file: CSS, markup slots and JavaScript (≈4,200 lines).
- `src/data/vocab.js` (topics and words), `src/data/gram.json` (grammar), `src/data/read.json` (stories and word tables),
  `src/data/sounds.json`, `talk.json`, `drills.json`, `write.json` (phase 4 lessons),
  `src/data/audio-index.json` (frame counts of every clip in every sound file, file names).
- `src/build.py` → writes `index.html` (page + data + app head) and `sw.js` (from `src/sw.template.js` with a new version).
- `audio/*.mp3` — sound packs: `wNN` words and `sNN` example sentences per topic (`r2` = re-recorded), `ga1…gb2` grammar,
  `rd1` stories. `icons/`, `manifest.webmanifest`, `.nojekyll`.
- `src/content/` — source text of the grammar lessons and stories (reference; the JSON in `src/data` is what the app uses).
- `src/tests/` — end-to-end tests (Playwright + Chromium), see below.

**After any change in `src/`: run `python3 src/build.py` and commit `index.html` and `sw.js` with it.**
GitHub Pages serves the repository root from `main`; a push redeploys in 1–2 minutes.

## Tests (run all before pushing; each must end with `ALL PASSED`)

```
python3 src/build.py
python3 src/build.py --plain /tmp/app/vocab-trainer.html && cp -r audio /tmp/app/audio
node src/tests/t2.js /tmp/app /tmp/app/shots     # vocabulary: 9 steps, review, sound fallbacks, saving
node src/tests/gt2.js /tmp/app /tmp/app/gshots   # grammar: all 64 lessons
node src/tests/t3.js /tmp/app /tmp/app/shots3    # path tab and me screen, answer panel, settings, reading, level check, backup
node src/tests/sp.js /tmp/app /tmp/app/spshots   # speaking: mic buttons, word marking, errors, recording, layout
node src/tests/t4.js /tmp/app /tmp/app/pshots    # path: first run, nodes, XP, combo, quests, checkpoints, backup, layout
node src/tests/t5.js /tmp/app /tmp/app/p3shots   # practice tab, mistakes, dictation, match race, rest days, badges, reminder, backup file
node src/tests/t6.js /tmp/app /tmp/app/p4shots   # phase 4 data, sounds, dialogues, drills, writing, work words, placement, backup
node src/tests/t7.js /tmp/app /tmp/app/p5shots   # phase 5: intervals, test-out, choice first, skill levels, exit test, certificate
node src/tests/pwatest.js .                      # app from a sub-path, service worker, all sound offline
node src/tests/stories.js                        # stories data: complete, clips exist, length per level, 5% word rule
```

Chromium is expected at `/opt/pw-browsers/chromium`, or set `CHROMIUM` to a browser path (on Windows also pass
`C:\...` folders to the tests, not `/c/...`); `NODE_PATH` must reach `playwright`. Run the suites one after another,
not in parallel: some checks wait a fixed time and fail on a busy machine. Tests click by ids and
`data-act` values — keep them, or update the tests in the same change. Check the layout at 390 px and 320 px wide,
in light and dark: no horizontal scroll (the tests check this too).

## Rules that protect the learner's progress

- Progress lives only in this browser's localStorage. **Never rename these keys or change their record formats**:
  `vocab3000-progress-v1` (`{w: {n: [level 0-5, due day, last right day, last wrong day, time]}, s: {"topic-set": step bits}}`),
  `vocab3000-ui-v1`, `vocab3000-grammar-v1` (`{l: {lessonId: [best, total, time]}, x: {questionId: misses}}`),
  `vocab3000-days-v1` (`{day: [review, vocab steps, grammar, stories, level checks, perfect]}`; "perfect" now means all
  three quests done), `vocab3000-read-v1` (`{storyId: [best, total, time]}`), `vocab3000-level-v1` (list of results),
  `vocab3000-xp-v1` (`{d: {day: XP}, c: {day: best run}, p: {day: perfect path nodes}, s: {day: sentences said right},
  b: 1}`; `b` marks the one-time estimate of past days from the days record),
  `vocab3000-path-v1` (`{k: {unitNo: [best, total, time]}, x: {reviewNo: day}, t: {storyId: [said, lines, time]}, s: start
  level index}`), `vocab3000-prac-v1` (`{m: best match-race ms, d: {day: dictation sentences right}, r: {day: mistakes
  rounds}}`), `vocab3000-streak-v1` (`{s: first day rest days applied, u: {day: 1} days covered by a rest day}`),
  `vocab3000-badges-v1` (`{c: {badgeId: day celebrated}}`), `vocab3000-lessons-v1` (`{p|d|e|w: {id: [best, total, time]},
  x: {drillItemId: misses}}`), `vocab3000-adapt-v1` (`{h: {nodeType: [[right, asked], … the last 5]}}`), `vocab3000-exit-v1`
  (`{A1: [right, asked, time in s, then right and asked for words, grammar, listening, reading, speaking]}`). Days are
  `Math.floor((local ms) / 86400000)`. The word record keeps its format; only the next due day of a level-5 word changed.
- **Path node ids are stable**: `v:<topic>.<set>.<stage>`, `g:<lessonId>`, `r:<storyId>`, `t:<storyId>`, `x:<n>`,
  `k:<unitNo>`, `p:<soundId>`, `d:<dialogueId>`, `e:<drillId>`, `w:<writingId>`. Done comes from existing records (step bits, `gPassed`, `rDone`) plus the path key; never write fake
  progress to mark a node done. Changing `pathBuild` changes unit numbers and review numbers that the path key stores, so
  add new kinds of nodes inside the existing units (phase 4) rather than re-cutting them, and topics 56+ go into B1.
  Stories after the first 30 (`PRBASE`) are slotted into the existing units this way (flag `ex`); added content behind the
  learner never becomes the current node. A new story goes at the end of `read.json` without `a`; words outside the app's
  list get a glossary entry (`gl`), irregular forms an `irr` entry; `src/tests/stories.js` checks length and the 5% rule.
  Phase 4 lessons and the work words (topics 55+, sets spread over B1) are slotted in the same way by `p4Place`, all `ex`.
- Word numbers `n`, topic indexes and step bits are fixed: topics 37-55 were appended after the first 36, and the display
  order (`ORD`) differs from the data order. Add new words or topics only at the end.
- The backup code (`EN1:` + base64 JSON of the documents `cNN`, `gram`, `days`, `read`, `level`, `xp`, `path`, `prac`,
  `streak`, `badges`, `lessons`, `adapt`, `exit`) must keep working, also for old codes without the later ones; restoring merges and never lowers
  progress (`Sync.merge`, `EXTRA`; the race keeps the shorter time). The same code can be saved and opened as a file.
- `Sync` (account saving) and `AI` (sentence check by Claude) only exist inside claude.ai; on GitHub Pages they stay off
  and the app saves locally and offers the self-check. Keep both paths working.

## Sound

- Clips were made with Piper and Kokoro voices and checked with Whisper; the voice models are **not** in this repository.
- Every pack is MP3, 24 kHz mono 32 kbps, no ID3/Xing, every frame exactly 96 bytes, so clip k of a file starts at
  `sum(frames before k) * 96` bytes (`AU.fb`), lasting `frames * 0.024` s (`AU.fd`). The page asks for byte ranges.
- If a pack changes, give it a new file name (like `w04r2`) and update `src/data/audio-index.json` (`f` lists names),
  so caches never serve the old one. The service worker keeps sound files whole in cache `audio-v1`.
- New text with no recorded clip: use the phone's own voice (`Snd.native(text)`; Chrome on Android has one) rather
  than inventing clip numbers.

## Design

Black-and-white manga (the owner's choice, 3 Nov 2026; rules and three mockups in `design/manga/`). Every new screen
uses this look.

- **Colour** only through the tokens at the top of the CSS (light block, then two dark blocks): `--paper`, `--ink`,
  `--ink-soft` and `--ink-mute` (grey text, at least 4.5:1), `--tone-1` to `--tone-3` (greys), `--shade`, and the
  patterns `--dots` (screentone), `--hatch` and `--hatch-up`. Dark mode is white ink on black paper, same patterns.
- **Ink**: outlines of about 3 px, hard offset shadows (`5px 5px 0` ink), no soft shadows. `.btn` is ink with a grey
  pressed edge, `.btn.ghost` is paper with an ink edge.
- **Tones** mark emphasis and never sit behind text: the current circle's halo, the unit banner's corner, the checkpoint
  ring, progress fills, the walked trail, the hatched strip on top of `.today` (the one loud panel per screen; on the
  path the loud thing is the current circle with its "เริ่ม" bubble).
- **Right and wrong** never rely on grey alone: a drawn ○ (`MK_O`; `MARK_OK` rings the right choice), ✕ (`MK_X`,
  `MARK_NO`, with a dashed edge and struck-through text on the wrong pick) and △ (`MK_TRI`, nearly right). Speaking marks
  heard words bold and underlined, missed words struck through; its result line gets the same marks.
- **Bubbles** (`.bubble`, Mali, with a tail): what the cast says in the answer panel (`sayHtml`, keeps `#praise`), the
  "เริ่ม" bubble, toasts, the end screen's note, and dialogue lines (`.line.sp-a` / `.sp-b`); narration is a square box.
- **The cast**: original ink faces in `FACE` (Ploy, Ton, Anna, Khun Mint, and `other` for anyone else), drawn with the
  classes `fo` / `fi` / `fl` / `fp` so they follow the tokens; `storyCast` picks a story's people (Ploy narrates the
  `f1` stories, Ton the `m1` ones), `castNow` the one who talks in the answer panel. Keep them simple and original.
- **Celebration**: speed lines and an impact burst (`celebrate()` → `.speedfx`, `BURST`; the end screen's `.pend-fx`),
  nothing with reduced motion.
- **Type**: Kanit 700–900 for headings, numbers and sound words, Mali in bubbles, Anuphan for Thai text, Lexend for
  English. Thai copy: short, plain, no emoji.

## Ideas the owner and Claude discussed, in order (the full plan is `ROADMAP.md`)

1. **ฝึกพูด (speaking)** — done (see "What is in the app"); sentences said right are counted in `XP.s` (phase 2).
   The original note: the biggest gap left. Now that the app runs outside claude.ai, Chrome on Android offers
   speech recognition (`webkitSpeechRecognition`, `lang: 'en-US'`) and the microphone. Add a mic button to story lines,
   grammar examples and word cards: the learner says the sentence, show what was heard word by word (right words green,
   missed ones marked), let them retry, and play their own recording next to the model clip. Optional, never blocks
   progress, explain in Thai when the browser has no recognition. Log a speaking round in today's activity if it helps.
2. A list of the learner's most-missed words and grammar questions, with a one-tap review of just those — done in
   phase 3 (the ฝึก tab).
3. More stories (B1/B2) — done in phase 4 (r31–r48, phone voice).
4. Save the backup code to a file and load it from a file (downloads work in the installed app) — done in phase 3.

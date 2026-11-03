# English app (ฝึกภาษาอังกฤษ) — guide for Claude Code

An installable web app (PWA on GitHub Pages: https://katan1441.github.io/english-app/) for a Thai university student
who is learning English from below A1. Everything the learner sees is in Thai; English is what is being learned.

## Talking with the owner

- Katan (คิว) is a beginner in English. Reply in **short, plain Thai**. Honest assessments, no padding, no jargon.
- Before a big or hard-to-undo change, say in one or two Thai sentences what you will do. When done, say what changed
  and how to get it on the phone (push to `main` → wait 1–2 minutes → open the app while online).

## What is in the app

- **วันนี้ (Today)**, the landing tab: daily checklist (review due words, new-word steps up to a daily goal, one grammar
  round, one story), streak and 7-day strip, progress tiles, level check, settings.
- **คำศัพท์**: 3,600 words in 55 topics (group A basics first, then 36 topics from the Oxford 3000 PDF, group C last),
  sets of 10, nine practice steps per set, spaced review, search, Thai readings with the stressed syllable marked.
- **ไวยากรณ์**: 64 lessons (A1 18, A2 18, B1 16, B2 12), each with explanation, patterns, examples with sound,
  common Thai mistakes and 10 questions (pass = 8).
- **อ่าน-ฟัง**: 30 graded stories/dialogues (A1 12, A2 12, B1 6) with a clip per line, play-all with line highlight,
  tap any word for its meaning (dictionary + word forms + glossary), 3 questions each.
- Answer panel slides up from the bottom after each answer; short answer sounds (oscillators) and confetti;
  settings (auto voice, answer sounds, text size, daily goal), backup code, offline sound download.

## Files

- `src/trainer.src.html` — the whole app in one file: CSS, markup slots and JavaScript (≈3,000 lines).
- `src/data/vocab.js` (topics and words), `src/data/gram.json` (grammar), `src/data/read.json` (stories and word tables),
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
node src/tests/t3.js /tmp/app /tmp/app/shots3    # today, answer panel, settings, reading, level check, backup code
node src/tests/pwatest.js .                      # app from a sub-path, service worker, all sound offline
```

Chromium is expected at `/opt/pw-browsers/chromium`; `NODE_PATH` must reach `playwright`. Tests click by ids and
`data-act` values — keep them, or update the tests in the same change. Check the layout at 390 px and 320 px wide,
in light and dark: no horizontal scroll (the tests check this too).

## Rules that protect the learner's progress

- Progress lives only in this browser's localStorage. **Never rename these keys or change their record formats**:
  `vocab3000-progress-v1` (`{w: {n: [level 0-5, due day, last right day, last wrong day, time]}, s: {"topic-set": step bits}}`),
  `vocab3000-ui-v1`, `vocab3000-grammar-v1` (`{l: {lessonId: [best, total, time]}, x: {questionId: misses}}`),
  `vocab3000-days-v1` (`{day: [review, vocab steps, grammar, stories, level checks, perfect]}`),
  `vocab3000-read-v1` (`{storyId: [best, total, time]}`), `vocab3000-level-v1` (list of results).
  Days are `Math.floor((local ms) / 86400000)`.
- Word numbers `n`, topic indexes and step bits are fixed: topics 37-55 were appended after the first 36, and the display
  order (`ORD`) differs from the data order. Add new words or topics only at the end.
- The backup code (`EN1:` + base64 JSON of the documents `cNN`, `gram`, `days`, `read`, `level`) must keep working;
  restoring merges and never lowers progress (`Sync.merge`).
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

Teal primary (`--primary`), one loud mango card per screen (`.today`), chunky buttons with a pressed edge, Mitr for
headings, Anuphan for Thai text, Lexend for English. Colours only through the tokens at the top of the CSS (light block,
then two dark blocks). Thai copy: short, plain, no emoji.

## Ideas the owner and Claude discussed, in order

1. **ฝึกพูด (speaking)** — the biggest gap left. Now that the app runs outside claude.ai, Chrome on Android offers
   speech recognition (`webkitSpeechRecognition`, `lang: 'en-US'`) and the microphone. Add a mic button to story lines,
   grammar examples and word cards: the learner says the sentence, show what was heard word by word (right words green,
   missed ones marked), let them retry, and play their own recording next to the model clip. Optional, never blocks
   progress, explain in Thai when the browser has no recognition. Log a speaking round in today's activity if it helps.
2. A list of the learner's most-missed words and grammar questions, with a one-tap review of just those.
3. More stories (B1/B2). Without the voice models, mark them as using the phone's voice.
4. Save the backup code to a file and load it from a file (downloads work in the installed app).

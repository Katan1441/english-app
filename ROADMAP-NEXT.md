# ROADMAP-NEXT: from a good app to the best one (phases 7–11)

## สรุปสำหรับคิว

แผนนี้ต่อจาก ROADMAP.md (ขั้น 1–6) ให้ทำหลังขั้น 5 เสร็จ ทีละขั้นตามลำดับ

- **ขั้น 7 จำได้มากขึ้นแต่ทบทวนน้อยลง**: เปลี่ยนวิธีนัดทบทวนคำเป็น FSRS แบบเดียวกับ Anki เพิ่มวลีที่ใช้บ่อย 500 วลี และสมุดคำของฉัน (กดเก็บคำหรือประโยคจากที่ไหนก็ได้)
- **ขั้น 8 ครู AI ในแอป**: คุยภาษาอังกฤษด้วยเสียงกับ AI ตามระดับของเรา เล่นบทบาทสมมติ ตรวจงานเขียน อธิบายเป็นภาษาไทย ใช้ key ฟรีของ Gemini ที่เก็บไว้ในเครื่องคุณเท่านั้น
- **ขั้น 9 สร้างนิสัย** (เสร็จแล้ว ยกเว้นทางลัด "ครู AI" ที่รอขั้น 8): แจ้งเตือนวันละครั้งถ้ายังไม่ได้เรียน ตั้งเวลาเรียนประจำแบบ "ถ้า...แล้วจะ..." ทางลัดจากไอคอนแอป และรายงานรายสัปดาห์
- **ขั้น 10 ฟังและพูดเหมือนของจริง**: พูดตามแบบ shadowing ปรับความเร็วเสียง ฝึกพูดคล่องแบบ 4/3/2 และโหมดฟังตอนเดินทาง (ปิดจอได้)
- **ขั้น 11 ต่อยอดคำศัพท์และการอ่าน**: เรียนหน้าคำ-ท้ายคำ (un-, re-, -tion...) และจับเวลาอ่าน

วิธีสั่ง (หลังงานเดิมเสร็จ): สร้างงาน Cloud เลือก english-app แล้วพิมพ์ `อ่าน ROADMAP-NEXT.md แล้วทำขั้นที่ 7 ถึง 11 ต่อกันตามลำดับ`

---

## For Claude Code

- Read `CLAUDE.md`, `ROADMAP.md` and `design/manga/README.md` first. Phases 1–6 and their **Definition of done** in
  `ROADMAP.md` apply here unchanged: storage keys and formats untouched, new data in new keys with an `EXTRA` entry and a
  backup round-trip test, nothing blocks the learner, offline first, Thai copy, the manga look, every test `ALL PASSED`,
  build, merge into `main`, push, report in short Thai.
- Do the phases in order. Update the **Status** table below and the feature list in `CLAUDE.md` in the same push.
- New kinds of path nodes go inside the existing units (the `ROADMAP.md` rule), never re-cutting the units.

## Status

| Phase | Content | Status |
| :- | :- | :- |
| 7 | FSRS review scheduling, 500 everyday phrases, my phrasebook | todo |
| 8 | AI tutor with the learner's own Gemini key (voice chat, role-play, writing feedback) | todo |
| 9 | Habit engine: daily notification, study-time plan, app shortcuts, weekly report | done (4 Nov 2026), see "As built" under Phase 9; the ครู AI shortcut waits for phase 8 |
| 10 | Shadowing with speed control, 4/3/2 fluency rounds, commute listening mode | todo |
| 11 | Word building (affixes), timed reading | todo |

## Why these, in one table

| Finding | What it gives this app |
| :- | :- |
| FSRS keeps a per-card memory state (difficulty, stability, retrievability) and needs fewer reviews than Anki's old SM-2 algorithm for the same retention; the learner picks a desired retention ([Anki manual](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm.md)). | Phase 7: less review time per day, so more time for new material, and better long-term memory. |
| Dialogue-based CALL systems had a medium overall effect on L2 proficiency (d = 0.58, 17 studies), with effects on vocabulary, morphosyntax and accuracy, also for lower-proficiency learners ([Bibauw et al., LLT](https://www.lltjournal.org/item-detail/1035)). | Phase 8: a conversation partner is the biggest missing piece: speaking with someone who answers. |
| The Gemini API has a free tier for Flash-class models; on the free tier, content is used to improve Google's products ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). | Phase 8 can be free for the learner, with a clear privacy note in Thai. |
| Implementation intentions ("if situation X, then I will do Y") had a medium-to-large effect on goal attainment (d = .65, 94 tests) ([Gollwitzer & Sheeran, 2006](https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f)). | Phase 9: ask when and after what the learner will study, and show that plan. |
| Periodic Background Sync works only in an installed app, on Chrome, and only when the site has engagement; the browser decides when it fires ([Chrome](https://developer.chrome.com/docs/capabilities/periodic-background-sync?hl=es)). | Phase 9: a daily reminder without a server, as best effort, with the calendar reminder as the reliable fallback. |
| Shadowing over two months improved listening comprehension; learners also reported gains in pronunciation and intonation, and found repetition tedious ([LEARN journal](https://so04.tci-thaijo.org/index.php/LEARN/article/view/282291)). | Phase 10: shadowing in short rounds with speed control and variety. |
| The 4/3/2 technique (the same talk repeated with less time) improved speaking fluency in a small study (d = 0.91, no control group) ([JER](https://jer.or.id/index.php/jer/article/view/3785)). | Phase 10: fluency rounds; treat the evidence as promising, not proven. |
| Lists of frequent multiword expressions were built to complement single-word lists in teaching ([Martinez, 2011](https://core.ac.uk/download/33565885.pdf)). | Phase 7: everyday phrases learned as whole chunks. |

---

## Phase 7: remember more, review less

- **7.1 FSRS scheduling.** Replace the fixed intervals (`IV`) with FSRS (the open FSRS algorithm with its default
  parameters, written into the page, no bundler). Store each word's memory state in a new key `vocab3000-fsrs-v1`
  (`{n: [stability, difficulty, last review day, reps, lapses]}`) with an `EXTRA` entry whose merge keeps the record with
  the later review day. Keep writing `vocab3000-progress-v1` exactly as now (level 0–5 by stability bands, due day, last
  right and wrong days), so old readers, `Sync.merge` and old backup codes keep working. Seed the state once from the
  current level and due day. Map answers to FSRS grades: wrong = Again, right after a hint or slowly = Hard, right =
  Good, right fast in a typing step = Easy. Setting "ความแม่นที่ต้องการ" 85% / 90% (default) / 95%. This replaces the
  simple rule in `ROADMAP.md` 5.2; mark 5.2 as superseded there if it was not built.
- **7.2 500 everyday phrases "วลีที่ใช้บ่อย".** Write an original list of about 500 high-frequency multiword expressions
  for A1–B1 (do not copy a published list): greetings and replies, requests and offers, time and place, opinions and
  feelings, linking words, common phrasal verbs. Each has Thai meaning, a short example, a Thai example and a level.
  New file `src/data/phrases.json` (build marker); phone voice; new path node type `c:` (one per few units, inside the
  existing units), reviewed by FSRS like words (their own ids, never colliding with word numbers).
- **7.3 My phrasebook "สมุดของฉัน".** A save button on every word, example, story line and (phase 8) AI chat line.
  Saved items get their own review session and are searchable. New key `vocab3000-book-v1` with an `EXTRA` entry.
- **Tests**: FSRS against reference values for a few sequences; seeding from old records; the old record still updated;
  backup round trip with `fsrs` and `book`; phrases data valid; a phrase node completes end to end.

## Phase 8: AI tutor "ครู AI" (optional, the learner's own key)

- **8.1 Setup.** Settings section "ครู AI": a step-by-step Thai guide to get a free key in Google AI Studio, a field to
  paste it, "ทดสอบ", "ลบ key". The key stays only in this device's storage: never in the repository, never in the backup
  code, never in a URL. A short Thai note: free use has limits, Google may use the chats to improve its products, so do
  not share personal information (Google's terms for unpaid use say human reviewers may read the chats, and that the API
  is for people 18 or older). Tell the learner to restrict the key to the Gemini API in AI Studio and never to turn on
  billing, so only the free tier can be used. Google advises a backend proxy for keys in web apps; this app has no
  server, so say plainly that the key is safe only on the learner's own device. A model field defaults to a current
  free Flash model and can be changed when models change.
- **8.2 Conversation.** Voice or text. The tutor speaks at the learner's level (from the skill levels or the path
  section): short replies, words the learner knows plus a few new ones, one question back each turn. After each learner
  turn: at most two corrections, shown as the learner's sentence and the better one, with a one-line Thai reason. Tap
  any AI line to see Thai, save it (7.3) or hear it again (phone voice). Starter topics from the current unit.
- **8.3 Role-play.** The phase-4 scenarios, played freely with the AI as the other person, with a goal for each
  (order a drink, ask the way, explain a machine problem) and a short Thai summary at the end: what went well, two
  things to fix.
- **8.4 Writing feedback.** The phase-4 writing tasks can be checked by the tutor: corrected text, the changes marked,
  Thai explanations, and a score against the task's checklist.
- **8.5 Ask anything.** A "ถามครู" button on grammar lessons and word cards: ask in Thai, get a short Thai answer with
  examples.
- **Rules.** Offline or no key: the tutor tab explains in Thai and the rest of the app works as before. Rate limit or
  error: a calm Thai message, never a lost conversation. The system prompt keeps the tutor on language learning,
  friendly and age-appropriate. Inside claude.ai, use the existing `AI` path instead of a key. Corrections the learner
  got wrong twice join the mistakes list. XP: +2 per learner turn of five or more words; a daily quest can ask for five
  turns.
- **Shortcut.** Add "ครู AI" to the app shortcuts in `manifest.webmanifest` (phase 9.3 left it out until the tutor exists),
  for example `./#go=tutor` handled by `goHash`, with a 96 and a 192 px icon like `icons/sc-*`.
- **Tests**: the API stubbed (no real calls); no request without a key; the key absent from the page source, backup code
  and storage of other keys; offline message; corrections rendered; role-play summary; quota error handled.

## Phase 9: habit engine

- **9.1 Study plan.** In first run and settings: pick a time and an anchor ("หลังกินข้าวเช้า", "ระหว่างเดินทาง", "ก่อน
  นอน", or own words). Show the plan as one line on the path header: "หลังกินข้าวเช้า ฉันจะเรียน 10 นาที".
- **9.2 Daily notification.** With permission (asked with a Thai explanation, never on first open), register Periodic
  Background Sync (installed app, Chrome) and, when it fires near the planned time and the learner has not studied
  today, show one notification from the service worker ("วันนี้ยังไม่ได้เรียน 5 นาทีก็พอ"). Quiet hours 22:00–07:00.
  Explain that the phone decides the exact time, and keep the calendar reminder (phase 3) as the sure way.
- **9.3 App shortcuts** in `manifest.webmanifest`: เรียนต่อ, ทบทวนคำ, ฝึกพูด, ครู AI (long-press the app icon).
- **9.4 Weekly report** every Monday (and on demand in "ฉัน"): days studied, XP, words learned and words now remembered
  long-term, accuracy, sentences said right, compared with last week, plus one concrete suggestion.
- **Tests**: plan saved and shown; notification logic (studied today → none; quiet hours → none) with the APIs stubbed;
  manifest shortcuts valid; weekly numbers on seeded data.

### As built (4 Nov 2026)

- **9.1.** The first run has a fourth step "เรียนตอนไหนดี" (step 3): หลังกินข้าวเช้า (07:30), ระหว่างเดินทาง (08:00),
  ก่อนนอน (21:00) or own words, and a time; "ต่อไป" with nothing picked sets no plan. Settings has the same choices in one
  section with the time, the notification and the calendar reminder; the plan's time and the calendar's time are one
  value. The plan shows as one line under the path header; the minutes come from the daily XP goal (10 XP = 5 minutes).
  The plan is in the new key `vocab3000-habit-v1` with an `EXTRA` entry, so it travels in the backup code (the newer plan
  wins when merging).
- **9.2.** "เปิดการแจ้งเตือน" in settings asks for permission (with a Thai explanation; never on first open) and registers
  Periodic Background Sync `daily-nudge`. The service worker cannot read localStorage, so the page keeps `{on, time, last
  day practised}` in the cache `habit-v1`, updated as soon as something is practised. When woken, the worker shows one
  notification a day only after the planned time, never 22:00–07:00 (a plan time inside those hours counts as 21:00 or
  07:00), and not when something was practised today or the app is on screen; tapping it opens the next lesson. Without
  background sync (not installed, or not Chrome) the setting says so and points to the calendar reminder.
- **9.3.** Three shortcuts: เรียนต่อ, ทบทวนคำ, ฝึกพูด (`./#go=next|review|say`, 96 and 192 px icons in the manga style). The
  page follows the address on start and on `hashchange`, never breaking off a running lesson; ทบทวนคำ with nothing due
  opens the practice tab with a note. **ครู AI** is left for phase 8, which builds the tutor.
- **9.4.** A card on the path in a new week when last week had practice ("ดู" opens the report, ✕ closes it for the
  week) and "รายงาน" on ฉัน. Rows: days studied, XP, words learned, words kept long (next review over 30 days away),
  accuracy of first answers, sentences said right, each against the week before. Words learned and accuracy are new counts
  (from the first day of this version), so the first weeks say they started counting and show no comparison for those two.
  The suggestion is the first that applies: study more days (or set a plan), practise the most-missed questions under
  70%, review over 30 due words, try speaking, raise the goal, or keep going; each has a button.
- **Tests**: `src/tests/t8.js` (the service worker's reminder runs in Node with its APIs stubbed).

## Phase 10: listen and speak like real life

- **10.1 Shadowing "พูดตามทันที".** In stories, dialogues and grammar examples: play a line, the learner repeats right
  after it, then a "พูดพร้อมกัน" round. Speed 0.75 / 1 / 1.25 (recorded clips with pitch kept; phone voice by rate).
  Recognition marks the words; the learner hears their recording next to the model. Rounds of 5 lines, varied order,
  so it does not get tedious.
- **10.2 Fluency rounds 4/3/2 "พูดให้คล่อง".** A topic from the current unit with helpful words; the learner talks
  three times with less time each round (beginner: 60, 45, 30 seconds); show words heard and words per minute for each
  round. Recordings stay in memory only.
- **10.3 Commute mode "ฟังตอนเดินทาง".** A playlist of recorded clips from the current and earlier units (word, pause,
  Thai meaning by the Thai phone voice, example sentence; story lines), with lock-screen controls (Media Session) and
  playback that continues with the screen off where the phone allows. Counts as listening for quests.
- **Tests**: shadowing flow with recognition stubbed; speed applied; 4/3/2 timer and numbers; playlist order and Media
  Session handlers.

## Phase 11: word building and reading speed

- **11.1 Word building "หน้าคำ ท้ายคำ".** About 20 common prefixes and suffixes (un-, re-, dis-, in-, pre-, -er, -or,
  -tion, -ment, -ness, -ful, -less, -ly, -able, -al, -ive, -ize, -y, -ous, -ity), each with a Thai explanation and drills
  built from words already in the app: split the word, guess a new word's meaning, build the right form for a sentence.
- **11.2 Timed reading "อ่านจับเวลา".** Re-read a finished story against the clock; show words per minute and the
  comprehension questions again; chart the speed over time.
- **Tests**: affix drills generated only from app words; WPM computed; chart renders at 320 px.

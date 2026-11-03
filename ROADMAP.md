# ROADMAP: keep the learner coming back for a year, and cover every skill up to B2

## สรุปสำหรับคิว

แผนนี้เขียนให้ Claude Code ทำทีละขั้น เป้าหมายคือเรียนได้ทุกวันแบบไม่เบื่อนานเป็นปี และฝึกครบทุกทักษะจนถึงระดับ B2

- **ขั้น 1 ฝึกพูด** (เสร็จแล้ว): ปุ่มไมค์ที่ประโยค พูดแล้วแอปบอกว่าคำไหนถูก
- **ขั้น 2 เส้นทางแบบ Duolingo** (เสร็จแล้ว): บทเรียนเป็นวงกลมเรียงเป็นทางเดียว กดวงถัดไปได้เลยไม่ต้องคิด มี XP เป้า XP ต่อวัน ภารกิจประจำวัน 3 อย่าง หน้าสรุปตอนจบบท และนับข้อที่ถูกติดกัน
- **หน้าตาแบบมังงะขาวดำ** (เสร็จแล้ว): เส้นหมึก ลายสกรีนโทน วง ○ เมื่อตอบถูก กากบาท ✕ เมื่อตอบผิด ตัวละครพูดในกรอบคำพูด
- **ขั้น 3 ฝึกและสร้างนิสัย** (เสร็จแล้ว): หน้า "ฝึก" รวมคำและข้อที่ผิดบ่อย ฟังแล้วพิมพ์ จับคู่แข่งเวลา วันพักกันสถิติหาย ต้อนรับตอนกลับมาเรียน เหรียญรางวัล ตั้งเตือนในปฏิทิน และเซฟสำรองเป็นไฟล์
- **ขั้น 4 เนื้อหาให้ครบ** (เสร็จแล้ว): ฝึกเสียงที่คนไทยพูดยาก บทสนทนาที่เราเล่นเป็นตัวละคร แบบฝึกหาที่ผิดในประโยค เรื่องอ่านเพิ่ม 18 เรื่อง (B1–B2) งานเขียนสั้นๆ และศัพท์งานกับเทคโนโลยี
- **ขั้น 5 ปรับตามผู้เรียน** (เสร็จแล้ว): ความยากพอดี (ตอบถูกราว 85%) คำที่จำได้แล้วเว้นช่วงทบทวนนานขึ้น ระดับ CEFR แยกตามทักษะ และสอบผ่านระดับพร้อมใบผ่าน

วิธีสั่ง: เปิด Claude Code แบบ **Cloud** เลือก english-app แล้วพิมพ์ `อ่าน ROADMAP.md แล้วทำขั้นที่ 2` (ขั้นต่อไปก็เปลี่ยนเลขตามนั้น) ทำทีละขั้นเท่านั้น อย่าเปิดสองงานพร้อมกัน เพราะทุกขั้นแก้ไฟล์เดียวกัน

---

## How to use this file (for Claude Code)

1. Do the phases **in order, one at a time**; one session may do several in a row when the owner asks. Read `CLAUDE.md`
   first, then the phase below. Fetch `main` before you start; another
   phase may have landed.
2. Open with 3–5 short Thai lines to the owner saying what you will build, then build it without waiting for approval.
3. Finish with the **Definition of done** below, merge into `main`, push `main`, and update the **Status** table here and
   the feature list in `CLAUDE.md` in the same push. If an earlier phase has landed on `main` but is still marked in
   progress, mark it done.
4. If a phase is too big for one session, finish and push a working subset, mark the rest `partly done` in Status, and
   list what is left under the phase.
5. Never run two sessions on this repository at the same time. Every phase edits `src/trainer.src.html`.

## Status

| Phase | Content | Status |
| :- | :- | :- |
| 1 | Speaking practice (`CLAUDE.md` idea 1) | done (3 Nov 2026) |
| 2 | Learning path, XP, daily quests, end-of-lesson screen, combo | done (3 Nov 2026), see "As built" under Phase 2 |
| M | Black-and-white manga look (`design/manga/README.md`), before phase 3 | done (3 Nov 2026): see the Design section of `CLAUDE.md` |
| 3 | Practice tab, mistakes review, dictation, match race, streak protection, comeback, badges, reminders, backup file | done (3 Nov 2026), see "As built" under Phase 3 |
| 4 | Content: Thai-speaker sounds, role-play dialogues, error-correction drills, 18 stories, writing tasks, work and technology words | done (3 Nov 2026), see "As built" under Phase 4 |
| 5 | Adaptive difficulty, longer reviews for known words, skill levels, level exit tests with certificate | done (3 Nov 2026), see "As built" under Phase 5 |
| 6 | Optional: more vocabulary (B2–C1) | later |

## Learner and target

- A Thai university student who started below A1, practises every day on an Android phone (installed PWA, often offline).
- Target: **B2**. A Thai government directive ([Bangkok Post](https://www.bangkokpost.com/thailand/general/2730885/mandatory-english-tests-for-uni-students))
  asks universities to test students against CEFR before graduation, with B2 for a bachelor's degree. Rules differ by
  university, so the app only frames B2 as the goal.
- Success means the learner keeps coming back daily for months, and can understand and say everyday, study and work
  English. The path below is long enough for about a year at 15–20 minutes a day.

## What the research says, and the rule it gives

| Finding | Rule for this app |
| :- | :- |
| Duolingo replaced its skill tree with one path because learners were unsure what the "correct" way to use the app was; the path mixes new material with spaced review and places stories at matching difficulty ([Duolingo, 2022](https://blog.duolingo.com/new-duolingo-home-screen-design/)). Some learners pushed back on the change ([report](https://piunikaweb.com/blog/duolingo-app-update-with-path-ui-faces-backlash-from-users)). | One obvious next step (the path), with review and stories built into it. Keep the existing tabs as a free-choice library, so the path guides without caging. |
| Practice testing and spaced (distributed) practice are the two highest-utility study techniques; rereading and highlighting are low ([Dunlosky et al., 2013](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)). | Every node is retrieval (answering, typing, saying), not reading. Spread each word set's stages apart in the path. |
| Duolingo's trained spacing model raised overall daily retention by 12% in an A/B test ([Duolingo](https://blog.duolingo.com/how-we-learn-how-you-learn/); [paper](https://preview.aclanthology.org/landing_page/P16-1174)). | Keep and improve spaced review (Phase 5 lengthens intervals for well-known words). |
| Learning is fastest around 85% success in simple tasks; the authors warn it is shown for simple tasks only ([Wilson et al., 2019](https://www.sciencedaily.com/releases/2019/11/191105113457.htm)). | Aim for roughly 80–90% correct: speed up when accuracy stays high, add review and easier formats when it drops (Phase 5). |
| Streaks keep learners committed; a 7-day streak wager raised day-7 retention 14%, and a weekend streak protector made learners 4% more likely to return and 5% less likely to lose the streak. Learners who binge are more likely to quit ([Duolingo, 2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)). | Keep the streak; add earned rest days (Phase 3); gently suggest stopping after a big day, never block. |
| Gamification helps learning (g = 0.49 cognitive, 0.36 motivational, 0.25 behavioural), but only the cognitive effect held in rigorous studies; a story/game fiction helped behaviour ([Sailer & Homner, 2020](https://link.springer.com/article/10.1007/s10648-019-09498-w)). | Use XP, quests and badges as seasoning; the learning tasks carry the weight. Tie units to a recurring cast and storyline. |
| App learners cycle through engagement, pauses, dormancy and re-engagement ([Hwang et al., 2024](https://www.cambridge.org/core/product/85DDA2047A7A04BA7FE80541433595C6)). | Make coming back easy and guilt-free: a short welcome-back review (Phase 3). |
| Speech-recognition pronunciation training has a medium effect (g = 0.69), larger for individual sounds (0.82) and with explicit feedback (0.86); 1–4 weeks of use showed almost no effect, 5–8 weeks a large one ([ReCALL meta-analysis](https://www.cambridge.org/core/journals/recall/article/effectiveness-of-automatic-speech-recognition-in-eslefl-pronunciation-a-metaanalysis/A915444CF252B61D14961D2FE733822D)). | Show exactly which words were heard right or wrong, and make speaking a small daily habit for weeks, not a one-off. |
| Comfortable reading needs about 98% of the words known (Hu & Nation, 2000), and 98% coverage takes 8,000–9,000 word families for written text and 6,000–7,000 for speech ([Nation, 2006](https://www.wgtn.ac.nz/__data/assets/pdf_file/0018/1626120/2006-How-large-a-vocab.pdf)). | Place each story where nearly all its words were already taught, and pre-teach the rest. The 3,600 words are a base; Phase 6 extends them. |
| Thai learners struggle with initial fricatives and affricates (except /f/, /s/, /h/), final fricatives, affricates and /l/, and consonant clusters, through substitution, omission and insertion of sounds ([Thai study](https://so05.tci-thaijo.org/index.php/tgt/article/view/273223)). | A sound unit made for Thai speakers (Phase 4.1), placed early in the path. |
| In Thai learners' spoken English, the top error types were subject–verb agreement (25%), verb form (18%) and tense (13%) ([Thai study](https://so17.tci-thaijo.org/index.php/JEL/article/view/625)). | Error-correction drills aimed at these first (Phase 4.3). |

## Definition of done (every phase)

- All rules in `CLAUDE.md` hold: storage keys and record formats unchanged, backup code and `Sync.merge` working, `Sync`/`AI`
  only inside claude.ai with the local path working on GitHub Pages, sound packs untouched, design tokens only.
- **New data goes in a new key** named `vocab3000-<name>-v1`, gets an entry in `EXTRA` (get/has/merge that never lowers
  progress) so it travels with account saving and the `EN1:` backup code, and a test restores a backup code that contains it.
  Old backup codes without it must still restore. The `days` array stays at six numbers (`cleanDay` and its merge assume it):
  never append to it. New fields may be added to the `ui` object; existing fields keep their meaning.
- Nothing blocks the learner: no hearts, no lives, no forced timers, no locked content without a way through. Every speaking
  or listening item has a skip ("ตอนนี้พูดไม่ได้", "ตอนนี้ฟังไม่ได้") that does not count as wrong.
- Works offline after the sound download; new text without recorded clips uses `Snd.native(text)` and is marked
  "เสียงจากเครื่อง".
- Thai copy is short, plain, encouraging and never shaming; no emoji. Respect `prefers-reduced-motion`. Tap targets at least
  44 px. Check 390 px and 320 px wide, light and dark: no horizontal scroll.
- `python3 src/build.py`, then every test in `CLAUDE.md` plus the phase's new tests end with `ALL PASSED`. Commit `index.html`
  and `sw.js` with the source.
- Report to the owner in short Thai: what changed, and how to get it on the phone (wait 1–2 minutes, open the app online).

---

## Phase 2: learning path (เส้นทาง), XP and daily quests

### 2.1 Path model (built at runtime, no new lesson content)

- Build the path from data already in the app: vocabulary sets (topics in `ORD` order, sets of 10, 360 sets), grammar lessons
  (`GLS` order, 64), stories (`RDS` order, 30). The order must be deterministic, and content appended later must only add
  nodes after the existing ones of its level, never reorder finished ones.
- **Node ids** are stable strings: `v:<cat>.<set>.<stage>` (one stage of a vocabulary set), `g:<lessonId>`, `r:<storyId>`,
  `t:<storyId>` (say-along after a story, needs Phase 1), `x:<n>` (review), `k:<unit>` (checkpoint). Phase 4 adds `p:` (sound),
  `d:` (dialogue), `e:` (error drill), `w:` (writing).
- **Vocabulary nodes**: one node is one stage (three steps) of one set: stage 0 รู้จักคำ (`card`, `e2t`, `listen`), stage 1
  จำตัวสะกด (`copy`, `t2e`, `type`), stage 2 ใช้ในประโยค (`cloze`, `order`, `write`). Space the stages: after introducing set k
  (stage 0), place stage 1 of set k−1 and stage 2 of set k−2, so each set comes back twice a few nodes later.
- **Sections** follow the grammar levels A1, A2, B1, B2. Split the 360 sets across the sections in proportion to the lesson
  counts (18/18/16/12), and spread each level's grammar lessons evenly through its section.
- **Stories**: inside their level's section, at the earliest point where at least 95% of the story's word tokens (names
  excluded, using the reader's word-form logic) are words already taught by then or common function words. If that point is
  never reached, place the story at the end of its section. Before each story, show its untaught words as a short
  "คำใหม่ในเรื่องนี้" step, from the reader glossary. After each story, a `t:` node: say 3–5 of its lines with the Phase 1
  speaking tool (skip the node type if speech recognition is missing).
- **Review** node after every 6 nodes: due words plus missed grammar questions (`x` in the grammar record). If nothing is due
  it shows as done.
- **Units** of about 12–18 nodes, named after the vocabulary topic they cover (Thai name), each ending with a checkpoint
  `k:`: 12 mixed questions from the unit (words, grammar, one listening item), pass at 80%. Store results in the new key
  `vocab3000-path-v1` as `{k: {unit: [best, total, time]}}`. Failing never locks the next unit.
- **Done state** comes from records that already exist: a vocabulary node is done when all three of its step bits are set in
  `s["cat-set"]`; a grammar node when the lesson is passed (`gPassed`); a story when `rDone`; a checkpoint when its best is at
  least 80%. Do not write fake progress to mark nodes done.
- **Current node** is the first node not done, skipping units whose checkpoint was passed ("ทดสอบข้าม" below).
- Size: about 1,500 nodes. Render only the current unit and two on each side; list the other units by name.

### 2.2 Path screen

- Becomes the landing tab "เรียน". The header shows the streak (flame and number), today's XP against the daily goal (small
  ring) and the quests button. Only one loud element per screen: the current node's "เริ่ม" bubble (mango then, ink since the manga look).
- Nodes are 64 px circles (current one 76 px) with the same pressed edge as buttons, sideways offset in a gentle wave
  (0, 44, 64, 44, 0, −44, −64, −44 px, kept inside 320 px). Each unit starts with a banner: level chip (A1), unit number, Thai
  title, and a "คู่มือ" button that opens the related grammar explanation.
- Inline SVG icons in the existing stroke style, one per node type: word, grammar, story, speak, review, checkpoint (trophy),
  sound, dialogue, fix-the-error, writing.
- States: done (teal fill with check), current (mango ring and a "เริ่ม" bubble that bobs unless reduced motion), ahead
  (muted but tappable), checkpoint passed (trophy filled). Add a colour token only if needed, defined in all three theme blocks.
- Tapping a node opens a small sheet (existing `sheet()`): title, type, about how many minutes, "เริ่ม". Tapping a node ahead
  of the current one says it is ahead and offers "ทำเลย" or, at a unit banner, "ทดสอบข้ามหน่วยนี้" (the unit checkpoint).
- Scroll to the current node on open.

### 2.3 Inside a node

- Reuse the existing step screens, grammar round and story screen in path mode: a progress bar on top, and a close button
  that asks with the app's own sheet (no `confirm()`): "ออกจากบทนี้ไหม ที่ทำไปแล้วยังเก็บไว้".
- **Combo**: count correct answers in a row within a node. Show a chip ("ถูกติดกัน 5") at 3, 5, 10, 15, 20, and a short praise
  line in the answer panel at milestones, chosen from a small pool ("เยี่ยม ถูกติดกัน 5 ข้อ", "แม่นมาก", "ไปได้สวย"). A wrong
  answer resets it without comment.
- **Vibration** (feature-detected `navigator.vibrate`): about 12 ms when right, `[20, 40, 20]` when wrong, longer at node
  end. New setting "สั่นเมื่อตอบ", on by default.
- **End-of-node screen**: XP earned (counts up), accuracy %, time, best combo, a "เต็ม" mark at 100%; buttons "ต่อไป" (next
  node) and "กลับเส้นทาง". Confetti only for a perfect node, a finished unit or a finished level, so it stays special.

### 2.4 XP and daily goal

- XP: +1 per answer right the first time, +10 per node finished, +5 more when perfect, +15 per story, +20 per checkpoint
  passed, +2 per sentence said right (Phase 1). Review sessions give +1 per right answer.
- Store in the new key `vocab3000-xp-v1`: `{d: {day: xp}, c: {day: bestCombo}, b: 1}` with an `EXTRA` entry (merge keeps the
  higher number per day). On first run, backfill past active days from `vocab3000-days-v1` with a conservative estimate (read
  what each `logAct` count means first) and set `b: 1` so it runs once.
- Daily XP goal in settings: 10 / 20 / 30 / 50 ("สบายๆ", "ปกติ", "จริงจัง", "เต็มที่"), default 20, as a new `ui` field.
  Keep the old new-word goal working or migrate it inside `ui` without breaking its readers and tests.
- The streak rule stays: any activity makes the day active.

### 2.5 Daily quests (replace the Today checklist)

- Three quests a day, picked deterministically from the day number (same all day, different across days) from a pool:
  reach today's XP goal; 10 right in a row; one perfect node; read or listen to one story; clear all due reviews; say 5
  sentences right (only when speech recognition exists); one mistakes round (after Phase 3).
- Progress comes from today's records (xp, days and speaking data). All three done: a small celebration, and the day counts as
  perfect (`DAYS[t][5] = 1`, the same meaning as today's "all three done"). Keep the 7-day strip.

### 2.6 First run and existing learners

- First run with no progress: three quick screens. เรียนเพื่ออะไร (เรียนและสอบ, ทำงาน, เที่ยว, ทั่วไป; save it, Phase 4 uses it to
  pick dialogues first); เวลาต่อวัน (5 / 10 / 15 / 20 นาที → XP goal 10 / 20 / 30 / 50); เริ่มจากไหน (เริ่มจากศูนย์ → unit 1;
  พอรู้บ้าง → the existing level check, then start at the section it suggests). Then open the first node straight away.
- Learners with progress skip this. The path shows what they already did, and a one-time sheet says: "ใหม่: เส้นทางการเรียน
  ทำวงถัดไปได้เลย แท็บเดิมยังอยู่ครบ".

### 2.7 Navigation

- "เรียน" replaces "วันนี้" as the landing tab. Streak, week strip, progress tiles, the level check and settings move into the
  path header and a "ฉัน" screen opened from it. The ศัพท์, ไวยากรณ์ and อ่าน-ฟัง tabs stay as the free-choice library.
- Keep existing ids and `data-act` values wherever the element still exists. Update the tests where an id must change.
- The tab bar must fit 320 px.

### 2.8 Tests (new `src/tests/t4.js`, plus updates to `t3.js`)

- Fresh profile: onboarding, first node opens, finishing it shows the end screen with XP, and the current node moves on.
- Seeded progress (finished sets, a passed lesson, a read story): those nodes show as done, the current node is the first
  unfinished one, and XP backfill is above zero. Progress keys are byte-identical before and after, apart from intended writes.
- Checkpoint pass and fail are stored; a failed checkpoint does not lock the next unit; test-out skips a unit.
- A backup code made after this phase contains `xp` and `path` and restores them; a code from before this phase still restores.
- Combo chip at 3 right in a row; `navigator.vibrate` (stubbed) called, and not called with the setting off.
- Quests are the same for a fixed day and fill in as tasks are done.
- Screens at 390 and 320 px, light and dark, without horizontal scroll; no bobbing with reduced motion.

### As built (3 Nov 2026): what differs from the plan above, and why

- **Story placement.** The topic order teaches many common story words late (Common Verbs, Common Adjectives,
  Prepositions and Pronouns sit in B1/B2), so the A1 stories reach only 73-90% coverage by the end of A1, and most A2
  stories never reach 95% inside A2. The literal rule would stack all 12 A1 stories at the end of A1. Instead each story
  of a level gets its own stretch (story j of n starts at (j+1)/(n+1) of the level's word nodes), and moves later inside
  that stretch until 95% is reached, else sits at the stretch's end. Coverage at placement: A1 60-84%, A2 80-100%,
  B1 94-97%. "คำใหม่ในเรื่องนี้" shows up to 12 untaught words (dictionary meaning or reader glossary); words the learner
  already knows from the library tabs are left out. A later phase could move the most frequent sets earlier; node ids
  would survive that, but unit and review numbers (stored in the path key) would shift, so plan a migration.
- **Reviews.** A review counts as done once it was done or the learner went past it (the node after it is done). While
  nothing is due it is skipped, and shown as done once reached. "Done when anything later is done" was too wide: reading a
  story far ahead in the library marked every review before it as done.
- **Checkpoints.** A tried checkpoint counts as passed by for the current node, so failing never stops the path; it shows
  as tried (dashed) until passed. "ทดสอบข้าม" is offered on the current unit and the units ahead.
- **Quests.** The XP goal is always one of the three; the other two are a pair from the pool, picked by the day number
  (`(day mod pairs) * 7 mod pairs`), so they stay the same all day and change the next day.
- **Records.** `vocab3000-xp-v1` also keeps `p` (perfect path nodes per day) and `s` (sentences said right per day), which
  the quests need. `vocab3000-path-v1` also keeps `x` (reviews done), `t` (say-alongs) and `s` (start level from the level
  check). The streak also counts a day with XP, so a day of only speaking keeps it.
- **Listening.** The listening question has "ตอนนี้ฟังไม่ได้": the rest of that round shows the word to read, not scored
  and not wrong, and the step still finishes.
- **Old words goal.** `UI.goal` keeps its value and meaning but is no longer shown; a learner who had changed it starts
  with the matching XP goal (5 steps → 10 XP, 18 → 30).

---

## Phase 3: practice tab, habits and rewards

- **3.1 Practice tab "ฝึก"** with cards: ทบทวนคำที่ถึงเวลา (count), คำและข้อที่ผิดบ่อย, ฝึกพูด (Phase 1), ฟังแล้วพิมพ์,
  จับคู่แข่งเวลา, and later ฝึกเสียง (Phase 4).
- **3.2 Mistakes** (`CLAUDE.md` idea 2): words where the last wrong day is on or after the last right day, then by most recent
  wrong day and lowest level; grammar questions by miss count (`x`). Show the top 20 of each with "ฝึกเฉพาะชุดนี้": one tap,
  10 mixed items. Answers update the normal records.
- **3.3 Dictation "ฟังแล้วพิมพ์"**: play a recorded sentence (example sentences, story lines, grammar examples), the learner
  types it; compare leniently (case, punctuation, contractions from the reader's table) and show a word-by-word diff in the
  same colours as speaking. A slow replay button.
- **3.4 Match race "จับคู่แข่งเวลา"**: three rounds of five English–Thai pairs from words already learned, with a timer. Keep the
  best time; beating it shows "ทำลายสถิติตัวเอง". Racing only against one's own record, no leagues.
- **3.5 Rest days "วันพัก"**: earn one per 7 days in a row, hold at most two. A single missed day uses one automatically and
  the streak continues; the week strip marks it. Store in the new key `vocab3000-streak-v1` with an `EXTRA` entry. No
  currency or purchases.
- **3.6 Welcome back**: if the last active day was 3 or more days ago, show "ยินดีต้อนรับกลับ เริ่มเบาๆ 5 ข้อ" leading to five
  easy review items. No guilt in the copy.
- **3.7 Pace**: after three times the daily goal, show once that day "วันนี้ทำเยอะแล้ว พักบ้างก็ได้ พรุ่งนี้จะจำได้ดีกว่า".
  Never block.
- **3.8 Badges "เหรียญ"**: about 20, computed from records; only "already celebrated" is stored (new key
  `vocab3000-badges-v1`). A celebration sheet when one is earned, and a grid on the "ฉัน" screen showing progress towards
  locked ones. Examples: first node; 3, 7, 30, 100 and 365 days in a row; 50, 100, 250, 500, 1000, 2000 and 3600 words known
  (memory level 3 or more); every grammar lesson of A1, A2, B1, B2 passed; 10 and 30 stories; 50 and 200 sentences said
  right; 20 right in a row; 10 perfect nodes; first unit finished.
- **3.9 Daily reminder**: in settings, pick a time, then "เพิ่มใน Google Calendar" (a
  `calendar.google.com/calendar/render?action=TEMPLATE` link with a daily `RRULE`) or "ดาวน์โหลดไฟล์ปฏิทิน" (an `.ics` with a
  daily rule and an alarm). There is no push server; this uses the phone's calendar as the cue.
- **3.10 Backup file** (`CLAUDE.md` idea 4): save the `EN1:` code as `english-backup-YYYY-MM-DD.txt`; load it from a file
  picker; the same checks and merge as pasting the code.
- **Tests**: mistakes ranking on seeded records; dictation diff with contractions; match race best time saved; a missed day
  covered by a rest day keeps the streak; welcome-back appears after 3 idle days; badge earned once and celebrated once;
  backup file round trip; reminder link and `.ics` text contain a daily rule.

### As built (3 Nov 2026): what differs from the plan above, and why

- **Records.** Besides `vocab3000-streak-v1` and `vocab3000-badges-v1`, a third key `vocab3000-prac-v1` keeps the race's
  best time and per-day counts of dictation sentences and mistakes rounds (the new quest needs them). All three have
  `EXTRA` entries and travel in the backup code; `src/tests/t5.js` restores a code with them and an old one without.
- **Mistakes round.** Ten items: the missed words first, at most four grammar questions; with nothing missed it uses the
  weakest learned words, so the card always works. It runs as a review node that is not on the path, so the end screen,
  XP and combo work as in a lesson; it returns to the ฝึก tab. A new quest "ฝึกข้อที่ผิดบ่อย 1 รอบ" joins the pool once 10
  words are learned (a stable condition, so the day's quests do not change mid-day for anything else).
- **Dictation** uses learned words' example sentences (recorded clips) and one line of a story already read; it changes no
  word records (it trains listening and spelling of sentences). A sentence right gives 1 XP.
- **Match race.** A wrong pair adds 2 seconds, so tapping at random does not pay; a pair matched first time gives 1 XP
  (the usual "right first time" rule). Word records are not changed by the race.
- **Rest days.** One is earned at every 7th practised day of a run, two at most. Only a single missed day is covered
  (between practised days, or yesterday while today is still open), and only from the day the feature arrived, so old gaps
  are not rewritten. The streak number counts practised days; covered days are hatched in the week strip.
- **Badges.** 24, computed from the records. The celebration is a small panel at the top that never blocks a tap, and
  several new badges at once are announced together (an existing learner may earn many on the first day).
- **Welcome back** is a card on the path (instead of the words-due card that day) leading to five meaning questions on
  the best known words. **Pace** is a short note once a day at three times the XP goal.

---

## Phase 4: content for every skill

- **4.1 Sounds for Thai speakers "ฝึกเสียง"**: 14 short lessons. Each has a Thai explanation of mouth and tongue position,
  example words, listen-and-choose minimal pairs (phone voice, normal and slow), say-it with recognition, and
  record-and-compare. The recogniser guesses likely words, so present its result as a hint; the comparison with the model
  matters as much.
  1. final /s/ and /z/: bus, buzz, rice, rise
  2. final /l/: ball, milk, school
  3. final /f/ and /v/: five, leaf, love
  4. final /ʃ/, /tʃ/, /dʒ/: fish, watch, page
  5. th as in think, three, mouth
  6. th as in this, mother
  7. /v/ and /w/: vest–west, very–wary
  8. /r/ and /l/: right–light, fry–fly
  9. /ʃ/ and /tʃ/: shoe–chew, ship–chip
  10. /z/: zoo, lazy, nose
  11. /g/ and /dʒ/ at the start: go, get, job, June
  12. clusters without an added vowel: street, spring, desk, asked
  13. -ed endings: worked, played, wanted; -s endings: cats, dogs, buses
  14. word stress (PHOtograph, phoTOgraphy, REcord as a noun, reCORD as a verb) and sentence rhythm

  Data in `src/data/sounds.json` (new build marker). Path: lessons 1–6 in A1, 7–11 in A2, 12–14 in B1, about one every two
  units.
- **4.2 Role-play dialogues "บทสนทนา"**: 16 scenarios with 8–12 lines each. The learner plays one role. The other role's
  lines play (recorded clip if one exists, otherwise phone voice). For the learner's line, show the Thai meaning, with the
  English behind "ดูคำใบ้" (first letters first, then the whole line). The learner says or types it; it passes when at least
  70% of the content words match (normalised, contractions handled). Show the diff, then retry or skip. Reuse the stories'
  recurring characters.
  - A1: introduce yourself; order a drink; buy something and ask the price; ask the way on campus.
  - A2: talk about the weekend; make plans with a friend; book by phone; at the pharmacy; message a lecturer.
  - B1: internship interview; report a problem with a machine at work; explain how something is made, step by step; give a
    short presentation; complain politely; check in at the airport.

  Data in `src/data/talk.json`. Path: about one per two units in A1–B1; the first-run goal decides which come first.
- **4.3 Error-correction drills "หาที่ผิด"**: 10 sentences per type, each with one error. The learner taps the wrong word, then
  picks the fix; a Thai explanation follows. Types, most common first: subject–verb agreement; verb forms (be + verb, as in
  "I am go"); tense and past forms; there is/are versus have (มี); missing be before adjectives; articles a/an/the; plural -s;
  in/on/at; countable and uncountable; gerund or infinitive. Link each type to its grammar lessons and draw ideas from the
  lessons' common-mistake notes. Missed items join the mistakes list.
- **4.4 Stories**: 6 more B1 and 12 B2 (ids `r31` onwards, appended), phone voice, continuing the cast's storyline (campus,
  part-time job, internship, first job). Each has 3 questions and glossary entries. Length: A1 60–100 words, A2 100–160,
  B1 160–260, B2 260–400. At most 5% of word tokens outside the app's words and the glossary.
- **4.5 Writing "เขียน"**: from A2, at each unit's end, a short guided message of 3–5 sentences (introduce yourself, describe
  your room, email a lecturer for an appointment, describe a process step by step, and so on). Each has a Thai brief, a word
  bank, a model answer and a self-check list ("ทุกประโยคมีประธานไหม", "กริยาเติม s ถูกไหม", "ใช้รูปอดีตไหม"). Inside
  claude.ai use the existing AI check; on GitHub Pages use the self-check.
- **4.6 Work and technology words**: new topics appended at the end (index 56 onwards), about 150 words in the existing line
  format (`word|pos|th|reading with *stress|example with {word}|th example`): measurement, materials, tools and machines,
  processes (cut, weld, assemble, inspect, package), safety, quality, energy and electricity. No clips: give the new topics
  empty entries in `audio-index.json`, keep the build's topic-count check, and make sure word and sentence sound falls back to
  `Snd.native`. Place them in the B1 section of the path.
- **Tests**: every new data file validates (ids unique, fields present, Thai and English non-empty, sound ids exist); one
  lesson of each new type can be completed end to end with recognition stubbed; stories meet the coverage rule (test computes
  it); new topics play phone voice and do not shift existing topic indexes or progress.

### As built (3 Nov 2026)

- **4.4 done.** r31–r36 (B1, 166–207 words) and r37–r48 (B2, 261–296 words), 6 dialogues among them, each with Thai lines,
  3 questions and glossary entries for the words outside the app's list (before the glossary at most 3.4% of a story's
  words were outside; after it none). Storyline: Ploy's internship and presentation, Ton's final project, Anna going home,
  graduation, the job hunt and interview, Ton's first weeks and the broken-parts problem, a first flat, an unhappy customer,
  working from home, asking for a raise, Anna's visit, saving money, a trip to Japan, and Ploy's scholarship to Melbourne.
  Phone voice, marked "เสียงจากเครื่อง". On the path they are slotted into the existing units (B1 units 56–67, B2 units
  71–81), halfway between the first stories where a level has some; no existing node changed unit, order or number, and
  a story added behind the learner is passed by instead of becoming the next thing to do. Checked by `src/tests/stories.js`.
- **Placement.** Everything new is added into the units already cut (`p4Place`, flag `ex`), so no existing node changed
  unit, order or number (checked against the previous build: 112 nodes added, none moved); the path has 1,632 nodes.
  Lessons the learner is already past are passed by, and every kind is also on the ฝึก tab as a list.
- **4.1 done.** 14 lessons in `src/data/sounds.json`: how to make the sound (Thai), example words, 5–6 minimal pairs heard
  with the phone's voice (normal and slow, "ตอนนี้ฟังไม่ได้" skips), and lines to say with the speaking panel (its guess is
  shown as a hint next to the model and one's own recording). Lesson 14 asks which syllable is stressed. Without the phone's
  voice the listening part is left out. Placed in every second unit from the 2nd unit of A1 (1–6), A2 (7–11) and B1 (12–14).
- **4.2 done.** 16 dialogues in `src/data/talk.json` (A1 4, A2 6, B1 6: "buy a train ticket" was added to reach 16). The
  learner plays Ploy or Ton; the other role is the cast or a person on the spot, read by the phone. Hints: first letters,
  then the whole line. A line passes when 70% of its content words match (small function words do not count, short forms
  are expanded); said through the mic or typed; skippable. Placed in the odd units from the start of A1, A2 and B1; the
  first-run goal (`UI.why`, tags per dialogue) puts matching dialogues first within a level.
- **4.3 done.** 10 types of 10 sentences in `src/data/drills.json`, most common first. Tap the wrong word (two wrong taps
  show it), pick the fix, read why. When the error is two words or a word too many, the sentence joins them with "_" into
  one tap target, and the fix replaces that chunk. Each drill sits right after its main grammar lesson. Misses are kept per
  sentence and join the mistakes list and its round.
- **4.5 done as a subset.** 27 tasks in `src/data/write.json` (A2 10, B1 10, B2 7) at the end of every second unit from A2,
  not every unit (58 tasks would mostly repeat). Each has a Thai brief, a word bank (tap to insert), a model answer and three
  self-check points; at least three sentences finish it, every point ticked counts as full. Claude's check is offered only
  inside claude.ai.
- **4.6 done.** 150 words in 7 topics appended at indexes 55–61 (group W, shown last on the คำศัพท์ tab), in the usual line
  format with readings and examples, empty entries in `audio-index.json`, phone voice. Their 15 sets are spread over the 20
  B1 units, each set's three stages inside one unit.
- **Records.** One new key `vocab3000-lessons-v1` (`p`, `d`, `e`, `w` results and `x` drill misses) with an `EXTRA` entry;
  `src/tests/t6.js` validates the data, runs one lesson of each kind and restores a backup code with and without it.

---

## Phase 5: adapt to the learner

- **5.1 Difficulty near 85%**: track accuracy over the last 5 nodes of each type. At 95% or more, offer "ข้ามไปเร็วขึ้น": a
  6-question test-out of the next stage that, if passed, sets those step bits (real evidence of knowledge). Below 70%, add a
  review node next and put choice formats before typing. Offer, never force.
- **5.2 Longer intervals for well-known words**: keep levels 0–5 and the record format. When a level-5 word is answered right,
  next due = today + clamp(2 × (today − last right day), 15, 180) days. Wrong answers work as now. Show "จำได้นาน (เกิน 30
  วัน)" in stats.
- **5.3 Skill levels**: estimate a CEFR level for words, grammar, listening, reading and speaking from progress; show them
  with a "เป้าหมาย B2" bar on the "ฉัน" screen.
- **5.4 Level exit tests**: for A1, A2, B1 and B2: 30 mixed items (listening clips, a short reading, grammar, words, 3 speaking
  items when recognition exists). Passing at 75% opens a certificate screen ("ผ่านระดับ A1", date, scores) with "บันทึกรูป"
  (canvas to PNG download). Store results in the new key `vocab3000-exit-v1`; leave `vocab3000-level-v1` as it is.
- **Tests**: test-out sets bits only when passed; interval formula and clamp; skill estimate on seeded records; certificate
  PNG created; backup round trip includes `exit`.

### As built (3 Nov 2026)

- **5.1.** `vocab3000-adapt-v1` keeps right and asked for the last 5 lessons of each node type (path lessons, not reviews,
  practice rounds or say-alongs); a judgement needs at least 3. At 95% or more, a word lesson that is not done offers "ข้ามไปเร็วขึ้น"
  on its sheet, and the end screen of a word lesson offers it for the next one: 6 questions on that set (meaning choices for
  the first stage, typing for the second, gap fills for the third); 5 right sets the stage's step bits, fewer changes
  nothing. Under 70% the end screen offers "ทบทวนก่อนไปต่อ" (a review round) and word lessons put the choice steps first.
  All of it is an offer.
- **5.2.** As planned. "จำได้นาน (เกิน 30 วัน)" on the ฉัน screen counts words whose current gap (next due day minus last
  right day) is over 30 days.
- **5.3.** Each skill is read from the path: words (word lessons), grammar (grammar lessons and drills), listening (the
  first stage of each word set, which holds the listening step, sound lessons and stories), reading (stories), speaking
  (say-alongs, dialogues and sound lessons). A level counts when 60% of the skill's lessons in it are done, and every
  level before it too; levels before the start level from the level check count, as do units tested out. The "เป้าหมาย B2"
  bar is the average share done of all five skills.
- **5.4.** 30 items: 9 words (meaning choices both ways), 5 listening items, 10 grammar choice questions, a story of the
  level (one not read yet when possible) with its 3 questions, and 3 of its lines to say; without speech recognition the
  words fill the gap, without sound the listening items too, and a line the phone could not hear is left out, not wrong. It runs like a lesson outside the path, from the ฉัน screen;
  the best result per level is kept and never lowered. Passing (75%) opens the certificate screen with the date and the
  part scores, and "บันทึกรูป" saves a PNG drawn on a canvas in the page's ink and paper. `vocab3000-level-v1` is untouched.
  Checked by `src/tests/t7.js`.

## Phase 6: optional, later

- More vocabulary for B2–C1 (the Oxford 5000 adds about 2,000 words to the Oxford 3000). It needs the official list: ask the
  owner to upload the PDF rather than writing the list from memory. Append as new topics with phone voice.
- More B2 stories and dialogues; a second pass on content the learner misses most.

---

## Coverage map

| Skill | In the app now | Added by |
| :- | :- | :- |
| Vocabulary | 3,750 words (150 work and technology words), 9 steps, spaced review with longer gaps for well-known words, search, mistakes, match race | 6 B2–C1 (later) |
| Grammar | 64 lessons A1–B2 with Thai mistakes | 2 review nodes; 3 missed questions; 4.3 error drills |
| Listening | clips for words, sentences, grammar, stories | 3 dictation; 4.2 dialogues; 4.4 stories |
| Reading | 48 stories with tap-to-translate (18 read by the phone's voice) | 2 coverage-based placement; 4.4 done |
| Speaking | Phase 1 | 2 say-along nodes; 4.1 sounds; 4.2 dialogues |
| Pronunciation | stressed syllable marked in readings | 4.1 sounds for Thai speakers |
| Writing | copy, type, order, own sentence | 3 dictation; 4.5 guided messages |
| Real-life use | some dialogues among the stories | 4.2 role-play |
| Assessment | level check, checkpoints, skill levels, exit tests with a certificate | done |
| Habit and motivation | streak, 7-day strip, daily checklist, confetti | 2 XP, quests, combo; 3 rest days, comeback, badges, reminders |

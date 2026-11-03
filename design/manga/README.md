# Black-and-white manga look

สรุปสำหรับคิว: เปลี่ยนทั้งแอปให้เป็นขาวดำเหมือนหน้าการ์ตูนมังงะ ใช้ 3 หน้าในโฟลเดอร์นี้เป็นตัวอย่าง

The owner chose this look on 3 Nov 2026. The three pages here are hand-made mockups at phone size, not app code: copy
the look, not the markup. Open them in a browser:

- `path.html`: the learning path (done, current and ahead circles, a unit banner, the checkpoint, the tab bar)
- `quiz.html`: a question answered right, with the ○ mark and the answer panel as a speech bubble from a character
- `done.html`: the end of a lesson with speed lines and an XP burst

## Rules

- **Colour**: only black, white and greys, like ink on paper. Replace the teal and mango values with ink tokens
  (for example `--ink`, `--paper`, `--tone-1`, `--tone-2`) in the same three token blocks at the top of the CSS; nothing
  else sets a colour. Dark mode is white ink on black paper, with the same patterns.
- **Ink**: thick black outlines (about 3 px) on cards, buttons and circles; hard offset shadows (`5px 5px 0` in ink)
  instead of soft ones; buttons keep their pressed edge.
- **Tones**: screentone dots (a `radial-gradient` dot grid) and hatching (`repeating-linear-gradient`) mark emphasis:
  the current circle's halo, part of each unit banner, checkpoints, progress bars, the walked part of the path trail.
  Never put a tone behind text.
- **Right and wrong without colour**: a hand-drawn ○ for right and ✕ for wrong, like Japanese test marking (inline
  SVG). In speaking results, words heard right are bold and underlined, missed words are struck through or get a wavy
  underline. Every state that used green or red must differ in shape or pattern, not only in grey.
- **Speech bubbles** with tails (Mali font): the answer panel message, the path's "เริ่ม", praise lines, toasts and the
  cast's lines.
- **Celebration**: manga speed lines (`repeating-conic-gradient`) and an impact burst for XP instead of coloured
  confetti. Respect `prefers-reduced-motion`.
- **Characters**: the story cast (Ploy, Ton, Anna, Khun Mint) get simple original ink-line faces (inline SVG), used in
  story headers and the answer panel. They must not resemble characters from existing anime or manga.
- **Type**: Kanit 700–900 for headings, numbers and sound-effect words; Mali 600–700 in bubbles; Anuphan for Thai text;
  Lexend for English words. Thai text stays as readable as now; grey text keeps at least 4.5:1 contrast.
- **Scope**: a look change only. Keep every id, `data-act` value and behaviour, and saved progress untouched. Update the
  Design section of `CLAUDE.md` so later phases use this look. Check 390 px and 320 px, light and dark.

# Guide for coding agents (Codex, Antigravity, Gemini, Claude and others)

The full guide to this repository is `CLAUDE.md`. It applies to every coding agent, not only Claude: read it first, then
`ROADMAP.md` (the plan and the status of each phase) and, for anything visual, `design/manga/README.md`.

The rules that matter most (details in `CLAUDE.md`):

- The learner's progress lives only in the phone's localStorage. Never rename the storage keys or change their record
  formats. New data goes in a new key with an `EXTRA` entry, so it travels in the backup code.
- After any change in `src/`, run `python3 src/build.py` and commit `index.html` and `sw.js` with it.
- Run every test listed in `CLAUDE.md`, one after another; each must end with `ALL PASSED`. If Chromium is not at
  `/opt/pw-browsers/chromium`, install one (`npx playwright install chromium`) and set `CHROMIUM` to its path.
- Everything the learner sees is in Thai. Talk to the owner (คิว) in short, plain Thai.
- Only one agent works on this repository at a time. GitHub Pages serves `main`: a change reaches the phone once it is
  merged into `main`.
- When a phase is done, update its status in `ROADMAP.md` and the feature list in `CLAUDE.md`.

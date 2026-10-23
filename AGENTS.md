# AGENTS.md — how to work on this repo

## Where everything lives
- `index.html` — the entire app: CSS, HTML, JS, lesson content, 21 portraits (base64). ~1 MB. This is the only file that changes for app updates.
- `system-levelling.html` — same app without the PWA manifest/service-worker lines (the Claude artifact copy). Keep in sync; `index.html` is derived from it.
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — PWA files for GitHub Pages. Rarely change.
- `the-system.keystore` — the permanent signing key (password `android`, alias `androiddebugkey`). Never regenerate; a new key breaks updates for the installed app.
- `.github/workflows/build-apk.yml` — builds the Android wrapper on every push to `main`. It *generates* the whole Android project from templates inside the YAML (Gradle files, manifest, Java/Kotlin sources, resources) and copies `index.html` into assets. There is no `android/` folder in the repo.
- `CONTEXT.md`, `DECISIONS.md`, `TICKETS.md` — this documentation.

## Inside index.html (search for these markers)
- `const SKILLS`, `GROWTH`, `DIFF`, `TIER`, `RANKS` — the game maths.
- `function load()` — state defaults **and all migrations**. Any new state field gets a default here.
- `rollover()` — the midnight engine: penalties, credits, streak resets, rest days.
- `EXERCISES`, `NEWW` (workouts), `TRACKERS`, `AUTO_GOALS`, `SKILL_TREE`, `ACH`, `TITLES`, `BOOKS`, `TEASERS`, `TRACKS` (lessons), `APPLY` (apply-it quests), `EMERGENCIES`, `BOSSES`.
- `S.todos` (to-do list), `S.notes` (three-pass notes), `S.practice`, `S.srs` (spaced repetition) — learning/to-do state.
- Every `section.view > .win` is collapsible: `initWins()` gives it an id, the heading click toggles `S.ui.open[id]`; `CLOSED_BY_DEFAULT` lists exceptions.
- Overlays push a history entry so Android back closes them (`OVERLAYS`, `pushOverlay`, popstate handler).
- `render()` calls every `renderX()`; add a new section by adding a `renderX()` and calling it there.
- `window.Android` bridge (APK only): `saveFile`, `setReminder`, `requestSteps`/`onSteps`, `setQuickLog`/`pullQuickLogs`. Always guard with `if(window.Android && Android.fn)`.

## What an agent is allowed to do
- Edit `index.html` / `system-levelling.html` and ship as a plain upload.
- The 'Write Android sources' run block is ~18.8k chars; split it into a third step before adding more source files.
- Edit the workflow YAML for wrapper changes — then validate with `actionlint`, keep every `run:` block under 21,000 chars and free of `${{ }}` (use `$GITHUB_RUN_NUMBER`), and simulate the "Assemble" and "Write Android sources" steps locally before shipping.
- Add exercises, workouts, lessons, goals, achievements, skill-tree actions.

## What an agent must not do
- Change the keystore or the `applicationId` (`uk.thesystem.app`).
- Use `confirm()`, `alert()` or `prompt()` for anything important — the Claude artifact sandbox blocks them. Use `confirmBox()` and `sys()`.
- Add a new bottom tab without removing one (seven is the limit at this font size).
- Remove or rename a stored field without a migration.
- Add network calls the published page's CSP would block, without an APK-only guard.

## How to test
- Headless: `node` + `jsdom`, load the file with `runScripts:'dangerously'`, call functions directly (`toggleTask`, `logSet`, `rollover`, `submitQuiz`…), always `process.exit(0)` because the page has `setInterval`s.
- Then publish the artifact and upload `index.html`; check the Actions run is green and install the release.

## Release routine
1. Upload `index.html` to repo root (same name replaces).
2. If the wrapper changed, upload `build-apk.yml` into `.github/workflows`.
3. Actions → green (~3 min) → Releases → newest → install over the top.

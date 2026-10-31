# AGENTS.md — how to work on this repo

## Where everything lives
- `index.html` — the entire app: CSS, HTML, JS, lesson content, 21 portraits (base64). ~1 MB. This is the only file that changes for app updates.
- `system-levelling.html` — same app without the PWA manifest/service-worker lines (the Claude artifact copy). Keep in sync; `index.html` is derived from it.
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — PWA files for GitHub Pages. Rarely change.
- Signing key — stored as the `KEYSTORE_B64` Actions secret (password `android`, alias `androiddebugkey`). Never regenerate; a new key breaks updates for the installed app.
- `tests/` — `run.js` (blocking checks) and `screens.js` (screenshots).
- `.github/workflows/build-apk.yml` — builds the Android wrapper on every push to `main`. It *generates* the whole Android project from templates inside the YAML (Gradle files, manifest, Java/Kotlin sources, resources) and copies `index.html` into assets. There is no `android/` folder in the repo.
- `CONTEXT.md`, `DECISIONS.md`, `TICKETS.md` — this documentation.

## Inside index.html (search for these markers)
- `const SKILLS`, `GROWTH`, `DIFF`, `TIER`, `RANKS` — the game maths.
- `function load()` — state defaults **and all migrations**. Any new state field gets a default here.
- `rollover()` — the midnight engine: penalties, credits, streak resets, rest days.
- `EXERCISES`, `NEWW` (workouts), `TRACKERS`, `AUTO_GOALS`, `SKILL_TREE`, `ACH`, `TITLES`, `BOOKS`, `TEASERS`, `TRACKS` (lessons), `APPLY` (apply-it quests), `EMERGENCIES`, `BOSSES`.
- `S.todos` (to-do list), `S.notes` (three-pass notes), `S.practice`, `S.srs` (spaced repetition) — learning/to-do state.
- Day judgement: never read `t.last` to decide if a past day was done — use `doneOn(d)`. Daily work runs through `dayTick()` (resume, visibility, 60 s timer).
- Emergencies: `S.emPlan[date]={at,id,hours}`; `syncEmergencyAlarms()` pushes upcoming alerts to the APK. Call it after anything that clears or changes a plan.
- Workflow: 'Write Android sources' is ~17.2k of the 21k limit — new Java goes in its own step (see 'Write quick-log sources', 'Write emergency receiver').
- Quick-log taps: Android keeps add_* (today) and prev_* (an earlier day) until `pullQuickLogs()` collects them; `setQuickLog` only updates base counts. Always call `pullQuickLogs()` before anything that saves on start/resume.
- `APP_BUILD` is 0 in the repo and replaced by sed in the workflow; never hard-code a number. `weakMult()` is HP-tiered — use it for every XP grant.
- `S.goalOv[id]` overrides auto goals (use gTarget/gXp/gPrim/gName/gHidden, never g.target directly). `S.customSubs` are pushed into SKILLS/SUB_SKILL/ALL_SUBS by `applyCustomSubs()` right after `load()`.
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
- `npm install --no-save jsdom@24.1.3 && node tests/run.js index.html` — must print all passing; CI runs the same before building. Add a test for every bug fixed.
- Screenshots: `npm install --no-save playwright@1.47.2 && npx playwright install chromium && node tests/screens.js index.html` → `screens/`. CI attaches them to each run as the *screenshots* artefact.
- Signing: the key lives in the `KEYSTORE_B64` secret; never commit a keystore.

- Headless: `node` + `jsdom`, load the file with `runScripts:'dangerously'`, call functions directly (`toggleTask`, `logSet`, `rollover`, `submitQuiz`…), always `process.exit(0)` because the page has `setInterval`s.
- Then publish the artifact and upload `index.html`; check the Actions run is green and install the release.

## Release routine
1. Upload `index.html` to repo root (same name replaces).
2. If the wrapper changed, upload `build-apk.yml` into `.github/workflows`.
3. Actions → green (~3 min) → Releases → newest → install over the top.

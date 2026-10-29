# TICKETS.md — backlog, in order

Format: **#N Title** · why · steps · acceptance criteria. Done tickets move to the bottom.

**#01 Cloud backup** · one phone = one copy of everything.
Steps: 1) wrapper bridge `saveToDrive(json)` via Android share/Storage Access Framework; 2) weekly auto-export on first open after Sunday; 3) banner shows last cloud backup date.
Accept: a backup file appears in Drive weekly without taps; restore from it works via Import.

**#02 Split lessons out of index.html** · file is ~1 MB; lessons are 300 KB of it.
Steps: 1) move `TRACKS` to `lessons.json`; 2) fetch on first use, cache; 3) APK bundles it in assets.
Accept: app opens faster; lessons still work offline in the APK and PWA.

**#03 Next 30 lessons per track** · owner asks for a refresh when tracks complete.
Steps: 1) read quiz scores and practice ratings; 2) revisit lowest-scored topics first; 3) deeper/case-based.
Accept: 30 new lessons each, appended, with apply-it actions.

**#04 Share progress with family** · optional rank comparison with Emeka/Chioma.
Steps: 1) "Share code" exports a compact base64 string of rank/level/skills/week XP; 2) "Add rival" pastes one; 3) Player tab shows side-by-side.
Accept: no server; two phones can compare by pasting a string.

**#05 Lesson-linked workouts/foods** · e.g. the AI lesson on vision links to a "scan a receipt" quest.
Accept: at least 10 lessons have a concrete in-app action beyond the apply-it text.

**#06 Mood correlation over 30+ days** · richer than the current with/without averages.
Accept: a 30-day chart of mood vs XP, steps, sleep (if added).

**#07 Sleep tracker via Health Connect** · Samsung Health records sleep.
Accept: last night's sleep hours shown in trackers; weekly goal.

**#08 Sleep and recovery into the weekly review** · pairs with #07.
Accept: review card shows average sleep and flags weeks under 7 h.

**#09 Move the signing key to GitHub secrets** · key and password are public in the repo.
Accept: keystore + password stored as Actions secrets, removed from the repo; builds still install over the top.

**#10 Tests in the build** · bugs reach the phone before they're caught.
Accept: jsdom suite in the repo runs in Actions before the APK step; a failure blocks the release; tab screenshots attached as artefacts.

**#11 Restructure** · 1 MB single file, global CSS, full re-render on every tap.
Accept: modules bundled at build; lessons/images as separate assets; only the visible tab re-renders; schemaVersion migrations; delegated event handling.

## Done
- Daily quests, trackers, skill tree, finite quests, projects (10-05)
- Train log, saved workouts, dungeon gates, 50+ exercises with descriptions (10-05 → 10-08)
- Boss, emergency quests, reward boxes, titles, shadow army (10-06)
- Food tracker, mood, journal, weekly review, spaced repetition, apply-it (10-07/08)
- Learning tracks 31 AI + 30 IFRS, practice modes, three-pass notes (10-07/08)
- APK pipeline, fixed key, Health Connect steps, camera, reminders, shortcuts/tiles (10-05 → 10-08)
- Day-judgement bug fixed + refund; random-time emergency quests with notifications (10-28)
- Update-available banner; simple mode; HP-tiered XP (10-23)
- Repo docs; UX audit fixes (touch targets, back button, keypads); morning mobility; to-do list (10-11 → 10-13)

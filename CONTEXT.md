# CONTEXT.md — The System

## What it is
A personal "life RPG" phone app in the spirit of Solo Leveling. Daily quests, five Skills with subcategories, infinite levelling with hunter ranks, HP penalties, streaks, a weekly boss, emergency quests, reward boxes, 21 character forms, a training log with dungeon-style workouts, food and mood tracking, a journal, two 30-lesson learning tracks with quizzes and memory practice.

## Who it is for
One user (the owner), on a Samsung Galaxy Z Flip 6 running Android 14. No accounts, no server, no other users. Privacy is simple because the data never leaves the phone.

## Product principles
1. The daily routine is the product. Every new input is a tax on it; prefer automation (trackers, Health Connect, linked quests) over new things to tap.
2. One codebase, three deliveries: Claude artifact (preview), GitHub Pages (PWA), Android APK (WebView wrapper). The APK is the real one.
3. Honest mechanics: XP is earned, not given. Penalties are real but survivable (rest day, shields).
4. Never lose data: every schema change ships with a migration in `load()`. Export/import must always work.
5. Explain everything in-app: every exercise, workout, lesson and goal says what it is and what it pays.

## Core loop
Open app → day rollover applies yesterday's penalties/credits → strip shows today → tick quests, log sets/food/trackers → XP flows task → subcategory → Skill → Character → level-ups, forms, ranks, boss damage → 21:00 reminder → repeat. Weekly: boss, review card, rest day resets Monday.

## Key numbers (don't change casually)
- XP per level: Subcategory 150·1.07^(L−1), Skill 600·1.08^(L−1), Character 4000·1.08^(L−1). Fast/slow subcategories ×0.8 / ×1.3.
- Task XP: Easy 8 · Medium 38 · Hard 150. Primary subcategory 100%, secondaries 25%.
- HP 1000; −100 per day under the quest threshold (default 6). Heals: day at threshold +20, 80% +50, flawless +100; gates +30/50/80; emergency +40; boss +150; goal +25; recovery +10; potion +100; pass streak +10/day (max 50), +100 every 7th day, shield every 30th. In-day cap 150. XP multiplier by HP: full ×1, 50–99% ×0.8, below 50% ×0.5.
- Ranks: E 1 · D 10 · C 20 · B 30 · A 40 · S 50 · National 75 · Monarch 100+ (tiers every 25). Forms every 5 levels to 100.
- Weekly boss HP = 14-day average XP × 7 × 1.15 (min 1500).

# v0.2.0 — Wire the Authored Levels

A maintenance pass after the ten-iteration stop point. It adds no new scope; it makes the existing data and mechanics actually work end to end.

## Fixed

- **Levels are now data-driven at runtime.** `initial()` previously hardcoded special positions and ignored `assets/levels/levels.json`. Board layout, special placement, level goal and mode now all come from the authored level table (mirrored in `assets/scripts/BubbleGame.ts` so the prototype still runs without a resources bundle).
- **Attach fallback.** A shot that hit the ceiling with row 0 occupied (or landed with no free neighbor cell) vanished without effect. It now attaches to the nearest free cell.
- **Combo popup score.** Floating text showed `count × 10` regardless of the actual formula; it now shows the real awarded points (color ×10×combo, bomb ×15×combo, clone ×12×combo).
- **Button touch leak.** Button taps propagated to the root node and could trigger an unintended shot.

## Added

- **Level switching.** ◀ PREV / NEXT ▶ buttons cycle the 10 authored levels; BOMB / STONE / CLONE buttons jump to the first level of that mode; HUD shows `LV n/10 · <name>` and the level goal.
- **Level clear detection.** Clearing the board awards +100, shows a LEVEL CLEAR popup, and auto-advances to the next level (with an ALL LEVELS CLEAR end state).
- **Difficulty ramp by row count.** Levels 1–3 start with 7 rows, 4–6 with 8, 7–9 with 9, level 10 with 10.

# v0.1.0 — Ten-Iteration Stop Point

This is the deliberate stop point for the current casual-game planning exercise.

## What is demonstrable

- Playable Cocos Creator interaction loop.
- Three materially different special-element decisions.
- Hex-grid placement instead of pure distance matching.
- Bomb / Stone / Clone have distinct level-design roles.
- Clone has an explicit hold/save decision.
- Score and combo provide immediate outcome feedback.
- Ten authored level concepts are captured as data.
- README contains a visual gameplay showcase.

## What is intentionally not added

- Online multiplayer
- Accounts or backend
- Monetization
- Large asset packs
- Complex progression systems
- Full audio production
- A level editor
- Endless feature expansion

The next useful step is **playtest → observe → tune**, not more code.
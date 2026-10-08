# Gameplay Specification

## Core loop
Aim -> shoot -> attach -> resolve special effects -> remove matching cluster -> remove unsupported bubbles -> continue.

## Prototype rules
- Match threshold: 3 bubbles.
- Staggered bubble rows.
- Wall bounce.
- Bomb clears a local radius.
- Stone acts as a persistent obstacle.
- Clone creates additional bubbles around the target.
- Unsupported bubbles fall when disconnected from the ceiling.

## UX goals
Immediately understandable, low-noise, responsive, rewarding on successful chains, and increasingly strategic without adding complicated controls.

## Iteration 3 — Attachment and resolution loop

The shot now follows a deterministic runtime loop: aim → preview trajectory → launch → collide → choose the nearest valid hex cell → attach → resolve the element → update score/combo → select the next shot.

This separates input, placement and resolution so future level tuning can change rules without rewriting the interaction layer.
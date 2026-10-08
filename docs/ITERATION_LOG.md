# Spiral Iteration Log

This repository intentionally stops after ten focused iterations. Each iteration raises the implementation ceiling while preserving the core casual-game loop.

1. **Core refactor** — replace distance-only prototype logic with a maintainable shot/board state model; make Bomb and Clone usable as actual shots.
2. **Hex placement** — introduce explicit staggered hex neighbors and collision-to-cell attachment.
3. **Resolution loop** — separate aim, launch, attach, special resolution, match, drop and next-shot selection.
4. **Design differentiation** — make Bomb / Stone / Clone represent burst / route / planning decisions.
5. **Visual capture** — add a GitHub-ready gameplay preview for the README and portfolio review.
6. **Level schema** — move authored layouts toward data-driven iteration.
7. **10-level progression** — define a difficulty curve from isolated special elements to combined decisions.
8. **QA checklist** — document deterministic manual tests for placement, special effects and unsupported drops.
9. **Portfolio packaging** — make the project easy to explain in an interview: mechanic, decision, evidence, next step.
10. **README showcase** — expose the gameplay image, controls, design intent and iteration result; stop here rather than adding low-value scope.

## Stopping rule

The project is deliberately not expanded into a full commercial game. The goal is a compact, playable, explainable casual-game planning portfolio piece.
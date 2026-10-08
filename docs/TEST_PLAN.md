# Manual QA Checklist

## Core loop
- [ ] Aim line updates continuously with pointer/touch movement.
- [ ] Wall bounce is readable and deterministic.
- [ ] A shot attaches to a valid adjacent hex cell rather than overlapping an existing ball.
- [ ] Normal colors only clear when the connected cluster reaches three.
- [ ] Unsupported normal/clone/bomb balls fall after a clear.

## Special elements
- [ ] Bomb can be fired from the launcher.
- [ ] Bomb clears a local area but does not remove stone obstacles.
- [ ] Clone can be fired and copies a nearby normal color into available adjacent cells.
- [ ] HOLD preserves a clone opportunity for a later shot.
- [ ] Stone remains persistent and changes the available route.

## UX
- [ ] Score and combo update after meaningful actions.
- [ ] Mode buttons reset to a known board state.
- [ ] Restart removes old nodes and does not duplicate the board.
- [ ] The prototype works with both mouse and touch events.

## Portfolio review
- [ ] A reviewer can understand each special element within one shot.
- [ ] Each mode creates a different decision, not just a different skin.
- [ ] The 10-level progression can be explained from simple introduction to combined decision density.

Known scope boundary: the current prototype is intentionally a portfolio-grade experiment, not a production game. Audio, full animation curves, persistence, monetization and a level editor are out of scope for this ten-iteration pass.
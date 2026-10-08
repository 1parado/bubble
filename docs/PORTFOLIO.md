# Portfolio Positioning

## Bubble Casual Lab — Special Element Level Design Experiments

This project demonstrates understanding of light-casual puzzle design through implementation.

### Bomb
Burst-oriented: placement creates a clear target and satisfying chain.

### Stone
Route-oriented: placement forces players to rethink angles and trajectories.

### Clone
Planning-oriented: placement creates a meaningful choice about timing.

## Next iteration
- true hex-grid adjacency
- trajectory preview
- deterministic level JSON
- 10 authored levels
- combo and score feedback
- sound hooks
- level completion and fail states
- simple element-placement editor

## Iteration 4 — Decision density

The portfolio story is now framed around three distinct decision types rather than three visual gimmicks:

| Element | Player question | Level-design lever |
|---|---|---|
| Bomb | Where is the highest-value detonation? | blast radius + target density |
| Stone | Which route is worth opening? | barrier geometry + bank angle |
| Clone | Spend now or preserve for a better cluster? | timing + local color composition |

The implementation deliberately keeps the control surface simple while increasing the decision density of each shot.
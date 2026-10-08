# Level Design Notes

Framework: element function -> placement -> player action -> decision cost -> feedback -> emotion.

## Bomb
Burst / chain accelerator. Placement should create a readable target and reward accurate shots.

Suggested progression: isolated bomb -> bomb beside same-color cluster -> bomb behind narrow opening -> two bombs with different shot priorities.

## Stone
Route constraint. The stone should change the geometry of the shot rather than only increase HP.

Suggested progression: horizontal barrier -> central obstacle -> asymmetric obstacle forcing bank shots.

## Clone
Planning multiplier. The player should recognize a meaningful choice between using the clone now and saving it for a larger chain.

Suggested progression: clone a small group -> clone near a bomb -> clone + stone + bomb combination.

## Evaluation
Can the player understand the element without text? Does placement change the best shot? Is the payoff visible immediately? Is there a meaningful alternative action? Does the element create a new decision rather than only more numbers?

## Iteration 2 — Hex-grid placement

The prototype now uses explicit staggered hex-neighbor relationships rather than distance-only matching. Each shot resolves to an adjacent empty cell around the first collision, so placement becomes a level-design variable instead of a visual approximation.

### Design impact
- Bomb: adjacency determines blast value.
- Stone: barriers create real route decisions.
- Clone: the value of cloning depends on nearby color cells.

This is the first step toward authored, testable level layouts.
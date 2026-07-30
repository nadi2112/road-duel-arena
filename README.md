# Road Duel Arena v0.4.7

Open `index.html` directly in a modern browser.

## v0.4.7 highlights

- Fixed bend placement so the committed car uses the same correctly aligned endpoint as the preview.
- Hidden the yellow maneuver preview whenever replay mode is active.
- Retains the v0.4.6 skid, projected-speed, and signed-angle controls described below.

- A loss-of-control bend now completes the normal corner-aligned one-inch bend before the skid begins.
- Skid distance follows the vehicle's original direction of travel and consumes only the movement remaining after the maneuver.
- Skids can continue across later scheduled movements; after the skid is complete, unused movement continues in the direction the car is facing.
- A pending acceleration or deceleration is shown over the player car as `current → projected mph` in red until committed.
- Left and Right Arrow now move through the complete signed bend sequence: 90° left through Straight to 90° right.
- Replay exports identify themselves as version `0.4.7`.

## Existing major systems
- Garage and saved vehicle designs
- Phase-based movement, forward and reverse gear
- Handling, control checks, crash tables, skids, spins, rolls, and vaults
- Basic combat and directional armor
- Deterministic replay export/import
- Camera zoom, pan, follow, fit, and center controls
- Developer inspector and categorized combat log

## Hotkeys
Arrows/WQEX drive, A/D drift, S straight, V changes gear while eligible, F fires, Space/Enter commits, H opens help, and Escape closes help/selects straight.

## Remaining approximations
Top-down rollover/vault animation and landing damage are practical visual approximations. Exact vehicle-to-vehicle and full wall-collision procedures remain planned.

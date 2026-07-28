# Road Duel Arena v0.4.4

Open `index.html` directly in a modern browser.

## v0.4.4 highlights

- Correct compass bearings: 0° is north and 90° is east while simulation angles remain canvas-native.
- Acceleration and deceleration may be selected at the beginning of any phase until a nonzero change is committed that turn.
- Speed choices use 5 mph increments; acceleration is capped by the vehicle design and normal braking is offered through 10 mph.
- Bend choices now include 15°, 30°, 45°, 60°, 75°, and 90°, with D1 through D6 handling difficulty.
- The movement preview reflects the selected bend angle before commitment.
- Skid mechanics remain unchanged pending a dedicated rules review.
- Replay exports identify themselves as version `0.4.4`.

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

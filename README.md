# Road Duel Arena v0.4.3

Open `index.html` directly in a modern browser.

## v0.4.3 highlights
- Locked the arena viewport to a square 1:1 aspect ratio at every responsive breakpoint.
- Removed the misleading Resume Live button; reaching the newest replay frame automatically restores live mode.
- Reworked the heading/momentum inspector into a labeled vehicle-facing and actual-travel diagram.
- Speed changes are now editable selections—accelerate, hold, or decelerate—until Commit Action is pressed.
- Maneuver buttons are enabled only during scheduled movement and are disabled during crash/loss-of-control states.
- Skid mechanics are intentionally unchanged pending a dedicated rules review.
- Replay exports now identify themselves as version `0.4.3`.

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

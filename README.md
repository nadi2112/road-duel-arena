# Road Duel Arena v0.4.8

Open `index.html` directly in a modern browser.

## v0.4.8 highlights

- Added a live **Current Machine-Gun Shot** breakdown to the Developer Inspector.
- Shows the base to-hit, range, target movement, stationary-firer, maneuver, and crash/skid modifiers, plus the total modifier and final roll required.
- Combat log shots now include the complete targeting calculation.
- Fixed the **Combat only** log filter by explicitly categorizing firing and hit/miss events as combat.
- Corrected range modifiers to use point blank below 1 inch and -1 for each full 4-inch range band.
- Replay exports identify themselves as version `0.4.8`.
- Advanced classic modifiers that are not yet implemented are clearly identified in the inspector.

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

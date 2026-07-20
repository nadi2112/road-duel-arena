# Road Duel Arena — Prototype 0.1

A private, browser-based hobby prototype inspired by classic pencil-and-paper vehicular combat.

## Run it

1. Extract the ZIP file.
2. Open `index.html` in Chrome, Edge, or Firefox.
3. Click **Start Duel**.

No installation, web server, package manager, or internet connection is required.

## Implemented in 0.1

- Original top-down arena graphics
- Human player versus basic AI rival
- One-second turns divided into five phases
- Movement timing for speeds from 0 to 100 mph
- Acceleration and deceleration once per turn
- Straight movement, 15-degree bends, and lateral drifts
- Handling status and simplified control checks
- Basic crash behavior
- Front-mounted machine gun
- Front firing arc and range/movement modifiers
- Directional armor
- Internal damage and vehicle destruction
- Arena-wall and vehicle collisions
- Combat log and maneuver preview

## Important prototype limitations

This is a first playable milestone, not a complete implementation of the classic manual.

- Control and crash tables are approximated in this build.
- Collision calculations are simplified.
- Internal component placement is simplified.
- Only one weapon and one arena are available.
- Vehicle construction is planned for Version 0.2.
- The AI is intentionally basic.
- No pedestrians, dropped weapons, fire, explosions, cycles, trikes, or campaign yet.

## Controls

Choose a driving action, optionally fire, and click **Commit Action / Advance Phase**.
A vehicle moves only in phases scheduled for its current speed.

## Project direction

The next major milestone is the vehicle builder and a more data-driven rules engine.

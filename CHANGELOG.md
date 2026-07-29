# Changelog

## v0.4.5
- Changed tabletop scale so one inch of movement equals one full car length.
- Reworked bends to use classic corner-to-corner placement: the inside front corner becomes the matching rear corner.
- Limited bend geometry to the first ordinary inch; additional phase distance continues straight, and half-moves cannot bend.
- Made repeated Left/Right Arrow presses select 15-degree bend increments through 90 degrees.
- Removed the redundant vehicle-direction compass from the Developer Inspector.
- Extended the replay slider to visually use its complete available range.
- Clarified Random seed and RNG state tooltips.

## v0.4.4 — Phase Speed & Bend Controls

- Corrected the inspector and compass to convert canvas headings to compass bearings (north = 0°, east = 90°).
- Added beginning-of-phase speed selection in 5 mph increments.
- A zero/hold selection no longer consumes the once-per-turn speed change.
- Limited acceleration choices to each vehicle's configured acceleration and top-speed limits.
- Added normal deceleration choices of 5 or 10 mph where available.
- Added bend angles of 15°, 30°, 45°, 60°, 75°, and 90° with D1–D6 difficulty.
- Updated bend previews and committed movement to use the selected angle.
- Renamed the maintained TDD to `docs/Road_Duel_Arena_TDD.md`.
- Left skid mechanics unchanged for the next focused review.

# Changelog

## v0.4.3 — Driving Controls & Readability

- Locked the arena viewport to a responsive 1:1 aspect ratio.
- Removed the Resume Live button; replay automatically returns to live at the newest current-game frame.
- Replaced the ambiguous heading/momentum compass with a labeled car-facing and travel-path display.
- Changed accelerate, hold, and decelerate into editable pre-commit speed selections.
- Restricted maneuver controls to scheduled movement phases and disabled them during forced crash movement.
- Left skid mechanics unchanged for a later focused rules review.
- Updated documentation and replay/version metadata to v0.4.3.


## v0.4.2 — Persistent Log & Reverse Preview

- Moved the combat log out of the scrolling controls sidebar into a dedicated third workspace column.
- Made the log fill the available viewport height on wide displays.
- Added responsive breakpoints: the log moves below the arena/control row on medium screens and all panels stack on narrow screens.
- Corrected the dashed reverse movement preview to follow effective travel direction behind the vehicle.
- Corrected reverse bend preview steering so it matches committed movement.
- Updated replay metadata and visible version labels to v0.4.2.

## v0.4.1 — Replay Recovery & Inspector Polish

- Fixed live controls remaining disabled after returning to the newest replay frame.
- Added explicit **Resume Live** control; imported replay files remain safely view-only.
- Replay playback automatically returns to live mode at the end of a current-game replay.
- Reworked control enable/disable logic so every button is recalculated when leaving replay mode.
- Replaced the unexplained RNG value with random seed, replay state/frame, and a subdued advanced RNG-state field.
- Added color-coded crash-state badges.
- Added a heading-versus-momentum compass to the developer inspector.


## v0.4.1
- Added deterministic replay recording and JSON export/import.
- Added replay timeline, stepping, and playback.
- Added camera zoom, pan, fit, center, and follow controls.
- Added fixed combat workspace and developer inspector.
- Added categorized, turn/phase-stamped combat log.

# Changelog

## v0.3.3 — Rollover Refinement

- Rollover results now begin with an immediate 90-degree T-stop, placing the vehicle broadside to its original path.
- Rollover movement preserves the vehicle's pre-crash travel direction instead of following its body orientation.
- Added clockwise/counterclockwise roll direction and explicit right-side, roof, left-side, and underside impact states.
- Reworked rollover art with clearly visible tire positions, distinct side profiles, a windowed roof, and a mechanical underside.
- Added rollover-face labels and per-impact event-log messages for easier playtesting.


## v0.3.2 — Crash Polish

- Failed bends now rotate the vehicle into the commanded heading before a crash skid begins; momentum remains along the pre-bend travel direction.
- Removed automatic HC -6 spinout recovery. Spinouts now continue until the vehicle stops.
- Added a unified visual crash state with red vehicle outlines, crash labels, loss-of-control banners, and dashed red crash trails.
- Rollover graphics now cycle through side, roof, opposite side, and underside views rather than rotating like a spinout.
- Preserved same-phase crash resolution, zero-speed cleanup, and arena-wall collision behavior from v0.3.1.

## v0.3.2 — Handling Stabilization
- Crash Table results and their first forced movement now resolve in the phase control is lost
- Spinouts end automatically at 0 mph
- Automatic HC −6 spinout recovery attempts on every scheduled movement phase
- Recovery transitions for forward, sideways (T-stop), and backward orientations
- Wall and barrier collision checks now apply during skids, spinouts, rolls, and vaults
- Vehicles are clamped inside arena boundaries rather than passing through walls
- Basic forward/reverse gear support, including a full stopped turn before changing direction
- Reverse speed limited to one-fifth of forward top speed; reverse maneuvers are one difficulty harder
- Expanded event-log explanations for recovery and forced movement

## v0.3.0 — Control, Crashes & Hotkeys
- Exact 0–100 mph Control Table
- Crash modifiers and Crash Tables 1/2
- Skids, fishtails, spinouts, rolls, fire, and vaults
- Active center barriers
- Keyboard controls

## v0.2.0 — Garage
Vehicle builder and saved designs.

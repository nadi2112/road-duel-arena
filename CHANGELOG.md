# Changelog

## v0.7.0 - Combat Arsenal

- Replaced the arena's hard-coded front machine gun with selectable per-weapon combat state.
- Added the complete 30-entry Chapter 6 vehicle-weapon catalog, including infrared laser variants and all dropped weapons.
- Added optional A/B/C weapon links and selectable grenade-launcher magazines to the Garage.
- Added front, back, left, right, turret, and underbody mount behavior with visible selected-weapon arcs.
- Added Chapter 3 line of fire, relative-arc movement, complete vehicle targeting modifiers, targeted armor sides, tire shots, turret shots, sustained fire, and impossible-shot handling.
- Added declared fire that resolves after movement so player and AI attacks in a phase are simultaneous.
- Added driver/gunner firing-action limits, per-weapon rate of fire, automatic fire, linked groups, MFR multi-projectile attacks, and laser power drain.
- Added component-level penetration through weapons, power plant, crew, cargo, and opposite-side systems.
- Added fireproof, reflective, reflective-fireproof, and weapon-hit metal armor behavior.
- Added cumulative incendiary modifiers, burn duration, all-component vehicle fire, volatile-load explosions, and blast damage.
- Added persistent mines, Spear 1000 mines, spikes, oil, flaming oil, smoke, and paint with map rendering and contact effects.
- Added grenade-launcher flight time, scatter, and vehicle-applicable grenade effects.
- Extended replay frames to retain hazards, grenades, and declared attacks.
- Added a Chapter 3 calculation module, complete-arsenal regression checks, and a headless multi-weapon arena smoke test.

## v0.6.3 - Controlled-Skid Button Refresh

- Fixed Add Skid remaining disabled after selecting an eligible bend or swerve.
- Maneuver selection now refreshes dependent control states immediately; changing the speed selection is no longer required.
- Preserved the existing controlled-skid rules and execution mechanics.
- Added regression coverage for the maneuver-selection refresh path.

## v0.6.2 - Natural Wall Contact

- Fixed wall and barrier impacts canceling the entire scheduled move and leaving a visible gap.
- Vehicles now advance along the attempted translation and rotation to the last safe position immediately before contact.
- Arena-wall checks now use the rotated vehicle outline instead of a fixed center margin.
- Pushed vehicles and their pushers retain their valid movement before becoming pinned against fixed scenery.
- Added regression coverage for swept last-safe-point collision placement.

## v0.6.1 - Sustained Contact Fix

- Fixed equal-speed rear contact incorrectly combining Temporary Speed values and raising both vehicles to a phantom 20 mph.
- Zero-relative-speed contact no longer causes collision damage, concussion checks, or D1 hazards.
- Vehicles in continuous contact now move together when the path is clear.
- A pushing vehicle and a lead vehicle pinned against a barrier or wall now both stop.
- Contact persistence now uses the oriented vehicle and barrier outlines instead of an approximate center-distance threshold.
- Added regression coverage for equal-speed contact and blocked pushing.

## v0.6.0 - Chapter 2 Driving and Collisions

- Added the remaining car maneuvers: steep drifts, swerves, controlled skids, bootlegger reverses, T-stops, and pivots.
- Added rapid-braking difficulty, tire damage, and road-surface modifiers.
- Replaced generic proximity damage with head-on, rear-end, T-bone, and sideswipe collision procedures.
- Added collision speed, swipe speed, Damage Modifier, and Temporary Speed Table calculations.
- Added directional collision armor, metal-armor absorption, momentum transfer, collision hazards, and optional concussion checks.
- Added fixed-object rams, destructible barriers, wall collisions, debris, impact labels, and continuous-contact suppression.
- Added an Advanced Maneuvers panel and collision details in the arena inspector and combat log.
- Added an independent Chapter 2 rules test suite.
- Preserved the approved v0.5.1 garage layout and visuals.
- Made production asset paths relative so the release works from a GitHub Pages project subdirectory.

## v0.5.1 — Directional Garage

- Moved the smaller live vehicle preview above the sticky Design Summary.
- Removed the three-quarter view and circular turntable in favor of one clear top-down inspection view.
- Fixed front and rear tire graphics so each axle reflects its own selected tire type.
- Replaced the summed armor outline with independent front, back, left, right, top, and underbody treatments.
- Added six always-visible numeric armor point readouts around the vehicle.
- Rebalanced pickup geometry with a much larger bed and shorter hood.
- Added axle labels, armor-type coloring, bay rails, a restrained scan effect, and improved vehicle surface details.

## v0.5.0 — Visual Garage

- Added a live SVG build bay to the Garage.
- Added unique silhouettes for all nine current body types.
- Added dynamic paint colors and gloss, metallic, and matte finishes.
- Added visible weapon models positioned by mount location.
- Added visual tire classes and armor plating levels.
- Added three-quarter and top-view controls.
- Added install animations and workshop presentation effects.
- Saved designs now preserve paint and finish selections.
- Updated page branding, replay metadata, documentation, and cache-busting URLs to v0.5.0.


## v0.4.10

- Fixed browser-cache issue that could leave the older once-per-phase firing code active after upgrading.
- Changed the authoritative fire-rate state to `lastFiredTurn`, preventing the same weapon from firing more than once in a five-phase turn.
- Added version query strings to JavaScript assets so each release loads the matching code.

# v0.4.10 — Once-Per-Turn Weapon Fire

- Corrected machine-gun rate of fire from once per phase to once per turn.
- Tracks firing availability on each vehicle for the entire five-phase turn.
- A weapon becomes available again only when the next turn begins.
- Updated the Fire button state, replay metadata, page branding, README, rule coverage, and technical documentation.

# v0.4.8
- Added a live **Current Machine-Gun Shot** breakdown to the Developer Inspector.
- Combat log shots now print base to-hit, every applied modifier, total modifier, and final roll needed.
- Fixed Combat-only log filtering by assigning combat events an explicit category instead of relying on message inference.
- Corrected prototype range modifiers to classic point-blank / 4-inch-band rules.
- Expanded target-speed modifiers and added the stationary-firer bonus used by the current prototype.
- Clearly labels classic targeting modifiers that are not implemented yet.

# Changelog

## v0.4.7 — Bend Geometry Replay Fix

- Fixed committed bends using an endpoint that was accidentally recalculated from the already-rotated heading.
- Successful and failed bends now reuse the same precomputed, corner-aligned one-inch bend endpoint.
- Movement beyond the first bend inch continues straight along the new vehicle heading.
- Hidden the yellow maneuver preview while viewing replay frames.
- Updated replay metadata and page branding to v0.4.7.

## v0.4.6 — Skid Mechanics & Control Polish

- Changed failed bends to complete the normal one-inch, corner-aligned bend before skid movement begins.
- Made skid movement follow the pre-maneuver travel heading and consume only the phase movement remaining after the bend.
- Preserved unfinished skid distance across later scheduled movements; unused distance after completion continues along the vehicle's body heading.
- Added a red `current → projected mph` map label while acceleration or deceleration is pending.
- Changed Left/Right Arrow bend selection to increment and decrement through left bends, Straight, and right bends without jumping sides.
- Updated replay metadata, page branding, README, and TDD for v0.4.6.

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

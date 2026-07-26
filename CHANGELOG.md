# Changelog

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

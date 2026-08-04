# Road Duel Arena v0.6.2

Open `index.html` directly in a modern browser.

## v0.6.2 highlights

- Preserves the approved v0.5.1 garage presentation and vehicle renderer.
- Adds steep drifts, swerves, controlled skids, T-stops, bootlegger reverses, and 5 mph pivots.
- Adds rapid-braking difficulty and tire-damage consequences.
- Resolves head-on, rear-end, T-bone, and sideswipe collisions separately.
- Uses impact orientation, relative speed, vehicle weight/Damage Modifier, and the Temporary Speed Table.
- Applies collision damage to the correct armor faces, including metal-armor collision protection.
- Adds fixed-object rams, destructible barriers, wall impacts, collision hazards, debris, and optional concussion checks.
- Prevents repeated damage while vehicles remain in continuous contact.
- Treats equal-speed contact as sustained pushing rather than a new collision.
- Stops both vehicles when a pushed vehicle is pinned against a barrier or wall.
- Places vehicles at the last safe point immediately against a wall or barrier instead of canceling the entire phase move.
- Sweeps both translation and rotation so angled impacts and pivots cannot jump into fixed scenery.
- Keeps contact state from actual vehicle outlines so separating movement remains available.
- Adds arena-surface handling modifiers and off-road wear.

## Preserved v0.5.1 garage highlights

- New layered SVG vehicle renderer in the Garage.
- Nine body silhouettes change live with the selected body type.
- Mounted weapons are drawn at their selected front, rear, left, right, top, or underbody positions.
- Dynamic paint color and gloss, metallic, or matte finishes.
- Visual tire, armor, pickup-bed, van, wagon, and camper treatments.
- Compact top-down live build now sits above the sticky Design Summary.
- Front and rear tire choices render independently with distinct tread, size, and sidewall treatments.
- Front, back, left, right, top, and underbody armor render independently with numeric point badges.
- Pickup proportions now use a larger bed, compact cab, and shorter hood.
- Workshop presentation no longer uses the three-quarter transform or circular turntable.
- Animated installation, scan-light, and live-status feedback keep the build bay active without obscuring the car.
- Visual configuration is saved with each vehicle design.

## Existing major systems
- Garage and saved vehicle designs
- Phase-based movement, forward and reverse gear
- Full car maneuver set, rapid braking, handling, control checks, and crash tables
- Skids, spins, rolls, vaults, and directional momentum
- Four vehicle-collision classes plus fixed-object and wall impacts
- Basic combat and directional armor
- Deterministic replay export/import
- Camera zoom, pan, follow, fit, and center controls
- Developer inspector and categorized combat log

## Hotkeys
Arrows/WQEX drive, A/D drift, S straight, V changes gear while eligible, F fires, Space/Enter commits, H opens help, and Escape closes help/selects straight.

## Remaining approximations
Top-down rollover/vault presentation and physical vehicle conforming after an impact are practical computer-first approximations. The Chapter 2 collision tables, damage, armor faces, speed transfer, hazards, and no-repeat-contact rule are implemented.

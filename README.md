# Road Duel Arena v0.5.2

Open `index.html` directly in a modern browser.

## v0.5.2 highlights

- Rebalanced the Garage into a narrower build column and a substantially wider visual/summary column.
- Rotated every vehicle preview so the front faces straight up.
- Enlarged the live vehicle and reshaped the build bay around the upright view.
- Removed the six small armor bubbles from the artwork.
- Added one clean, high-contrast armor strip with large values for Front, Left, Right, Rear, Top, and Under.
- Kept all six armor edges independent on the vehicle itself.
- Added a separate front-direction marker that stays clear of mounted weapons.
- Added a lightweight Vite development setup for repeatable visual testing; the game still opens directly from `index.html`.

## v0.5.1 highlights

- New layered SVG vehicle renderer in the Garage.
- Nine body silhouettes change live with the selected body type.
- Mounted weapons are drawn at their selected front, rear, left, right, top, or underbody positions.
- Dynamic paint color and gloss, metallic, or matte finishes.
- Visual tire, armor, pickup-bed, van, wagon, and camper treatments.
- Compact top-down live build now sits above the sticky Design Summary.
- Front and rear tire choices render independently with distinct tread, size, and sidewall treatments.
- Front, back, left, right, top, and underbody armor render independently.
- Pickup proportions now use a larger bed, compact cab, and shorter hood.
- Workshop presentation no longer uses the three-quarter transform or circular turntable.
- Animated installation, scan-light, and live-status feedback keep the build bay active without obscuring the car.
- Visual configuration is saved with each vehicle design.

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

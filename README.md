# Road Duel Arena v0.7.0

Open `index.html` directly in a modern browser, or run `npm install` followed by `npm run dev`.

## v0.7.0 Combat Arsenal

This release adds the vehicle-applicable combat rules from Chapter 3 and the complete Chapter 6 arsenal while preserving the v0.6.3 driving and collision behavior.

### Weapons and firing

- Select any installed weapon or linked group in the arena.
- Fire through front, back, left, right, or 360-degree turret arcs.
- Select the exposed armor side, a specific tire, or a turret as the target.
- Declare fire before committing movement; player and AI attacks resolve together after movement.
- Track ammunition, weapon DP, power units, one-shot rockets, six independent MFR rockets, laser drain, gunner firing actions, sustained fire, and automatic fire.
- Use the full range, relative-motion, vehicle-profile, visibility, road, maneuver, skid, paint, and specific-target modifier stack.

### Damage and fire

- Penetrating attacks damage weapons, the power plant, crew, cargo, and opposite-side components in Chapter 3 order.
- Driver wounds cause handling hazards; destroyed plants stop acceleration and laser fire.
- Fireproof, reflective, reflective-fireproof, and metal armor apply their special combat behavior.
- Flamethrowers, lasers, flaming oil, thermite, and white phosphorus contribute cumulative fire modifiers.
- Burning vehicles damage every armor face, component, occupant, and tire, and volatile loads may explode.

### Persistent arena effects

- Minedroppers, Spear 1000 mines, spikes, oil, and flaming oil remain where deployed.
- Smoke and paint affect line of fire; ordinary lasers cannot fire through them, while infrared lasers can at reduced damage.
- Paint coats windshields, oil increases maneuver and hazard difficulty, and flaming oil burns out into smoke.
- Grenade launchers use one-second flight and scatter, with twelve selectable grenade magazine types.

### Complete Chapter 6 catalog

The Garage now includes AC, MG, RR, VMG, ATG, GL, SG, HR, LtR, MR, MML, MNR, MFR, RL, LL, ML, L, HL, four infrared lasers, FT, PS, SS, FOJ, OJ, MD, SMD, and SD.

## Existing systems preserved

- Garage and saved vehicle designs
- Exact five-phase movement through 100 mph
- Forward and reverse gear
- Full car maneuver set and rapid braking
- Handling, control checks, and crash tables
- Skids, spins, rolls, vaults, and directional momentum
- Four vehicle-collision classes, fixed-object rams, barriers, walls, and debris
- Deterministic replay export/import, now including combat hazards and pending attacks
- Camera zoom, pan, follow, fit, and center controls
- Developer inspector and categorized combat log

## Hotkeys

Arrows/WQEX drive, A/D drift, S selects straight, V changes gear while eligible, F declares the selected weapon, Space/Enter commits the phase, H opens help, and Escape closes help/selects straight.

## Tests

Run `npm test` for the Chapter 2 calculation suite, Chapter 3 combat calculations, complete-arsenal checks, and a headless multi-weapon arena smoke test.

See `RULE_COVERAGE.md` for exact coverage and documented computer-first adaptations.

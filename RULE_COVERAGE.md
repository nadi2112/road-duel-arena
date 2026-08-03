# Rule Coverage v0.6.0

## Chapter 2 movement and control

- Movement Chart phase scheduling through 100 mph
- Acceleration, normal deceleration, rapid braking, and reverse gear
- Handling Class, Control Table, hazards, and end-turn recovery
- Crash Tables 1 and 2 with skids, fishtails, spins, rolls, vaults, and stops
- Bends from 15 to 90 degrees
- Drifts and steep drifts
- Swerves
- Controlled skids at 1/4, 1/2, 3/4, and 1 inch
- Bootlegger reverses
- T-stops
- 5 mph pivots
- Road-surface handling modifiers and off-road wear
- Debris tire damage and optional concussion effects

## Chapter 2 collisions

- Oriented-box contact detection with swept movement checks
- Head-on, rear-end, T-bone, and sideswipe classification
- Collision and swipe speed calculations
- Weight-based Damage Modifiers and playable-vehicle Temporary Speed Table entries
- Correct affected armor faces and metal-armor collision absorption
- Post-impact speed transfer, handling hazards, and control rolls
- Fixed-object rams, destructible barriers, and wall impacts
- Continuous-contact suppression so one impact is not charged repeatedly
- Impact markers, combat-log explanations, and inspector readouts

## Computer-first approximations

- Rollover/vault artwork and landing presentation are top-down visual approximations.
- Vehicle conforming after impact uses a compact geometric adjustment rather than a literal tabletop corner-pivot sequence.
- The current arena has no ramps, cliffs, or ditches, although Chapter 2 jump, fall, landing-hazard, and debris calculations are implemented in the rules module for future terrain.

# Rule Coverage v0.7.0

## Chapter 2 movement, control, and collisions

- Movement Chart phase scheduling through 100 mph
- Acceleration, deceleration, rapid braking, reverse, and all car maneuvers
- Handling Class, Control Table, hazards, Crash Tables 1 and 2, and end-turn recovery
- Oriented-box and swept collision detection for vehicles, barriers, and walls
- Head-on, rear-end, T-bone, and sideswipe speed, damage, and hazard procedures
- Directional armor, metal-armor collision protection, debris, and concussion
- Continuous contact, pushing, pinned-vehicle stops, and last-safe-point placement

## Chapter 3 vehicle combat

- Combat is declared before committing a phase and resolves after both vehicles move
- All declared attacks resolve as one simultaneous fire step
- One shot per weapon per turn and one firing action per driver or living gunner
- Front, back, left, right, 360-degree turret, and underbody mount behavior
- Line of fire from the actual mount, including barrier blocking
- Player-selected exposed armor side, individual tire, or turret targeting
- Complete range, relative-arc movement, stationary, vehicle-profile, visibility, road, maneuver, skid, paint, target-side, specific-target, and sustained-fire modifiers
- Natural 2 automatic miss and impossible 13+ shots
- Armor-first damage followed by mounted weapons, power plant, crew, cargo, and pass-through damage
- Random selection where several weapons, crew, or internal components share a location
- Driver injury, unconsciousness, death, power-plant loss, laser-power loss, and component destruction
- Plastic, fireproof, laser-reflective, reflective-fireproof, and metal armor behavior
- Enemy-fire handling hazards based on total damage from a firing action
- Cumulative fire modifiers, burn duration, vehicle fire damage, volatile-load explosions, and blast damage
- Automatic fire actions, aimed-fire restrictions, direct-fire lane checks, and automatic dropped-weapon deployment
- Linked individual fire and linked groups; identical same-mount groups aim together
- Mines, Spear 1000 mines, spikes, oil, flaming oil, smoke, and paint as persistent arena objects
- Oil maneuver/hazard modifiers, mine and spike trigger rolls, flaming-oil damage, and paint duration
- Smoke/paint line-of-fire penalties, normal-laser blocking, and infrared-laser penetration
- One-second grenade-launcher flight, grenade scatter, and all car-relevant grenade effects

## Chapter 6 weapons

All 30 vehicle weapon entries are available in the Garage and Arena:

- Small bore: AC, MG, RR, VMG
- Large bore: ATG, GL, SG
- Rockets: HR, LtR, MR, MML, MNR, MFR, RL
- Lasers: LL, ML, L, HL and all four infrared versions
- Flamethrower: FT
- Dropped gas: PS, SS
- Dropped liquid: FOJ, OJ
- Dropped solid: MD, SMD, SD

Each weapon carries its rulebook to-hit value, damage expression, DP, loaded cost, loaded weight, spaces, ammunition, and applicable burst, area, fire, smoke, power, multi-projectile, or dropped-weapon behavior.

## Computer-first adaptations and current entity limits

- The Garage's `top` mount is a 360-degree turret. The `underbody` mount is useful for dropped weapons and cannot trace ordinary direct fire.
- The Garage stores one grenade type per launcher magazine. Mixed, ordered grenade magazines are not yet exposed in the builder.
- Spike-gun area fire uses the opponent's current position as the selected arena square; direct tire fire remains available.
- Vehicle internals use a consistent front-to-back order because the Garage does not yet include a component-layout editor.
- Direct automatic fire uses a narrow four-degree lane test in place of a physical string line.
- The current arena contains cars only. Cycle/trike location tables, pedestrians, hand weapons, passenger hand fire, buildings, cover, and pedestrian-only grenade effects are retained as data where useful but cannot activate without those entity types.
- Chapter 7 accessories are outside this release. Targeting computers, cyberlinks, fire extinguishers, remote mine radios, and smart links therefore have no Garage controls yet.

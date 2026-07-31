# Rule Coverage v0.3.0

Implemented: exact Control Table through 100 mph, speed modifiers, D-3 crash modifier, Crash Table 1 and 2 result bands, end-turn handling recovery, weapon-damage hazards, D3 arena barriers, keyboard controls.

Approximated visually: rollover/vault animation and vault landing damage.

Planned: exact vehicle and wall collisions, detailed tire/wheel integration, component diagrams.


## v0.3.2 stabilization
- Same-phase crash resolution and forced movement
- Spinout termination at zero speed
- Automatic HC -6 spinout recovery
- Boundary/obstacle collision checks during uncontrolled movement
- Basic reverse gear rules

## v0.3.3 rollover refinement
- Rollovers begin with a 90-degree T-stop.
- The vehicle continues rolling along its original travel vector.
- Rollover faces are visually and mechanically tracked as right side, roof, left side, and underside.

- Machine-gun rate of fire: each vehicle weapon may fire once per turn, with availability reset at the start of the next turn.

# Rule Coverage — Prototype 0.1

## Implemented

| System | Status | Notes |
|---|---:|---|
| Five phases per turn | Implemented | Phase controller and UI |
| Speed-based movement | Partial | 0–100 mph movement rows |
| Acceleration | Partial | 5 mph prototype vehicle acceleration |
| Deceleration | Partial | Safe 5 mph decrement only |
| Handling status | Partial | Tracks reductions and end-turn recovery |
| Bends | Partial | 15-degree bends only |
| Drifts | Partial | Standard 1/4-inch lateral drift |
| Control checks | Prototype | Simplified derived table |
| Crash behavior | Prototype | Simplified spin, deceleration, damage |
| Machine gun | Partial | Front mount, 2d to-hit, 1d damage |
| Firing arcs | Implemented | Front 90-degree arc |
| Armor | Partial | Six locations stored; four currently targeted |
| Damage | Partial | Armor then generic internal structure |
| Wall collisions | Prototype | Simplified ram damage |
| Vehicle collisions | Prototype | Simplified relative-speed damage |
| Amateur arena objective | Implemented | Last surviving vehicle wins |
| AI opponent | Prototype | Turns toward target and fires |

## Planned next

1. Exact control table and crash tables
2. Exact collision procedure
3. Vehicle builder with body, chassis, suspension, plant, tires, weapons, armor, weight, space, and cost
4. Component-by-component internal damage
5. More maneuvers
6. Save/load vehicle designs
7. Improved AI

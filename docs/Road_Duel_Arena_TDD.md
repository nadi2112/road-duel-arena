Road Duel Arena
Game Design & Technical Design Document
Document Version: 1.5
Game Version: v0.5.0
Next Milestone: combat targeting and fire mechanics refinement

1. Project Overview
Project Goals
Road Duel Arena is a browser-based vehicular combat game inspired by the mechanics of classic tabletop car-combat games.
The primary goals are to:
Implement the core movement, handling, combat, damage, and vehicle-construction systems.
Preserve the tactical decisions of the tabletop game while using the computer to automate calculations and bookkeeping.
Make complex events easy to understand through animation, replay, logs, and visual indicators.
Build a modular foundation that can support additional vehicles, weapons, maneuvers, arenas, AI opponents, and game modes.
Test whether a complete game can be designed and programmed primarily through collaboration with artificial intelligence.
AI-Directed Development
Road Duel Arena is intentionally being developed as an AI-led project.
The AI is responsible for:
Game-design suggestions
Technical architecture
Coding and debugging
Feature planning
Documentation
Interface recommendations
Rule interpretation and implementation proposals
The human project leader is responsible for:
Setting priorities
Approving design decisions
Supplying reference materials
Testing releases
Reporting problems
Evaluating whether the game is enjoyable and understandable
This development model is partly an experiment to determine whether current AI technology can independently handle the detailed design and implementation of a substantial hobby game. It is also intended to be a challenging and enjoyable collaboration.
The project leader should not need to perform routine coding or low-level design work. The AI should propose, implement, document, and refine solutions based on testing feedback.
Inspiration
The project is inspired by Car Wars and similar tabletop vehicular-combat games.
The original rulebook is used as a reference for mechanics. Road Duel Arena remains an original software implementation with its own code, interface, presentation, artwork, and design decisions.
The guiding question is:
How would Steve Jackson have designed Car Wars if computers existed first?
Scope
The intended scope includes:
Arena-based vehicular combat
Vehicle construction and garage management
Speed, acceleration, braking, and reverse movement
Handling Class and control loss
The full maneuver set represented in the reference rules
Crash tables, skids, spins, vaults, and rollovers
Weapons represented in the reference rules
Armor and internal damage
Computer-controlled opponents
Replay and developer inspection tools
Multiple arenas and game modes
Longer-term campaign and league systems
The goal is not to reproduce the tabletop presentation exactly. The goal is to reproduce and expand upon its tactical mechanics in a computer-first format.
Platform
Road Duel Arena is implemented as a browser-based application.
The browser platform was selected because it provides:
Easy distribution
No installation requirement
Broad operating-system compatibility
Built-in support for graphics, animation, sound, and user interfaces
Rapid testing and iteration
Straightforward sharing with friends
All versions are stored in GitHub and can be found here: github.com/nadi2112/road-duel-arena. Eventually, the plan is to use GitHub pages to host the web based game so that it can be shared and played by friends. This would be useful to debug gameplay and also help suggest any features or improvements. At some point an online play mode should be implemented to enable gameplay between different users online.
Current Version
The current stable baseline is v0.5.0.
Major implemented systems include:
Arena movement
Basic vehicle combat
Computer-controlled opponent behavior
Garage and vehicle construction
Handling and crash resolution
Skids, spins, vaults, and rollovers
Replay controls
Camera controls
Developer inspector
Combat log
Crash-state visual indicators
Current Milestone
The v0.5.0 milestone is complete.
Completed goals:
Corrected weapon rate of fire so the machine gun may fire once during the full five-phase turn, rather than once per phase.
Reset weapon firing availability only when the next turn begins.
Added a live machine-gun targeting breakdown to the Developer Inspector.
Made every currently applied to-hit modifier visible, including the total modifier and final roll required.
Expanded combat-log shot messages to include the targeting calculation.
Fixed the Combat-only log filter by assigning combat events explicit categories.
Corrected point-blank and long-range modifier bands.
Updated replay metadata, page branding, README, changelog, and technical documentation to v0.5.0.

2. Design Philosophy
Computer-First Design
Road Duel Arena should not simply imitate a tabletop game on a screen.
Whenever a rule is implemented, the design should ask:
How would this mechanic work if it had originally been designed for a computer?
The computer should handle calculations, table lookups, state tracking, animation, and record keeping. The player should remain focused on tactical decisions.
Rules First
The underlying mechanics should remain recognizable and tactically meaningful.
The presentation may be improved through:
Animated crashes
Replay
Visual skid trails
Rollover animation
Loss-of-control graphics
Automatic calculations
Combat logs
Developer inspection tools
These improvements should explain and streamline the rules rather than casually replace them.
Readability Over Literal Simulation
When multiple implementations produce similar mechanical results, preference should be given to the one players understand most easily.
Examples include:
A red outline showing that a vehicle is out of control
Dashed trails showing movement and crash direction
Rollover graphics showing vehicle orientation
Crash-state badges
A heading-and-momentum compass
Persistent combat-log messages
A mechanic that is technically accurate but visually confusing should be improved.
Simulation as the Source of Truth
The simulation determines the actual game state.
Rendering, replay, developer tools, and future AI systems should all read from that state rather than maintaining separate versions of events.
This supports:
Consistent behavior
Reliable replay
Easier debugging
Automated testing
Future multiplayer synchronization
Visual Feedback Is Functional
Animations and overlays are not merely decorative.
They explain:
What happened
Why it happened
Where the vehicle is moving
Which direction it is facing
Whether the driver remains in control
How damage or a crash changed the vehicle state
Visual communication is therefore considered part of the gameplay system.
AI Ownership of Detailed Design
The AI should take responsibility for the detailed implementation of approved features.
When a new feature is requested, the expected workflow is:
Interpret the goal and relevant rules.
Propose an appropriate computer-first design.
Implement the feature.
Validate it.
Present it for playtesting.
Refine it from project-leader feedback.
Update this document.
The project leader should guide the destination without needing to manage every technical step.
Documenting Important Decisions
Significant decisions should be recorded in the Rule Deviations or Architecture sections.
Each entry should briefly identify:
The original or previous behavior
Why it was rejected or changed
The current behavior
The reason for the decision
Any possible future revision
This prevents future development from accidentally reversing decisions whose reasoning has already been established.
# 3. Gameplay
## Movement
Vehicles move in phases according to speed. The movement system tracks position, heading, speed, and travel direction.
Supported movement includes:
Acceleration and deceleration
Braking
Forward and reverse movement
Steering and turning
Speed-based movement phases
Planned movement preview
The long-term goal is to support every applicable maneuver from the reference rules.
## Handling
Handling Class represents the driver's remaining control of the vehicle.
Maneuvers reduce Handling Class according to difficulty. Stable driving allows Handling Class to recover over time.
When control is lost, the crash system determines the result.
## Maneuvers
The maneuver system is intended to include all maneuvers supported by the reference rules.
Each maneuver must define:
Required movement
Handling difficulty
Speed restrictions
Position and heading changes
Interaction with crashes and collisions
Visual preview and animation
Any maneuver adapted for computer play will be documented in Section 4.
## Crash System
Loss-of-control events may produce:
Skids
Spins
Vaults
Rollovers
Stops
Other crash-table results
Crash movement preserves the distinction between vehicle heading and momentum.
Visual indicators show the current crash state, travel path, and vehicle orientation.
## Weapons
Combat currently supports basic vehicle weapon use.
The complete weapon system is intended to include all applicable weapons from the reference rules, including their:
Firing arcs
Range behavior
Accuracy modifiers
Damage
Ammunition
Space and weight requirements
Special effects
Weapons that require adaptation for computer play will be documented individually.
## Combat
Combat is based on positioning, range, firing arcs, and line of sight.
A typical attack includes:
Select a weapon and target.
Verify range and firing arc.
Resolve the attack.
Apply armor or internal damage.
Record the result in the combat log.
## Damage
Damage is applied first to the affected armor location and then to internal vehicle systems when armor is penetrated.
The long-term damage model should support:
Directional armor
Internal components
Weapons
Tires
Crew
Power plants
Mobility loss
Vehicle destruction
## Garage
The garage supports vehicle construction and configuration.
Vehicle design may include:
Chassis and body selection
Armor
Weapons
Ammunition
Tires
Power plant
Equipment
Weight
Space
Cost
The garage should validate designs and prevent illegal configurations.
## Artificial Intelligence
Computer-controlled vehicles should use the same rules and simulation as human-controlled vehicles.
AI responsibilities include:
Movement planning
Target selection
Weapon use
Handling-risk evaluation
Collision avoidance
Tactical positioning
Multiple AI skill levels may be added later.
## Victory Conditions
The current focus is arena combat.
Typical victory conditions may include:
Destroying all opposing vehicles
Disabling the opponent
Surviving for a required period
Completing a scenario objective
Additional scenario types may be added later.

# 4. Rule Deviations
This section records deliberate differences from previous implementations or literal tabletop presentation.
## Crash Skids
Original interpretation:
The vehicle continued straight before entering the skid.
Rejected because:
The result felt delayed and did not clearly connect the driver's maneuver to the crash.
Current implementation:
The vehicle rotates toward the commanded heading while momentum continues along the original travel vector. The crash skid then begins.
Reason:
The result is easier to understand and better represents the intended crash behavior visually.
## Spin Recovery
Previous implementation:
The vehicle automatically recovered when Handling Class reached −6.
Rejected because:
Spins often ended before the player could clearly observe them.
Current implementation:
A spinning vehicle continues spinning until it stops.
Possible future rule:
Driver-controlled recovery may be added as an optional mechanic.
## Rollovers
Original implementation:
A rollover appeared as a flat spinning vehicle sprite.
Rejected because:
It did not clearly communicate a vehicle overturning.
Current implementation:
The rollover begins with a T-stop, turns broadside, uses quarter-turn graphics, and preserves momentum.
Reason:
The sequence is easier to follow and visually communicates the rollover.
## Loss-of-Control Presentation
Tabletop presentation:
Control states are communicated through rules, counters, and vehicle placement.
Current implementation:
Loss of control is shown using:
Red vehicle outlines
Dashed crash trails
Crash badges
Rollover graphics
Heading and momentum indicators
Combat-log messages
Reason:
The computer should communicate important state changes immediately.
## Automatic Bookkeeping
The computer automatically manages:
Movement phases
Handling changes
Crash-table results
Damage application
Replay history
Combat-log entries
Reason:
Automation removes administrative work without removing tactical choices.
## Replay
Replay is not part of the original tabletop process.
It is included because it allows players and developers to inspect complex events and verify simulation behavior.
## Future Deviations
Any future adaptation involving maneuvers, weapons, collisions, or campaign rules should be added to this section before release.

# 5. Architecture
## Simulation Engine
The simulation engine is the authoritative source of game state.
It manages:
Vehicles
Movement
Speed
Heading
Momentum
Handling
Crashes
Combat
Damage
Turn progression
Rendering and interface systems must not independently modify simulation results.
## Movement Engine
The movement engine converts speed and player commands into phase-based vehicle movement.
It handles:
Position updates
Heading changes
Maneuver execution
Reverse movement
Movement previews
Crash movement
Arena boundaries
## Handling and Crash Engine
This subsystem tracks handling status and resolves loss-of-control events.
It includes:
Handling costs
Handling recovery
Crash-table selection
Skids
Spins
Vaults
Rollovers
Crash-state termination
## Combat Engine
The combat engine resolves:
Target validity
Firing arcs
Range
Hit determination
Damage
Ammunition use
Combat-log events
## Collision Engine
Vehicle collisions and ramming are planned but not yet complete.
The future system should support:
Collision detection
Relative speed
Impact angle
Vehicle mass
Damage
Momentum transfer
Post-impact movement
Loss of control
## Replay Engine
The replay engine records enough state or event history to reconstruct gameplay.
It supports:
Step forward
Step backward
Pause
Resume
Event inspection
Camera review
Replay should remain deterministic and should not alter the actual match state.
## Rendering System
The renderer displays simulation state through:
Vehicle sprites
Rotation and movement
Skid trails
Crash outlines
Rollover graphics
Movement previews
Arena objects
Status indicators
## Camera System
The camera supports viewing and reviewing arena action.
Planned or existing functions include:
Pan
Zoom
Vehicle focus
Replay tracking
Reset view
## User Interface
The interface includes:
Arena view
Vehicle controls
Status information
Combat log
Replay controls
Camera controls
Developer inspector
Garage screens
The combat log is planned to receive its own persistent column.
## Developer Tools
Developer tools expose internal state for testing and debugging.
They may display:
Position
Heading
Momentum direction
Speed
Handling Class
Crash state
Replay state
AI decisions
These tools are permanent project features.
## Artificial Intelligence
The AI subsystem reads the same legal moves and game state available to the simulation.
It should not rely on hidden shortcuts that violate the game rules.
## Garage System
The garage manages vehicle construction, equipment selection, validation, and saved designs.
It should remain separate from arena simulation while producing compatible vehicle data.
## Project Workflow
Source code and version history are maintained through GitHub.
The intended release workflow is:
Define the milestone.
Implement the feature.
Test the build.
Record playtest feedback.
Fix identified problems.
Update this document.
Commit and tag the release.
Publish the playable build through GitHub Pages when ready.

# 6. Version History
## v0.1 — Arena Prototype
Introduced:
Arena
Vehicle movement
Basic combat
Initial AI opponent
Core turn flow
## v0.1.1 — Movement Corrections
Improved:
Movement-chart behavior
Phase calculations
Vehicle positioning
## v0.2.0 — Garage
Introduced:
Vehicle construction
Garage interface
Vehicle configuration
Design validation foundation
## v0.3.0 — Crash System
Introduced:
Handling and control loss
Crash tables
Skids
Spins
Vaults
Rollovers
Hazards
## v0.3.2 — Crash Presentation
Improved:
Skid logic
Crash visualization
Red crash outline
Dashed crash trail
Loss-of-control feedback
## v0.3.3 — Rollover Improvements
Introduced or improved:
T-stop rollover entry
Broadside rollover movement
Quarter-turn rollover graphics
Momentum preservation
## v0.4.0 — Replay and Developer Tools
Introduced:
Replay system
Camera controls
Developer inspector
Layout improvements
Expanded combat log
## v0.4.1 — Replay and Inspection Refinements
Improved:
Replay behavior
Developer inspector
Heading and momentum compass
Crash-state badges
General interface behavior

# 7. Known Bugs
Current known issues include:
## Replay Resume
Resuming from replay may occasionally leave normal controls unavailable or in an incorrect state.
## Reverse Movement Preview
The dashed movement preview is drawn in front of the vehicle while reverse gear is selected.
It should appear behind the vehicle along the actual travel direction.
## Combat Log Layout
The combat log currently requires scrolling and competes with other interface content.
It should remain visible in a dedicated column.
## General Bug Process
When a bug is fixed:
Remove it from this section.
Add the fix to the appropriate version-history entry.
Record any resulting design decision in Section 4 or Section 5.

# 8. Future Roadmap
## Near-Term
### v0.4.2 — Completed
Delivered:
Dedicated combat-log column
Correct reverse movement preview
Responsive arena/control/log layout
Replay metadata update
Interface cleanup
## Maneuver Expansion
Implement all applicable maneuvers from the reference rules.
Work includes:
Rule review
Maneuver data definitions
Movement preview
Handling costs
Animation
AI support
Testing
Documentation of any adaptations
## Weapon Expansion
Implement all applicable weapons from the reference rules.
Work includes:
Weapon statistics
Firing arcs
Range and accuracy
Damage
Ammunition
Special effects
Garage integration
AI use
Visual and audio feedback
## Medium-Term
Planned systems include:
Vehicle collisions
Ramming
Collision damage
Momentum transfer
Improved AI
Multiple AI vehicles
Additional arena layouts
Expanded damage modeling
Sound effects
Improved visual effects
## Long-Term
Possible future features include:
Tracks and road courses
Scenario-based missions
Campaign mode
Driver progression
Vehicle persistence
Leagues and tournaments
Multiple players
Network multiplayer
Saved replays
Custom arenas
Community-created vehicles
Network multiplayer is a possible future goal rather than a current commitment.

# 9. Playtest Notes
Playtest notes record direct observations and resulting decisions.
Each entry should use the following format:
Version:
Release being tested.
Observation:
What the tester noticed.
Decision:
What will remain or change.
Action:
Specific follow-up work.
## v0.3.2
Observation:
“Skids finally feel correct.”
Decision:
Keep the current heading-and-momentum skid behavior.
Action:
Treat the implementation as the baseline for future crash changes.
## v0.3.3
Observation:
The updated rollover is easier to understand than the flat spinning sprite.
Decision:
Keep the T-stop and quarter-turn rollover presentation.
Action:
Continue refining the graphics without changing the basic sequence.
## v0.4.1
Observation:
Reverse gear works, but the dashed preview appears in the wrong direction.
Decision:
Keep the reverse mechanic and correct only the preview rendering.
Action:
Fixed in v0.4.2 by drawing the preview along effective travel direction.
## v0.4.1
Observation:
The combat log contains important information but is too easy to lose while scrolling.
Decision:
Make the combat log a permanent part of the main arena layout.
Action:
Completed in v0.4.2 with a persistent third column and responsive fallback.
## Ongoing Playtest Priorities
Future testing should evaluate:
Whether vehicle movement is understandable
Whether crashes clearly communicate heading and momentum
Whether maneuvers behave consistently
Whether AI actions appear legal and reasonable
Whether weapon results are clearly reported
Whether the interface keeps essential information visible
Whether replay accurately reproduces events
Whether new features preserve existing behavior


## v0.4.3 — Driving Controls and Readability
Introduced:
- A square 1:1 arena viewport that scales without geometric distortion.
- Editable pre-commit speed choices: accelerate, hold speed, or decelerate.
- Phase-aware maneuver button availability.
- Crash-state maneuver lockout.
- A redesigned heading-and-travel diagram with explicit labels and numeric bearings.
- Automatic live-mode restoration at the newest replay frame without a separate Resume Live button.

### Interface Decision: Arena Aspect Ratio
Previous behavior:
The arena canvas stretched to fill its container and could become wider or taller as the browser changed shape.
Current behavior:
The visible arena remains square at every layout breakpoint. The canvas and CSS viewport both use a 1:1 aspect ratio.
Reason:
Vehicle shapes, angles, movement distances, and arena geometry should not be visually distorted by window size.

### Interface Decision: Pending Speed Change
Previous behavior:
Accelerate or decelerate immediately changed speed and locked the decision before the phase was committed.
Current behavior:
The player may select accelerate, hold speed, or decelerate and revise the selection until Commit Action. The selected change is applied at the start of commitment, before phase movement.
Reason:
This preserves the beginning-of-phase speed decision while allowing normal computer-interface correction before final submission.

### Interface Decision: Maneuver Availability
Current behavior:
Maneuver buttons are enabled only when the movement chart schedules movement for the player's vehicle and the vehicle is under control. They are disabled during skids and other forced crash movement. Commit remains available so a no-movement phase can advance.
Reason:
Unavailable actions should be visibly unavailable rather than accepted and silently ignored.

### Playtest Note: Skids
Observation:
The current skid implementation may still need rules review.
Decision:
Do not revise skid mechanics as part of v0.4.3.
Action:
Schedule a focused comparison of the implemented skid sequence against the reference crash rules before making further changes.


## v0.4.5 — Phase Speed and Bend Controls
Introduced:
- Compass-bearing conversion for heading and travel displays. Simulation angles remain unchanged, while user-facing bearings use north as 0° and east as 90°.
- Speed-change selection at the beginning of any phase, provided the vehicle has not already accelerated or decelerated during that turn.
- Five-mph speed-change increments. Acceleration options are capped by the vehicle's configured maximum acceleration and applicable top speed. Normal braking options currently extend through 10 mph.
- A hold-speed choice that does not consume the once-per-turn speed-change opportunity.
- Bend choices of 15°, 30°, 45°, 60°, 75°, and 90°.
- Bend difficulty of D1 for each 15° increment, through D6 at 90°.
- Direction-aware previews and committed movement for every supported bend angle.

### Rules Decision: Timing of Speed Changes
Previous implementation:
The speed-change choice was effectively treated as a first-phase or automatically consumed decision.

Current implementation:
At the beginning of each phase, the player may choose a legal speed change if no nonzero speed change has yet been committed that turn. The chosen change is applied immediately before movement for that phase. Holding speed leaves the option available in later phases.

Reason:
The reference rules permit acceleration or deceleration once per turn at the beginning of any phase, not necessarily Phase 1.

### Rules Decision: Bend Angles
Current implementation:
The bend control offers 15° increments from 15° through 90°. Difficulty increases by one for every 15°: D1, D2, D3, D4, D5, and D6.

Reason:
This directly follows the bend difficulty ranges and gives the player the full basic bend set with a simple computer-first selector.

### Deferred Review: Skid Mechanics
Skid, fishtail, spin, rollover, and other loss-of-control movement are intentionally unchanged in v0.4.5. A focused rules and presentation review is planned for the next development discussion.


## v0.4.6 — Skid Mechanics & Control Polish

### Failed bend and skid order
A failed bend still completes the same one-inch corner-aligned bend used by a successful maneuver. The vehicle then skids from that completed bend position along the travel heading recorded immediately before the maneuver.

The phase movement budget is consumed in this order:
1. One inch for the normal bend.
2. As much pending skid distance as the remaining phase movement permits.
3. Any distance still unused after the skid is complete moves straight along the vehicle's current body heading.

If the phase contains only one inch, the bend consumes the entire phase and the skid begins on the vehicle's next scheduled movement. If the phase contains two or more inches, some or all of the skid may occur immediately after the bend. Unfinished skid distance remains in crash state and continues on later scheduled movements.

### Projected speed label
While a legal acceleration or deceleration is selected but not committed, the map label above the player vehicle displays the current and projected speeds in red using `current → projected mph`. The normal label returns after commitment or cancellation.

### Signed bend keyboard sequence
Left and Right Arrow operate on a signed angle from -90° through 0° to +90°. The sequence includes Straight, so reversing direction requires stepping back through smaller bends instead of jumping immediately to the opposite side.


## v0.4.8 — Combat Targeting Visibility

- Added a live machine-gun shot calculation to the Developer Inspector.
- Displayed base to-hit, applied modifiers, total modifier, and final required roll.
- Added detailed targeting calculations to combat-log firing messages.
- Fixed Combat-only filtering by explicitly categorizing combat events.
- Corrected point-blank and four-inch-band range modifiers.
- Updated replay metadata and all current-version branding and documentation.

## v0.4.7 — Bend Geometry Replay Fix

- The one-inch bend endpoint is calculated once from the vehicle's pre-maneuver heading and reused for both successful and loss-of-control movement paths.
- Any movement beyond the first inch proceeds straight along the post-bend heading.
- Maneuver previews are suppressed whenever replay mode is active.

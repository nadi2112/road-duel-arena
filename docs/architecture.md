# Architecture

- `data.js`: Chapter 6 construction, weapon, and grenade catalogs
- `chapter2.js`: pure driving, control, crash, and collision rules
- `chapter3.js`: pure firing arcs, attack modifiers, damage dice, sustained fire,
  placement, and scatter rules
- `garage.js`: construction calculations, weapon mounts/links, validation, and
  local design storage
- `app.js`: navigation and match setup
- `arena.js`: phase engine, simultaneous fire declarations, weapon state,
  component damage, fire, persistent hazards, UI updates, and canvas rendering

The arena owns mutable match state; `chapter2.js` and `chapter3.js` remain
deterministic rule modules so their tables can be regression-tested without a
browser. Every installed weapon receives its own DP, ammunition, mode, and
sustained-fire state when a design enters the arena.

Classic scripts are used so the project continues to work when `index.html` is opened directly from disk.

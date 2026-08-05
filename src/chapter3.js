(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RDA_CHAPTER3 = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const norm = angle => (angle % 360 + 360) % 360;
  const angleDifference = (a, b) => {
    const value = Math.abs(norm(a - b));
    return value > 180 ? 360 - value : value;
  };

  function relativeArc(vehicle, observer) {
    const bearing = norm(Math.atan2(observer.y - vehicle.y, observer.x - vehicle.x) * 180 / Math.PI);
    const delta = norm(bearing - vehicle.heading);
    if (delta <= 45 || delta >= 315) return "front";
    if (delta >= 135 && delta <= 225) return "back";
    return "side";
  }

  function mountArcCenter(vehicle, mount) {
    const offset = {front: 0, right: 90, back: 180, left: -90}[mount];
    return offset === undefined ? null : norm(vehicle.heading + offset);
  }

  function inMountArc(vehicle, target, mount) {
    if (mount === "top") return true; // Top mounts are treated as turrets in the arena builder.
    if (mount === "under") return false;
    const center = mountArcCenter(vehicle, mount);
    if (center === null) return false;
    const bearing = norm(Math.atan2(target.y - vehicle.y, target.x - vehicle.x) * 180 / Math.PI);
    return angleDifference(bearing, center) <= 45;
  }

  function speedModifier(speed) {
    const value = Math.abs(speed);
    if (value < 30) return 0;
    return -Math.min(6, Math.floor((value - 20) / 10));
  }

  function relativeMovementSpeed(firer, target, movingToward) {
    const firerInTarget = relativeArc(target, firer);
    const targetInFirer = relativeArc(firer, target);
    const t = target.speed || 0, f = firer.speed || 0;
    const matrix = {
      front: {front: t / 2, back: (t - f) / 2, side: -t / 2},
      back: {front: (t - f) / 2, back: -t / 2, side: t / 2},
      side: {front: t, back: t, side: movingToward ? t : t - f}
    };
    return {speed: matrix[firerInTarget][targetInFirer], firerInTarget, targetInFirer};
  }

  function rangeModifier(range) {
    if (range < 1) return 4;
    const bands = Math.floor(range / 4);
    return bands ? -bands : 0;
  }

  function vehicleTargetModifier(bodyKey, targetFace) {
    let modifier = bodyKey === "compact" || bodyKey === "subcompact" ? -1 : 0;
    if (targetFace === "front" || targetFace === "back") modifier--;
    return modifier;
  }

  function parseDamage(expression) {
    const match = /^(\d+)d(?:([+-])(\d+))?$/.exec(String(expression || ""));
    if (!match) return {dice: 0, modifier: 0};
    return {dice: Number(match[1]), modifier: match[2] === "-" ? -Number(match[3]) : Number(match[3] || 0)};
  }

  function rollDamage(expression, die) {
    const spec = parseDamage(expression);
    const rolls = Array.from({length: spec.dice}, () => die());
    return {rolls, total: Math.max(0, rolls.reduce((sum, value) => sum + value, 0) + spec.modifier)};
  }

  function visibleSides(target, attacker) {
    const bearing = norm(Math.atan2(attacker.y - target.y, attacker.x - target.x) * 180 / Math.PI - target.heading);
    if (bearing === 45) return ["front", "right"];
    if (bearing === 135) return ["right", "back"];
    if (bearing === 225) return ["back", "left"];
    if (bearing === 315) return ["left", "front"];
    if (bearing < 90) return ["front", "right"];
    if (bearing < 180) return ["right", "back"];
    if (bearing < 270) return ["back", "left"];
    return ["left", "front"];
  }

  function primarySide(target, attacker) {
    const bearing = norm(Math.atan2(attacker.y - target.y, attacker.x - target.x) * 180 / Math.PI - target.heading);
    if (bearing < 45 || bearing >= 315) return "front";
    if (bearing < 135) return "right";
    if (bearing < 225) return "back";
    return "left";
  }

  function targetedSidePenalty(target, attacker, requestedSide) {
    if (!requestedSide || requestedSide === "auto") return 0;
    const visible = visibleSides(target, attacker);
    if (!visible.includes(requestedSide)) return null;
    const primary = primarySide(target, attacker);
    return primary === requestedSide ? 0 : -2;
  }

  function sustainedFireBonus(weapon, targetId, turn) {
    if (weapon.automatic || weapon.lastTargetId !== targetId || weapon.lastFiredTurn !== turn - 1) return 0;
    return weapon.sustainedTurns >= 2 ? 2 : weapon.sustainedTurns >= 1 ? 1 : 0;
  }

  function updateSustainedFire(weapon, targetId, turn, automatic) {
    if (automatic || weapon.lastTargetId !== targetId || weapon.lastFiredTurn !== turn - 1) weapon.sustainedTurns = 1;
    else weapon.sustainedTurns = Math.min(3, (weapon.sustainedTurns || 1) + 1);
    weapon.lastTargetId = targetId;
    weapon.lastFiredTurn = turn;
    if (automatic) weapon.sustainedTurns = 0;
  }

  function mountIsLegal(weapon, mount) {
    if (weapon.mountRule === "rearSide") return ["back", "left", "right"].includes(mount);
    return true;
  }

  function hazardDimensions(type) {
    if (["mine", "spearMine", "spikes"].includes(type)) return {length: .5, width: .5};
    if (["paint", "smoke", "flamingOil", "oil"].includes(type)) return {length: 1, width: .5};
    return {length: 1, width: 1};
  }

  function grenadeScatter(missedBy, die) {
    let squares;
    if (missedBy <= 0) squares = Math.max(0, die() - 3);
    else if (missedBy === 1) squares = Math.max(1, die() - 1);
    else if (missedBy === 2) squares = die() + 1;
    else if (missedBy === 3) squares = Math.max(1, die() + die() - 2);
    else if (missedBy <= 5) squares = die() + die() + 3;
    else squares = Math.max(8, die() + die() + die());
    return squares * .25;
  }

  function metalCollisionArmor(incoming, armorPoints) {
    const damage = Math.max(0, Math.floor(incoming));
    const armor = Math.max(0, Math.floor(armorPoints));
    const absorbed = Math.min(damage, armor * 3);
    const loss = Math.min(Math.ceil(armor / 2), Math.ceil(absorbed / 3));
    return {absorbed, loss, penetrated: damage - absorbed};
  }

  return {
    norm,
    angleDifference,
    relativeArc,
    mountArcCenter,
    inMountArc,
    speedModifier,
    relativeMovementSpeed,
    rangeModifier,
    vehicleTargetModifier,
    parseDamage,
    rollDamage,
    visibleSides,
    primarySide,
    targetedSidePenalty,
    sustainedFireBonus,
    updateSustainedFire,
    mountIsLegal,
    hazardDimensions,
    grenadeScatter,
    metalCollisionArmor
  };
});

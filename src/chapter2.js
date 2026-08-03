(function (root, factory) {
  const rules = factory();
  root.RDA_CHAPTER2 = rules;
  if (typeof module === "object" && module.exports) module.exports = rules;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SURFACE_MODIFIERS = Object.freeze({
    dry: 0,
    offroad: 1,
    lightRain: 1,
    heavyRain: 2,
    gravel: 1,
    oil: 2,
    lightSnow: 2,
    heavySnow: 3,
    ice: 4,
  });

  const FALL_TABLE = Object.freeze([
    { max: 0.25, phases: 2, dice: 1, modifier: -2 },
    { max: 0.5, phases: 3, dice: 1, modifier: -1 },
    { max: 0.75, phases: 4, dice: 1, modifier: -1 },
    { max: 1.0, phases: 5, dice: 1, modifier: 0 },
    { max: 1.5, phases: 6, dice: 1, modifier: 0 },
    { max: 2.25, phases: 7, dice: 1, modifier: 0 },
    { max: 2.5, phases: 8, dice: 1, modifier: 0 },
    { max: 3.0, phases: 8, dice: 2, modifier: 0 },
    { max: 3.25, phases: 9, dice: 2, modifier: 0 },
    { max: 3.75, phases: 9, dice: 3, modifier: 0 },
    { max: 4.0, phases: 10, dice: 3, modifier: 0 },
  ]);

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function angleDifference(a, b) {
    const value = Math.abs(normalizeAngle(a - b));
    return value > 180 ? 360 - value : value;
  }

  function roundUp5(value) {
    return Math.ceil(Math.max(0, value) / 5) * 5;
  }

  function damageModifier(weight) {
    if (weight <= 2000) return 1 / 3;
    if (weight <= 4000) return 2 / 3;
    if (weight <= 8000) return 1;
    if (weight <= 12000) return 2;
    if (weight <= 16000) return 3;
    if (weight <= 20000) return 4;
    if (weight <= 24000) return 5;
    return 5 + Math.ceil((weight - 24000) / 4000);
  }

  function dmKey(dm) {
    if (dm <= 1 / 3 + 1e-9) return "1/3";
    if (dm <= 2 / 3 + 1e-9) return "2/3";
    return String(Math.max(1, Math.round(dm)));
  }

  // The current construction system produces cars no heavier than 8,000 lb,
  // so these are the exact TST intersections used by playable vehicles.
  const LIGHT_VEHICLE_TST = Object.freeze({
    "1/3": Object.freeze({ "1/3": 1 / 2, "2/3": 1 / 4, "1": 1 / 4 }),
    "2/3": Object.freeze({ "1/3": 3 / 4, "2/3": 1 / 2, "1": 1 / 2 }),
    "1": Object.freeze({ "1/3": 3 / 4, "2/3": 1 / 2, "1": 1 / 2 }),
  });

  function temporarySpeedFactor(ownDM, opposingDM) {
    const own = dmKey(ownDM), opposing = dmKey(opposingDM);
    if (LIGHT_VEHICLE_TST[own] && LIGHT_VEHICLE_TST[own][opposing] !== undefined) {
      return LIGHT_VEHICLE_TST[own][opposing];
    }
    // Chapter 2's full table extends to tractor-trailer weights. This ratio
    // form preserves its quarter-step behavior for fixed objects and future
    // heavy vehicles while the exact playable-car intersections remain above.
    const ratio = ownDM / Math.max(opposingDM, 1 / 3);
    if (ratio >= 2.5) return 1;
    if (ratio >= 1.25) return 3 / 4;
    if (ratio >= 0.5) return 1 / 2;
    if (ratio >= 0.125) return 1 / 4;
    return 0;
  }

  function temporarySpeed(speed, ownDM, opposingDM) {
    return roundUp5(speed * temporarySpeedFactor(ownDM, opposingDM));
  }

  function ramDamageSpec(speed) {
    const value = roundUp5(speed);
    if (value <= 0) return { dice: 0, modifier: 0 };
    if (value <= 5) return { dice: 1, modifier: -4 };
    if (value <= 10) return { dice: 1, modifier: -2 };
    if (value <= 15) return { dice: 1, modifier: -1 };
    if (value <= 30) return { dice: 1, modifier: 0 };
    return { dice: 1 + Math.floor((value - 30) / 5), modifier: 0 };
  }

  function rollRamDamage(speed, die) {
    const spec = ramDamageSpec(speed);
    let total = spec.modifier;
    for (let i = 0; i < spec.dice; i += 1) total += die();
    return Math.max(0, total);
  }

  function collisionSpeeds(type, v1Speed, v2Speed, v1DM, v2DM, sameDirection = true) {
    const t1 = temporarySpeed(v1Speed, v1DM, v2DM);
    const t2 = temporarySpeed(v2Speed, v2DM, v1DM);
    if (type === "headOn") {
      const difference = Math.abs(t1 - t2);
      return {
        collisionSpeed: v1Speed + v2Speed,
        temporary1: t1,
        temporary2: t2,
        speed1: t1 >= t2 ? difference : 0,
        speed2: t2 > t1 ? difference : 0,
      };
    }
    if (type === "rearEnd") {
      const collisionSpeed = Math.abs(v1Speed - v2Speed);
      if (collisionSpeed === 0) {
        return {
          collisionSpeed: 0,
          temporary1: t1,
          temporary2: t2,
          speed1: v1Speed,
          speed2: v2Speed,
          sustained: true,
        };
      }
      return {
        collisionSpeed,
        temporary1: t1,
        temporary2: t2,
        speed1: t1 + t2,
        speed2: t1 + t2,
      };
    }
    if (type === "tBone") {
      return {
        collisionSpeed: v1Speed,
        temporary1: t1,
        temporary2: t2,
        speed1: t1,
        speed2: v2Speed,
      };
    }
    const net = sameDirection ? Math.abs(v1Speed - v2Speed) : v1Speed + v2Speed;
    const swipeSpeed = roundUp5(net / 4);
    if (swipeSpeed === 0) {
      return {
        collisionSpeed: 0,
        swipeSpeed: 0,
        temporary1: t1,
        temporary2: t2,
        speed1: v1Speed,
        speed2: v2Speed,
        sustained: true,
      };
    }
    return {
      collisionSpeed: swipeSpeed,
      swipeSpeed,
      temporary1: t1,
      temporary2: t2,
      speed1: v1Speed,
      speed2: v2Speed,
    };
  }

  function collisionHazard(type, originalSpeed, finalSpeed, swipeSpeed = 0) {
    const basis = type === "sideswipe" ? swipeSpeed : Math.abs(originalSpeed - finalSpeed);
    if (basis <= 0) return 0;
    return Math.max(1, Math.ceil(basis / 10));
  }

  function contactAction({ activeContact = false, collisionSpeed = 0, movingToward = true, pushedBlocked = false } = {}) {
    if (!movingToward) return "separate";
    if (activeContact || collisionSpeed <= 0) return pushedBlocked ? "halt" : "push";
    return "impact";
  }

  function classifyCollision({
    attackerFace,
    defenderFace,
    attackerMotion,
    defenderMotion,
    attackerDirection = 1,
    defenderDirection = 1,
  }) {
    const difference = angleDifference(attackerMotion, defenderMotion);
    const attackerLead = attackerDirection < 0 ? "back" : "front";
    const defenderLead = defenderDirection < 0 ? "back" : "front";
    const defenderRear = defenderDirection < 0 ? "front" : "back";
    const attackerSide = attackerFace === "left" || attackerFace === "right";
    const defenderSide = defenderFace === "left" || defenderFace === "right";
    if (attackerSide && defenderSide) return "sideswipe";
    if (difference <= 45 && attackerFace === attackerLead && defenderFace === defenderRear) return "rearEnd";
    if (difference >= 135 && attackerFace === attackerLead && defenderFace === defenderLead) return "headOn";
    if (defenderSide && attackerFace === attackerLead) return "tBone";
    if (attackerSide || defenderSide) return "sideswipe";
    return difference >= 90 ? "headOn" : "rearEnd";
  }

  function controlledSkid(distance) {
    const key = Number(distance);
    return {
      0.25: { difficulty: 1, firePenalty: 1, deceleration: 0, tireDamage: 0 },
      0.5: { difficulty: 2, firePenalty: 3, deceleration: 5, tireDamage: 0 },
      0.75: { difficulty: 3, firePenalty: 6, deceleration: 5, tireDamage: 1 },
      1: { difficulty: 4, firePenalty: 99, deceleration: 10, tireDamage: 2 },
    }[key] || null;
  }

  function maneuverDifficulty(type, options = {}) {
    const angle = Math.max(0, Number(options.angle || 0));
    let difficulty = 0;
    if (type === "bend") difficulty = Math.ceil(angle / 15);
    else if (type === "drift") difficulty = 1;
    else if (type === "steepDrift") difficulty = 3;
    else if (type === "swerve") difficulty = Math.ceil(angle / 15) + 1;
    else if (type === "bootlegger") difficulty = 7;
    else if (type === "tstop") difficulty = Math.ceil(Math.max(0, options.speed || 0) / 10);
    const skid = controlledSkid(options.skidDistance);
    if (skid && (type === "bend" || type === "swerve")) difficulty += skid.difficulty;
    if (options.reverse && difficulty > 0) difficulty += 1;
    if (type !== "straight") difficulty += SURFACE_MODIFIERS[options.surface] || 0;
    return difficulty;
  }

  function brakingDifficulty(deceleration) {
    const value = Math.max(0, Number(deceleration || 0));
    if (value <= 10) return 0;
    if (value <= 15) return 1;
    if (value <= 20) return 2;
    if (value <= 25) return 3;
    if (value <= 30) return 5;
    if (value <= 35) return 7;
    if (value <= 40) return 9;
    if (value <= 45) return 11;
    return Infinity;
  }

  function rapidBrakeTireDamage(deceleration, die) {
    if (deceleration < 35) return 0;
    if (deceleration === 35) return 2;
    if (deceleration === 40) return die();
    return die() + 3;
  }

  function surfaceModifier(surface) {
    return SURFACE_MODIFIERS[surface] || 0;
  }

  function jumpDistance(speed, angle) {
    if (angle < 15 || angle > 45 || speed <= 20) return 0;
    const full = ((speed - 20) / 10) * 15;
    return angle >= 20 && angle <= 40 ? full : full / 2;
  }

  function landingHazard(distanceFeet, slope = "level") {
    let difficulty = Math.max(1, 1 + Math.floor(Math.max(0, distanceFeet) / 30));
    if (slope === "down") difficulty -= 1;
    if (slope === "up") difficulty += 1;
    return Math.max(0, difficulty);
  }

  function fallResult(heightInches) {
    return FALL_TABLE.find((row) => heightInches <= row.max) || FALL_TABLE[FALL_TABLE.length - 1];
  }

  function debrisTireDamage(dieResult) {
    return Math.max(0, dieResult - 3);
  }

  function concussionThreshold(speedChange) {
    return Math.ceil(Math.max(0, speedChange) / 10);
  }

  return Object.freeze({
    SURFACE_MODIFIERS,
    normalizeAngle,
    angleDifference,
    roundUp5,
    damageModifier,
    temporarySpeedFactor,
    temporarySpeed,
    ramDamageSpec,
    rollRamDamage,
    collisionSpeeds,
    collisionHazard,
    contactAction,
    classifyCollision,
    controlledSkid,
    maneuverDifficulty,
    brakingDifficulty,
    rapidBrakeTireDamage,
    surfaceModifier,
    jumpDistance,
    landingHazard,
    fallResult,
    debrisTireDamage,
    concussionThreshold,
  });
});

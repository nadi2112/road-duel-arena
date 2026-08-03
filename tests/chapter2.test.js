const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../src/chapter2.js");

test("collision damage modifiers follow the Chapter 2 weight bands", () => {
  assert.equal(rules.damageModifier(2000), 1 / 3);
  assert.equal(rules.damageModifier(2001), 2 / 3);
  assert.equal(rules.damageModifier(4001), 1);
  assert.equal(rules.damageModifier(8001), 2);
  assert.equal(rules.damageModifier(24001), 6);
});

test("ram damage dice follow the movement chart", () => {
  assert.deepEqual(rules.ramDamageSpec(5), { dice: 1, modifier: -4 });
  assert.deepEqual(rules.ramDamageSpec(10), { dice: 1, modifier: -2 });
  assert.deepEqual(rules.ramDamageSpec(15), { dice: 1, modifier: -1 });
  assert.deepEqual(rules.ramDamageSpec(20), { dice: 1, modifier: 0 });
  assert.deepEqual(rules.ramDamageSpec(30), { dice: 1, modifier: 0 });
  assert.deepEqual(rules.ramDamageSpec(35), { dice: 2, modifier: 0 });
  assert.deepEqual(rules.ramDamageSpec(40), { dice: 3, modifier: 0 });
  assert.deepEqual(rules.ramDamageSpec(100), { dice: 15, modifier: 0 });
  assert.deepEqual(rules.ramDamageSpec(200), { dice: 35, modifier: 0 });
});

test("playable vehicle temporary-speed intersections are exact", () => {
  assert.equal(rules.temporarySpeedFactor(1 / 3, 1 / 3), 1 / 2);
  assert.equal(rules.temporarySpeedFactor(1 / 3, 2 / 3), 1 / 4);
  assert.equal(rules.temporarySpeedFactor(2 / 3, 1 / 3), 3 / 4);
  assert.equal(rules.temporarySpeedFactor(2 / 3, 2 / 3), 1 / 2);
  assert.equal(rules.temporarySpeedFactor(1, 1), 1 / 2);
  assert.equal(rules.temporarySpeed(35, 2 / 3, 1), 20);
});

test("the four collision procedures calculate their distinct speeds", () => {
  const headOn = rules.collisionSpeeds("headOn", 40, 20, 2 / 3, 2 / 3);
  assert.equal(headOn.collisionSpeed, 60);
  assert.deepEqual([headOn.speed1, headOn.speed2], [10, 0]);

  const rearEnd = rules.collisionSpeeds("rearEnd", 40, 20, 2 / 3, 2 / 3);
  assert.equal(rearEnd.collisionSpeed, 20);
  assert.deepEqual([rearEnd.speed1, rearEnd.speed2], [30, 30]);

  const tBone = rules.collisionSpeeds("tBone", 40, 20, 2 / 3, 2 / 3);
  assert.equal(tBone.collisionSpeed, 40);
  assert.deepEqual([tBone.speed1, tBone.speed2], [20, 20]);

  const swipe = rules.collisionSpeeds("sideswipe", 60, 20, 2 / 3, 2 / 3, true);
  assert.equal(swipe.swipeSpeed, 10);
  assert.deepEqual([swipe.speed1, swipe.speed2], [60, 20]);
});

test("impact orientation classifies all four collision types", () => {
  assert.equal(rules.classifyCollision({attackerFace:"front",defenderFace:"front",attackerMotion:0,defenderMotion:180}), "headOn");
  assert.equal(rules.classifyCollision({attackerFace:"front",defenderFace:"back",attackerMotion:0,defenderMotion:0}), "rearEnd");
  assert.equal(rules.classifyCollision({attackerFace:"front",defenderFace:"right",attackerMotion:0,defenderMotion:90}), "tBone");
  assert.equal(rules.classifyCollision({attackerFace:"right",defenderFace:"left",attackerMotion:0,defenderMotion:0}), "sideswipe");
});

test("maneuver difficulties include controlled skids, reverse, and road surface", () => {
  assert.equal(rules.maneuverDifficulty("bend", { angle: 90 }), 6);
  assert.equal(rules.maneuverDifficulty("steepDrift"), 3);
  assert.equal(rules.maneuverDifficulty("swerve", { angle: 30 }), 3);
  assert.equal(rules.maneuverDifficulty("bend", { angle: 45, skidDistance: 0.75 }), 6);
  assert.equal(rules.maneuverDifficulty("bend", { angle: 15, reverse: true, surface: "ice" }), 6);
  assert.equal(rules.maneuverDifficulty("straight", { surface: "ice" }), 0);
  assert.equal(rules.maneuverDifficulty("pivot", { surface: "lightRain" }), 1);
});

test("rapid braking and controlled skid consequences match Chapter 2", () => {
  assert.equal(rules.brakingDifficulty(10), 0);
  assert.equal(rules.brakingDifficulty(15), 1);
  assert.equal(rules.brakingDifficulty(30), 5);
  assert.equal(rules.brakingDifficulty(45), 11);
  assert.equal(rules.brakingDifficulty(50), Infinity);
  assert.deepEqual(rules.controlledSkid(0.75), { difficulty: 3, firePenalty: 6, deceleration: 5, tireDamage: 1 });
  assert.equal(rules.rapidBrakeTireDamage(35, () => 6), 2);
  assert.equal(rules.rapidBrakeTireDamage(40, () => 4), 4);
  assert.equal(rules.rapidBrakeTireDamage(45, () => 4), 7);
});

test("terrain support covers jumps, falls, debris, and concussion", () => {
  assert.equal(rules.jumpDistance(40, 30), 30);
  assert.equal(rules.jumpDistance(40, 15), 15);
  assert.equal(rules.landingHazard(60), 3);
  assert.deepEqual(rules.fallResult(0.5), { max: 0.5, phases: 3, dice: 1, modifier: -1 });
  assert.equal(rules.debrisTireDamage(2), 0);
  assert.equal(rules.debrisTireDamage(6), 3);
  assert.equal(rules.concussionThreshold(35), 4);
});

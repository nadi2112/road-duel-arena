const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const rules = require("../src/chapter3.js");

const car = (x, y, heading, speed = 0) => ({x, y, heading, speed});

test("mounted weapons use their Chapter 3 firing arcs", () => {
  const shooter = car(0, 0, 0);
  assert.equal(rules.inMountArc(shooter, car(10, 0, 0), "front"), true);
  assert.equal(rules.inMountArc(shooter, car(0, 10, 0), "right"), true);
  assert.equal(rules.inMountArc(shooter, car(-10, 0, 0), "back"), true);
  assert.equal(rules.inMountArc(shooter, car(0, -10, 0), "left"), true);
  assert.equal(rules.inMountArc(shooter, car(-10, 0, 0), "front"), false);
  assert.equal(rules.inMountArc(shooter, car(-10, 0, 0), "top"), true);
  assert.equal(rules.inMountArc(shooter, car(10, 0, 0), "under"), false);
});

test("range and target-speed modifiers match the Chapter 3 tables", () => {
  assert.equal(rules.rangeModifier(.99), 4);
  assert.equal(rules.rangeModifier(1), 0);
  assert.equal(rules.rangeModifier(4), -1);
  assert.equal(rules.rangeModifier(12), -3);
  assert.equal(rules.speedModifier(25), 0);
  assert.equal(rules.speedModifier(30), -1);
  assert.equal(rules.speedModifier(45), -2);
  assert.equal(rules.speedModifier(80), -6);
  assert.equal(rules.speedModifier(120), -6);
});

test("relative-arc movement uses both vehicle positions and speeds", () => {
  const firer = car(0, 0, 0, 40);
  const target = car(100, 0, 180, 60);
  assert.deepEqual(rules.relativeMovementSpeed(firer, target, true), {
    speed: 30,
    firerInTarget: "front",
    targetInFirer: "front"
  });
  target.heading = 0;
  assert.equal(rules.relativeMovementSpeed(firer, target, false).speed, 10);
});

test("weapon damage expressions preserve individual dice", () => {
  const values = [6, 2, 1];
  assert.deepEqual(rules.rollDamage("2d+3", () => values.shift()), {rolls: [6, 2], total: 11});
  assert.deepEqual(rules.rollDamage("1d-1", () => values.shift()), {rolls: [1], total: 0});
  assert.deepEqual(rules.parseDamage("hazard"), {dice: 0, modifier: 0});
});

test("sustained fire increases only on consecutive aimed turns", () => {
  const weapon = {lastTargetId: null, lastFiredTurn: 0, sustainedTurns: 0, automatic: false};
  assert.equal(rules.sustainedFireBonus(weapon, "ai", 1), 0);
  rules.updateSustainedFire(weapon, "ai", 1, false);
  assert.equal(rules.sustainedFireBonus(weapon, "ai", 2), 1);
  rules.updateSustainedFire(weapon, "ai", 2, false);
  assert.equal(rules.sustainedFireBonus(weapon, "ai", 3), 2);
  rules.updateSustainedFire(weapon, "ai", 3, true);
  assert.equal(rules.sustainedFireBonus(weapon, "ai", 4), 0);
});

test("special placement and scatter helpers cover dropped weapons", () => {
  assert.equal(rules.mountIsLegal({mountRule: "rearSide"}, "front"), false);
  assert.equal(rules.mountIsLegal({mountRule: "rearSide"}, "left"), true);
  assert.deepEqual(rules.hazardDimensions("mine"), {length: .5, width: .5});
  assert.deepEqual(rules.hazardDimensions("oil"), {length: 1, width: .5});
  assert.equal(rules.grenadeScatter(2, () => 4), 1.25);
});

test("the complete Chapter 6 vehicle arsenal is available", () => {
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8"), sandbox);
  const weapons = sandbox.window.RDA_DATA.weapons;
  const expected = ["ac","mg","rr","vmg","atg","gl","sg","hr","ltr","mr","mml","mnr","mfr","rl","ll","ml","laser","hl","irll","irml","irlaser","irhl","ft","ps","ss","foj","oj","md","smd","sd"];
  assert.deepEqual(Object.keys(weapons), expected);
  assert.equal(weapons.mfr.projectiles, 6);
  assert.equal(weapons.ft.maxRange, 10);
  assert.equal(weapons.foj.ammo, 25);
  assert.equal(Object.keys(sandbox.window.RDA_DATA.grenades).length, 12);
});

test("compact frontal profiles apply both vehicle penalties", () => {
  assert.equal(rules.vehicleTargetModifier("compact", "front"), -2);
  assert.equal(rules.vehicleTargetModifier("compact", "left"), -1);
  assert.equal(rules.vehicleTargetModifier("sedan", "back"), -1);
});

test("metal collision armor absorbs triple value but loses at most half a side", () => {
  assert.deepEqual(rules.metalCollisionArmor(29, 8), {absorbed: 24, loss: 4, penetrated: 5});
  assert.deepEqual(rules.metalCollisionArmor(7, 8), {absorbed: 7, loss: 3, penetrated: 0});
  assert.deepEqual(rules.metalCollisionArmor(6, 1), {absorbed: 3, loss: 1, penetrated: 3});
});

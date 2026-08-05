const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor(id = "") {
    this.id = id; this.value = ""; this.textContent = ""; this.children = [];
    this.style = {}; this.dataset = {}; this.disabled = false; this.width = 900; this.height = 900;
    this.classList = {add() {}, remove() {}, toggle() {}};
  }
  set innerHTML(value) {
    this._innerHTML = value;
    if (!this.value) this.value = value.match(/<option value="([^"]+)"/)?.[1] || "";
  }
  get innerHTML() { return this._innerHTML || ""; }
  get selectedOptions() { return [{textContent: this.value || "dry pavement"}]; }
  appendChild(child) { this.children.push(child); }
  querySelectorAll() { return []; }
  addEventListener() {}
  getBoundingClientRect() { return {left: 0, top: 0, width: 900, height: 900}; }
  setPointerCapture() {}
  releasePointerCapture() {}
  click() { if (this.onclick) this.onclick({target: this}); }
  getContext() { return new Proxy({}, {get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true)}); }
}

test("arena boots, starts a multi-weapon duel, selects weapons, fires, and advances", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const elements = {};
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = new FakeElement(match[1]);
  const storage = new Map();
  const design = {
    name: "Combat Test", bodyKey: "compact", hc: 2, acceleration: 10, topSpeed: 100, weight: 3600,
    armorTypeKey: "plastic", armor: {front: 20, right: 10, left: 10, back: 15, top: 5, under: 5},
    suspensionKey: "improved", frontTireKey: "puncture", rearTireKey: "puncture", plantKey: "large",
    maxSpaces: 10, spaces: 9, crew: {drivers: 1, gunners: 1, passengers: 0},
    weapons: [
      {weapon: "mg", mount: "front", link: "A"},
      {weapon: "mg", mount: "front", link: "A"},
      {weapon: "md", mount: "back", link: ""}
    ]
  };
  storage.set("rdaSelectedPlayer", JSON.stringify(design));
  storage.set("rdaSelectedAI", JSON.stringify({...design, name: "Combat Target", weapons: [{weapon: "rr", mount: "front", link: ""}]}));
  storage.set("rdaStartSpeed", "20"); storage.set("rdaRoadSurface", "dry");

  const sandbox = {
    console, performance: {now: () => 0}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    Blob: class {}, URL: {createObjectURL: () => "blob:test", revokeObjectURL() {}}, FileReader: class {},
    localStorage: {getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value)},
    document: {
      getElementById: id => elements[id] || (elements[id] = new FakeElement(id)),
      createElement: () => new FakeElement(), querySelectorAll: () => [], addEventListener() {}
    }
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of ["data.js", "chapter2.js", "chapter3.js", "arena.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, `../src/${file}`), "utf8"), context, {filename: file});
  }

  elements.startBtn.click();
  assert.match(elements.weaponSelect.innerHTML, /Machine Gun/);
  assert.match(elements.weaponSelect.innerHTML, /LINK A/);
  elements.weaponSelect.value = "weapon:w2";
  elements.weaponSelect.onchange();
  assert.match(elements.fire.textContent, /Deploy/);
  elements.fire.click();
  assert.match(elements.log.children.map(child => child.textContent).join("\n"), /declares Minedropper/);
  assert.doesNotMatch(elements.log.children.map(child => child.textContent).join("\n"), /deploys Minedropper/);
  elements.commit.click();
  assert.match(elements.log.children.map(child => child.textContent).join("\n"), /deploys Minedropper|movement resolved/);
});

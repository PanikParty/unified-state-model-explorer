"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const USM = require("../model.js");

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} !≈ ${b}`);

test("index transform: unit elasticity at 0.5, round trip, band edges (§2.2, §3.2)", () => {
  close(USM.eta(0.5), 1);
  close(USM.eta(-0.5), -1);
  close(USM.eta(0.2), 0.25);
  close(USM.eta(0.8), 4);
  for (const e of [-0.9, -0.3, 0, 0.05, 0.47, 0.9]) close(USM.epsilon(USM.eta(e)), e);
  assert.equal(USM.eta(1), Infinity);
});

test("supply bands are disjoint and exhaustive (§3.2)", () => {
  assert.equal(USM.supplyBand(-0.05), "S−");
  assert.equal(USM.supplyBand(-0.049), "S0h");
  assert.equal(USM.supplyBand(0.049), "S0h");
  assert.equal(USM.supplyBand(0.05), "S0s");
  assert.equal(USM.supplyBand(0.199), "S0s");
  assert.equal(USM.supplyBand(0.2), "S1");
  assert.equal(USM.supplyBand(0.799), "S1");
  assert.equal(USM.supplyBand(0.8), "S2");
});

test("readouts: Δ, Λ, μ and the sign link between Λ and ηd + ηs (§2.3)", () => {
  const r = USM.readout(0.5, 0.2);
  close(r.delta, 0.3);
  close(r.level, 0.35);
  close(r.mu, 1 / (1 + 0.25));
  assert.equal(r.stability, "stable");
  for (const [ed, es] of [[0.3, -0.2], [-0.6, 0.7], [-0.1, -0.1], [0.9, -0.8], [-0.4, 0.3]]) {
    const s = USM.readout(ed, es);
    assert.equal(Math.sign(s.level), Math.sign(s.demandEta + s.supplyEta));
  }
});

test("μ is never reported in the unstable region", () => {
  const r = USM.readout(-0.5, 0.2);
  assert.equal(r.stability, "unstable");
  assert.ok(Number.isNaN(r.mu));
  assert.equal(r.corner, "Spiral");
  assert.equal(USM.muText(r), "no stable clearing");
  const wall = USM.readout(0, 0);
  assert.equal(wall.stability, "boundary");
  assert.equal(wall.corner, "Wall");
  assert.equal(USM.muText(wall), "unbounded");
});

test("corners", () => {
  assert.equal(USM.readout(0.02, 0.2).corner, "Captive buyer");
  assert.equal(USM.readout(0.2, 0.02).corner, "Constrained supplier");
  assert.equal(USM.readout(0.6, 0.6).corner, "Deep market");
  assert.equal(USM.readout(0.3, 0.3).corner, "Stable, intermediate flexibility");
});

test("position map: nine entries, and every guard that withholds one (§6.1)", () => {
  assert.equal(Object.keys(USM.MAP_ENTRIES).length, 9);
  const base = { kStatus: "K1", band: "S0h", p: "P0", provenance: "proxy", w: "W1" };
  const hit = USM.mapEntry(base);
  assert.ok(hit.defined);
  assert.match(hit.text, /Cost bearer: W1/);

  assert.equal(USM.mapEntry({ ...base, kStatus: "unscreened" }).defined, false);
  assert.equal(USM.mapEntry({ ...base, provenance: "UNPLACED" }).defined, false);
  assert.equal(USM.mapEntry({ ...base, provenance: "legacy (void)" }).defined, false);
  assert.equal(USM.mapEntry({ ...base, p: "unclassified" }).defined, false);
  assert.equal(USM.mapEntry({ ...base, band: "S1" }).defined, false);

  const k2 = { kStatus: "K2-observed", band: "S0h", p: "P1", provenance: "measured" };
  assert.equal(USM.mapEntry(k2).defined, false);
  assert.ok(USM.mapEntry({ ...k2, k2Window: "2024Q1–2025Q4", k2Range: "+150 bp" }).defined);
});

test("binding layer is the least flexible supply layer (§2.5)", () => {
  assert.equal(USM.bindingLayerIndex([{ es: 0.3 }, { es: 0.0 }, { es: 0.9 }]), 1);
  assert.equal(USM.bindingLayerIndex([]), -1);
});

test("decision rule and sizing (§4.2, §4.3)", () => {
  const input = {
    gamma: -0.048, gain: 0.5, loss: 0.25, lambda: 0.2, nu: 0.1, margin: 0,
    window: 2, q: 0.8, budgetFraction: 0.02, capital: 1e6, stressLoss: 0.25, execution: 50000
  };
  const d = USM.decision(input);
  close(d.edge, 0.2 * 0.5 - 0.1 * 0.25 - 0.048);
  close(d.ev, d.edge / 0.3 * (1 - Math.exp(-0.6)));
  close(d.tQ, -Math.log(0.2) / 0.2);
  close(d.budgetBound, 20000 / (0.25 + 0.048 * d.tQ));
  assert.ok(d.passes);
  close(d.size, Math.min(d.budgetBound, 50000));

  const fail = USM.decision({ ...input, margin: 0.05 });
  assert.equal(fail.passes, false);
  assert.equal(fail.size, 0);

  const positiveCarry = USM.decision({ ...input, gamma: 0.03 });
  close(positiveCarry.carryCost, 0);
  close(positiveCarry.edge, 0.2 * 0.5 - 0.1 * 0.25 + 0.03);
});

test("EV formula agrees with direct numerical integration", () => {
  const i = { gamma: -0.05, gain: 0.4, loss: 0.3, lambda: 0.5, nu: 0.2, margin: 0, window: 3, q: 0.8, budgetFraction: 0.02, capital: 1, stressLoss: 0.2, execution: 1 };
  let ev = 0, alive = 1;
  const n = 200000, dt = i.window / n;
  for (let s = 0; s < n; s += 1) {
    ev += alive * (i.lambda * i.gain - i.nu * i.loss + i.gamma) * dt;
    alive *= Math.exp(-(i.lambda + i.nu) * dt);
  }
  close(USM.decision(i).ev, ev, 1e-5);
});

test("scale scenario: defaults cross capital strain first, near two years", () => {
  const p = {
    horizon: 15, demandRatio: 1.1, techGrowth: 0.25, demandGrowth: 0.04, coupling: 1, meaningLoss: 0.09,
    capitalStart: 0.15, capitalGrowth: 0.35, utilisation: 0.8, capitalDemandGrowth: 0.18, intensity: 0.8,
    lockupTarget: 0.75, lockupSpeed: 0.35, meaningFloor: 0.5, strainLimit: 0.85
  };
  const s = USM.scenario(p);
  assert.equal(s.first.key, "capital");
  close(s.first.point.t, Math.log(0.85 / 0.8) / 0.03, 0.1);
  assert.equal(s.crossings.find((c) => c.key === "volume").point, null);
  close(s.longRun.capitalDemandRate, 0.38);
  close(s.longRun.supplyRate, 0.25 - 0.38);
  assert.ok(s.longRun.supplyRate < 0, "supply shrinks once capital binds at the defaults");
});

test("every parameter and readout has a plain-language help tip", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { TIPS, GROUPS } = require("../tips.js");
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const html = read("index.html");
  const app = read("app.js");

  const bound = [...html.matchAll(/data-bind="([^"]+)"/g)].map((m) => m[1]);
  const layer = [...html.matchAll(/data-layer="([^"]+)"/g)].map((m) => "layer." + m[1]);
  assert.ok(bound.length >= 30);
  for (const key of new Set([...bound, ...layer])) assert.ok(TIPS[key], `no tip for input ${key}`);

  const referenced = [
    ...[...html.matchAll(/data-tip="([^"]+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/help\.term\("([^"]+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/data-tip='([^']+)'/g)].map((m) => m[1])
  ];
  for (const key of referenced) assert.ok(TIPS[key], `tip key ${key} is used but not defined`);

  const grouped = GROUPS.flatMap((g) => g.keys);
  assert.equal(new Set(grouped).size, grouped.length, "a key is listed twice in the glossary groups");
  for (const key of grouped) assert.ok(TIPS[key], `glossary lists unknown key ${key}`);
  for (const key of Object.keys(TIPS)) {
    assert.ok(grouped.includes(key), `${key} is missing from the glossary groups`);
    assert.ok(TIPS[key].text.length > 30 && TIPS[key].text.length < 420, `${key} tip length`);
  }
});

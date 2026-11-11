/*
 * Unified State Model explorer — pure model functions.
 * No DOM access here, so everything in this file is unit-testable under Node
 * (see tests/model.test.js). Section references are to
 * shared/unified-state-model-v07.md in PanikParty/AgentDiscussionBoard.
 */
(function (rootScope, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else rootScope.USM = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* §2.2 — bounded index <-> real elasticity. Unit elasticity sits at ε = 0.5. */
  function eta(epsilon) {
    var denom = 1 - Math.abs(epsilon);
    if (denom <= 0) return epsilon < 0 ? -Infinity : Infinity;
    return epsilon / denom;
  }

  function epsilon(etaValue) {
    if (!Number.isFinite(etaValue)) return etaValue < 0 ? -1 : 1;
    return etaValue / (1 + Math.abs(etaValue));
  }

  /* §3.2 — supply bands on the index scale. */
  var BANDS = {
    "S−": "Perverse",
    "S0h": "Hard wall",
    "S0s": "Steep",
    "S1": "Elastic",
    "S2": "Unbounded"
  };

  function supplyBand(epsilonSupply) {
    if (epsilonSupply <= -0.05) return "S−";
    if (epsilonSupply < 0.05) return "S0h";
    if (epsilonSupply < 0.2) return "S0s";
    if (epsilonSupply < 0.8) return "S1";
    return "S2";
  }

  /*
   * §6.3 names five corners in words only. The numeric cut-offs below are this
   * tool's FIRST-PASS display heuristics. They are not in the specification and
   * have not been ratified; change them here, in one place.
   */
  var CORNER_THRESHOLDS = {
    wallLevel: 0.05,      // Wall: 0 <= Λ <= wallLevel ...
    wallDelta: 0.10,      // ... and |Δ| <= wallDelta
    smallLevel: 0.15,     // Captive buyer / Constrained supplier: 0 < Λ <= smallLevel
    sideDelta: 0.05,      // ... and |Δ| > sideDelta
    deepLevel: 0.50       // Deep market: Λ >= deepLevel
  };

  var STABILITY_TOLERANCE = 1e-6;

  /* §2.3 — readouts for one leg. */
  function readout(ed, es) {
    var demandEta = eta(ed);
    var supplyEta = eta(es);
    var delta = ed - es;
    var level = (ed + es) / 2;
    var denom = demandEta + supplyEta;
    var stability;
    var mu;
    if (level < -STABILITY_TOLERANCE) {
      stability = "unstable";   // Λ < 0: no stable clearing, μ has no meaning
      mu = NaN;
    } else if (!Number.isFinite(denom)) {
      stability = "stable";
      mu = 0;
    } else if (Math.abs(denom) < STABILITY_TOLERANCE) {
      stability = "boundary";   // Λ = 0: multiplier unbounded
      mu = Infinity;
    } else {
      stability = "stable";
      mu = 1 / denom;
    }

    var c = CORNER_THRESHOLDS;
    var corner = "Stable, intermediate flexibility";
    if (stability === "unstable") corner = "Spiral";
    else if (level <= c.wallLevel && Math.abs(delta) <= c.wallDelta) corner = "Wall";
    else if (level <= c.smallLevel && delta < -c.sideDelta) corner = "Captive buyer";
    else if (level <= c.smallLevel && delta > c.sideDelta) corner = "Constrained supplier";
    else if (level >= c.deepLevel) corner = "Deep market";

    return {
      ed: ed, es: es, demandEta: demandEta, supplyEta: supplyEta,
      delta: delta, level: level, mu: mu, stability: stability,
      band: supplyBand(es), corner: corner
    };
  }

  function muText(state, digits) {
    if (state.stability === "unstable") return "no stable clearing";
    if (state.stability === "boundary") return "unbounded";
    return state.mu.toFixed(digits === undefined ? 2 : digits);
  }

  /* §6.1 — the map of legs. Nine of sixty (K, S, P) combinations are defined. */
  var MAP_ENTRIES = {
    "K2|S2|P2": "No long on this leg. A short remains subject to stressed borrow and to the P3 risk still ahead.",
    "K2|S0h|P1": "Long the constrained leg, conditional on demand for the layer surviving a K2 exit.",
    "K2|S0s|P1": "Long the constrained leg and the cost bearer's exposure; watch W.",
    "K0|S2|P0": "Exit this leg.",
    "K1|S2|P0": "Avoid.",
    "K1|S0h|P0": "Long exposure wanted; choose the instrument under the payoff constraints (§6.2).",
    "K1|S0h|P2": "Long exposure; implied volatility is elevated, which prices options accordingly.",
    "K1|S0h|P3": "Hold existing exposure; add nothing.",
    "K0|S0h|P0": "Wait unless the decision-rule test passes."
  };

  var VOID_PROVENANCE = { "UNPLACED": true, "legacy (void)": true };

  /*
   * Returns { defined, key, text, reason }.
   * kStatus is the single K control: "unscreened" | "K0" | "K1" | "K2-observed" (§3.1).
   */
  function mapEntry(opts) {
    var kStatus = opts.kStatus;
    var band = opts.band;
    var p = opts.p;
    var provenance = opts.provenance;

    if (kStatus === "unscreened") {
      return { defined: false, reason: "The capital pool is unscreened, so it has no regime (§3.1)." };
    }
    if (kStatus === "K2-observed" && !(opts.k2Window && opts.k2Range)) {
      return { defined: false, reason: "K2-observed must state its observation window and cost range (§3.1)." };
    }
    if (VOID_PROVENANCE[provenance]) {
      return { defined: false, reason: "This layer's values are " + provenance + " and cannot support a position (§2.1, §7)." };
    }
    if (p === "unclassified") {
      return { defined: false, reason: "The price regime is unclassified (§3.3)." };
    }
    var k = kStatus === "K2-observed" ? "K2" : kStatus;
    var key = k + "|" + band + "|" + p;
    var text = MAP_ENTRIES[key];
    if (!text) {
      return { defined: false, key: key, reason: "The map defines 9 of 60 K–S–P combinations; " + key.replace(/\|/g, " · ") + " is not one of them." };
    }
    if ((band === "S0h" || band === "S0s") && opts.w) text += " Cost bearer: " + opts.w + ".";
    return { defined: true, key: key, text: text };
  }

  /* §2.5 — the binding layer is the least flexible supply layer. */
  function bindingLayerIndex(layers) {
    var best = -1;
    for (var i = 0; i < layers.length; i += 1) {
      if (best < 0 || layers[i].es < layers[best].es) best = i;
    }
    return best;
  }

  /* §4.2 and §4.3 — three-outcome rule and loss-budget sizing. */
  function decision(input) {
    var favourable = input.lambda * input.gain;
    var adverse = -input.nu * input.loss;
    var edge = favourable + adverse + input.gamma;
    var rate = input.lambda + input.nu;
    var ev = rate > 0
      ? edge / rate * (1 - Math.exp(-rate * input.window))
      : input.gamma * input.window;
    var q = Math.max(0.0001, Math.min(0.9999, input.q));
    var tQ = input.lambda > 0 ? -Math.log(1 - q) / input.lambda : Infinity;
    var carryCost = Math.max(-input.gamma, 0) * tQ;
    if (Number.isNaN(carryCost)) carryCost = 0;          // zero carry, unreachable quantile
    var perUnitLoss = input.stressLoss + carryCost;
    var budgetBound = perUnitLoss > 0 ? input.budgetFraction * input.capital / perUnitLoss : Infinity;
    var passes = edge > input.margin;
    var bound = Math.min(budgetBound, input.execution);
    return {
      favourable: favourable, adverse: adverse, edge: edge, ev: ev,
      tQ: tQ, carryCost: carryCost, budgetBound: budgetBound,
      passes: passes,
      size: passes ? bound : 0      // below the entry margin, size is zero by rule
    };
  }

  /*
   * Exploratory scale scenario. NOT part of the Unified State Model: v0.7
   * defines no volumes, no "unit meaning" and no capital-stock process.
   * Every quantity is a normalised user assumption.
   */
  function scenario(p, samples) {
    var count = samples || 180;
    var exponent = Math.log(Math.max(0.0001, 1 - p.meaningLoss)) / Math.log(2);
    var points = [];
    for (var i = 0; i <= count; i += 1) {
      var t = p.horizon * i / count;
      var technical = Math.exp(p.techGrowth * t);
      var capitalSupply = Math.min(1, p.capitalStart * Math.exp(p.capitalGrowth * t));
      var capitalDemand = p.capitalStart * p.utilisation * Math.exp(p.capitalDemandGrowth * t) * Math.pow(technical, p.intensity);
      var coverage = Math.min(1, capitalSupply / capitalDemand);
      var supply = technical * coverage;
      var demand = p.demandRatio * Math.exp(p.demandGrowth * t) * Math.pow(supply, p.coupling);
      var ratio = demand / supply;
      var converted = Math.min(capitalDemand, capitalSupply);
      var meaning = Math.min(1, ratio) * Math.pow(supply, exponent);
      points.push({
        t: t, supply: supply, demand: demand, ratio: ratio,
        capitalDemand: capitalDemand, capitalSupply: capitalSupply,
        strain: capitalDemand / capitalSupply,
        converted: converted,
        lockup: converted * p.lockupTarget * (1 - Math.exp(-p.lockupSpeed * t)),
        meaning: Math.max(0, Math.min(1, meaning)),
        logSupply: Math.log(supply) / Math.LN2,
        logDemand: Math.log(demand) / Math.LN2
      });
    }

    function first(predicate) {
      for (var j = 0; j < points.length; j += 1) if (predicate(points[j])) return points[j];
      return null;
    }
    var crossings = [
      { key: "volume", label: "Supply meets demand (demand / supply ≤ 1)", point: first(function (d) { return d.ratio <= 1; }) },
      { key: "meaning", label: "Unit meaning reaches the floor", point: first(function (d) { return d.meaning <= p.meaningFloor; }) },
      { key: "capital", label: "Capital strain reaches the threshold", point: first(function (d) { return d.strain >= p.strainLimit; }) }
    ];
    var reached = crossings.filter(function (c) { return c.point; })
      .sort(function (a, b) { return a.point.t - b.point.t; });

    /*
     * Long-run growth rates once capital supply has hit its cap of 1 and capital
     * demand exceeds it. These show which outcomes the assumptions force.
     */
    var capitalDemandRate = p.capitalDemandGrowth + p.intensity * p.techGrowth;
    var supplyRateBound = p.techGrowth - Math.max(0, capitalDemandRate);
    var ratioRateBound = p.demandGrowth + (p.coupling - 1) * supplyRateBound;
    return {
      points: points, crossings: crossings, first: reached.length ? reached[0] : null,
      longRun: {
        capitalDemandRate: capitalDemandRate,   // > 0 means capital strain is crossed eventually
        supplyRate: supplyRateBound,            // intelligence supply growth once capital binds
        ratioRate: ratioRateBound               // demand / supply growth once capital binds
      }
    };
  }

  return {
    eta: eta, epsilon: epsilon, supplyBand: supplyBand, BANDS: BANDS,
    CORNER_THRESHOLDS: CORNER_THRESHOLDS, readout: readout, muText: muText,
    MAP_ENTRIES: MAP_ENTRIES, VOID_PROVENANCE: VOID_PROVENANCE, mapEntry: mapEntry,
    bindingLayerIndex: bindingLayerIndex, decision: decision, scenario: scenario
  };
});

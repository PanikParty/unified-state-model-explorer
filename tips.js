/*
 * Plain-language glossary for every parameter and readout in the explorer.
 * One source of truth: the app shows these as help tips, and primer.html
 * prints them as its glossary. Keys match data-bind / data-layer / data-tip.
 */
(function (rootScope, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { rootScope.USM_TIPS = api.TIPS; rootScope.USM_TIP_GROUPS = api.GROUPS; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TIPS = {
    /* ── state: market and regimes ── */
    "market": { term: "Market identifier M", text: "A name for the market you are describing, such as “US data-centre power”. Two sets of numbers can only be compared if they describe the same market." },
    "kStatus": { term: "Capital regime K", text: "How money gets handed out in this market. K0: it is rationed by rules or quotas. K1: it is handed out by price, and investors pull back when money gets dearer. K2: handed out by price, but investors kept spending even when money got dearer. “Unscreened” means nobody has checked yet, so the tool will not suggest any position." },
    "k2Window": { term: "K2 observation window", text: "The dates over which investors were seen to keep spending despite dearer money. A K2 label is only as good as the period it was observed in, so the tool will not use it without one." },
    "k2Range": { term: "K2 cost range observed", text: "How much dearer money got during that window, for example “+150 bp” (1.5 percentage points). The K2 label says nothing about what happens if money gets dearer than this." },
    "p": { term: "Price regime P", text: "What the price chart is doing right now. P0: quiet and flat. P1: rising steadily. P2: rising fast and getting jumpy. P3: extreme and probably running out of steam. “Unclassified” means none of these fit, for example a falling market." },
    "showEpisodes": { term: "Legacy episodes", text: "Five historical examples (dot-com, housing, crypto) placed by guesswork in an older version of the model. They are shown for illustration only and must not be treated as evidence." },

    /* ── state: layers and legs ── */
    "layer.name": { term: "Layer name", text: "One link in the supply chain, such as “grid power” or “chips”. Each layer is scored separately because a product is only as easy to expand as its hardest-to-expand part." },
    "layer.prov": { term: "Provenance", text: "Where the numbers came from. Measured: worked out from real price and quantity data. Proxy: estimated from a stand-in such as delivery lead times. UNPLACED: a placeholder. Legacy (void): an old guess. The last two cannot support a position." },
    "layer.w": { term: "Cost bearer W", text: "Who pays to expand a constrained layer. W0: the new customer pays, so expansion tends to be quicker. W1: existing customers share the bill, which usually means disputes and delay. W2: still being argued over." },
    "layer.ed": { term: "Demand flexibility ε_d", text: "How much buyers cut back when the price rises, on a scale from −1 to +1. Near 0: buyers are stuck and keep buying whatever the price. +0.5: a 1% price rise cuts purchases by about 1%. Negative: buyers pile in as the price rises, or flee as it falls." },
    "layer.es": { term: "Supply flexibility ε_s", text: "How much more sellers produce when the price rises, from −1 to +1. Near 0: a hard wall, no more can be made in time at any price. +0.5: a 1% price rise brings about 1% more supply. Negative: supply shrinks as the price rises." },
    "capital.prov": { term: "Capital provenance", text: "Where the capital-leg numbers came from: measured from data, estimated by proxy, a placeholder, or an old guess." },
    "capital.ed": { term: "Capital demand flexibility ε_d,C", text: "How much borrowers and builders cut back when money gets dearer. Near 0 means they keep borrowing regardless of the interest rate." },
    "capital.es": { term: "Capital supply flexibility ε_s,C", text: "How much more money lenders and investors offer when the return on offer rises. High values mean money floods in easily." },

    /* ── state: readouts ── */
    "eta": { term: "Real elasticity η", text: "The ordinary economics measure behind the slider: the percentage change in quantity for a 1% change in price. The slider value ε is just η squeezed onto a −1 to +1 scale, with η = 1 landing at ε = 0.5." },
    "delta": { term: "Differential Δ", text: "Demand flexibility minus supply flexibility. It shows which side is stuck. Positive: sellers are the stiffer side, so they collect the gains when demand grows. Negative: buyers are the stiffer side, so they bear the cost." },
    "level": { term: "Level Λ", text: "The average of the two flexibilities: how much “give” the market has in total. High: shocks are absorbed without much price change. Near zero: small shocks cause big price swings. Below zero: price moves feed on themselves." },
    "mu": { term: "Shock multiplier μ", text: "Roughly how many percent the price moves when demand shifts by 1%. A value of 0.8 means a 10% jump in demand lifts the price by about 8%. It grows without limit as the market loses its give, and has no meaning once price moves feed on themselves." },
    "band": { term: "Supply band S", text: "A label for the supply flexibility. S− perverse (shrinks as price rises), S0h hard wall, S0s steep (expandable at sharply rising cost), S1 elastic, S2 unbounded (expands almost freely)." },
    "corner": { term: "Corner", text: "A nickname for where the point sits. Wall: neither side can adjust. Captive buyer: buyers are stuck. Constrained supplier: sellers are stuck. Deep market: plenty of give. Spiral: price moves feed on themselves. The exact cut-offs are this tool’s first guess, not part of the model." },
    "binding": { term: "Binding layer ★", text: "The layer with the least supply flexibility. It is the bottleneck that limits the whole chain." },
    "map": { term: "Position map", text: "A small lookup table from the model document. For a given capital regime, supply band and price regime it names a kind of exposure. Only 9 of the 60 combinations are filled in; for the rest the honest answer is “no position defined”." },

    /* ── decision overlay: inputs ── */
    "decision.gamma": { term: "Carry Γ", text: "What it costs (negative) or pays (positive) per year just to hold the position if the price does not move: storage, insurance, interest, borrowing fees. −0.048 means it costs 4.8% a year to wait." },
    "decision.gain": { term: "Favourable gain G", text: "How much you make, as a fraction of the position, if things go your way. 0.50 means +50%." },
    "decision.loss": { term: "Adverse loss D", text: "How much you lose, as a fraction of the position, if things go against you. 0.25 means −25%." },
    "decision.lambda": { term: "Favourable hazard λ", text: "How likely the good outcome is to arrive, per year. 0.20 means roughly a one-in-five chance each year, so an average wait of about five years." },
    "decision.nu": { term: "Adverse hazard ν", text: "How likely the bad outcome is to arrive, per year. 0.10 means roughly a one-in-ten chance each year." },
    "decision.margin": { term: "Entry margin m", text: "A safety buffer you set in advance. The expected yearly edge has to beat this number before any position is allowed." },
    "decision.window": { term: "Holding window T", text: "How many years you plan to hold. It changes the size of the expected value but never its sign." },
    "decision.q": { term: "Survival quantile q", text: "How patient you plan to be. 0.80 means: budget enough to keep paying the carry until the good outcome has had an 80% chance of arriving." },
    "decision.budgetFraction": { term: "Loss-budget fraction k", text: "The share of your free capital you are willing to lose on this one idea. 0.02 means 2%." },
    "decision.capital": { term: "Unencumbered capital U", text: "Money that is truly free: not borrowed, not pledged, and not at risk of being called away." },
    "decision.stressLoss": { term: "Stress loss D_stress", text: "The loss per unit of position in a bad-but-plausible scenario that you chose in advance. It is usually the biggest term in sizing." },
    "decision.execution": { term: "Execution bound", text: "The most you could actually buy or sell without moving the market against yourself. It is a ceiling on size." },

    /* ── decision overlay: outputs ── */
    "out.edge": { term: "Edge λG − νD + Γ", text: "The expected gain per year of holding: chance of the good outcome times its gain, minus chance of the bad outcome times its loss, plus the carry. The rule passes only if this beats the margin." },
    "out.ev": { term: "EV over T", text: "The expected total return over the holding window, allowing for the position ending early when either outcome arrives." },
    "out.tq": { term: "Quantile time T_q", text: "How long you would have to wait for the good outcome to have had a q chance of arriving. With λ = 0.20 and q = 0.80 that is about eight years." },
    "out.carry": { term: "Negative carry paid to T_q", text: "The total holding cost you would pay if you had to wait that long. Positive carry counts as zero here." },
    "out.budget": { term: "Loss-budget bound", text: "The largest position whose stress loss plus waiting cost still fits inside your loss budget: k × U ÷ (stress loss + carry paid)." },
    "out.size": { term: "Maximum size", text: "The smaller of the loss-budget bound and the execution bound, or zero if the rule fails. It is a ceiling under your stated assumptions, not a recommendation and not a guarantee against larger losses." },

    /* ── scale scenario: inputs ── */
    "scenario.horizon": { term: "Horizon", text: "How many years ahead the scenario runs." },
    "scenario.demandRatio": { term: "Initial demand / supply", text: "How demand compares with supply at the start. 1.10 means demand begins 10% above supply." },
    "scenario.techGrowth": { term: "Technical supply growth g_T", text: "How fast the technology could expand supply each year if money were no object. 0.25 is about 28% a year, compounding." },
    "scenario.demandGrowth": { term: "Baseline demand growth g_ID", text: "How fast demand would grow each year even if supply stood still." },
    "scenario.coupling": { term: "Supply-induced demand α", text: "How strongly new supply creates its own demand. 1 means demand grows in step with supply. Below 1, supply slowly catches up. Above 1, more supply leaves you further behind." },
    "scenario.meaningLoss": { term: "Meaning loss per doubling d", text: "An invented measure: how much less each unit is “worth” every time total supply doubles. 0.09 means 9% less per doubling. It has no agreed definition." },
    "scenario.capitalStart": { term: "Initial capital supply CS0", text: "How much of the total available pool of money is on offer at the start. The pool is scaled so that 1 means all of it." },
    "scenario.capitalGrowth": { term: "Capital supply growth g_CS", text: "How fast the money on offer grows each year, until it reaches the whole pool (1) and can grow no further." },
    "scenario.utilisation": { term: "Initial capital utilisation u0", text: "The share of the money on offer that is wanted at the start. 0.80 means 80% is already spoken for." },
    "scenario.capitalDemandGrowth": { term: "Capital demand growth g_CD", text: "How fast the appetite for money grows each year, on top of what scaling the technology requires." },
    "scenario.intensity": { term: "Capital intensity β", text: "How much extra money each step of technical growth needs. 1 means money needs grow in step with the technology; below 1 means it gets cheaper to scale." },
    "scenario.lockupTarget": { term: "Target lockup share ℓ", text: "The share of the invested money that eventually becomes tied up and cannot be moved elsewhere." },
    "scenario.lockupSpeed": { term: "Lockup speed s", text: "How quickly invested money becomes tied up. Higher means it gets locked in sooner." },
    "scenario.meaningFloor": { term: "Meaning floor", text: "The level of “unit meaning” you choose to call a boundary. The chart marks when the path falls to it." },
    "scenario.strainLimit": { term: "Capital strain threshold", text: "The ratio of money wanted to money on offer that you choose to call a boundary. 0.85 means: flag it when 85% of the money on offer is wanted." },

    /* ── scale scenario: outputs ── */
    "out.crossing": { term: "Boundary crossing", text: "The moment an assumed path meets a threshold you set. It is arithmetic on your assumptions, not a forecast, a probability or a date to plan around." },
    "out.forced": { term: "What the assumptions force", text: "Some results follow from the shape of the formulas whatever numbers you type. This panel spells those out so that “when” is not mistaken for “whether”." }
  };

  var GROUPS = [
    { title: "Market and regimes", keys: ["market", "kStatus", "k2Window", "k2Range", "p", "showEpisodes"] },
    { title: "Layers and legs", keys: ["layer.name", "layer.prov", "layer.w", "layer.ed", "layer.es", "capital.prov", "capital.ed", "capital.es"] },
    { title: "Readouts", keys: ["eta", "delta", "level", "mu", "band", "corner", "binding", "map"] },
    { title: "Decision overlay: what you enter", keys: ["decision.gamma", "decision.gain", "decision.loss", "decision.lambda", "decision.nu", "decision.margin", "decision.window", "decision.q", "decision.budgetFraction", "decision.capital", "decision.stressLoss", "decision.execution"] },
    { title: "Decision overlay: what it works out", keys: ["out.edge", "out.ev", "out.tq", "out.carry", "out.budget", "out.size"] },
    { title: "Scale scenario: what you enter", keys: ["scenario.horizon", "scenario.demandRatio", "scenario.techGrowth", "scenario.demandGrowth", "scenario.coupling", "scenario.meaningLoss", "scenario.capitalStart", "scenario.capitalGrowth", "scenario.utilisation", "scenario.capitalDemandGrowth", "scenario.intensity", "scenario.lockupTarget", "scenario.lockupSpeed", "scenario.meaningFloor", "scenario.strainLimit"] },
    { title: "Scale scenario: what it works out", keys: ["out.crossing", "out.forced"] }
  ];

  return { TIPS: TIPS, GROUPS: GROUPS };
});

# Unified State Model Explorer

**Live explorer (GitHub Pages):** https://panikparty.github.io/unified-state-model-explorer/

**Source model document:** [shared/unified-state-model-v07.md](https://github.com/PanikParty/AgentDiscussionBoard/blob/main/shared/unified-state-model-v07.md) in [PanikParty/AgentDiscussionBoard](https://github.com/PanikParty/AgentDiscussionBoard)

**New to this?** Start with the [primer](https://panikparty.github.io/unified-state-model-explorer/primer.html): ten minutes, no economics background needed.

## Purpose

This interactive explorer implements the v0.7 candidate Unified State Model's elasticity planes, per-layer position map and decision overlay, then adds an explicitly exploratory time extension for intelligence-scale scenarios.

The extension makes seven trajectories visible:

1. Intelligence supply
2. Intelligence demand
3. Capital demand
4. Capital supply
5. Unit meaning
6. Capital converted
7. Capital lockup

It is a scenario tool. It is not a calibrated forecast, an estimate of intelligence, or investment advice.

## Scope and boundaries

The original model treats the resource and capital legs as local price–quantity response relationships. It does not define volumetric demand, a unit-meaning function, or a capital-stock process over time.

The Scale scenario view adds those quantities as user-supplied assumptions. It does not infer an elasticity from scale, and it does not infer the capital regime K from the capital paths. The selected elasticities remain local slopes on the resource and capital planes.

## State-model layer

Each leg takes bounded demand and supply flexibility inputs (§2 of the model document):

    ε = η / (1 + |η|)          η = ε / (1 − |ε|)
    Δ = εd − εs                Λ = (εd + εs) / 2          μ = 1 / (ηd + ηs)

The planes show the Λ = 0 stability boundary, dashed contours of Λ, the Δ = 0 diagonal and the shaded self-reinforcing region (Λ < 0). μ is reported only where the market clears stably: at Λ = 0 it reads "unbounded" and below it "no stable clearing".

**Resource layers.** The resource leg holds a list of named layers (§2.5), each with its own pair, provenance and cost bearer W. The least flexible supply layer is flagged as binding. A stack is never given one coordinate.

**Capital regime.** K is a single user-set control holding the screen result: unscreened, K0, K1 or K2-observed (§3.1). It is never derived from the sliders. K2-observed must state its observation window and cost range.

**Position map.** Evaluated per layer (§6.1). The map defines 9 of 60 K–S–P combinations; anything else reads "no position defined". No entry is shown when the pool is unscreened, when K2-observed lacks its window or range, when the price regime is unclassified, or when the layer's values are tagged UNPLACED or legacy (void).

**Corner names.** §6.3 names five corners in words only. The numeric cut-offs here (`CORNER_THRESHOLDS` in `model.js`) are first-pass display heuristics, not part of the specification.

**Legacy episodes.** `episodes.json` carries the five §7 rows with their scale version and provenance. They are void for inference and render as hollow reference markers only when switched on.

## Decision overlay

Implements the three-outcome rule and loss-budget sizing of §4.2–4.3 on user-assumed inputs:

    hold iff  λG − νD + Γ > m
    EV(T) = [(λG − νD + Γ) / (λ + ν)] · (1 − e^(−(λ+ν)T))
    size ≤ min( k·U / (D_stress + Γ⁻·T_q), execution bound )

When the rule fails, maximum size is zero.

## Scale scenario (exploratory extension)

All values below are normalized scenario values. One unit of capital supply represents the chosen convertible-capital base.

    Technical potential
    T(t) = exp(gT · t)

    Capital supply
    CS(t) = min(1, CS0 · exp(gCS · t))

    Capital demand
    CD(t) = CS0 · u0 · exp(gCD · t) · T(t)^β

    Capital coverage
    f(t) = min(1, CS(t) / CD(t))

    Intelligence supply
    IS(t) = T(t) · f(t)

    Intelligence demand
    ID(t) = r0 · exp(gID · t) · IS(t)^α

    Demand / supply
    R(t) = ID(t) / IS(t)

    Unit meaning
    M(t) = min(1, R(t)) · IS(t)^(ln(1 − d) / ln(2))

    Capital converted
    CC(t) = min(CD(t), CS(t))

    Capital lockup
    CL(t) = CC(t) · ℓ · (1 − exp(−s · t))

Where:

| Symbol | Scenario meaning |
|---|---|
| gT | Technical intelligence-supply growth rate |
| CS0, gCS | Starting capital supply and its growth rate |
| u0, gCD, β | Starting capital utilisation, capital-demand growth, and capital intensity to technical scale |
| r0, gID, α | Initial intelligence-demand ratio, baseline demand growth, and supply-induced demand coupling |
| d | Unit-meaning loss per doubling of intelligence supply |
| ℓ, s | Target capital-lockup share and speed of lockup |

Capital converted is the funded minimum of capital demand and supply. Capital lockup is the portion of that converted amount that becomes committed over time under the selected target share and speed.

## Boundary crossings

The scenario marks the earliest of three threshold crossings:

- **Volume:** intelligence supply meets intelligence demand (ID / IS ≤ 1).
- **Meaning:** unit meaning falls to the selected floor.
- **Capital:** capital strain (CD / CS) reaches the selected threshold.

A crossing is where an assumed path meets an assumed threshold. It is not a probability, a hazard estimate or a projected date, and it is not one of the model's hazard-driven transitions (§5).

**What the functional forms force.** Capital supply is capped at 1, so capital strain is crossed eventually whenever capital demand grows (gCD + β·gT > 0). Once capital binds, intelligence supply grows at gT(1 − β) − gCD, which is negative at the default inputs: supply then shrinks and unit meaning recovers. Demand / supply trends at gID + (α − 1) × supply growth. The scenario view prints these rates so that "when" is not mistaken for "whether".

## Inputs

The Scale scenario view exposes:

- Horizon
- Initial intelligence demand / supply
- Technical supply growth
- Baseline demand growth
- Supply-induced demand coupling α
- Meaning loss per supply doubling
- Initial capital supply
- Capital supply growth
- Initial capital utilisation
- Capital demand growth
- Capital intensity to scale β
- Target lockup share
- Lockup speed
- Meaning floor
- Capital-strain threshold

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css` | The page. Plain HTML and CSS, light and dark. |
| `model.js` | Pure model functions, no DOM. Loads in the browser and in Node. |
| `app.js` | State, input binding and D3 rendering. |
| `primer.html` | Plain-language primer on the theory, with worked examples and a glossary. |
| `tips.js` | The glossary: one plain-language entry per parameter and readout. Feeds both the help tips and the primer. |
| `tooltip.js` | Help-tip behaviour: hover, keyboard focus or tap any `?` or dotted term. |
| `episodes.json` | Legacy seed rows (void). Optional: the page works without it. |
| `vendor/d3.min.js` | D3 7.9.0, vendored with its licence. No network requests at run time. |
| `tests/model.test.js` | Unit tests for the model functions. |

Inputs are remembered per browser in `localStorage`; "Reset all inputs" clears them.

## Running and testing

    npm run serve      # then open http://localhost:8080
    npm test           # Node 20 or later; no dependencies to install

Opening `index.html` straight from disk also works; only the legacy episode rows need a server.

## Limits

- None of the intelligence, demand, capital, meaning, or lockup parameters are measured by this tool.
- “Unit meaning” is a user-defined scenario construct; it is not a moral, social, or economic measurement.
- The capital-demand and capital-supply paths do not classify K0, K1, or K2.
- No causal conclusion follows from trajectories that share an assumed driver.
- Boundary crossings should be stress-tested across plausible parameter ranges before being used in any decision process.

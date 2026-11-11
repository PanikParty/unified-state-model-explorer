# Studies

Applied readings of the Unified State Model on live data. Each study is a dated snapshot: the model version it was scored against, every input with its provenance, and the cells the model returns `unclassified` rather than defaulting.

A study is not a recommendation and not a position. It is the model run on data, with the failures left visible.

## Index

| Date | Study | Model | Files |
|---|---|---|---|
| 2026-11-10 | Current state of the economic forces — US rates and credit, AI compute (two capital pools), gold and silver, energy, equity, FX, crypto. **Revision 2**, corrected after review (§R of the study) | v0.7-candidate | [`usm-state-2026-11-10.md`](usm-state-2026-11-10.md) · [`usm-state-2026-11-10.json`](usm-state-2026-11-10.json) |

## What each study contains

- **`*.md`** — the read: state table per market with per-cell provenance (`measured`, `proxy`, `UNPLACED`, `unscreened`), carry and decision overlay for positions already held, the five-force status, and the named inputs the model still lacks.
- **`*.json`** — the same state in `usm-state/1` schema, machine-readable: `Σ = (K, S, P, M)` per market, `k2_window` / `k2_cost_range` where a K2 status is claimed, `Γ` per position, and falsification observations keyed to §11 test IDs.

## Discipline these studies obey

1. **No elasticity is invented.** Every `(η_d, η_s)` that has not been estimated from an observed price–quantity response is `UNPLACED`, which means no §6.3 corner and no §6.1 map entry may be printed.
2. **`unclassified` is a result.** Where §3.3's ladder does not reach the observed state, the cell says so. Downside levels are an open item (§12.8), so a falling market prices out as `unclassified` rather than being forced to `P0`.
3. **K is per pool, and qualified.** A K2 reading states its observation window and cost range, and claims nothing above that range (§3.1).
4. **Provenance travels with every number.** A `proxy` level yields to a measured `η_s` when one exists.

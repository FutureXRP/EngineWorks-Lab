# FOUNDRY — Game Spec

Invented alloy chemistry. The catalog's first NON-spatial game: a process pipeline, not a grid. You buy invented ores, set a recipe (ratios + temperature + quench), pour, and test the ingot against contract specs. The deep mechanic: the interaction rules are fully honest but initially *unlabeled* — your **Materials Codex** fills in permanently as you experiment. Knowledge is the progression. File target: `foundry.html`. Accent: ember-orange/iron-grey.

## The Pipeline (the "machine")

HOPPERS (ore ratios) → SMELTER (temperature dial) → MIX → QUENCH (rate dial) → CAST → TEST BENCH. Rendered as a horizontal process diagram in the COREWORKS schematic language; the two dials (temp, quench) plus ore sliders are the whole control surface. Commit button: **POUR**.

## The Ores (invented periodic table, v1 = five)

| Ore | Base $/unit | Traits (printed honestly in Codex once discovered) |
|---|---|---|
| FERRIT | $2 | +hardness, −flex, heavy |
| LUMEN | $4 | +shimmer, +flex, light; shimmer BURNS above 1100° (→0) |
| DROSS | $0.5 | filler: −all stats slightly, −purity, dirt cheap |
| VEX | $5 | +flex ×2, +instability; >25% of mix risks UNSTABLE pour |
| AURELIN | $9 | +everything modestly, +purity; premium |

Ore market prices drift daily on the seed (±40%), so good buying instinct = stockpiling cheap days. Inventory persists (save state), making FOUNDRY the most "tycoon" of the catalog.

## The Chemistry (deterministic; constants live in one table)

Ingot stats: HARDNESS, FLEX, SHIMMER, MASS, PURITY (0–100 each).

```
base[stat] = Σ ratio_i × ore_i[stat]
fusion     = temp curve: each ore has an ideal temp window;
             outside it, that ore contributes at 60%
shimmer    = 0 if temp > 1100 and LUMEN present (SCORCH)
purity     = base − DROSS penalty − (temp < 900 ? 15 : 0)   // cold pour → SLAG
quench     : fast → hardness +20%, flex −25% (BRITTLE risk if flex < 15)
             slow → flex +20%, hardness −15%
instab     = VEX share > 25% → pour fails UNSTABLE unless AURELIN ≥ 10% (stabilizer)
```

All constants in a single `CHEM` table so tuning is one-file. Every interaction above is a **Codex entry**: hidden as "?" until the player's pour exhibits it once, then permanently documented in-game in plain language. (Honest physics: nothing is random; everything is learnable and, once learned, written down for you.)

## Contracts

Seeded board of 3, pick 1: `{ specs: bands per stat, units, deadline rounds, pay, clause }`. Clauses: "client supplies free DROSS, min 20%" · "shimmer showcase: shimmer ≥ 50" · "military: hardness ≥ 70 AND flex ≥ 30" (the classic quench contradiction — solvable only with the right ore mix). Failure = STALL per Bible; failed batches return 50% of ore value as scrap.

## Failure vocabulary
SLAG (purity floor) · SCORCH (burned LUMEN) · BRITTLE (shatters on test: hardness fine, flex below floor) · UNSTABLE (pour lost, VEX) · OFF-SPEC (names the exact stat band missed).

## Operator Modes
ASSISTED: live projected stat bars vs. contract bands as you move sliders/dials (full instrumentation). STANDARD: projected bars shown only for stats whose Codex interactions you've discovered — knowledge literally becomes instrumentation. MANUAL: POUR reveals all; the **Assay Kit** ($6 consumable, the gauge-analog) previews one chosen stat for one pour.

STANDARD mode's knowledge-gating is FOUNDRY's signature: the Codex isn't flavor, it's your sensor suite.

## Economy
Per Bible §3, FLOOR=5, with the ore market replacing the parts shop (no rarity maturity; price drift instead). Supply guarantee: every contract on the board must be satisfiable from ores currently purchasable within `2 × pay` budget (validate when seeding the board; reroll the contract internally if not — this is FOUNDRY's stranding protection).

## Build order
1. CHEM table + pour resolution + test bench readout.
2. Contract board + economy + stall.
3. Codex discovery system. 4. Market drift + inventory persistence (`ewl.foundry.v1`). 5. Modes (Codex-gated STANDARD), share, ranks (Smelter → Alloysmith → … → Archmetallurgist).

# PIPEWORKS — Game Spec

Pressure networks. Route invented fluid from pumps to demanding taps through pipes that have RATINGS — and burst above them. Grid game like CRANKWORKS, but the physics is pressure/flow instead of rpm/torque, and the board has fixed, seeded terminals. File target: `pipeworks.html`. Accent: teal/brass on near-black.

## Board

- 6 wide × 6 tall grid. **Terminals are seeded and fixed**: 1–2 PUMP terminals on the left edge, 2–4 TAP terminals on the right/bottom edges (count grows with round). Player builds the network between them; terminals cannot move. This is the differentiator from CRANKWORKS: the endpoints are the puzzle, not the player's choice.
- Parts are `{id, rot}` with ports per face, CRANKWORKS port conventions exactly (faces 0–3, mating opposing ports).

## Physics (invented, legible)

- Pump Mk I: 40 L/s at 6.0 bar into its port.
- Every pipe segment traversed: **−0.5 bar** (head loss). Junction splits divide FLOW evenly among live branches; pressure carries through undivided.
- Every pipe part has a **RATING**: pressure above rating = **BURST** (part destroyed at run resolution, flow dies there, part must be re-bought — the catalog's only destructive failure, and it is fully predictable, never random).
- A TAP is satisfied if it receives `flow ≥ need` AND `pressure within [lo, hi]` band. Over-pressure at a tap = **SCALD** (tap counts ×0.2); under = **TRICKLE** (×0.2); flow short = **STARVED** (0).
- Round score = Σ satisfied-tap value. Demand `round(60 × 1.5^(n−1))` equivalent in tap values; economy per Bible §3, FLOOR=5.

## Parts

| Part | Cost/Rarity | Effect |
|---|---|---|
| Copper Pipe ─ | $2 c | straight, rating 8 bar |
| Copper Elbow └ | $2 c | corner, rating 8 bar |
| Copper Tee ┬ | $4 c | splits flow, rating 8 bar |
| Steel Pipe ═ | $5 u | straight, rating 16 bar |
| Steel Elbow ╚ | $5 u | corner, rating 16 bar |
| Steel Tee ╦ | $7 u | splitter, rating 16 bar |
| Booster ▲ | $9 u | inline, +4.0 bar, rating 16; consumes $1/round upkeep |
| Reducer ▽ | $4 c | inline, −3.0 bar deliberately, rating 16 |
| Throttle Valve ⊗ | $6 u | inline, tap to set 25/50/75/100% flow pass-through during build |
| Accumulator ◎ | $8 r | inline; banks up to 30 L/s of flow that overshot its branch's tap need, releases next round into the same branch |
| Manometer ⌖ | $3 c | inline, rating 16, no effect; in MANUAL mode shows live bar/L/s at its position (the Gauge part) |
| Pump Mk II | $16 r | 70 L/s at 9.0 bar |

Distinct-job audit: copper vs steel = cost-vs-rating risk pricing; Booster creates the burst tension (boosted copper is a time bomb you chose); Reducer/Throttle shape tap bands; Accumulator is the Capacitor-sibling; Manometer is instrumentation.

## The Core Tension

Boosters make copper economically tempting and physically doomed. ASSISTED mode shows projected bar at every part (burst warnings in red before you ever run); MANUAL mode players either buy Manometers, do the arithmetic, or learn from shrapnel. The honest-physics rule holds: head-loss and ratings are printed on every part card.

## Failure vocabulary
BURST (part over rating — names the part and its bar) · STARVED / TRICKLE / SCALD (per tap, names the band miss) · DEADHEAD (flow path reaches no tap — wasted flow diagnostic).

## Rounds & boss variant
Every 5th round: MAINS SURGE — pump pressure +3 bar that round (announced one round ahead). Copper networks must throttle or upgrade. Commit button: **OPEN MAINS**.

## Build notes
Clone CRANKWORKS as the chassis (ports/rotation/BFS are 80% shared) — change the propagation payload to `{flow, bar}`, add ratings check at entry, terminals from seed, taps as edge fixtures. Save key `ewl.pipeworks.v1`. Modes per Bible §2; Manometer is the MANUAL gauge. Supply guarantee: a pipe-class part always offered if player owns < 3 transport parts; a Pump if none owned.

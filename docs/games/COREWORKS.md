# COREWORKS — Game Spec (Flagship)

The invented machine. Socket anatomy + tuning, contracts, campaign. Approved visual language lives in `coreworks-mockup.html` (keep untouched as reference). Build the real game as `coreworks.html`.

## The Machine — Blueprint 01 "The Core"

Five stages, eleven sockets, flux in → vim out.

Sockets: S-01a/S-01b Vanes · S-02 Chamber · S-02c ×2 Coils · S-03 Resonator · S-03f ×2 Forks · S-04 Converter · R-01 Sink · R-02 Governor. Parts only install in their socket class. Player also sets ONE continuous control: the **frequency dial** (the operating point), bounded by the installed Resonator's range.

## Simulation (deterministic, run on every change for ASSISTED projection)

```
D     = Σ vane.draw                          // fl/s
F     = min(D, chamber.cap)                  // chamber-limited flux
P     = chamber.base + Σ coil.pressure       // pressure multiplier
H     = Σ part.heat(f)                       // total heat/s (coils flat; resonator scales with f)
T     = H ≤ sink.cap ? 1 : sink.cap / H      // thermal throttle
Q     = F × P × T                            // pulse charge
M     = (res.redline − f)/res.redline × 100
        + Σ fork.stability + governor.stability   // stability margin
shud  = f > res.redline OR M < 0
e(f)  = 1.0 inside converter band [a,b];
        linear falloff to 0.2 across ±10 Hz outside
vim   = floor( min(Q, conv.cap) × e(f) × conv.rate × (shud ? 0.45 : 1) )
```

### Failure vocabulary (always diagnosed by stage)
- **STARVED** — D < chamber.cap × 0.6 (chamber underfed; points at vanes)
- **CHOKED** — Q > conv.cap (overflow shown in vim-equivalent; points at converter)
- **OVERHEAT** — T < 1 (shows H vs sink.cap; points at sink/coils)
- **SHUDDER** — f past redline or margin < 0 (output ×0.45; points at resonator/forks)

A run can have multiple simultaneous diagnoses; the bench lists all, worst first, with the BOTTLENECK chip naming the single binding constraint (the stage whose relaxation most increases vim — compute by finite difference).

## Part Catalog Mk I–III (per socket class)

| Socket | Mk I | Mk II | Mk III |
|---|---|---|---|
| Vane | 22 fl/s · $0 starter | 36 fl/s · $8 | 54 fl/s · $16 |
| Chamber | cap 40, P 1.0 · starter | cap 70, P 1.1 · $12 | cap 110, P 1.2 · $22 |
| Coil | +0.4P, +12 H · $6 | +0.7P, +18 H · $11 | +1.0P, +26 H · $18 |
| Resonator | range 20–60 Hz, redline 60, heat 0.4×f · starter | range 20–88, redline 88, heat 0.5×f · $14 | range 20–120, redline 120, heat 0.65×f · $26 |
| Fork | +8 stability · $5 | +14 · $9 | +22 · $15 |
| Converter | band 38–55, cap 60, rate 1.0 · starter | band 50–80, cap 110, rate 1.1 · $13 | band 70–110, cap 180, rate 1.2 · $24 |
| Sink | 40 H · starter | 75 H · $9 | 125 H · $17 |
| Governor | +12 stability, +5% T floor · $7 | +20, +10% · $13 | +30, +15% · $22 |

Design intent: each Mk tier shifts the optimal frequency upward, so upgrading the Resonator without the matching Converter band is a classic CHOKED/band-miss trap — mixed-tier machines are where the engineering lives.

## Game Structure — Contracts Campaign

No quota ladder; a seeded **contract board** of 3 offers per round, player picks one:

`{ vim target, max heat %, budget hint, special clause, pay }`

Special clauses (seeded pool): "run below 50 Hz" · "no coils" · "heat must stay under 60%" · "deliver with stability ≥ 40" · "double pay, single bench pull (no retry that round)". Failing a contract = STALL per Bible (it returns to the board). Completed contracts advance the campaign meter; campaign tiers unlock Mk II then Mk III parts in the shop and, later, **Blueprint 02** (a second machine variant — design TBD, do not invent without instruction).

Shop: 4 seeded slots drawn across socket classes with maturity weights, supply guarantee = any socket class required by the selected contract and currently empty must be offered.

## Operator Modes (Bible §2 applied)
- ASSISTED: live formula readouts per stage, ghost vim on gauge, bottleneck chip, predicted failure flags before pull.
- STANDARD: ghost vim total + dial position only; stage readouts dark.
- MANUAL: bench shows nothing until BENCH PULL. Gauge equivalent: **Sight Glass** parts ($3 each) install into a small G-01/G-02 socket pair and light up ONE chosen stage's readout each.

## UI
Mockup's anatomy verbatim: schematic with socket codes, tap-to-inspect info strip, bench with output-vs-frequency curve (band overlay, operating dot follows the dial), three gauges (OUTPUT/HEAT/STABILITY), bottleneck chip, BENCH PULL commit. Add: frequency dial (slider under the bench curve), contract board panel, shop drawer with socket-class tabs. Save key `ewl.coreworks.v1`, full move log.

## Build order
1. Sim engine + dial + ASSISTED instrumentation (the toy must be fun bare).
2. Contract board + economy + stall loop.
3. Shop + Mk tiers + supply guarantee.
4. Modes, save, share. 5. Campaign meter + unlock gates.

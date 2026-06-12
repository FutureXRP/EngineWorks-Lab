# CRANKWORKS — Game Spec

Drivetrain builder. Typed ports, rotation, friction, reversible gearing. File: `crankworks.html` (playable; this spec documents current behavior plus v2).

## Current Sim (as shipped)

- 5×5 grid. Parts are `{id, rot}`; ports defined per rotation on faces 0=N/1=E/2=S/3=W. Tap selected part again = rotate 90°.
- Power: BFS per motor (120 RPM, 12 Nm out of one face). Connection requires mating ports on opposing faces. First flow claims a cell; later flows stop at visited cells.
- Friction: −5% torque entering each transmission part, unless an Oiler is upstream in that flow (Oiler sets `lub` flag for everything downstream).
- Parts: Motor $15r · Shaft $2c · Elbow $3c · T-Split $5u (torque divides among live branches) · Gearbox $7u (reversible: enter S-end → ×2 RPM ÷2 Nm; enter F-end → ÷2 RPM ×2 Nm) · Oiler $6u · Generator $6c (W = rpm×Nm/10) · Turbine $10u (×2 at ≥300 RPM else ×0.2) · Press $10u (×2 at ≥30 Nm else ×0.2).
- Demand `round(80 × 1.5^(n−1))`, economy per Bible §3 with FLOOR=5. Supply guarantees: a load if you own none; a motor if you own none.

## v2 — Build Next

### Save state + Operator Modes
Per Bible §5/§2, key `ewl.crankworks.v1`. ASSISTED = current live per-part RPM/Nm readouts + projected watts. STANDARD = projected watts only, parts show no numbers. MANUAL = nothing; **Dial Gauge** part ⌖ $3c: inline pass-through (shaft ports), zero friction, displays live RPM/Nm *at its own position only* — instrumentation you literally plumb into the line. (This is the flagship example of MANUAL-mode gauge design.)

### New parts (each with a distinct job)
| Part | Cost/Rarity | Ports | Effect | Distinct job |
|---|---|---|---|---|
| Belt Drive ∞ | $8 u | one face | pairs with a second Belt Drive anywhere on the SAME row/column with clear line of sight; transmits flow across the gap at −15% torque | the only non-adjacent connection in the catalog; solves topology locks |
| Flywheel ◍ | $9 r | inline (shaft) | smooths thresholds: downstream loads treat RPM as `max(rpm, 0.8 × peak rpm seen this run across all flows through it)` — practically, lets a marginal Turbine chain hit its band | threshold insurance; the mechanical Fuse-sibling |
| Clutch ⊅ | $5 u | inline | tap to toggle ENGAGED/FREE during build phase; FREE = flow stops here | lets one machine serve different demands without rebuilding; enables contract mode |
| Ratio Box 3:1 ⚙⁺ | $12 r | F/S ends | as Gearbox but ×3/÷3 | late-game band jumping (one part instead of two gearboxes' friction) |
| Torque Limiter ▽ | $4 c | inline | caps torque at 40 Nm passing through, excess shed as heat (cosmetic) | protects future fragile loads; pairs with Contracts below |

### Merge rule v2 (replaces "first flow claims")
When two flows arrive at the same part on DIFFERENT ports in the same run: if the part is a T-Split or Shaft, flows MERGE: `rpm = min(rpms)`, `torque = sum(torques) × 0.9` (synchronization loss). Anything else: second flow stops (as now) with a SLIP diagnostic on that cell. This makes multi-motor machines a real discipline instead of a wall.

### Contracts (replaces bare demand, mirrors COREWORKS)
Each round is a contract: total watts PLUS constraints, seeded. Examples: "≥1 load must be a Press" · "no more than 9 parts powered" · "Turbine watts count double this round" · "one load must receive ≤25 Nm (bring a Limiter)". Constraints shown one round ahead. Failure vocabulary: STARVED (load with no flow shows —), SPUTTER (threshold miss, !), SLIP (illegal merge), VOID (contract constraint unmet — names which one).

### Board expansion
+COLUMN button (grid widens 5→6→7) at $14/$22/$30. Columns, not rows, because drivetrains run horizontally more often. Adjust `NB()` and `COLS` to be dynamic.

# DYNAMO — Game Spec

The daily engine. Grid-based engine builder vs. escalating quotas. Flagship for soft launch. File: `dynamo.html` (playable; this spec documents current behavior plus Batch 2 expansion).

## Current Sim (as shipped — do not change without flagging)

- Grid 4 wide × `rows` (4 start, expandable to 7 via +ROW button at $12/$20/$28).
- Resolution order per run: (1) capacitor stored charge enters pool → (2) generators fire in reading order: `output = (base + 4×overclockCount) × Π(adjacent amp ×2 / coil ×3) × (1 + adjacent relays)` → (3) converters drink the shared pool in reading order: `capacity = base × (1 + adjacent relays)` → (4) capacitors store leftovers ≤40 each → (5) remainder WASTED (diagnosed).
- Quotas `round(15 × 1.5^(n−1))`. Economy per Bible §3 with FLOOR=4. Stall/streak/Fuse per Bible. Ranks: Apprentice/Operator/Engineer/Chief Engineer/Master Operator/Grand Dynamo/Ascendant.
- Parts: Dynamo 5⚡ $3c · Reactor 12⚡ $6u · Turbine 20⚡ $9r · Amp ×2 $5c · Coil ×3 $9r · Relay (adjacent parts trigger twice) $7u · Overclock (global +4 base) $8u · Converter 30⚡@1:1 $4c · Refinery 60⚡@1.5 $7u · Capacitor 40⚡ store $5u · Fuse $12r.
- Shop: 4 slots, $2 reroll, RARMULT maturity, conversion-capacity supply guarantee (`convPts() < quota(round+1)` forces a converter-class offer).
- Tutorial: 7-step state machine, RUN gated until valid starter build.

## Batch 2 — Build Next

### Save state
Per Bible §5, key `ewl.dynamo.v1`. Persist full `S` + mode. Autosave on every committed action. "Scrap this engine" reset with confirm. Record `moveLog` (array of `{t:'place'|'buy'|'sell'|'rotate'|'expand'|'reroll'|'run', ...args}`) for future server validation.

### Operator Modes
Per Bible §2. ASSISTED = current behavior. STANDARD hides per-cell consequences in the ghost line (show projected total only, hide waste figure). MANUAL hides ghost entirely. Add Gauge part for MANUAL economy: **Meter** ◫ $4 common, occupies a cell, does nothing in sim, but while on the grid restores the projected-total readout (one Meter = total; a second Meter = waste figure too).

### Conditional parts (6 new — each must survive "what's the difference?")
| Part | Cost/Rarity | Effect | Distinct job |
|---|---|---|---|
| Edge Tap ⌐ | $5 u | Generator, 4⚡, +4⚡ per adjacent EMPTY cell | rewards sparse builds; anti-density tension vs amps |
| Manifold ╪ | $8 u | Converter 25⚡@1:1, +15 capacity per adjacent converter-class part | makes converter *banks* a build, not a row of singles |
| Surge Cell ▲▲ | $9 r | Generator, 2⚡ base, doubles its own base each round it stays in the same cell (cap 32⚡) | time investment + placement commitment; moving it resets |
| Governor ◐ | $7 u | Adjacent generators −25% output, but their charge is NEVER wasted (auto-banks to pool next round, no capacitor needed) | safety valve; pairs with overbuilt cores |
| Flux Lens ◬ | $10 r | Doubles the multiplier of one adjacent Amp/Coil (×2→×4, ×3→×6); only the single strongest | super-late multiplier scaling without raw amp spam |
| Scrapper ⛏ | $6 u | At round end, gain $1 per 20⚡ wasted (max $4) | converts the failure diagnostic into an economy strategy; tension with fixing waste properly |

### Boss rounds
Every 5th round is a SURGE ROUND with a seeded modifier announced one round in advance (so it's plannable, per honest-physics doctrine). Modifier pool (seeded pick): "Amps offline this round" · "Converters at half capacity" · "Quota +25% but triple surplus pay" · "Reading order reversed" · "No rearranging this round (lock at start)". Modifiers change rules transparently, never secretly.

### Retool (prestige) — design now, build after save-state proves retention
When quota wall is reached (3 consecutive stalls offered as trigger, never forced): RETOOL melts the engine. Player keeps nothing except **Patents** = `floor(round/3)` permanent points spent on small permanent perks (+1 starting money each, +1 shop slot at 5, start at round 2 at 8...). New run begins at round 1 with patents applied. Patents are the long arc toward "something amazing."

### Daily Ranked mode (production phase)
One ranked attempt per day on the daily seed, mode-locked, committed before viewing leaderboards; unlimited practice on yesterday's seed. Requires accounts; design the client UI now, ship with platform layer.

## Failure vocabulary
WASTED (charge above conversion capacity) · STALLED (quota missed). Batch 2 adds SURGE (boss round active) as a state label, not a failure.

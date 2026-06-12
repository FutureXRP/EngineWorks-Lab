# EngineWorks Lab — DESIGN BIBLE

Shared systems for every game in the catalog. Game specs in `docs/games/` inherit everything here. Where a game spec conflicts with this bible, the bible wins unless the spec explicitly says "OVERRIDE."

## 1. Doctrine (product law)

1. **Invented physics, honest physics.** No real-world domain advantage. The rules never lie; everything is learnable in-game.
2. **Every failure is diagnosable and named.** Each game defines its failure vocabulary (e.g., STARVED, CHOKED, OVERHEAT, SHUDDER, BURST, SLAG). A failure without a name and a location is a bug.
3. **No death.** Failure = STALL: no income, small scrap subsidy ($2), streak reset, the target holds. A path forward must be mathematically guaranteed (the subsidy guarantees it).
4. **No pay-to-win.** Real money buys access to the catalog, never advantage inside it.
5. **Daily seeds are sacred.** Deterministic, identical for all players, derived from the UTC date. RNG consumed sequentially from `mulberry32(strSeed('<game>-day-N'))`. Never call `Math.random()` in game logic. Never reorder existing `rng()` calls in a shipped game.
6. **Every part survives "what's the difference?"** Each part has a job no other part does.
7. **Mandatory part classes get supply smoothing.** If progress requires a part class the player lacks, the next shop guarantees one is offered.
8. **Information is honest but tiered.** See §2. Never hide computable information *except* via the difficulty system. Never add auto-optimize/auto-layout — arrangement is the skill.

## 2. Operator Modes (difficulty = instrumentation, not physics)

The sim, seed, economy, and targets are IDENTICAL in every mode. Modes only change what the machine tells you before you commit, plus a score multiplier. Mode is chosen at run start, locked for the run, stored in save state, and badged on shares/leaderboards.

| Mode | Multiplier | Pre-commit information |
|---|---|---|
| **ASSISTED** | ×1.0 | Ghost projection on the target gauge, live per-part readouts, waste/bottleneck warnings, failure forecasts |
| **STANDARD** | ×1.25 | Ghost projection of the TOTAL only. Per-part readouts and warnings hidden until the run executes |
| **MANUAL** | ×1.5 | Nothing live. The run reveals everything. Gauge-class parts (where a game defines them) restore specific readouts as purchasable, slot-occupying instrumentation |

Implementation: every game funnels pre-commit display through one function gated by `S.settings.mode`. The sim always computes full data; the mode filters display only. Post-run results are always fully detailed in every mode — diagnosis after the fact is sacred (Doctrine #2).

UI: mode picker on the intro screen with one-line descriptions and multipliers; current mode shown as a small badge in the header; share text includes mode.

## 3. Shared Economy Template

Game specs tune constants but keep the shape:

- **Targets** grow geometrically: `T(n) = round(BASE × RATE^(n−1))`, RATE ≈ 1.45–1.55.
- **Income on clear**: `FLOOR + n + surplus + interest + streak` where surplus = `min(3, floor((result/target − 1) × 4))`, interest = `min(4, floor(money/5))`, streak = `min(5, streak − 1)`.
- **Stall**: $2 subsidy, streak → 0, target holds, round does not advance.
- **Shop**: 4 seeded slots, $2 reroll, rarity weights mature with round (`RARMULT` pattern: commons taper to ~0.35×, rares climb ~+12–14%/round), supply guarantees per Doctrine #7.
- **Sell** = floor(cost/2). **Insurance part** (Fuse-class, ~$12 rare): burns on a miss to preserve streak + base pay.
- **Board expansion** (spatial games): escalating fixed-price button, never a shop item.
- **Ranks**: named operator titles at round thresholds 1/4/7/10/14/18/24 (per-game flavor names allowed).

## 4. Seeds, Determinism, Anti-cheat

- Day number: days since 2026-01-01 UTC, +1.
- All randomness flows from one `rng` stream per run. Adding a feature that consumes RNG must append draws AFTER existing call sites or use a forked stream (`mulberry32(strSeed(seed + ':featureName'))`).
- Production leaderboards validate by replaying the player's move log server-side against the seed. Design every game so the full run is reconstructible from `(seed, mode, moveLog)`. Record the move log from day one even before servers exist.

## 5. Save State

- Key: `ewl.<game>.v<schemaVersion>` in localStorage (allowed on the deployed site).
- Shape: `{ schema: 1, state: S, settings: { mode }, meta: { created, updated, dayNum } }`.
- On load: if schema mismatches, offer reset (do not attempt risky migration in v1). Save after every committed action (place, buy, sell, run resolution). Provide an explicit "Scrap this machine" reset with confirmation.

## 6. Shared UI Kit

- Single self-contained HTML file per game. Vanilla JS, inline CSS, no build step. `max-width:520px`, portrait-first, tap-driven, `prefers-reduced-motion` respected, `env(safe-area-inset-bottom)` on sticky bars.
- Type: Chakra Petch (display) + IBM Plex Mono (data) everywhere.
- Per-game accent families on a shared dark-industrial base: DYNAMO amber/olive · CRANKWORKS copper/steel · COREWORKS prussian/chalk/flux-amber · PIPEWORKS teal/brass on near-black · FOUNDRY ember-orange/iron-grey.
- Shared anatomy: header (brand, day, rank, mode badge, stats row, target gauge with ghost layer) → play surface → info strip (selected item + actions) → bench → shop → sticky commit button.
- The commit button is the ritual: each game names it in its own voice (RUN ENGINE / ENGAGE DRIVE / BENCH PULL / OPEN MAINS / POUR).
- Result animation always plays in causal order so the player can watch the system resolve.

## 7. Catalog & Status

| Game | Surface | Core skill | Status |
|---|---|---|---|
| DYNAMO | grid, adjacency auras | placement economics | playable, needs save + content batch |
| CRANKWORKS | grid, typed ports + rotation | transmission design | playable, needs save + v2 parts |
| COREWORKS | socket anatomy + tuning dial | systems matching | mockup approved, sim to build |
| PIPEWORKS | grid, rated networks | pressure routing | spec only |
| FOUNDRY | process pipeline, no grid | recipe inference | spec only |

Build order: DYNAMO hardening → COREWORKS sim → CRANKWORKS v2 → PIPEWORKS → FOUNDRY.

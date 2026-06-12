# EngineWorks Lab

Invented machines, honest physics. A catalog of seeded daily engineering games —
identical machine, identical seed, for every operator on Earth — with accounts,
a subscription paywall for ranked play, and daily / weekly / monthly league
leaderboards.

Design law lives in [`docs/DESIGNBIBLE.md`](docs/DESIGNBIBLE.md); per-game specs
in [`docs/games/`](docs/games/).

## Run it

Requires Node 22+ (uses the built-in `node:sqlite` — zero npm dependencies).

```sh
node server/server.js        # http://localhost:8420  (PORT=… to override)
```

That serves the hub (`web/index.html`), the games, and the platform API.
The SQLite database is created at `data/ewl.sqlite` on first run
(`EWL_DATA_DIR=…` to relocate).

## What's here

| Path | What |
|---|---|
| `web/index.html` | Hub: catalog, league countdowns, leaderboards, sign-in/up, subscription paywall, account panel |
| `web/platform.js` | SDK games load: league seed strings, save keys, move-log mirror, ranked score submission (fail-safe — games always work offline/signed-out) |
| `web/games/dynamo.html` | DYNAMO — playable: tutorial, operator modes, save, move log, share |
| `web/games/crankworks.html` | CRANKWORKS — playable, integrated (modes, save, move log, ranked submit) |
| `web/games/coreworks.html` | COREWORKS — playable: socket anatomy + frequency dial, contracts campaign |
| `web/games/coreworks-mockup.html` | Approved COREWORKS visual reference (kept untouched per spec) |
| `web/games/pipeworks.html` | PIPEWORKS — playable: pressure networks, rated pipes, BURST |
| `web/games/foundry.html` | FOUNDRY — playable: alloy chemistry, Materials Codex, ore market |
| `server/server.js` | Zero-dependency platform server: static hosting + JSON API |
| `docs/` | Design Bible + all five game specs |

## The model

- **Free forever:** every game is playable unranked, full physics, daily seed.
- **Ranked subscription ($4.99/mo):** posting scores to the daily, weekly and
  monthly leagues. Per Bible §1.4 money buys *access to competition*, never
  advantage — all operators play the identical seeded machine.
- **Leagues (UTC):** daily `day-N` (days since 2026-01-01), weekly
  `week-YYYY-Www` (ISO week), monthly `month-YYYY-MM`. Each league is its own
  seed stream, so the weekly machine is a different puzzle from the daily one.
- **Scoring:** games submit raw score + operator mode; the server applies the
  Bible §2 multiplier (ASSISTED ×1.0 / STANDARD ×1.25 / MANUAL ×1.5) and keeps
  each player's best per period. Move logs are stored with every score as the
  replay-validation source (Bible §4) — server-side replay validation is the
  next anti-cheat milestone.

## API surface

```
POST /api/auth/register {handle,email,password}
POST /api/auth/login    {email,password}
POST /api/auth/logout
GET  /api/me
POST /api/billing/subscribe          # dev provider; Stripe swap point, see below
POST /api/billing/cancel
GET  /api/leagues
POST /api/scores        {game,league,score,round,mode,moveLog}   # 401 unauth / 402 unsubscribed
GET  /api/leaderboard?game=&league=&period=
GET  /play/<game>?league=daily|weekly|monthly
```

## Production checklist (not yet wired)

- **Payments:** `server/server.js` ships a `dev` billing provider (subscribe
  button activates instantly so the whole loop is testable). The swap point is
  documented in the billing section of `server.js`: replace it with Stripe
  Checkout + a webhook writing the same `subscriptions` row. Nothing else
  changes.
- **Replay validation:** scores already carry `(seed, mode, moveLog)`; add a
  headless replayer per game and validate before ranking (Bible §4).
- **HTTPS / cookies:** put behind TLS and add `Secure` to the session cookie.
- **Email:** no verification or password reset yet.

## Mobile (roadmap)

Web-first by design — each game is a single self-contained HTML file. The
planned native path is a thin wrapper (Capacitor or similar) around the same
`web/` bundle for iOS and Android, sharing the platform API; App Store /
Play Store subscription billing will need StoreKit / Play Billing alongside
Stripe on the web.

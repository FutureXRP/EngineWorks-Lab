#!/usr/bin/env node
/* EngineWorks Lab — platform server
 * Zero-dependency Node (>=22): node:http + node:sqlite.
 * Accounts, sessions, subscription paywall (ranked leagues), leaderboards.
 *
 * Run: node server/server.js   (PORT env to override, default 8420)
 */
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 8420);
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const DATA_DIR = process.env.EWL_DATA_DIR || path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ============ db ============ */
const db = new DatabaseSync(path.join(DATA_DIR, 'ewl.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_salt TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created INTEGER NOT NULL,
    expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    status TEXT NOT NULL,              -- 'active' | 'canceled'
    provider TEXT NOT NULL,            -- 'dev' | 'stripe'
    period_end INTEGER NOT NULL,       -- ms epoch; access until this time
    updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS entitlements (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    ads_removed INTEGER NOT NULL DEFAULT 0,  -- one-time "Remove Ads" purchase
    provider TEXT,                           -- 'dev' | 'stripe' | 'appstore' | 'play'
    updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    game TEXT NOT NULL,
    league TEXT NOT NULL,              -- 'daily' | 'weekly' | 'monthly'
    period_key TEXT NOT NULL,          -- e.g. 'day-163', 'week-2026-W24', 'month-2026-06'
    score INTEGER NOT NULL,            -- raw in-game score
    points INTEGER NOT NULL,           -- score x mode multiplier (ranking key)
    round INTEGER NOT NULL,
    mode TEXT NOT NULL,
    move_log TEXT NOT NULL,            -- JSON; replay-validation source (Bible §4)
    created INTEGER NOT NULL,
    updated INTEGER NOT NULL,
    UNIQUE(user_id, game, league, period_key)
  );
  CREATE INDEX IF NOT EXISTS idx_scores_board ON scores(game, league, period_key, points DESC);
`);

/* ============ shared constants ============ */
const GAMES = new Set(['dynamo', 'crankworks', 'coreworks', 'pipeworks', 'foundry']);
const LEAGUES = new Set(['daily', 'weekly', 'monthly']);
const MODE_MULT = { ASSISTED: 1.0, STANDARD: 1.25, MANUAL: 1.5 }; // Bible §2
const SESSION_DAYS = 30;
const SUB_DAYS = 30;
const PLAN = { id: 'ranked-monthly', name: 'EngineWorks Ranked', priceCents: 499, interval: 'month' };
/* One-time purchase: removes ads on the free tier. Subscribers are always ad-free. */
const REMOVE_ADS = { id: 'remove-ads', name: 'Remove Ads', priceCents: 299, type: 'one_time' };

/* ============ league periods (UTC, Bible §4 epoch) ============ */
const EPOCH = Date.UTC(2026, 0, 1);
function dayNum(now) { return Math.floor((now - EPOCH) / 86400000) + 1; }
function isoWeek(now) {
  const d = new Date(now);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;            // Mon=1..Sun=7
  t.setUTCDate(t.getUTCDate() + 4 - day);    // nearest Thursday
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return { y, week };
}
function periods(now = Date.now()) {
  const d = new Date(now);
  const { y, week } = isoWeek(now);
  const dayEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const dow = d.getUTCDay() || 7;
  const weekEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - dow));
  const monthEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return {
    daily:   { key: `day-${dayNum(now)}`, endsAt: dayEnd },
    weekly:  { key: `week-${y}-W${String(week).padStart(2, '0')}`, endsAt: weekEnd },
    monthly: { key: `month-${d.getUTCFullYear()}-${mm}`, endsAt: monthEnd },
  };
}
/* Seed strings: daily keeps the shipped '<game>-day-N' scheme (Bible §5 sacred);
 * weekly/monthly are forked streams per Bible §4. */
function seedString(game, league, p) {
  if (league === 'daily') return `${game}-${p.daily.key}`;
  if (league === 'weekly') return `${game}-${p.weekly.key}`;
  return `${game}-${p.monthly.key}`;
}

/* ============ auth helpers ============ */
function hashPassword(pw, salt) {
  return crypto.scryptSync(pw, salt, 32).toString('hex');
}
function getSessionUser(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)ewl_session=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const row = db.prepare(
    `SELECT u.id, u.handle, u.email, s.token FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires > ?`).get(m[1], Date.now());
  return row || null;
}
function subStatus(userId) {
  const now = Date.now();
  const row = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  const active = !!row && row.period_end > now;
  return {
    active,
    status: row ? row.status : 'none',
    renewsAt: row ? row.period_end : null,
    willRenew: !!row && row.status === 'active',
  };
}
function entitlements(userId) {
  const row = db.prepare('SELECT ads_removed FROM entitlements WHERE user_id = ?').get(userId);
  return { adsRemoved: !!(row && row.ads_removed) };
}
/* The single public shape for a logged-in user. `showAds` is authoritative:
 * subscribers are always ad-free; the one-time purchase also removes ads. */
function publicUser(u) {
  const subscription = subStatus(u.id);
  const ent = entitlements(u.id);
  const showAds = !subscription.active && !ent.adsRemoved;
  return { id: u.id, handle: u.handle, email: u.email, subscription, entitlements: { ...ent, showAds } };
}

/* ============ http plumbing ============ */
function send(res, code, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(json);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; if (buf.length > 2_000_000) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2',
};
function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath);
  if (p === '/') p = '/index.html';
  const file = path.join(WEB, p);
  if (!file.startsWith(WEB)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) {
      // extensionless game routes: /play/dynamo -> games/dynamo.html handled in router
      return send(res, 404, { error: 'not found' });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ============ api ============ */
const HANDLE_RE = /^[A-Za-z0-9_.-]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const api = {
  /* ---- auth ---- */
  async 'POST /api/auth/register'(req, res) {
    const { handle, email, password } = await readBody(req);
    if (!HANDLE_RE.test(handle || '')) return send(res, 400, { error: 'handle must be 3-20 chars (letters, digits, _ . -)' });
    if (!EMAIL_RE.test(email || '')) return send(res, 400, { error: 'invalid email' });
    if (!password || password.length < 8) return send(res, 400, { error: 'password must be at least 8 characters' });
    const salt = crypto.randomBytes(16).toString('hex');
    try {
      const r = db.prepare('INSERT INTO users (handle,email,pass_salt,pass_hash,created) VALUES (?,?,?,?,?)')
        .run(handle, email, salt, hashPassword(password, salt), Date.now());
      return loginUser(res, Number(r.lastInsertRowid));
    } catch (e) {
      return send(res, 409, { error: 'handle or email already in use' });
    }
  },
  async 'POST /api/auth/login'(req, res) {
    const { email, password } = await readBody(req);
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email || '');
    if (!u || hashPassword(password || '', u.pass_salt) !== u.pass_hash) {
      return send(res, 401, { error: 'wrong email or password' });
    }
    return loginUser(res, u.id);
  },
  async 'POST /api/auth/logout'(req, res) {
    const sess = getSessionUser(req);
    if (sess) db.prepare('DELETE FROM sessions WHERE token = ?').run(sess.token);
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'ewl_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' });
  },
  async 'GET /api/me'(req, res) {
    const sess = getSessionUser(req);
    const p = periods();
    const body = { leagues: p, plan: PLAN, removeAds: REMOVE_ADS, user: null };
    if (sess) body.user = publicUser(sess);
    return send(res, 200, body);
  },

  /* ---- billing (dev provider; swap for Stripe Checkout in production) ----
   * Production path: POST /api/billing/subscribe creates a Stripe Checkout
   * Session and returns its URL; a /api/billing/webhook endpoint receives
   * checkout.session.completed / invoice.paid / customer.subscription.deleted
   * and writes the same subscriptions row. The rest of the app only reads
   * subscriptions.period_end, so the swap is contained here. */
  async 'POST /api/billing/subscribe'(req, res) {
    const sess = getSessionUser(req);
    if (!sess) return send(res, 401, { error: 'sign in first' });
    const now = Date.now();
    const cur = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(sess.id);
    const base = cur && cur.period_end > now ? cur.period_end : now;
    const end = base + SUB_DAYS * 86400000;
    db.prepare(`INSERT INTO subscriptions (user_id,status,provider,period_end,updated) VALUES (?,?,?,?,?)
                ON CONFLICT(user_id) DO UPDATE SET status='active', provider=excluded.provider,
                period_end=excluded.period_end, updated=excluded.updated`)
      .run(sess.id, 'active', 'dev', end, now);
    return send(res, 200, { ok: true, subscription: subStatus(sess.id) });
  },
  async 'POST /api/billing/cancel'(req, res) {
    const sess = getSessionUser(req);
    if (!sess) return send(res, 401, { error: 'sign in first' });
    db.prepare("UPDATE subscriptions SET status='canceled', updated=? WHERE user_id=?").run(Date.now(), sess.id);
    return send(res, 200, { ok: true, subscription: subStatus(sess.id) });
  },
  /* One-time "Remove Ads" purchase (dev provider). Production: a Stripe
   * one-time Checkout (or App Store / Play one-time IAP); the webhook /
   * receipt validation writes this same entitlements row. */
  async 'POST /api/billing/remove-ads'(req, res) {
    const sess = getSessionUser(req);
    if (!sess) return send(res, 401, { error: 'sign in first' });
    const now = Date.now();
    db.prepare(`INSERT INTO entitlements (user_id,ads_removed,provider,updated) VALUES (?,1,?,?)
                ON CONFLICT(user_id) DO UPDATE SET ads_removed=1, provider=excluded.provider, updated=excluded.updated`)
      .run(sess.id, 'dev', now);
    return send(res, 200, { ok: true, entitlements: entitlements(sess.id) });
  },

  /* ---- leagues & scores ---- */
  async 'GET /api/leagues'(req, res) {
    const p = periods();
    const out = {};
    for (const lg of LEAGUES) out[lg] = { ...p[lg] };
    return send(res, 200, { leagues: out, now: Date.now() });
  },
  async 'POST /api/scores'(req, res) {
    const sess = getSessionUser(req);
    if (!sess) return send(res, 401, { error: 'sign in to post ranked scores' });
    const sub = subStatus(sess.id);
    if (!sub.active) return send(res, 402, { error: 'subscription_required', plan: PLAN });
    const { game, league, score, round, mode, moveLog } = await readBody(req);
    if (!GAMES.has(game)) return send(res, 400, { error: 'unknown game' });
    if (!LEAGUES.has(league)) return send(res, 400, { error: 'unknown league' });
    const mult = MODE_MULT[mode];
    if (!mult) return send(res, 400, { error: 'unknown mode' });
    if (!Number.isInteger(score) || score < 0 || score > 1e9) return send(res, 400, { error: 'bad score' });
    if (!Number.isInteger(round) || round < 1 || round > 10000) return send(res, 400, { error: 'bad round' });
    const now = Date.now();
    const p = periods(now);
    const periodKey = p[league].key;             // server-authoritative period
    const points = Math.round(score * mult);
    const log = JSON.stringify(moveLog || []).slice(0, 500_000); // replay source, Bible §4
    const cur = db.prepare('SELECT points FROM scores WHERE user_id=? AND game=? AND league=? AND period_key=?')
      .get(sess.id, game, league, periodKey);
    if (!cur) {
      db.prepare(`INSERT INTO scores (user_id,game,league,period_key,score,points,round,mode,move_log,created,updated)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(sess.id, game, league, periodKey, score, points, round, mode, log, now, now);
    } else if (points > cur.points) {
      db.prepare(`UPDATE scores SET score=?, points=?, round=?, mode=?, move_log=?, updated=?
                  WHERE user_id=? AND game=? AND league=? AND period_key=?`)
        .run(score, points, round, mode, log, now, sess.id, game, league, periodKey);
    }
    const best = Math.max(points, cur ? cur.points : 0);
    return send(res, 200, { ok: true, periodKey, points, best, improved: !cur || points > cur.points });
  },
  async 'GET /api/leaderboard'(req, res, url) {
    const game = url.searchParams.get('game');
    const league = url.searchParams.get('league') || 'daily';
    if (!GAMES.has(game)) return send(res, 400, { error: 'unknown game' });
    if (!LEAGUES.has(league)) return send(res, 400, { error: 'unknown league' });
    const p = periods();
    const periodKey = url.searchParams.get('period') || p[league].key;
    const rows = db.prepare(
      `SELECT u.handle, s.score, s.points, s.round, s.mode, s.updated
       FROM scores s JOIN users u ON u.id = s.user_id
       WHERE s.game=? AND s.league=? AND s.period_key=?
       ORDER BY s.points DESC, s.updated ASC LIMIT 100`).all(game, league, periodKey);
    const board = rows.map((r, i) => ({ rank: i + 1, ...r }));
    let me = null;
    const sess = getSessionUser(req);
    if (sess) {
      const mine = db.prepare('SELECT points FROM scores WHERE user_id=? AND game=? AND league=? AND period_key=?')
        .get(sess.id, game, league, periodKey);
      if (mine) {
        const ahead = db.prepare(
          'SELECT COUNT(*) AS n FROM scores WHERE game=? AND league=? AND period_key=? AND points > ?')
          .get(game, league, periodKey, mine.points);
        me = { rank: ahead.n + 1, points: mine.points, handle: sess.handle };
      }
    }
    return send(res, 200, { game, league, periodKey, endsAt: p[league].endsAt, board, me });
  },
};

function loginUser(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token,user_id,created,expires) VALUES (?,?,?,?)')
    .run(token, userId, now, now + SESSION_DAYS * 86400000);
  const u = db.prepare('SELECT id,handle,email FROM users WHERE id=?').get(userId);
  return send(res, 200, { user: publicUser(u) }, {
    'Set-Cookie': `ewl_session=${token}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; SameSite=Lax`,
  });
}

/* ============ server ============ */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = `${req.method} ${url.pathname}`;
  try {
    if (api[route]) return await api[route](req, res, url);
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });
    /* pretty play routes: /play/<game>?league=daily|weekly|monthly */
    const play = url.pathname.match(/^\/play\/([a-z]+)$/);
    if (play) return serveStatic(req, res, `/games/${play[1]}.html`);
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    return send(res, 400, { error: e.message || 'bad request' });
  }
});
server.listen(PORT, () => console.log(`EngineWorks Lab platform on http://localhost:${PORT}`));

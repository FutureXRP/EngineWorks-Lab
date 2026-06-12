/* EngineWorks Lab — platform SDK for games.
 * Games include this with <script src="../platform.js"></script> and call:
 *   const ctx = EWL.boot({game:'dynamo'});
 *   EWL.log(move);                       // mirror every committed action
 *   EWL.submitScore({score, round, mode}); // after every run resolution
 * Everything is fail-safe: games must keep working offline / signed out.
 */
(function () {
  'use strict';
  const EPOCH = Date.UTC(2026, 0, 1);

  function dayNum(now) { return Math.floor((now - EPOCH) / 86400000) + 1; }
  function isoWeek(now) {
    const d = new Date(now);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y = t.getUTCFullYear();
    const week = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return y + '-W' + String(week).padStart(2, '0');
  }
  function periodKey(league, now) {
    const d = new Date(now);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    if (league === 'weekly') return 'week-' + isoWeek(now);
    if (league === 'monthly') return 'month-' + d.getUTCFullYear() + '-' + mm;
    return 'day-' + dayNum(now);
  }

  const EWL = {
    ctx: null,
    moveLog: [],

    boot(opts) {
      const game = opts.game;
      const q = new URLSearchParams(location.search);
      let league = q.get('league') || 'daily';
      if (!['daily', 'weekly', 'monthly'].includes(league)) league = 'daily';
      const now = Date.now();
      const pk = periodKey(league, now);
      this.ctx = {
        game, league, periodKey: pk,
        dayNum: dayNum(now),
        /* daily keeps the sacred shipped scheme '<game>-day-N' (Bible §5);
         * weekly/monthly are forked streams (Bible §4) */
        seedString: game + '-' + pk,
        saveKey: league === 'daily' ? 'ewl.' + game + '.v1'
                                    : 'ewl.' + game + '.' + league + '.v1',
        leagueLabel: league.toUpperCase() + ' · ' + pk,
        ranked: true,
      };
      this.moveLog = [];
      this._mountBadge();
      return this.ctx;
    },

    log(entry) {
      if (this.moveLog.length < 20000) this.moveLog.push(entry);
    },

    async submitScore(r) {
      if (!this.ctx) return;
      try {
        const res = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            game: this.ctx.game, league: this.ctx.league,
            score: r.score, round: r.round, mode: r.mode || 'ASSISTED',
            moveLog: this.moveLog,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          this._toast(body.improved
            ? 'RANKED · ' + body.points + ' pts posted to the ' + this.ctx.league + ' league'
            : 'RANKED · best stands at ' + body.best + ' pts');
        } else if (res.status === 401) {
          this._toast('Playing unranked — sign in at the hub to post scores', '/');
        } else if (res.status === 402) {
          this._toast('Ranked leagues need a subscription — upgrade at the hub', '/#upgrade');
        }
        return body;
      } catch (e) { /* offline play is sacred — never break the game */ }
    },

    /* small fixed banner; games keep their own UI untouched */
    _toast(msg, href) {
      let el = document.getElementById('ewlToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'ewlToast';
        el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);' +
          'z-index:99;background:#171A1B;border:1px solid #475052;border-radius:6px;' +
          'padding:8px 14px;font:600 11px "IBM Plex Mono",monospace;letter-spacing:.06em;' +
          'color:#E9E4D4;max-width:90%;text-align:center;cursor:pointer;transition:opacity .3s';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.onclick = href ? () => { location.href = href; } : null;
      el.style.opacity = '1';
      clearTimeout(this._tt);
      this._tt = setTimeout(() => { el.style.opacity = '0'; }, 4500);
    },

    _mountBadge() {
      const mount = () => {
        const el = document.createElement('a');
        el.href = '/';
        el.textContent = '◀ LAB · ' + this.ctx.league.toUpperCase();
        el.style.cssText = 'position:fixed;top:6px;right:6px;z-index:98;background:#171A1B;' +
          'border:1px solid #2E3536;border-radius:4px;padding:3px 8px;text-decoration:none;' +
          'font:600 9px "IBM Plex Mono",monospace;letter-spacing:.12em;color:#8E9697';
        document.body.appendChild(el);
      };
      if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
    },
  };

  window.EWL = EWL;
})();

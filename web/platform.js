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
      this._initAds();
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
      finally { try { this._maybeAd(); } catch (e) {} }
    },

    /* ---- ads: free tier only. Subscribers and one-time "Remove Ads"
     * buyers never see them; offline/standalone play never sees them. ---- */
    _ads: { ready: false, show: false, count: 0, removeAds: { priceCents: 299 } },
    _adEvery: 3,                          // one interstitial every Nth committed run
    async _initAds() {
      /* Default OFF until we confirm a free/anonymous session online; if the
       * fetch throws (offline / file://) it stays OFF so play is never blocked. */
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' });
        const b = await res.json().catch(() => ({}));
        const u = b && b.user;
        this._ads.show = u ? !!(u.entitlements && u.entitlements.showAds) : true;  // signed-out = free tier
        if (b && b.removeAds) this._ads.removeAds = b.removeAds;
        try { this._ads.count = parseInt(localStorage.getItem('ewl.adcount') || '0', 10) || 0; } catch (e) {}
        this._ads.ready = true;
      } catch (e) { this._ads.show = false; }
    },
    _maybeAd() {
      if (!this._ads.show) return;        // subscribers / remove-ads / offline / unknown
      this._ads.count += 1;
      try { localStorage.setItem('ewl.adcount', String(this._ads.count)); } catch (e) {}
      if (this._ads.count % this._adEvery !== 0) return;
      this._showInterstitial();
    },
    _showInterstitial() {
      if (!document.body || document.getElementById('ewlAd')) return;
      const price = '$' + (((this._ads.removeAds && this._ads.removeAds.priceCents) || 299) / 100).toFixed(2);
      const ov = document.createElement('div');
      ov.id = 'ewlAd';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,10,9,.94);display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;' +
        'font-family:"IBM Plex Mono",ui-monospace,monospace;color:#E9E4D4';
      ov.innerHTML =
        '<div style="font-size:9px;letter-spacing:.2em;color:#8E9697">ADVERTISEMENT · DEMO PLACEHOLDER</div>' +
        '<div style="font-family:\'Chakra Petch\',sans-serif;font-size:22px;letter-spacing:.06em">Your ad could be here</div>' +
        '<div style="font-size:11px;color:#8E9697;max-width:34ch;line-height:1.5">Free players see a short ad every few runs. This stub swaps for a real ad network in the apps.</div>' +
        '<button id="ewlAdRemove" style="margin-top:4px;font-family:\'Chakra Petch\',sans-serif;letter-spacing:.06em;border:1px solid #8A6230;background:#2A2113;color:#FFAE45;border-radius:8px;padding:10px 16px;font-size:12px;cursor:pointer">Remove ads — ' + price + ' one-time</button>' +
        '<button id="ewlAdClose" disabled style="font-family:\'Chakra Petch\',sans-serif;letter-spacing:.1em;border:1px solid #475052;background:#1F2425;color:#8E9697;border-radius:8px;padding:8px 18px;font-size:12px">CLOSE <span id="ewlAdT">(5)</span></button>';
      document.body.appendChild(ov);
      document.getElementById('ewlAdRemove').onclick = () => { location.href = '/#upgrade'; };
      const closeBtn = document.getElementById('ewlAdClose');
      let t = 5;
      const iv = setInterval(() => {
        t -= 1;
        const lab = document.getElementById('ewlAdT');
        if (t <= 0) {
          clearInterval(iv);
          closeBtn.disabled = false;
          closeBtn.style.color = '#E9E4D4'; closeBtn.style.borderColor = '#8E9697'; closeBtn.style.cursor = 'pointer';
          closeBtn.innerHTML = 'CLOSE ✕';
          closeBtn.onclick = () => ov.remove();
        } else if (lab) { lab.textContent = '(' + t + ')'; }
      }, 1000);
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

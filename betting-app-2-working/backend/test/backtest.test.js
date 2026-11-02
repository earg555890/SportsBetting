import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkForward, createElo } from '../model/elo.js';
import { splitIndex, tuneLeague } from '../model/tune.js';
import { backtestLeague } from '../model/backtest.js';

// Synthetic league: 8 teams with fixed hidden strengths, two seasons.
function makeGames(seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const strength = [3, 2, 1, 0.5, 0, -0.5, -1, -2];
  const games = [];
  let day = 0;
  for (const season of [2025, 2026]) {
    const n = season === 2025 ? 400 : 120;
    for (let i = 0; i < n; i++) {
      const h = Math.floor(rand() * 8);
      let a = Math.floor(rand() * 7); if (a >= h) a++;
      const diff = strength[h] - strength[a] + 0.6 + (rand() - 0.5) * 6;
      const hs = 100 + Math.max(0, Math.round(diff * 3));
      let as = 100 + Math.max(0, Math.round(-diff * 3));
      if (as === hs) as += diff >= 0 ? -1 : 1;              // no ties (they are not scored)
      const date = new Date(Date.UTC(2025, 0, 1) + (day++) * 3600e3).toISOString();
      games.push({ id: String(games.length), date, season, home: 't' + h, away: 't' + a, hs, as, neutral: false });
    }
  }
  return games;
}

test('walk-forward: each prediction only uses earlier games (changing the future changes nothing)', () => {
  const games = makeGames();
  const params = { k: 20, hfa: 40, revert: 0.25 };
  const base = walkForward(games, params).preds;
  const k = 300;
  const altered = games.map((g, i) => (i < k ? g : { ...g, hs: g.as, as: g.hs + 7 }));  // flip every later result
  const changed = walkForward(altered, params).preds;
  for (let i = 0; i <= k; i++) assert.equal(changed[i], base[i], `prediction ${i} changed`);
  assert.notDeepEqual(changed.slice(k + 1), base.slice(k + 1));     // sanity: later ones do change
});

test('walk-forward: prediction i equals a fresh model trained on games[0..i) only', () => {
  const games = makeGames(11);
  const params = { k: 15, hfa: 30, revert: 1 / 3 };
  const preds = walkForward(games, params).preds;
  for (const i of [0, 1, 50, 399, 400, 401, 519]) {
    const fresh = createElo(params);
    games.slice(0, i).forEach(g => fresh.update(g));
    // update() returns the PRE-game probability (and applies the season
    // regression first when game i opens a new season, as the walk does)
    assert.equal(preds[i], fresh.update(games[i]));
  }
});

test('tuning never sees the test period', () => {
  const games = makeGames(3);
  const cut = splitIndex(games);
  assert.equal(cut, 200);                                  // half of the first season (400 games)
  const a = tuneLeague('nba', games);
  const scrambled = games.map((g, i) => (i < cut ? g : { ...g, hs: 0, as: 99 }));
  const b = tuneLeague('nba', scrambled);
  assert.deepEqual(b.params, a.params);
  assert.equal(b.tuneLogLoss, a.tuneLogLoss);
  assert.ok(a.tuneGames.every(g => g.date < games[cut].date));
});

test('backtest scores only test games and beats 50/50 on a league with real skill gaps', () => {
  const games = makeGames(5);
  const r = backtestLeague('nba', games);
  assert.equal(r.elo.n, games.length - splitIndex(games));
  assert.equal(r.coin.brier, 0.25);
  assert.ok(r.elo.logLoss < r.coin.logLoss);
  assert.equal(r.parts.restOfLastSeason.n + r.parts.thisSeason.n, r.elo.n);
});

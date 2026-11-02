// ============================================================
// TUNE — pick K and home advantage per league, on early data only
// ============================================================
//
// Games (sorted by date) are split at splitIndex():
//   TUNE = the first half of the last full season (earliest season in the data)
//   TEST = everything after (used only by backtest.js)
//
// K and HFA are grid-searched on TUNE by log loss. The first BURN_IN share of
// TUNE is replayed but not scored, so the "everyone starts at 1500" period
// doesn't decide the parameters. Season regression (`revert`) is a fixed
// prior from elo.js — the only season break lies in TEST.
//
// Run from backend/:  node model/tune.js     → writes model/params.json
// ============================================================

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkForward, score, REVERT } from './elo.js';
import { loadHistory, MODEL_LEAGUES, PARAMS_PATH } from './service.js';

export const TUNE_FRACTION = 0.5;   // of the first season
export const BURN_IN = 0.25;        // of the tune games

export const GRID = {
  k:   [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40, 45, 50, 60],
  hfa: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120]
};

// Index of the first TEST game.
export function splitIndex(games) {
  const first = games[0].season;
  const firstSeasonCount = games.filter(g => g.season === first).length;
  return Math.floor(firstSeasonCount * TUNE_FRACTION);
}

// Grid search. Takes ONLY the tune slice, so it cannot see the test period.
export function tune(tuneGames, revert) {
  const from = Math.floor(tuneGames.length * BURN_IN);
  let best = null;
  for (const k of GRID.k) {
    for (const hfa of GRID.hfa) {
      const { preds } = walkForward(tuneGames, { k, hfa, revert });
      const s = score(tuneGames, preds, from);
      if (!best || s.logLoss < best.logLoss) best = { k, hfa, logLoss: s.logLoss };
    }
  }
  return best;
}

export function tuneLeague(league, games) {
  const cut = splitIndex(games);
  const tuneGames = games.slice(0, cut);
  const best = tune(tuneGames, REVERT[league]);
  return {
    cut, tuneGames,
    params: { k: best.k, hfa: best.hfa, revert: REVERT[league] },
    tuneLogLoss: best.logLoss,
    tunedOn: { games: tuneGames.length, from: tuneGames[0].date.slice(0, 10), to: tuneGames[cut - 1].date.slice(0, 10) }
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = {};
  for (const league of MODEL_LEAGUES) {
    const h = loadHistory(league);
    if (!h) { console.log(`[${league}] no history file — run node scripts/fetch-history.js ${league}`); continue; }
    const t = tuneLeague(league, h.games);
    out[league] = { ...t.params, tunedOn: t.tunedOn, tuneLogLoss: Math.round(t.tuneLogLoss * 1e4) / 1e4 };
    console.log(`[${league}] K=${t.params.k} HFA=${t.params.hfa} revert=${t.params.revert.toFixed(2)} · tuned on ${t.tunedOn.games} games (${t.tunedOn.from} → ${t.tunedOn.to}) · tune log loss ${t.tuneLogLoss.toFixed(4)}`);
  }
  writeFileSync(PARAMS_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${PARAMS_PATH}`);
}

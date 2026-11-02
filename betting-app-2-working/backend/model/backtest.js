// ============================================================
// BACKTEST — honest, walk-forward evaluation of the Elo model
// ============================================================
//
// Per league (games sorted by date):
// 1. K and HFA are tuned with tune.js on the TUNE slice only (first half of
//    the last full season).
// 2. One walk-forward pass over ALL games with those params: each game is
//    predicted from games strictly before it, then its result is applied.
//    Only TEST games (everything after the tune slice) are scored.
// 3. Baselines on the same TEST games:
//      - Always home: pick the home team; probability = home win rate in TUNE
//      - 50/50:       probability 0.5 for every game
//
// Ties (rare NFL ties) are applied to ratings but left out of the scores.
//
// Run from backend/:  node model/backtest.js   → prints a table, writes model/RESULTS.md
// ============================================================

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkForward, score, outcome } from './elo.js';
import { tuneLeague } from './tune.js';
import { loadHistory, MODEL_LEAGUES } from './service.js';

const HERE = dirname(fileURLToPath(import.meta.url));

export function homeWinRate(games) {
  let n = 0, w = 0;
  for (const g of games) {
    const y = outcome(g);
    if (y === null || g.neutral) continue;
    n++; w += y;
  }
  return w / n;
}

export function backtestLeague(league, games) {
  const { cut, tuneGames, params, tuneLogLoss, tunedOn } = tuneLeague(league, games);
  const { preds } = walkForward(games, params);
  const homeRate = homeWinRate(tuneGames);
  const test = games.slice(cut);
  const firstSeason = games[0].season;
  const thisSeasonStart = games.findIndex(g => g.season !== firstSeason);

  return {
    league, params, tuneLogLoss, homeRate, preds,
    tune: tunedOn,
    test: { games: test.length, from: test[0].date.slice(0, 10), to: test[test.length - 1].date.slice(0, 10),
            ties: test.filter(g => outcome(g) === null).length },
    elo: score(games, preds, cut),
    home: score(games, games.map(() => homeRate), cut),
    coin: score(games, games.map(() => 0.5), cut),
    parts: thisSeasonStart > cut ? {
      restOfLastSeason: score(games, preds, cut, thisSeasonStart),
      thisSeason: score(games, preds, thisSeasonStart)
    } : null
  };
}

// --- output ---
const pct = x => (x * 100).toFixed(1) + '%';
const f4 = x => x.toFixed(4);

export function resultsTable(results) {
  const rows = [
    '| League | Test games | Model | Accuracy | Brier ↓ | Log loss ↓ |',
    '|---|---:|---|---:|---:|---:|'
  ];
  for (const r of results) {
    rows.push(`| ${r.league.toUpperCase()} | ${r.elo.n} | **Elo** (K=${r.params.k}, HFA=${r.params.hfa}) | **${pct(r.elo.accuracy)}** | **${f4(r.elo.brier)}** | **${f4(r.elo.logLoss)}** |`);
    rows.push(`| | | Always home (p=${r.homeRate.toFixed(3)}) | ${pct(r.home.accuracy)} | ${f4(r.home.brier)} | ${f4(r.home.logLoss)} |`);
    rows.push(`| | | 50/50 | — | ${f4(r.coin.brier)} | ${f4(r.coin.logLoss)} |`);
  }
  return rows.join('\n');
}

export function verdict(r) {
  const gain = r.home.logLoss - r.elo.logLoss;        // > 0 means Elo is better
  const accGain = (r.elo.accuracy - r.home.accuracy) * 100;
  const how = gain > 0.03 ? 'clearly beats' : gain > 0.01 ? 'modestly beats' : gain > 0 ? 'only barely beats' : 'does NOT beat';
  return `- **${r.league.toUpperCase()}**: Elo ${how} the always-home baseline (log loss ${gain >= 0 ? '−' : '+'}${Math.abs(gain).toFixed(4)}, accuracy ${accGain >= 0 ? '+' : ''}${accGain.toFixed(1)} pts).`;
}

function partsTable(results) {
  const rows = ['| League | Period | Games | Accuracy | Brier | Log loss |', '|---|---|---:|---:|---:|---:|'];
  for (const r of results) {
    if (!r.parts) continue;
    const a = r.parts.restOfLastSeason, b = r.parts.thisSeason;
    rows.push(`| ${r.league.toUpperCase()} | rest of first season | ${a.n} | ${pct(a.accuracy)} | ${f4(a.brier)} | ${f4(a.logLoss)} |`);
    rows.push(`| | latest season (to ${r.test.to}) | ${b.n} | ${pct(b.accuracy)} | ${f4(b.brier)} | ${f4(b.logLoss)} |`);
  }
  return rows.join('\n');
}

export function resultsMarkdown(results, generatedAt) {
  const periods = results.map(r =>
    `| ${r.league.toUpperCase()} | ${r.tune.from} → ${r.tune.to} (${r.tune.games}) | ${r.test.from} → ${r.test.to} (${r.test.games}${r.test.ties ? `; ${r.test.ties} tie${r.test.ties > 1 ? 's' : ''} not scored` : ''}) | K=${r.params.k}, HFA=${r.params.hfa}, revert=${r.params.revert.toFixed(2)} |`
  ).join('\n');
  return `# Elo model — backtest results

Generated ${generatedAt} by \`node model/backtest.js\`. Data: ESPN final scores
(regular season, play-in and playoffs) in \`backend/data/history-<league>.json\`.

**Method.** Walk-forward: every test game is predicted using only games played
before it. K and home advantage were tuned on the first half of the last full
season only; the test period was never used for tuning. Season-to-season
regression is a fixed prior, not tuned. Lower Brier and log loss are better
(50/50 guessing scores 0.2500 and 0.6931).

${resultsTable(results)}

## Plain verdict

${results.map(verdict).join('\n')}

## Test period by season

${partsTable(results)}

"First season" is the last full season (its second half; the first half was
used for tuning). "Latest season" is the current one: complete for MLB, a few
weeks old for NBA, NFL and NHL, so those rows are small samples. Early-season
games use ratings that were just regressed toward the mean.

**What this does not show.** There is no historical betting-line data here, so
the model is compared with simple baselines, not with the market. Sportsbook
closing lines are much harder to beat than "always pick home"; a model edge
over these baselines is not evidence of an edge over the books.

## Periods and parameters

| League | Tune period (games) | Test period (games) | Chosen parameters |
|---|---|---|---|
${periods}
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const results = [];
  for (const league of MODEL_LEAGUES) {
    const h = loadHistory(league);
    if (!h) { console.log(`[${league}] no history file — run node scripts/fetch-history.js ${league}`); continue; }
    results.push(backtestLeague(league, h.games));
  }
  writeFileSync(join(HERE, 'RESULTS.md'), resultsMarkdown(results, new Date().toISOString().slice(0, 10)));
  console.log('\n' + resultsTable(results).replace(/\*\*/g, '') + '\n');
  console.log(results.map(verdict).join('\n').replace(/\*\*/g, ''));
  console.log('\nWrote model/RESULTS.md');
}

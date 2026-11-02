// ============================================================
// ELO RATING MODEL — one rating per team, per league
// ============================================================
//
//   P(home wins) = 1 / (1 + 10^(-(R_home + HFA - R_away) / 400))
//
// HFA (home-field advantage, in rating points) is 0 at a neutral site.
// After each game both teams move by the same amount in opposite directions:
//
//   shift = K * MOV * (actual - expected)
//
// MOV (margin-of-victory multiplier, FiveThirtyEight style):
//   ln(|margin| + 1) * 2.2 / (winnerEloDiff * 0.001 + 2.2)
// Bigger wins count more, but less so when the favorite wins big (that
// second term stops ratings running away for strong teams). Ties use 1.
//
// Between seasons every rating regresses toward the mean:
//   R_new = MEAN + (R_old - MEAN) * (1 - revert)
//
// K and HFA are tuned per league by model/backtest.js (on the early part of
// the data only); `revert` is a fixed prior — see REVERT below.
// ============================================================

export const MEAN = 1500;

// Season-to-season regression. Not tuned: our data contains a single season
// boundary and it falls in the test period. Values follow published Elo work
// (FiveThirtyEight used 1/3 for NFL and MLB, 1/4 for NBA).
export const REVERT = { nba: 0.25, nfl: 1 / 3, mlb: 1 / 3, nhl: 1 / 3 };

// Starting points used before tuning (and if params.json is missing).
export const DEFAULT_PARAMS = {
  nba: { k: 20, hfa: 70, revert: REVERT.nba },
  nfl: { k: 20, hfa: 50, revert: REVERT.nfl },
  mlb: { k: 4,  hfa: 24, revert: REVERT.mlb },
  nhl: { k: 8,  hfa: 30, revert: REVERT.nhl }
};

export function expectedHome(rHome, rAway, hfa, neutral = false) {
  const diff = rHome + (neutral ? 0 : hfa) - rAway;
  return 1 / (1 + Math.pow(10, -diff / 400));
}

// winnerEloDiff = winner's rating (incl. HFA if the winner was at home) minus the loser's.
export function movMultiplier(margin, winnerEloDiff) {
  if (margin === 0) return 1;
  return Math.log(Math.abs(margin) + 1) * (2.2 / (winnerEloDiff * 0.001 + 2.2));
}

export function regress(rating, revert) {
  return MEAN + (rating - MEAN) * (1 - revert);
}

// A league's rating state. Feed games in time order with update().
export function createElo(params) {
  const { k, hfa, revert } = params;
  const ratings = new Map();
  let season = null;
  let gamesSeen = 0;
  let lastDate = null;

  const get = id => (ratings.has(id) ? ratings.get(id) : MEAN);

  // New season: regress every known team once, before its first game.
  function enterSeason(s) {
    if (season !== null && s !== season) {
      for (const [id, r] of ratings) ratings.set(id, regress(r, revert));
    }
    season = s;
  }

  function predict(homeId, awayId, neutral = false) {
    return expectedHome(get(homeId), get(awayId), hfa, neutral);
  }

  // Applies one finished game. Returns the pre-game home-win probability.
  function update(game) {
    if (game.season != null) enterSeason(game.season);
    const rh = get(game.home), ra = get(game.away);
    const p = expectedHome(rh, ra, hfa, game.neutral);
    const margin = game.hs - game.as;
    const actual = margin > 0 ? 1 : margin < 0 ? 0 : 0.5;
    const homeEdge = rh + (game.neutral ? 0 : hfa) - ra;    // home's effective rating lead
    const winnerDiff = margin > 0 ? homeEdge : -homeEdge;
    const shift = k * movMultiplier(margin, winnerDiff) * (actual - p);
    ratings.set(game.home, rh + shift);
    ratings.set(game.away, ra - shift);
    gamesSeen++;
    lastDate = game.date;
    return p;
  }

  return {
    params: { k, hfa, revert },
    predict, update, rating: get,
    ratings: () => new Map(ratings),
    get gamesSeen() { return gamesSeen; },
    get lastDate() { return lastDate; },
    get season() { return season; }
  };
}

// Walk-forward pass: each game is predicted from ratings built ONLY on the
// games before it, then the game's result is applied. Returns one prediction
// per game (same order as `games`, which must be sorted by date).
export function walkForward(games, params) {
  const elo = createElo(params);
  const preds = games.map(g => elo.update(g));
  return { elo, preds };
}

// --- scoring (y = 1 home win, 0 home loss) ---
const EPS = 1e-15;
export function brier(p, y) { return (p - y) ** 2; }
export function logLoss(p, y) {
  const q = Math.min(1 - EPS, Math.max(EPS, p));
  return -(y * Math.log(q) + (1 - y) * Math.log(1 - q));
}

// 1 home win, 0 home loss, null tie.
export const outcome = g => (g.hs > g.as ? 1 : g.hs < g.as ? 0 : null);

// Average scores of predictions `preds` over games[from..to) (ties skipped).
// A 0.5 prediction counts as half right.
export function score(games, preds, from = 0, to = games.length) {
  let n = 0, correct = 0, b = 0, ll = 0;
  for (let i = from; i < to; i++) {
    const y = outcome(games[i]);
    if (y === null) continue;
    const p = preds[i];
    n++;
    correct += p === 0.5 ? 0.5 : (p > 0.5) === (y === 1) ? 1 : 0;
    b += brier(p, y);
    ll += logLoss(p, y);
  }
  return { n, accuracy: correct / n, brier: b / n, logLoss: ll / n };
}

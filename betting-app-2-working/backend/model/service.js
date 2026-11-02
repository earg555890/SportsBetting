// ============================================================
// MODEL SERVICE — loads history, builds current Elo ratings, answers
// "what's the home team's win probability?" for server.js.
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElo, DEFAULT_PARAMS } from './elo.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(HERE, '..', 'data');
export const PARAMS_PATH = join(HERE, 'params.json');
export const MODEL_LEAGUES = ['nba', 'nfl', 'mlb', 'nhl'];

// Teams with fewer games than this are exhibition / special-event sides that
// slipped past the fetch filter (e.g. international friendlies). Dropped.
const MIN_TEAM_GAMES = 10;

export function cleanGames(games) {
  const count = new Map();
  for (const g of games) for (const t of [g.home, g.away]) count.set(t, (count.get(t) || 0) + 1);
  return games
    .filter(g => count.get(g.home) >= MIN_TEAM_GAMES && count.get(g.away) >= MIN_TEAM_GAMES)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function loadHistory(league, dataDir = DATA_DIR) {
  const p = join(dataDir, `history-${league}.json`);
  if (!existsSync(p)) return null;
  const h = JSON.parse(readFileSync(p, 'utf8'));
  return { teams: h.teams, games: cleanGames(h.games), updatedAt: h.updatedAt };
}

export function loadParams(paramsPath = PARAMS_PATH) {
  const tuned = existsSync(paramsPath) ? JSON.parse(readFileSync(paramsPath, 'utf8')) : {};
  const out = {};
  for (const l of MODEL_LEAGUES) {
    const t = tuned[l];
    out[l] = t ? { k: t.k, hfa: t.hfa, revert: t.revert } : { ...DEFAULT_PARAMS[l] };
    out[l].tuned = !!t;
  }
  return out;
}

// --- team name matching ---
// Accepts an ESPN team id, abbreviation, full name ("Boston Celtics"), short
// name ("Celtics"), with or without accents/punctuation. Full names that differ
// between ESPN and The Odds API ("LA Clippers" vs "Los Angeles Clippers") fall
// back to a unique nickname match on the end of the name.
export function normName(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function makeTeamResolver(teams) {
  const exact = new Map();
  const nick = [];
  for (const t of Object.values(teams)) {
    for (const key of [t.id, t.abbr, t.name, t.short, t.nickname]) {
      if (key) exact.set(normName(key), t.id);
    }
    if (t.nickname) nick.push([normName(t.nickname), t.id]);
  }
  return function resolve(query) {
    if (query == null || query === '') return null;
    const q = normName(query);
    if (exact.has(q)) return exact.get(q);
    const hits = nick.filter(([n]) => q.endsWith(n));
    return hits.length === 1 ? hits[0][1] : null;
  };
}

// Builds every available league's model from scratch (fast: a few thousand games).
export function createModelService({ dataDir = DATA_DIR, paramsPath = PARAMS_PATH } = {}) {
  const params = loadParams(paramsPath);
  const leagues = new Map();
  for (const league of MODEL_LEAGUES) {
    const h = loadHistory(league, dataDir);
    if (!h || !h.games.length) continue;
    const elo = createElo(params[league]);
    for (const g of h.games) elo.update(g);
    leagues.set(league, {
      elo, teams: h.teams, resolve: makeTeamResolver(h.teams),
      params: params[league], gamesUsed: h.games.length,
      ratingsAsOf: h.games[h.games.length - 1].date.slice(0, 10)
    });
  }

  function teamOut(m, id) {
    const t = m.teams[id];
    return { id, name: t ? t.name : id, abbr: t ? t.abbr : null, rating: Math.round(m.elo.rating(id) * 10) / 10 };
  }

  // Returns { ok:true, ... } or { ok:false, status, error }.
  function predict(league, home, away, neutral = false) {
    const m = leagues.get(league);
    if (!m) return { ok: false, status: 404, error: `No model for league: ${league}`, available: [...leagues.keys()] };
    if (!home || !away) return { ok: false, status: 400, error: 'Pass both ?home= and ?away= (team name, abbreviation or ESPN id).' };
    const hid = m.resolve(home), aid = m.resolve(away);
    const missing = [!hid && home, !aid && away].filter(Boolean);
    if (missing.length) return { ok: false, status: 404, error: `Unknown team for ${league}: ${missing.join(', ')}` };
    const p = m.elo.predict(hid, aid, neutral);
    return {
      ok: true,
      league, model: 'Elo', source: 'Elo model', neutral,
      home: teamOut(m, hid), away: teamOut(m, aid),
      homeWinProb: Math.round(p * 10000) / 10000,
      awayWinProb: Math.round((1 - p) * 10000) / 10000,
      params: { k: m.params.k, hfa: m.params.hfa, revert: Math.round(m.params.revert * 1000) / 1000, tuned: m.params.tuned },
      gamesUsed: m.gamesUsed, ratingsAsOf: m.ratingsAsOf
    };
  }

  return { predict, leagues: () => [...leagues.keys()], info: league => leagues.get(league) };
}

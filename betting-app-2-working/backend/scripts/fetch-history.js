// ============================================================
// FETCH HISTORY — past game results from ESPN's public scoreboard
// ============================================================
//
// Pulls final scores day by day (scoreboard?dates=YYYYMMDD) for NBA, NFL,
// MLB and NHL: the last full season plus this season so far. Saves one file
// per league to backend/data/history-<league>.json.
//
// Polite + cached:
//   - one request at a time, REQUEST_GAP_MS between requests
//   - every finished day is recorded in `fetchedDays`, so a re-run never
//     refetches it. Only the most recent RECHECK_DAYS days are re-checked
//     (late finals, postponements). Today and future days are never fetched.
//   - progress is saved every SAVE_EVERY days, so an interrupted run resumes.
//
// Kept: regular season, play-in and postseason games that are final
// (postseason games are tagged by round: RD16, QTR, FINAL, ...; NBA Cup: CC).
// Dropped: preseason / spring training, All-Star and exhibition games.
//
// Run from backend/:   node scripts/fetch-history.js            (all leagues)
//                      node scripts/fetch-history.js nba nhl    (some leagues)
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const REQUEST_GAP_MS = 300;
const RECHECK_DAYS = 2;
const SAVE_EVERY = 25;

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// Season windows (inclusive, ESPN's US-Eastern dates). Off-season months are
// skipped so we don't spend requests on empty days. `end: null` = yesterday.
export const LEAGUES = {
  nba: { path: 'basketball/nba', windows: [['2025-10-01', '2026-06-30'], ['2026-10-01', null]] },
  nfl: { path: 'football/nfl',   windows: [['2025-09-01', '2026-02-15'], ['2026-09-01', null]] },
  mlb: { path: 'baseball/mlb',   windows: [['2025-03-15', '2025-11-05'], ['2026-03-15', null]] },
  nhl: { path: 'hockey/nhl',     windows: [['2025-09-25', '2026-06-30'], ['2026-09-25', null]] }
};

// ESPN season.type: 1 preseason, 2 regular, 3 postseason, 4 off-season, 5 play-in.
const KEEP_SEASON_TYPES = new Set([2, 3, 5]);
// competition.type.abbreviation values that are not real games between two clubs.
const DROP_KINDS = new Set(['ALLSTAR', 'EXH']);

// --- date helpers (calendar dates as 'YYYY-MM-DD', no time zones) ---
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// One ESPN event -> a compact game record, or null if it should be dropped.
export function parseEvent(event) {
  const comp = event.competitions && event.competitions[0];
  if (!comp) return null;
  const seasonType = event.season && event.season.type;
  if (!KEEP_SEASON_TYPES.has(seasonType)) return null;
  const kind = comp.type && comp.type.abbreviation;
  if (DROP_KINDS.has(kind)) return null;
  const status = comp.status && comp.status.type;
  if (!status || !status.completed) return null;            // postponed / in progress
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;
  const hs = Number(home.score), as = Number(away.score);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
  return {
    game: {
      id: event.id,
      date: event.date,                                     // ISO start time
      season: event.season.year,
      type: seasonType,
      home: home.team.id,
      away: away.team.id,
      hs, as,
      neutral: !!comp.neutralSite
    },
    teams: [home.team, away.team].map(t => ({
      id: t.id, name: t.displayName, short: t.shortDisplayName,
      nickname: t.name, location: t.location, abbr: t.abbreviation
    }))
  };
}

function historyPath(league) { return join(DATA_DIR, `history-${league}.json`); }

function loadOrInit(league) {
  const p = historyPath(league);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  return { league, source: 'ESPN public scoreboard (?dates=YYYYMMDD)', updatedAt: null, fetchedDays: [], teams: {}, games: [] };
}

function save(h) {
  h.games.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  h.fetchedDays.sort();
  h.updatedAt = new Date().toISOString();
  mkdirSync(DATA_DIR, { recursive: true });
  // One game per line keeps the file diff-friendly and readable.
  const games = h.games.map(g => '    ' + JSON.stringify(g)).join(',\n');
  const { games: _g, ...rest } = h;
  const head = JSON.stringify(rest, null, 2).slice(0, -2);
  writeFileSync(historyPath(h.league), `${head},\n  "games": [\n${games}\n  ]\n}\n`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchDay(path, iso) {
  const url = `${ESPN_BASE}/${path}/scoreboard?dates=${iso.replace(/-/g, '')}&limit=100`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);                         // same plain fetch as server.js
      if (res.ok) return (await res.json()).events || [];
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === 3) throw err;
    }
    await sleep(2000 * attempt);                            // back off, then retry
  }
  throw new Error('ESPN request failed after 3 attempts');
}

async function fetchLeague(league) {
  const cfg = LEAGUES[league];
  const h = loadOrInit(league);
  const today = localToday();
  const yesterday = addDays(today, -1);
  const recheckFrom = addDays(today, -RECHECK_DAYS);
  const have = new Set(h.fetchedDays);
  const byId = new Map(h.games.map(g => [g.id, g]));

  const days = [];
  for (const [start, endOrNull] of cfg.windows) {
    const end = endOrNull && endOrNull < yesterday ? endOrNull : yesterday;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (!have.has(d) || d >= recheckFrom) days.push(d);
    }
  }
  console.log(`[${league}] ${days.length} day(s) to fetch, ${have.size} already cached`);

  let n = 0;
  for (const d of days) {
    const events = await fetchDay(cfg.path, d);
    for (const ev of events) {
      const parsed = parseEvent(ev);
      if (!parsed) continue;
      byId.set(parsed.game.id, parsed.game);
      for (const t of parsed.teams) h.teams[t.id] = t;
    }
    if (d < recheckFrom) have.add(d);                       // final; never refetch
    n++;
    if (n % SAVE_EVERY === 0) {
      h.games = [...byId.values()]; h.fetchedDays = [...have]; save(h);
      console.log(`[${league}] ${n}/${days.length} days · ${byId.size} games`);
    }
    await sleep(REQUEST_GAP_MS);
  }
  h.games = [...byId.values()]; h.fetchedDays = [...have]; save(h);
  console.log(`[${league}] done · ${h.games.length} games · ${Object.keys(h.teams).length} teams`);
}

// Run only when executed directly (tests import parseEvent).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const wanted = process.argv.slice(2);
  const leagues = wanted.length ? wanted : Object.keys(LEAGUES);
  for (const l of leagues) {
    if (!LEAGUES[l]) { console.error(`Unknown league: ${l} (choose from ${Object.keys(LEAGUES).join(', ')})`); process.exit(1); }
  }
  for (const l of leagues) await fetchLeague(l);
}

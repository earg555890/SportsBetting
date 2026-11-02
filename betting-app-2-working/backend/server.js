// ============================================================
// SPORTS BACKEND — zero-dependency local development server
// ============================================================
//
// Wraps two upstreams and serves them to your front-end with CORS:
//   1. ESPN's unofficial scoreboard endpoints (live scores)  — no key needed
//   2. The Odds API v4 (betting lines + player props)        — needs a key
//
// The Odds API key lives ONLY here, server-side. It is never sent to the
// browser, so every user of the app shares this one backend key — no one
// needs their own.
//
// Requires: Node 18+ (you have Node 26 — perfect)
// Dependencies: NONE — uses built-in `http` and `fetch`
//
// To run:
//   ODDS_API_KEY=your_key_here node server.js
//   (on Windows PowerShell:  $env:ODDS_API_KEY="your_key"; node server.js)
//
// Get a free Odds API key at https://the-odds-api.com (free tier = 500
// requests/month). Each featured-odds call costs ~3 requests (3 markets x
// 1 region); props cost more. The cache below is what keeps that sane.
//
// Routes:
//   GET /                                      → liveness check
//   GET /api/health                            → liveness check
//
//   --- live scores (ESPN) ---
//   GET /api/nba/scoreboard ... etc            → unchanged from before
//
//   --- betting lines (The Odds API) ---
//   GET /api/odds/:league                      → moneyline + spread + total
//   GET /api/odds/:league/events               → event list (id lookup; free)
//   GET /api/odds/:league/event/:eventId/props → player props for one game
//
//   :league uses the SAME ids as the front end (nba, nfl, epl, ufc, ...).
//   Featured odds games carry a `model` field: the Elo model's win
//   probabilities (nba, nfl, mlb, nhl; null for other leagues / unknown teams).
//
//   --- prediction model (Elo, see model/RESULTS.md) ---
//   GET /api/model/:league/predict?home=&away=[&neutral=1]
//                                              → home/away win probability
//
// Cache: ESPN 5s, odds featured 30s, props 60s. Odds move far slower than
//   scores, so longer TTLs stretch the monthly quota a long way.
// ============================================================

import { createServer } from 'node:http';
import { createModelService } from './model/service.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// ---- Elo prediction model: ratings rebuilt from data/history-*.json at startup ----
const model = createModelService();

// ---- Secret (server-side only; never shipped to the browser) ----
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';

// ---- ESPN endpoints we wrap (live scores) ----
const ESPN_ENDPOINTS = {
  nba:     'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  wnba:    'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
  ncaam:   'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
  ncaaw:   'https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard',
  nfl:     'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  ncaaf:   'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  mlb:     'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  ncaabb:  'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard',
  nhl:     'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  ncaah:   'https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/scoreboard',
  epl:     'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
  mls:     'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
  ufc:     'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard'
};

// ---- The Odds API (betting lines) ----
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Front-end league id  ->  Odds API sport key.
// These ids match your sportTree (config.js) + ESPN_SPORT_MAP (espn.js).
const ODDS_SPORT_MAP = {
  nba:     'basketball_nba',
  wnba:    'basketball_wnba',
  ncaam:   'basketball_ncaab',
  nfl:     'americanfootball_nfl',
  ncaafb:  'americanfootball_ncaaf',
  mlb:     'baseball_mlb',
  nhl:     'icehockey_nhl',
  epl:     'soccer_epl',
  mls:     'soccer_usa_mls',
  laliga:  'soccer_spain_la_liga',
  ucl:     'soccer_uefa_champs_league',
  ufc:     'mma_mixed_martial_arts',
  boxing:  'boxing_boxing'
};

// Player-prop market keys per Odds API sport key. Sports without configured
// props return an empty bookmakers array (featured markets still work).
const PROP_MARKETS = {
  basketball_nba:            ['player_points', 'player_rebounds', 'player_assists', 'player_threes'],
  basketball_wnba:           ['player_points', 'player_rebounds', 'player_assists'],
  basketball_ncaab:          ['player_points', 'player_rebounds', 'player_assists'],
  americanfootball_nfl:      ['player_pass_yds', 'player_pass_tds', 'player_rush_yds', 'player_reception_yds', 'player_receptions'],
  americanfootball_ncaaf:    ['player_pass_yds', 'player_rush_yds', 'player_reception_yds'],
  baseball_mlb:              ['batter_hits', 'batter_total_bases', 'batter_home_runs', 'pitcher_strikeouts'],
  icehockey_nhl:             ['player_points', 'player_shots_on_goal', 'player_goals'],
  soccer_epl:                ['player_shots_on_target', 'player_shots', 'player_goal_scorer_anytime'],
  soccer_usa_mls:            ['player_shots_on_target', 'player_shots', 'player_goal_scorer_anytime'],
  soccer_spain_la_liga:      ['player_shots_on_target', 'player_shots', 'player_goal_scorer_anytime'],
  soccer_uefa_champs_league: ['player_shots_on_target', 'player_shots', 'player_goal_scorer_anytime'],
  mma_mixed_martial_arts:    [], // limited prop coverage — featured markets only
  boxing_boxing:             []
};

// ---- In-memory cache (shared by ESPN + odds) ----
const cache = new Map();
const TTL = {
  espn:          5000,
  oddsFeatured:  30000,
  oddsProps:     60000,
  oddsEvents:    60000
};

// Returns { data, meta, fetchedAt }. `meta` carries Odds API quota headers
// when present so we can log/expose remaining requests.
async function fetchWithCache(url, ttl = 5000) {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && (now - entry.fetchedAt) < ttl) return entry;

  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (_) {}
    const err = new Error(`Upstream HTTP ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const meta = {
    remaining: res.headers.get('x-requests-remaining'),
    used: res.headers.get('x-requests-used')
  };
  const stored = { data, meta, fetchedAt: now };
  cache.set(url, stored);
  return stored;
}

// ---- CORS headers ----
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

// CORS headers for odds responses — also exposes the quota headers so the
// front end can read how many Odds API requests are left.
function oddsCors(meta) {
  const h = corsHeaders();
  h['Access-Control-Expose-Headers'] = 'x-requests-remaining, x-requests-used';
  if (meta) {
    if (meta.remaining != null) h['x-requests-remaining'] = String(meta.remaining);
    if (meta.used != null) h['x-requests-used'] = String(meta.used);
  }
  return h;
}

function sendErr(res, status, error, extra) {
  res.writeHead(status, oddsCors());
  res.end(JSON.stringify({ error, ...(extra || {}) }));
}

function sendUpstreamErr(res, label, err) {
  const status = err.status === 401 ? 401 : err.status === 422 ? 422 : 502;
  const msg =
    err.status === 401 ? 'The Odds API rejected the key (401). Check ODDS_API_KEY.'
    : err.status === 422 ? 'The Odds API could not process the request (422) — bad sport/market or event id.'
    : 'Upstream odds fetch failed.';
  console.error(`[odds:${label}] ${err.message}`);
  res.writeHead(status, oddsCors());
  res.end(JSON.stringify({ error: msg, detail: err.message }));
}

function logQuota(label, meta) {
  if (meta && meta.remaining != null) {
    console.log(`  [odds] ${label} · ${meta.remaining} Odds API requests remaining`);
  }
}

// ============================================================
// MOCK ODDS  (served only when ODDS_API_KEY is unset)
// ============================================================
//
// Shapes match The Odds API v4 EXACTLY so the front end parses mock and real
// responses with the same code. The instant you set ODDS_API_KEY, the handlers
// below stop calling these and hit the real API instead — no other change.
// Responses are tagged with an `x-mock-data: true` header.

// A few plausible matchups per league (paired into games two at a time).
const MOCK_TEAMS = {
  nba:    ['Boston Celtics', 'New York Knicks', 'Denver Nuggets', 'Los Angeles Lakers', 'Milwaukee Bucks', 'Golden State Warriors'],
  wnba:   ['Las Vegas Aces', 'New York Liberty', 'Connecticut Sun', 'Seattle Storm'],
  ncaam:  ['Duke Blue Devils', 'Kansas Jayhawks', 'UConn Huskies', 'Gonzaga Bulldogs'],
  nfl:    ['Kansas City Chiefs', 'Buffalo Bills', 'Philadelphia Eagles', 'San Francisco 49ers', 'Baltimore Ravens', 'Dallas Cowboys'],
  ncaafb: ['Georgia Bulldogs', 'Michigan Wolverines', 'Alabama Crimson Tide', 'Ohio State Buckeyes'],
  mlb:    ['Los Angeles Dodgers', 'New York Yankees', 'Atlanta Braves', 'Houston Astros', 'Philadelphia Phillies', 'San Diego Padres'],
  nhl:    ['Boston Bruins', 'Edmonton Oilers', 'Toronto Maple Leafs', 'Colorado Avalanche', 'Florida Panthers', 'New York Rangers'],
  epl:    ['Arsenal', 'Manchester City', 'Liverpool', 'Tottenham Hotspur', 'Chelsea', 'Manchester United'],
  mls:    ['LAFC', 'Inter Miami', 'Atlanta United', 'Seattle Sounders'],
  laliga: ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla'],
  ucl:    ['Real Madrid', 'Bayern Munich', 'Paris Saint-Germain', 'Manchester City'],
  ufc:    ['Jon Jones', 'Tom Aspinall', 'Islam Makhachev', 'Charles Oliveira'],
  boxing: ['Canelo Alvarez', 'David Benavidez', 'Terence Crawford', 'Errol Spence Jr']
};

// A couple of mock players per league for prop markets.
const MOCK_PLAYERS = {
  nba:    ['Jayson Tatum', 'Jalen Brunson'],
  wnba:   ["A'ja Wilson", 'Breanna Stewart'],
  ncaam:  ['Star Guard', 'Big Forward'],
  nfl:    ['Patrick Mahomes', 'Josh Allen'],
  ncaafb: ['Star QB', 'Lead Back'],
  mlb:    ['Aaron Judge', 'Shohei Ohtani'],
  nhl:    ['Connor McDavid', 'Auston Matthews'],
  epl:    ['Erling Haaland', 'Mohamed Salah'],
  mls:    ['Lionel Messi', 'Denis Bouanga'],
  laliga: ['Robert Lewandowski', 'Vinicius Junior'],
  ucl:    ['Kylian Mbappe', 'Harry Kane']
};

const MOCK_BOOKS = [
  { key: 'draftkings', title: 'DraftKings' },
  { key: 'fanduel',    title: 'FanDuel'    },
  { key: 'betmgm',     title: 'BetMGM'     }
];

const SOCCER_LEAGUES = new Set(['epl', 'mls', 'laliga', 'ucl']);   // 3-way h2h (Draw)
const COMBAT_LEAGUES = new Set(['ufc', 'boxing']);                 // h2h only, no spreads/totals

// Typical total (Over/Under line) per league for believable mock numbers.
const MOCK_TOTAL_BASE = {
  nba: 224.5, wnba: 165.5, ncaam: 145.5, nfl: 45.5, ncaafb: 55.5,
  mlb: 8.5, nhl: 6.5, epl: 2.5, mls: 3.5, laliga: 2.5, ucl: 2.5
};

// Default Over/Under point for each prop market key.
const PROP_POINTS = {
  player_points: 24.5, player_rebounds: 8.5, player_assists: 6.5, player_threes: 2.5,
  player_pass_yds: 274.5, player_pass_tds: 1.5, player_rush_yds: 64.5,
  player_reception_yds: 68.5, player_receptions: 5.5,
  batter_hits: 1.5, batter_total_bases: 1.5, batter_home_runs: 0.5, pitcher_strikeouts: 6.5,
  player_points_nhl: 0.5, player_shots_on_goal: 2.5, player_goals: 0.5,
  player_shots_on_target: 1.5, player_shots: 2.5
};

// American odds from an implied win probability (no vig adjustment — mock only).
function americanFromProb(p) {
  return p >= 0.5 ? -Math.round((100 * p) / (1 - p)) : Math.round((100 * (1 - p)) / p);
}

function mockMarketsFor(league, gameIdx) {
  const isSoccer = SOCCER_LEAGUES.has(league);
  const isCombat = COMBAT_LEAGUES.has(league);
  const homeProb = 0.50 + ((gameIdx * 7) % 4) * 0.05;            // 0.50 .. 0.65
  const spreadPoint = -(((gameIdx * 3) % 6) + 1.5);             // home favored: -1.5 .. -6.5
  const total = MOCK_TOTAL_BASE[league] != null ? MOCK_TOTAL_BASE[league] : 5.5;

  return MOCK_BOOKS.map((book, b) => {
    const delta = (b - 1) * 6;        // each book shades the price a little differently
    const markets = [];

    // h2h (moneyline)
    const h2h = [
      { name: '@HOME', price: americanFromProb(homeProb) - delta },
      { name: '@AWAY', price: americanFromProb(1 - homeProb) + delta }
    ];
    if (isSoccer) h2h.push({ name: 'Draw', price: 240 + delta });
    markets.push({ key: 'h2h', outcomes: h2h });

    if (!isCombat) {
      markets.push({
        key: 'spreads',
        outcomes: [
          { name: '@HOME', price: -110 - delta, point: spreadPoint },
          { name: '@AWAY', price: -110 + delta, point: -spreadPoint }
        ]
      });
      markets.push({
        key: 'totals',
        outcomes: [
          { name: 'Over',  price: -110 + delta, point: total },
          { name: 'Under', price: -110 - delta, point: total }
        ]
      });
    }
    return { key: book.key, title: book.title, markets };
  });
}

function mockGames(league) {
  const sportKey = ODDS_SPORT_MAP[league];
  const teams = MOCK_TEAMS[league] || ['Home Team', 'Away Team', 'Team C', 'Team D'];
  const games = [];
  for (let i = 0; i + 1 < teams.length; i += 2) {
    const gameIdx = i / 2;
    const home = teams[i];
    const away = teams[i + 1];
    const commence = new Date(Date.now() + (gameIdx + 1) * 3 * 3600 * 1000).toISOString();
    const bookmakers = mockMarketsFor(league, gameIdx).map(bk => ({
      key: bk.key,
      title: bk.title,
      last_update: new Date().toISOString(),
      // Fill the @HOME / @AWAY placeholders with the real team names.
      markets: bk.markets.map(m => ({
        key: m.key,
        last_update: new Date().toISOString(),
        outcomes: m.outcomes.map(o => ({
          ...o,
          name: o.name === '@HOME' ? home : o.name === '@AWAY' ? away : o.name
        }))
      }))
    }));
    games.push({
      id: `mock${league}${gameIdx}`,   // alphanumeric only — matches the real Odds API id format + the props route regex
      sport_key: sportKey || league,
      sport_title: sportKey || league,
      commence_time: commence,
      home_team: home,
      away_team: away,
      bookmakers
    });
  }
  return games;
}

// Event-list shape (the /events route): no bookmakers.
function mockEventList(league) {
  return mockGames(league).map(g => ({
    id: g.id, sport_key: g.sport_key, sport_title: g.sport_title,
    commence_time: g.commence_time, home_team: g.home_team, away_team: g.away_team
  }));
}

// Player-props shape (the /event/:id/props route): one event, prop markets.
function mockPropsFor(league, eventId) {
  const sportKey = ODDS_SPORT_MAP[league];
  const markets = PROP_MARKETS[sportKey] || [];
  const game = mockGames(league).find(g => g.id === eventId) || mockGames(league)[0] || null;
  if (!markets.length || !game) {
    return { id: eventId, sport_key: sportKey || league, bookmakers: [], note: 'No player-prop markets configured for this sport.' };
  }
  const players = MOCK_PLAYERS[league] || ['Player One', 'Player Two'];
  const bookmakers = MOCK_BOOKS.map((book, b) => {
    const delta = (b - 1) * 6;
    return {
      key: book.key,
      title: book.title,
      last_update: new Date().toISOString(),
      markets: markets.map(mkey => {
        const isYesNo = /anytime|scorer/.test(mkey);   // e.g. anytime goal scorer
        const point = PROP_POINTS[mkey] != null ? PROP_POINTS[mkey] : 1.5;
        const outcomes = [];
        players.forEach(player => {
          if (isYesNo) {
            outcomes.push({ name: 'Yes', description: player, price: 150 + delta });
          } else {
            outcomes.push({ name: 'Over',  description: player, price: -115 + delta, point });
            outcomes.push({ name: 'Under', description: player, price: -105 - delta, point });
          }
        });
        return { key: mkey, last_update: new Date().toISOString(), outcomes };
      })
    };
  });
  return {
    id: game.id, sport_key: sportKey, sport_title: sportKey,
    commence_time: game.commence_time, home_team: game.home_team, away_team: game.away_team,
    bookmakers
  };
}

// CORS headers for a mock response — flags it and exposes the marker header.
function mockHeaders() {
  const h = oddsCors();
  h['Access-Control-Expose-Headers'] = 'x-requests-remaining, x-requests-used, x-mock-data';
  h['x-mock-data'] = 'true';
  h['x-requests-remaining'] = 'unlimited (mock)';
  return h;
}

// ============================================================
// ODDS ROUTE HANDLERS
// ============================================================

// Adds the Elo model's probabilities to each featured-odds game (new objects;
// the cached upstream data is never mutated).
function withModel(league, games) {
  if (!Array.isArray(games)) return games;
  return games.map(g => {
    const r = model.predict(league, g.home_team, g.away_team);
    return {
      ...g,
      model: r.ok
        ? { source: 'Elo model', home_win_prob: r.homeWinProb, away_win_prob: r.awayWinProb, ratings_as_of: r.ratingsAsOf }
        : null
    };
  });
}

function handleModelPredict(league, query, res) {
  const neutral = query.get('neutral') === '1' || query.get('neutral') === 'true';
  const r = model.predict(league, query.get('home'), query.get('away'), neutral);
  const { ok, status, ...body } = r;
  res.writeHead(ok ? 200 : status, corsHeaders());
  res.end(JSON.stringify(body));
}

async function handleOddsFeatured(league, res) {
  const sportKey = ODDS_SPORT_MAP[league];
  if (!sportKey) return sendErr(res, 404, `No odds mapping for league: ${league}`, { available: Object.keys(ODDS_SPORT_MAP) });
  if (!ODDS_API_KEY) {                                  // no key yet → mock
    res.writeHead(200, mockHeaders());
    return res.end(JSON.stringify(withModel(league, mockGames(league))));
  }

  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds`
    + `?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${ODDS_API_KEY}`;
  try {
    const { data, meta } = await fetchWithCache(url, TTL.oddsFeatured);
    logQuota(league, meta);
    res.writeHead(200, oddsCors(meta));
    res.end(JSON.stringify(withModel(league, data)));
  } catch (err) {
    sendUpstreamErr(res, league, err);
  }
}

// Event list — useful for resolving event ids. Per Odds API docs this
// endpoint does not count against the request quota.
async function handleOddsEvents(league, res) {
  const sportKey = ODDS_SPORT_MAP[league];
  if (!sportKey) return sendErr(res, 404, `No odds mapping for league: ${league}`);
  if (!ODDS_API_KEY) {                                  // no key yet → mock
    res.writeHead(200, mockHeaders());
    return res.end(JSON.stringify(mockEventList(league)));
  }

  const url = `${ODDS_API_BASE}/sports/${sportKey}/events?apiKey=${ODDS_API_KEY}`;
  try {
    const { data, meta } = await fetchWithCache(url, TTL.oddsEvents);
    res.writeHead(200, oddsCors(meta));
    res.end(JSON.stringify(data));
  } catch (err) {
    sendUpstreamErr(res, league, err);
  }
}

async function handleOddsProps(league, eventId, res) {
  const sportKey = ODDS_SPORT_MAP[league];
  if (!sportKey) return sendErr(res, 404, `No odds mapping for league: ${league}`);
  if (!ODDS_API_KEY) {                                  // no key yet → mock
    res.writeHead(200, mockHeaders());
    return res.end(JSON.stringify(mockPropsFor(league, eventId)));
  }

  const markets = PROP_MARKETS[sportKey] || [];
  if (!markets.length) {
    res.writeHead(200, oddsCors());
    return res.end(JSON.stringify({ id: eventId, bookmakers: [], note: 'No player-prop markets configured for this sport.' }));
  }

  const url = `${ODDS_API_BASE}/sports/${sportKey}/events/${eventId}/odds`
    + `?regions=us&markets=${markets.join(',')}&oddsFormat=american&apiKey=${ODDS_API_KEY}`;
  try {
    const { data, meta } = await fetchWithCache(url, TTL.oddsProps);
    logQuota(`${league} props`, meta);
    res.writeHead(200, oddsCors(meta));
    res.end(JSON.stringify(data));
  } catch (err) {
    sendUpstreamErr(res, league, err);
  }
}

// ============================================================
// SERVER
// ============================================================
const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, oddsCors());
    return res.end();
  }
  if (req.method !== 'GET') {
    res.writeHead(405, corsHeaders());
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const [path, qs] = req.url.split('?');

  // --- health ---
  if (path === '/' || path === '/api/health') {
    res.writeHead(200, corsHeaders());
    return res.end(JSON.stringify({
      ok: true,
      message: 'Sports backend running',
      oddsKey: ODDS_API_KEY ? 'configured' : 'missing',
      oddsMode: ODDS_API_KEY ? 'live (The Odds API)' : 'mock (set ODDS_API_KEY for real odds)',
      models: model.leagues()
    }));
  }

  // --- model: win probability  /api/model/:league/predict?home=&away= ---
  let m;
  if ((m = path.match(/^\/api\/model\/([a-z0-9]+)\/predict$/))) {
    return handleModelPredict(m[1], new URLSearchParams(qs || ''), res);
  }

  // --- odds: player props for one event  /api/odds/:league/event/:eventId/props ---
  if ((m = path.match(/^\/api\/odds\/([a-z0-9]+)\/event\/([a-z0-9]+)\/props$/))) {
    return handleOddsProps(m[1], m[2], res);
  }
  // --- odds: event list  /api/odds/:league/events ---
  if ((m = path.match(/^\/api\/odds\/([a-z0-9]+)\/events$/))) {
    return handleOddsEvents(m[1], res);
  }
  // --- odds: featured markets  /api/odds/:league ---
  if ((m = path.match(/^\/api\/odds\/([a-z0-9]+)$/))) {
    return handleOddsFeatured(m[1], res);
  }

  // --- ESPN scoreboard  /api/:sport/scoreboard ---
  const match = path.match(/^\/api\/([a-z0-9]+)\/scoreboard$/);
  if (match) {
    const sport = match[1];
    const url = ESPN_ENDPOINTS[sport];
    if (!url) {
      res.writeHead(404, corsHeaders());
      return res.end(JSON.stringify({ error: `Unknown sport: ${sport}`, available: Object.keys(ESPN_ENDPOINTS) }));
    }
    try {
      const { data } = await fetchWithCache(url, TTL.espn);
      res.writeHead(200, corsHeaders());
      return res.end(JSON.stringify(data));
    } catch (err) {
      console.error(`[${sport}] fetch failed:`, err.message);
      res.writeHead(502, corsHeaders());
      return res.end(JSON.stringify({ error: 'Upstream fetch failed', detail: err.message }));
    }
  }

  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ error: 'Not found', tried: path }));
});

server.listen(PORT, () => {
  console.log(`\n  Sports backend running at http://localhost:${PORT}`);
  console.log(`  Live scores (ESPN): ${Object.keys(ESPN_ENDPOINTS).join(', ')}`);
  console.log(`  Betting odds: ${ODDS_API_KEY ? 'The Odds API — key configured ✓' : 'MOCK mode (no key) — set ODDS_API_KEY for real odds'}`);
  console.log(`    odds leagues: ${Object.keys(ODDS_SPORT_MAP).join(', ')}`);
  console.log(`  Elo model: ${model.leagues().length ? model.leagues().map(l => `${l} (as of ${model.info(l).ratingsAsOf})`).join(', ') : 'no history yet — run node scripts/fetch-history.js'}`);
  console.log(`  Try: http://localhost:${PORT}/api/odds/nba`);
  console.log(`  Press Ctrl+C to stop.\n`);
});

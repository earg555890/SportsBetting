# Sports Stats & Analytics App

Mobile-first multi-sport stats and betting-odds web app. Vanilla JavaScript front end with a zero-dependency Node.js backend that proxies ESPN live scores and The Odds API. Best-price comparison across sportsbooks, implied-probability edge ranking, player comparison and sport-specific SVG visualizations.

A mobile-first, multi-sport stats and betting prototype. Runs entirely in a single browser tab from `betting-app-2-working/index.html`. Optional Node backend lets it pull real live data from ESPN.

## Quick start

### Just the app (no real data)

Double-click `betting-app-2-working/index.html`. It opens in your browser. Fake live mode is on by default — you'll see scores ticking on the Overview every few seconds.

### With real ESPN data

1. Open a terminal and `cd betting-app-2-working/backend`
2. Run `node server.js` (requires Node 18+)
3. Open `betting-app-2-working/index.html` in your browser
4. Tap the green **"Try real ESPN data: OFF"** button under the phone — it flips to ON
5. Real games for NBA, WNBA, NCAA Men, NFL, NCAA FB, MLB, NHL, EPL, MLS all replace the mock data

See [`betting-app-2-working/backend/README.md`](betting-app-2-working/backend/README.md) for backend setup details.

## What's in it

Five tabs at the bottom — Home, Odds, Compare, Favorites, More.

- **Home** routes to whichever sport is selected from the sport pill. The default is Overview (cross-sport). Each sport home page has a featured game with full stats and visualizations, plus collapsible "other games" cards that expand to show per-game viz.
- **Odds** shows lines across Kalshi / FanDuel / DraftKings with best-price highlighting. Filtered by the selected sport. Tap any game for full lines (moneyline, spread, total), game segments (1H/Q1/etc), and sport-aware player props.
- **Compare** lets you stack up to three players head-to-head across any sport. Live search picker. Similarity-based suggestions.
- **Favorites** holds saved teams and players. Drives the "My teams · live" filter on the Overview.
- **More** has settings groupings (stubbed).

## Project structure

```
betting-app-2-working/
├── index.html            ← entry point, loads all scripts
├── styles.css            ← all CSS
├── src/
│   ├── config.js         ← API_CONFIG, sport tree, default sections
│   ├── data.js           ← mockData for all leagues
│   ├── datasource.js     ← read path (mock/live/degraded/fake-live)
│   ├── state.js          ← global UI state object
│   ├── helpers.js        ← logoCircle, statusPill, oddsBar, section, etc.
│   ├── router.js         ← tab + sport navigation, renderContent
│   ├── common-renderers.js ← game info card, player picker, etc.
│   ├── pages/
│   │   └── overview.js   ← cross-sport home page
│   ├── visualizations/
│   │   ├── hockey-viz.js
│   │   ├── basketball-viz.js
│   │   ├── football-viz.js
│   │   ├── baseball-viz.js
│   │   ├── soccer-viz.js
│   │   └── ufc-viz.js
│   ├── tabs/
│   │   ├── compare.js
│   │   ├── odds.js
│   │   ├── favorites.js
│   │   └── more.js
│   ├── router-patch.js   ← wraps router for Compare/Favorites pickers
│   ├── dev-controls.js   ← fake-live + simulate-failure buttons
│   ├── espn.js           ← ESPN integration
│   └── init.js           ← bootstrap
└── backend/
    ├── server.js         ← Node server, wraps ESPN + The Odds API, serves the model
    ├── package.json      ← npm test, fetch-history, tune, backtest
    ├── README.md
    ├── scripts/
    │   └── fetch-history.js ← ESPN game history, cached per day
    ├── data/
    │   └── history-<league>.json ← nba, nfl, mlb, nhl results
    ├── model/
    │   ├── elo.js        ← Elo ratings, scoring (Brier, log loss)
    │   ├── tune.js       ← K + home advantage per league → params.json
    │   ├── backtest.js   ← walk-forward evaluation → RESULTS.md
    │   └── service.js    ← ratings + predictions for server.js
    └── test/             ← node:test unit tests
```

## Prediction model

The Odds tab's "edge" is the model's win probability minus the probability
implied by the best price. With the backend on, NBA, NFL, MLB and NHL games
use a real, measured **Elo model** instead of placeholder probabilities, and
the pick is labelled "Elo model".

**Method** (`betting-app-2-working/backend/model/`):

- **Data:** final scores from ESPN's public scoreboard, one request per day,
  for the last full season and this season so far (regular season, play-in,
  playoffs). `node scripts/fetch-history.js` caches finished days and never
  refetches them.
- **Elo:** `P(home) = 1 / (1 + 10^(-(R_home + HFA - R_away)/400))`, no home
  advantage at neutral sites. After each game, ratings move by
  `K × MOV × (result − expected)`. The margin-of-victory multiplier is
  `ln(|margin|+1) × 2.2 / (0.001 × winner's rating lead + 2.2)`. Each season
  starts by pulling ratings 1/4 (NBA) or 1/3 (others) of the way back to 1500.
- **Tuning:** K and home advantage are grid-searched per league on the
  **first half of the last full season only**. Season regression is a fixed
  prior, not tuned.
- **Backtest:** walk-forward over everything after the tuning period. Each
  game is predicted from earlier games only, and the test period never
  touches tuning. Baselines: always pick the home team (at the home win rate
  from the tuning period) and 50/50.

**Results** (test period; lower Brier and log loss are better; full detail in
[`model/RESULTS.md`](betting-app-2-working/backend/model/RESULTS.md)):

| League | Test games | Model | Accuracy | Brier ↓ | Log loss ↓ |
|---|---:|---|---:|---:|---:|
| NBA | 753 | **Elo** (K=10, HFA=40) | **70.1%** | **0.1956** | **0.5759** |
| | | Always home (p=0.556) | 55.0% | 0.2476 | 0.6882 |
| | | 50/50 | — | 0.2500 | 0.6931 |
| NFL | 262 | **Elo** (K=18, HFA=45) | **64.5%** | **0.2201** | **0.6288** |
| | | Always home (p=0.556) | 51.9% | 0.2510 | 0.6951 |
| | | 50/50 | — | 0.2500 | 0.6931 |
| MLB | 3708 | **Elo** (K=6, HFA=15) | **54.7%** | **0.2462** | **0.6855** |
| | | Always home (p=0.547) | 53.2% | 0.2492 | 0.6915 |
| | | 50/50 | — | 0.2500 | 0.6931 |
| NHL | 928 | **Elo** (K=2, HFA=15) | **57.5%** | **0.2450** | **0.6832** |
| | | Always home (p=0.523) | 52.9% | 0.2492 | 0.6915 |
| | | 50/50 | — | 0.2500 | 0.6931 |

**Honest read:** Elo clearly beats both baselines in the NBA and NFL. In MLB
and NHL it beats "always home" only barely: single games there are close to
coin flips. There is no historical betting-line data here, so this is **not**
evidence of an edge over sportsbooks, whose closing lines are far harder to
beat. In backend mode the book prices are still placeholders until the Odds
tab is wired to `/api/odds` (START_HERE.md step 2). Until then the edge
compares the model with placeholder prices.

**Run it** (from `betting-app-2-working/backend`):

```
node scripts/fetch-history.js   # update results (only new days are fetched)
node model/tune.js              # K and home advantage → model/params.json
node model/backtest.js          # walk-forward evaluation → model/RESULTS.md
npm test                        # unit tests (built-in node:test, no dependencies)
```

API: `GET /api/model/:league/predict?home=Boston Celtics&away=New York Knicks`
(`nba`, `nfl`, `mlb`, `nhl`; names, abbreviations or ESPN ids; add `&neutral=1`
for a neutral site). Each game in `/api/odds/:league` also carries a `model`
field.

## Vanilla JS, on purpose

No build step. No React. No npm install (for the front-end). Open `betting-app-2-working/index.html` and it works. Every script tag declares functions/variables at global scope; later scripts depend on earlier ones; `index.html` loads them in dependency order with inline comments explaining each layer.

This keeps the app inspectable: open the browser dev tools, every function is callable from the console. Good for prototyping. If this ever ships as a real product, a build pipeline gets bolted on, but that's a future problem.

## What the ESPN backend does and doesn't do

It wraps ESPN's unofficial scoreboard endpoints — the same JSON the ESPN mobile app uses — and serves them with the right CORS header so your browser will accept them. Caches each endpoint for 5 seconds so polling doesn't slam ESPN.

What you get from ESPN: scores, clocks, status, team names, team colors, basic schedules.

What you don't get from ESPN (and what the prototype renders as illustrative when ESPN mode is on): heat maps, shot charts, possession maps, player props, fighter strike zones. Those are premium feed data — requires a paid sports data provider (Sportradar, Stats Perform, OddsJam, etc).

When ESPN mode is on, a banner explains this clearly so anyone using the prototype knows what's real vs sample.

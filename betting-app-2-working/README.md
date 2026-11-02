# Sports Stats & Analytics App

A mobile-first, multi-sport stats and betting prototype. Runs entirely in a single browser tab from `index.html`. Optional Node backend lets it pull real live data from ESPN.

## Quick start

### Just the app (no real data)

Double-click `index.html`. It opens in your browser. Fake live mode is on by default — you'll see scores ticking on the Overview every few seconds.

### With real ESPN data

1. Open a terminal and `cd backend`
2. Run `node server.js` (requires Node 18+)
3. Open `index.html` in your browser
4. Tap the green **"Try real ESPN data: OFF"** button under the phone — it flips to ON
5. Real games for NBA, WNBA, NCAA Men, NFL, NCAA FB, MLB, NHL, EPL, MLS all replace the mock data

See `backend/README.md` for backend setup details.

## What's in it

Five tabs at the bottom — Home, Odds, Compare, Favorites, More.

- **Home** routes to whichever sport is selected from the sport pill. The default is Overview (cross-sport). Each sport home page has a featured game with full stats and visualizations, plus collapsible "other games" cards that expand to show per-game viz.
- **Odds** shows lines across Kalshi / FanDuel / DraftKings with best-price highlighting. Filtered by the selected sport. Tap any game for full lines (moneyline, spread, total), game segments (1H/Q1/etc), and sport-aware player props.
- **Compare** lets you stack up to three players head-to-head across any sport. Live search picker. Similarity-based suggestions.
- **Favorites** holds saved teams and players. Drives the "My teams · live" filter on the Overview.
- **More** has settings groupings (stubbed).

## Project structure

```
sports-stats-app/
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
    ├── server.js         ← Node server, wraps ESPN
    ├── package.json
    └── README.md
```

## Prediction model

With the backend on, NBA/NFL/MLB/NHL win probabilities come from an Elo model
backtested walk-forward on real ESPN results. Method and numbers:
`backend/model/RESULTS.md` and the root README.

## Vanilla JS, on purpose

No build step. No React. No npm install (for the front-end). Open `index.html` and it works. Every script tag declares functions/variables at global scope; later scripts depend on earlier ones; `index.html` loads them in dependency order with inline comments explaining each layer.

This keeps the app inspectable: open the browser dev tools, every function is callable from the console. Good for prototyping. If this ever ships as a real product, a build pipeline gets bolted on, but that's a future problem.

## What the ESPN backend does and doesn't do

It wraps ESPN's unofficial scoreboard endpoints — the same JSON the ESPN mobile app uses — and serves them with the right CORS header so your browser will accept them. Caches each endpoint for 5 seconds so polling doesn't slam ESPN.

What you get from ESPN: scores, clocks, status, team names, team colors, basic schedules.

What you don't get from ESPN (and what the prototype renders as illustrative when ESPN mode is on): heat maps, shot charts, possession maps, player props, fighter strike zones. Those are premium feed data — requires a paid sports data provider (Sportradar, Stats Perform, OddsJam, etc).

When ESPN mode is on, a banner explains this clearly so anyone using the prototype knows what's real vs sample.

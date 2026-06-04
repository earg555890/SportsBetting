# Sports Stats App — Project Context

**This document is the source of truth for what this app is. Paste it into the Claude.ai Project description, or attach it to every chat about this codebase.**

## What we're building

A mobile-first, multi-sport stats and analytics app. Five tabs (Home, Odds, Compare, Favorites, More). Covers NBA, WNBA, NCAA Men's & Women's Basketball, NFL, NCAA Football, MLB, NCAA Baseball, NHL, NCAA Hockey, EPL, MLS, La Liga, Champions League, NCAA Soccer, UFC, and Boxing. Real-time scores, betting odds across multiple books, head-to-head player comparison, sport-specific visualizations.

The whole app runs in a single browser tab from `index.html`. No build step. Vanilla JS. An optional Node backend at `backend/server.js` provides real live data by wrapping ESPN's unofficial endpoints.

## Tech decisions and constraints

- **No frameworks.** Plain HTML, CSS, and vanilla JS. The app should keep working by double-clicking `index.html`. If a code change would require React, Webpack, npm install on the front-end, etc — don't make it; flag it instead and we'll discuss.
- **No ES modules in script files.** They block file:// loading. Every JS file uses plain `<script>` tags loaded in dependency order from `index.html`. Functions and variables live at global scope.
- **Mobile-first.** Designed for a ~380px-wide viewport. Bottom tab bar. Touch-sized hit targets. The app shell wraps content in a phone-frame style container so it always looks like a mobile app even on desktop.
- **Auto theme.** CSS variables for both light and dark mode, switched by `@media (prefers-color-scheme)`. Don't hardcode hex colors — use `var(--color-text-primary)`, `var(--color-background-secondary)`, etc.
- **Tone of formatting.** Tight, balanced density. The user prefers things to be collapsible/expandable rather than long scroll lists. Pattern: a feature collapses into an accordion-style "section" with a chevron, and expanding it reveals the detail.

## Code structure

```
index.html        ← loads all scripts in order
styles.css        ← all CSS
src/
  config.js              ← API_CONFIG (backend URLs), sportTree, defaultOpen sections
  data.js                ← mockData for every league (teams, players, matches, news, leaders)
  datasource.js          ← DataSource module: read path, mock/live/degraded/fake-live modes
  state.js               ← global UI state (current tab, sport, pickers, favorites, etc.)
  helpers.js             ← logoCircle, statusPill, oddsBar, section, sampleDataBanner, espnMode flag
  router.js              ← sport dropdown, tab bar, renderContent dispatch
  common-renderers.js    ← featured game card, "other games" card, player picker pill, etc.
  pages/
    overview.js          ← cross-sport home page (Home tab, Overview sport)
  visualizations/
    hockey-viz.js        ← renderHockey + 6 NHL viz (shot chart, goalie zones, ice heat, PP timeline, faceoff, shifts)
    basketball-viz.js    ← renderBasketball + shot chart, quarter scoring, hot players
    football-viz.js      ← renderFootball + passing chart, drive chart
    baseball-viz.js      ← renderBaseball + spray chart, strike zone, innings grid
    soccer-viz.js        ← renderSoccer + heat map, possession, form
    ufc-viz.js           ← renderUFC + anatomical body figure with strike heat zones, strike breakdown tables
  tabs/
    compare.js           ← Compare tab with up-to-3-player picker, search, similarity suggestions
    odds.js              ← Odds tab: filtered by sport, expandable cards with full lines + sport-aware player props
    favorites.js         ← Favorites tab + picker
    more.js              ← Settings tab (stubbed)
  router-patch.js        ← Wraps renderContent so Compare and Favorites pickers can intercept
  dev-controls.js        ← Three buttons under the phone: fake-live toggle, simulate-failure, ESPN toggle (wired up in espn.js)
  espn.js                ← ESPN integration: fetch all sports in parallel from backend, replace mockData
  init.js                ← Bootstrap calls
backend/
  server.js              ← Node 18+ zero-dependency HTTP server, wraps 13 ESPN endpoints
  package.json
  README.md
```

## How visualizations work

Each sport has its own viz file. Naming convention: `render<Sport>` is the page entry point that wraps everything in collapsible sections. Inside, there are individual functions like `hockeyShotChart`, `goalieNetSVG`, `bodyFigure`, etc. that return raw SVG strings.

The visualizations use mock data from `data.js`. When ESPN mode is on, real game data replaces matches, but visualization data (heat zones, strike maps, etc.) can't come from ESPN's public endpoints — premium feed data. So when ESPN mode is on, a banner explains the visualizations are illustrative. This is a deliberate design choice — the user said keep them visible with a label, don't hide them.

## State object

Lives in `state.js`. Key fields:

- `tab` — current bottom tab ('home', 'odds', 'compare', 'favorites', 'more')
- `sport` / `league` / `template` — current selection from the sport pill
- `openSectionsByLeague` — per-league memory of which collapsible sections are open. Resets only when the app reloads.
- `expandedFightId` — currently-expanded UFC fight card
- `expandedGameKey` — currently-expanded non-featured game card on sport home pages
- `expandedOddsKey` — currently-expanded Odds tab card
- `compareIds`, `compareSlot`, `compareSearch` — Compare tab state
- `favoriteTeams`, `favoritePlayers` — drives Overview filter + Favorites tab
- `pickerStateByLeague` — per-league memory of which player is selected for each picker on each sport home page

## DataSource

The single read path. Code calls `DataSource.getActive(leagueId)` or `DataSource.getAll()` and gets back the current data. Modes:

- `mock` — using `mockData` (default when no backend)
- `live` — connected to a real backend, fetching periodically
- `degraded` — backend configured but unreachable, falling back to mock with a warning banner
- `fake-live` — testing mode, ticks random score changes every 3.5s

Pub/sub via `DataSource.subscribe(cb)` — re-renders when score changes come in.

## The user's working style

- Asks for plans before code. Will tell me to stop if I jump straight to building.
- Prefers single questions over multi-part. Will accept a recommendation if I give one.
- Doesn't want visualizations rendered inline unless explicitly asked.
- Sometimes asks "can we do X" — usually that means "tell me how", not "do it now." Ask before building.

## What's not done

- **Player and team detail pages.** Tapping a player or team name does nothing currently. Would need new routes + dedicated pages.
- **Onboarding flow.** Favorites are hardcoded. No way to pick favorites at first launch.
- **Real betting odds.** Lines and props in the Odds tab are derived from mock win-probabilities or pure placeholders. No real provider wired in (would be The Odds API or similar).
- **Real visualization data.** Heat maps, shot charts, strike zones, etc. are all mock — would need a paid sports data provider for real data.
- **Search.** No global search for teams/players outside the Compare/Favorites pickers.
- **Tappable Overview game cards.** The user asked for these to deep-link to that game's full stats page in the relevant sport template. Not yet implemented.
- **More sports added.** User wants NCAA Baseball, NCAA Women's Basketball, NCAA Hockey, NCAA Soccer next — partially in the data file but not all fully wired through the navigation tree.

## What's worked on most recently

Most recent change before this restructure: full Odds tab buildout with expandable cards. Each card now shows moneyline (American odds), spread, total, game segments (1H/Q1/etc), and sport-aware player props. UFC fights get method-of-victory grid + distance prop + fighter props. Sport filter respects the sport pill.

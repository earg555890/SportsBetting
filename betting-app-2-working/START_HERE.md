# START HERE — Sports Betting App (Claude Code brief)

Read this first, then `CLAUDE.md` (hard constraints) and `PROJECT.md` (how the
existing app is structured). This file says **what we're building and where we
are**; those two say **how the code works and what not to break**.

## What this is

This project evolves the existing multi-sport stats app into a **sports-betting
app**. Same engine, same conventions, reorganized around two functions:

1. **Picks (home / default tab)** — real betting lines (moneyline, spread,
   total, player props) across multiple books, each game paired with an **AI
   recommendation** and a **"Why this pick"** explanation.
2. **Live (second tab)** — the existing live game tracking: real scores and the
   per-sport visualizations already built. Reused as-is, just demoted from home
   to the second tab.

Keep Compare / Favorites / More.

## Hard constraints (from CLAUDE.md — do not violate)

- Vanilla HTML/CSS/JS. No React/Vue/TypeScript/bundler/build step. The app must
  keep working by double-clicking `index.html`.
- No ES modules in front-end `.js` — plain `<script>` tags at global scope,
  load order set in `index.html`.
- Backend = Node built-in modules only (`http`, global `fetch`). No npm installs.
- CSS variables only; mobile-first ~380px viewport.

## Architecture decisions (already settled)

- **One shared backend key, not per-user.** The Odds API key (and later the
  model API key) live only in `backend/server.js`, read from `process.env`.
  End users never supply a key.
- **The AI agent runs server-side** for the same reason — it needs a model key.
  It returns structured output: pick + confidence + a list of factors.
- **Optional-backend pattern preserved.** Real odds + AI light up when the
  backend is running; with it off, `datasource.js` falls back to mock/degraded
  so double-clicking `index.html` still works. This mirrors how ESPN live data
  already behaves today.

## Build order + status

1. ✅ **Backend odds proxy — DONE.** `backend/server.js` now proxies The Odds
   API alongside the existing ESPN scoreboard routes. New routes use the same
   league ids the front end already uses:
   - `GET /api/odds/:league` — moneyline + spread + total
   - `GET /api/odds/:league/events` — event list (does not cost quota)
   - `GET /api/odds/:league/event/:eventId/props` — player props
   Key read from `process.env.ODDS_API_KEY`. Cached 30s (featured) / 60s (props).
   Remaining quota passed through to the client via `x-requests-remaining`.

2. ⬜ **Wire the front end to the odds proxy.** ← DO THIS NEXT.
   Add an odds-fetch module that calls `BACKEND_URL/api/odds/...` exactly like
   `espn.js` calls the scoreboard routes, parse the Odds API response into the
   Odds tab, and route it through `datasource.js` so the mock/degraded fallback
   still applies when the backend is off.

3. ⬜ **AI recommendation + "Why".** Add `POST /api/recommend` to `server.js`
   (model call via plain `fetch`, structured response, cached per game). Render
   the recommendation plus a "Why this pick" collapsible using the existing
   `section()` helper.

4. ⬜ **IA reorg.** Make Picks/Odds the default landing tab; demote the current
   per-sport home pages to a "Live" tab.

## Renderers (reconstructed — app runs as-is)

The 11 renderer files below were missing from the original package and have been
rebuilt to match the contracts the existing infrastructure defines (the
`render<X>` dispatch in `router.js`, the helpers in `helpers.js`, the mock-data
shape in `data.js`, and the card patterns in `common-renderers.js`). The app now
runs end-to-end in mock mode by double-clicking `index.html` — every tab and
sport renders. These are functional reconstructions, not the original files, so
treat them as a working baseline you can refine:

- `src/pages/overview.js` — cross-sport home (my teams / live / final / headlines)
- `src/tabs/odds.js` — betting board: multi-book moneyline, spread, total with
  best-price highlighting + player props (derived from mock data; this is the
  surface the backend odds proxy replaces in step 2)
- `src/tabs/compare.js`, `src/tabs/favorites.js`, `src/tabs/more.js`
- `src/visualizations/hockey-viz.js`, `basketball-viz.js`, `football-viz.js`,
  `baseball-viz.js`, `soccer-viz.js`, `ufc-viz.js` — per-sport pages + the SVG
  primitives `common-renderers.js` calls for per-game visuals

Verified: all files pass `node --check`, and a DOM-shim harness rendered every
tab × sport (33 scenarios) with 0 errors.

## Honest flags to keep in mind

- **Cost / quota.** A shared key means you pay and you're rate-limited for
  everyone. The Odds API free tier (500 req/mo) won't survive multiple real
  users even with caching — plan for a paid tier. Same for model usage; cache
  each recommendation per game.
- **Reasoning framing.** The "Why" should present factors + a confidence level
  and where the line looks soft — not guaranteed winners. Sports markets are
  efficient and carry the vig. This framing is both more honest and more useful.

## Run it

- Front end: open `index.html` (works offline in mock mode).
- Backend: `cd backend && ODDS_API_KEY=your_key node server.js` (Node 18+).
  On Windows PowerShell: `$env:ODDS_API_KEY="your_key"; node server.js`.
  Get a free key at https://the-odds-api.com. Test: `http://localhost:3000/api/odds/nba`.

## Good first prompt for Claude Code

> Wire the Odds tab to the backend odds proxy. Add an odds-fetch module that
> calls `BACKEND_URL/api/odds/:league` following the same pattern as `espn.js`,
> parse The Odds API response (bookmakers → markets → outcomes, American odds)
> into the Odds tab cards with best-price highlighting across books, and route
> it through `datasource.js` so the mock/degraded fallback still applies when
> the backend is off. Don't break the double-click-`index.html` flow.

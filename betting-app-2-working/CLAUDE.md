# Instructions for Claude Code

**This project is the SPORTS BETTING app — not the original stats app.** Before
making any changes, read `START_HERE.md` first. It states what we're building,
the current build step, and what's next, and it takes precedence over
`PROJECT.md`.

`PROJECT.md` below describes the original multi-sport stats app that this one is
built on. Treat it as background for how the existing code works — NOT as the
goal. The goal is in `START_HERE.md`.

## Core constraints — don't violate these

- **No frameworks.** This is vanilla HTML/CSS/JS, on purpose. The app must keep working by double-clicking `index.html`. Don't introduce React, Vue, TypeScript, Webpack, Vite, or any build step. If a change would require one, surface it as a question rather than making it.
- **No ES modules in `.js` files.** Browsers block ES module imports from `file://`. Every JS file uses plain global functions and variables. Later scripts depend on earlier ones; load order is set in `index.html`.
- **No npm install on the front-end.** The `backend/` folder uses Node's built-in modules only (`http`, global `fetch`). Don't add Express, axios, dotenv, etc. — they're not needed and they break the "just run it" setup.
- **CSS variables only.** Don't hardcode colors. Use `var(--color-text-primary)`, `var(--color-background-secondary)`, etc. They handle dark mode automatically.
- **Mobile-first sizing.** Target viewport is ~380px wide. Touch-sized hit targets. Don't add things that only look right on desktop.

## File map

```
index.html        ← entry, loads all scripts in dependency order
styles.css        ← all CSS, light + dark mode via @media query
src/
  config.js, data.js, datasource.js, state.js, helpers.js, router.js,
  common-renderers.js, router-patch.js, dev-controls.js, espn.js, init.js
  pages/overview.js
  tabs/{compare,odds,favorites,more}.js
  visualizations/{hockey,basketball,football,baseball,soccer,ufc}-viz.js
backend/
  server.js, package.json, README.md
```

When adding a new feature, prefer adding to an existing file over creating new ones. Files are organized by responsibility, not by size — `odds.js` is allowed to be 500 lines if all of it is odds-related.

## How rendering works

Every page is rendered by a function that takes the content container `c` and writes to `c.innerHTML`. After setting innerHTML, the function calls `bindSectionToggles(c)` (and any other binders it needs) to wire up event handlers. Re-rendering is "blow away and rebuild" — there's no virtual DOM diffing.

To trigger a re-render after state changes, call `renderContent()`.

## Conventions to follow

- **Collapsible sections:** Use the `section(id, label, badge, contentHTML)` helper. Sections remember their open/closed state per league in `state.openSectionsByLeague`.
- **Cards:** Use `var(--color-background-primary)` background, `0.5px solid var(--color-border-tertiary)` border, `var(--border-radius-md)` corners.
- **Logos:** Use `logoCircle(name, color, size)` — never inline circles.
- **Status pills:** Use `statusPill(status)` for LIVE / FINAL / UPCOMING.
- **Odds bars:** Use `oddsBar(homeColor, awayColor, odds, hasD)`. `hasD` is true for soccer (3-way).
- **Player pickers:** Use `playerPickerPill(d, label, key)` + bind with `bindPlayerPickers(c)`.
- **Sample data banner:** When showing visualizations whose data isn't real, prepend `sampleDataBanner()` to the HTML. It only shows when `espnMode` is true.

## Things to be careful about

- The state object is mutated directly, not replaced. `state.tab = 'odds'` is normal; never do `state = {...state, tab: 'odds'}`.
- `mockData` is also mutated directly — that's how ESPN mode replaces real games into it. The original is saved to `mockSnapshot` so it can be restored.
- Re-renders are full-page — be careful when adding inputs (text fields), as the user's cursor position can get lost. The Compare picker handles this by restoring focus + cursor after re-render. Follow that pattern if adding any other text inputs.
- ESPN mode replaces team IDs with `espn_<id>` keys. Player rosters don't match ESPN's roster, so player-specific visualizations may not have data for ESPN-fetched games — handle gracefully with "data unavailable" messages rather than crashing.

## Working style

- Walk through a plan before writing code for anything larger than a small fix.
- Single-question check-ins are preferred to multi-part questionnaires.
- If something would take more than a few files to change, surface the plan first.
- Don't render visualizations inline in chat unless asked.
- Refer to `PROJECT.md` for the user's working style and recent context.

## Quick how-to-run

Front-end: open `index.html` in a browser. That's it.

Backend (for real ESPN data): `cd backend && node server.js`. Requires Node 18+. Then in the app, tap the "Try real ESPN data" button.

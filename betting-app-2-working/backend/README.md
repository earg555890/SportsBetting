# Sports Backend — Setup

A tiny zero-dependency Node server that wraps ESPN's scoreboard endpoints (live
scores) AND The Odds API (betting lines) so the app can fetch both without CORS
errors, with the Odds API key held server-side.

## Running it

1. Put this `backend/` folder somewhere on your machine.
2. Open a terminal and `cd` into it.
3. Start the server **with your Odds API key in the environment**:

   ```
   ODDS_API_KEY=your_key_here node server.js
   ```

   Windows PowerShell:
   ```
   $env:ODDS_API_KEY="your_key_here"; node server.js
   ```

   No `npm install`. Requires Node 18+.

You should see the startup log confirm whether the Odds API key is configured.

## The Odds API key

- Get a free key at https://the-odds-api.com (free tier = 500 requests/month).
- It is read from `process.env.ODDS_API_KEY` and never sent to the browser, so
  every user of the app shares this one key — nobody needs their own.
- Caching (30s featured / 60s props) keeps the request count down. The free
  tier will not stretch across many real users — plan for a paid tier.

## Endpoints

Live scores (ESPN): `/api/<sport>/scoreboard` for nba, wnba, ncaam, ncaaw, nfl,
ncaaf, mlb, ncaabb, nhl, ncaah, epl, mls, ufc.

Betting lines (The Odds API):
| Endpoint | Returns |
|---|---|
| `/api/odds/:league` | moneyline + spread + total |
| `/api/odds/:league/events` | event list (quota-free, for id lookup) |
| `/api/odds/:league/event/:eventId/props` | player props |

`:league` uses the same ids as the front end (nba, nfl, epl, ufc, ...).

## Stopping it

Ctrl+C in the terminal running the server.

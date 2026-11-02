// =============================================================================
// ESPN INTEGRATION (local backend)
// Fetches real scoreboards from the Node backend at localhost:3000, fans out
// across all sports in parallel, and replaces mockData in-place. Restores
// the original mock data when toggled off. Sets espnMode flag so banners
// and visualizations adapt.
// =============================================================================

const BACKEND_URL = 'http://localhost:3000';

// Map: prototype league id → backend endpoint slug
// Only leagues we know how to integrate appear here. Others stay on mock data.
const ESPN_SPORT_MAP = {
  nba:    'nba',
  wnba:   'wnba',
  ncaam:  'ncaam',
  nfl:    'nfl',
  ncaafb: 'ncaaf',
  mlb:    'mlb',
  nhl:    'nhl',
  epl:    'epl',
  mls:    'mls'
  // ufc/boxing intentionally excluded — ESPN's MMA endpoint has a different
  // shape (events containing multiple fights). Boxing also stays on mock.
};

// Leagues the backend's Elo model covers (GET /api/model/:league/predict).
const MODEL_LEAGUES = ['nba', 'nfl', 'mlb', 'nhl'];
// 'league|homeId|awayId|neutral' -> { w, l, source } or null (unknown team).
// Ratings only change when the backend restarts, so one fetch per matchup.
const modelProbCache = {};

let espnTimer = null;
let espnEnabled = false;
// Saved snapshot of mockData to restore when ESPN mode is turned off
let mockSnapshot = null;

const espnBtn = document.getElementById('toggle-espn');
const espnStatusEl = document.getElementById('espn-status');

function snapshotMockData(){
  // Deep clone (structuredClone exists in Node 17+ and modern browsers)
  mockSnapshot = structuredClone(mockData);
}

function restoreMockData(){
  if (!mockSnapshot) return;
  // Replace contents in place rather than reassigning the constant
  Object.keys(mockData).forEach(k => delete mockData[k]);
  Object.entries(mockSnapshot).forEach(([k, v]) => mockData[k] = v);
  mockSnapshot = null;
}

function espnEventToMatch(event){
  // Convert one ESPN event into the prototype's match shape, plus the team objects it needs.
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const homeC = comp.competitors?.find(c => c.homeAway === 'home');
  const awayC = comp.competitors?.find(c => c.homeAway === 'away');
  if (!homeC || !awayC) return null;

  const espnState = event.status?.type?.state;
  let status;
  if (espnState === 'in') status = 'LIVE';
  else if (espnState === 'post') status = 'FINAL';
  else status = 'UPCOMING';

  const time = event.status?.type?.shortDetail || event.status?.displayClock || '';
  const homeKey = 'espn_' + homeC.id;
  const awayKey = 'espn_' + awayC.id;

  const homeTeamObj = {
    name: homeC.team?.shortDisplayName || homeC.team?.displayName || 'Home',
    short: homeC.team?.abbreviation || '???',
    color: homeC.team?.color ? '#' + homeC.team.color : '#666',
    record: homeC.records?.[0]?.summary || '—',
    pts: '—'
  };
  const awayTeamObj = {
    name: awayC.team?.shortDisplayName || awayC.team?.displayName || 'Away',
    short: awayC.team?.abbreviation || '???',
    color: awayC.team?.color ? '#' + awayC.team.color : '#666',
    record: awayC.records?.[0]?.summary || '—',
    pts: '—'
  };

  const hs = homeC.score !== undefined && homeC.score !== '' ? parseInt(homeC.score) : null;
  const as = awayC.score !== undefined && awayC.score !== '' ? parseInt(awayC.score) : null;

  const winProb = comp.situation?.lastPlay?.probability?.homeWinPercentage
    || (status === 'LIVE' && hs > as ? 0.6 : status === 'LIVE' && hs < as ? 0.4 : 0.5);
  const w = Math.round(winProb * 100);

  return {
    homeKey, awayKey, homeTeamObj, awayTeamObj,
    match: {
      home: homeKey,
      away: awayKey,
      status,
      time,
      hs: status === 'UPCOMING' ? null : hs,
      as: status === 'UPCOMING' ? null : as,
      odds: { w, l: 100 - w },
      books: {
        kalshi:     { w, l: 100 - w },
        fanduel:    { w, l: 100 - w },
        draftkings: { w, l: 100 - w }
      },
      neutral: !!comp.neutralSite,
      _espn: true
    }
  };
}

async function fetchOneSport(leagueId, slug){
  const res = await fetch(`${BACKEND_URL}/api/${slug}/scoreboard`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

async function fetchAllSports(){
  // Fetch all configured sports in parallel; failures don't block the others.
  espnStatusEl.textContent = 'Fetching all sports from backend…';
  const entries = Object.entries(ESPN_SPORT_MAP);
  const results = await Promise.allSettled(entries.map(([leagueId, slug]) => fetchOneSport(leagueId, slug)));

  let totalGames = 0, totalSports = 0, failed = [];
  results.forEach((result, i) => {
    const [leagueId] = entries[i];
    if (result.status !== 'fulfilled'){
      failed.push(leagueId);
      return;
    }
    const events = result.value;
    if (!events.length){
      // Replace with empty match list so we don't show stale mocks
      if (mockData[leagueId]) mockData[leagueId].matches = [];
      return;
    }

    if (!mockData[leagueId]) return;

    // Build fresh teams + matches from this sport's events
    const newTeams = {};
    const newMatches = [];
    events.forEach((event, idx) => {
      const conv = espnEventToMatch(event);
      if (!conv) return;
      newTeams[conv.homeKey] = conv.homeTeamObj;
      newTeams[conv.awayKey] = conv.awayTeamObj;
      // First game becomes the featured one
      if (idx === 0) conv.match.isFeature = true;
      newMatches.push(conv.match);
    });

    if (newMatches.length){
      mockData[leagueId].teams = newTeams;
      mockData[leagueId].matches = newMatches;
      // Wipe goalies/players that referenced old team ids (otherwise sport-specific
      // home pages try to render visualizations with stale team mappings)
      if (mockData[leagueId].goalies) mockData[leagueId].goalies = {};
      // Keep the league-wide players list — they're used for player-picker
      // visualizations and are fine to keep showing as illustrative.
      totalGames += newMatches.length;
      totalSports++;
    }
  });

  if (failed.length === entries.length){
    throw new Error('All sport fetches failed — backend may be offline');
  }

  return { totalGames, totalSports, failed };
}

// Attaches m.model = { w, l, source:'Elo model' } (home/away win %) to every
// real game in a model league. Failures leave m.model unset, so the Odds tab
// falls back to its placeholder probabilities.
async function attachModelProbs(){
  const jobs = [];
  MODEL_LEAGUES.forEach(lid => {
    const d = mockData[lid];
    if (!d || !d.matches) return;
    d.matches.forEach(m => {
      if (!m._espn) return;
      const home = m.home.replace('espn_', ''), away = m.away.replace('espn_', '');
      const key = `${lid}|${home}|${away}|${m.neutral ? 1 : 0}`;
      if (key in modelProbCache){ if (modelProbCache[key]) m.model = modelProbCache[key]; return; }
      jobs.push(fetch(`${BACKEND_URL}/api/model/${lid}/predict?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}${m.neutral ? '&neutral=1' : ''}`)
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          const w = j && j.homeWinProb != null ? Math.round(j.homeWinProb * 100) : null;
          modelProbCache[key] = w == null ? null : { w, l: 100 - w, source: 'Elo model', asOf: j.ratingsAsOf };
          if (modelProbCache[key]) m.model = modelProbCache[key];
        })
        .catch(() => {}));                       // network error: retry on next refresh
    });
  });
  await Promise.allSettled(jobs);
}

async function refreshEspnData(){
  try {
    const { totalGames, totalSports, failed } = await fetchAllSports();
    await attachModelProbs();
    const failNote = failed.length ? ` · ${failed.length} sport${failed.length === 1 ? '' : 's'} unavailable` : '';
    espnStatusEl.textContent = `✓ Live · ${totalGames} games across ${totalSports} sports${failNote}`;
    renderContent();
  } catch(err){
    console.warn('[Backend] Multi-sport fetch failed', err);
    espnStatusEl.textContent = '✗ Backend offline (run `node server.js` in your sports-backend folder)';
  }
}

espnBtn.addEventListener('click', async () => {
  espnEnabled = !espnEnabled;
  if (espnEnabled){
    espnBtn.textContent = 'Try real ESPN data: ON';
    espnBtn.style.background = 'var(--color-text-success)';
    espnBtn.style.color = 'white';
    // Stop fake live so real data isn't fighting with simulated updates
    if (DataSource.isFakeLive()){
      DataSource.stopFakeLive();
      fakeLiveBtn.textContent = 'Fake live: OFF';
      fakeLiveBtn.style.background = 'var(--color-background-secondary)';
      fakeLiveBtn.style.color = 'var(--color-text-secondary)';
    }
    // Save mock state so we can restore on toggle off
    snapshotMockData();
    espnMode = true;
    await refreshEspnData();
    espnTimer = setInterval(refreshEspnData, 10000);
  } else {
    espnBtn.textContent = 'Try real ESPN data: OFF';
    espnBtn.style.background = 'var(--color-background-success)';
    espnBtn.style.color = 'var(--color-text-success)';
    if (espnTimer){ clearInterval(espnTimer); espnTimer = null; }
    espnStatusEl.textContent = '';
    espnMode = false;
    restoreMockData();
    renderContent();
  }
});

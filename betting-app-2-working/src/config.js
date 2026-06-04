// =============================================================================
// CONFIG
// API_CONFIG (live backend URLs), defaultOpen sections per sport, sport tree
// for the dropdown navigation.
// =============================================================================

const API_CONFIG = {
  baseUrl: null, wsUrl: null, apiKey: null,
  polling: { liveGames: 10000, standings: 3600000, news: 300000 },
  healthCheckTimeoutMs: 3000,
  wsReconnect: { initialDelayMs: 1000, maxDelayMs: 30000, factor: 2 }
};

// ============================================================
// DEFAULTS PER SPORT (which sections start open)
// ============================================================
const defaultOpen = {
  overview: ['favgames','livegames','finished','headlines'],
  soccer: ['game','standings','news'],
  basketball: ['game','standings','leaders'],
  football: ['game','standings','news'],
  baseball: ['game','standings','news'],
  hockey: ['game','standings','news'],
  ufc: ['fightcard','news']
};

const sportTree = {
  overview: {name:'Overview', template:'overview', leagues:[{id:'overview', name:'All sports'}]},
  hockey: {name:'Hockey', template:'hockey', leagues:[{id:'nhl', name:'NHL'}]},
  combat: {name:'Combat', template:'ufc', leagues:[{id:'ufc', name:'UFC'},{id:'boxing', name:'Boxing'}]},
  soccer: {name:'Soccer', template:'soccer', leagues:[{id:'epl', name:'Premier League'},{id:'mls', name:'MLS'},{id:'laliga', name:'La Liga'},{id:'ucl', name:'Champions League'}]},
  basketball: {name:'Basketball', template:'basketball', leagues:[{id:'nba', name:'NBA'},{id:'wnba', name:'WNBA'},{id:'ncaam', name:'NCAA Men'}]},
  football: {name:'Football', template:'football', leagues:[{id:'nfl', name:'NFL'},{id:'ncaafb', name:'NCAA FB'}]},
  baseball: {name:'Baseball', template:'baseball', leagues:[{id:'mlb', name:'MLB'}]}
};

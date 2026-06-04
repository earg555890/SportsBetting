// =============================================================================
// STATE
// Global UI state — current tab, sport, picker selections, compare slots,
// favorites, expanded sections, etc. Plus a few small helpers that read/write it.
// =============================================================================

let state = {
  tab: 'home',
  sport: 'overview',
  league: 'overview',
  template: 'overview',
  openSectionsByLeague: {},
  expandedFightId: null,
  // Track which non-featured game cards are expanded — keyed by `${leagueId}|${matchIndex}`
  expandedGameKey: null,
  // Track which Odds tab card is currently expanded showing full lines + props.
  // Key format: `${leagueId}|${matchIndex}` or `fight|${leagueId}|${fightIndex}`
  expandedOddsKey: null,
  // Track which game's AI-pick popup is open (same key format as expandedOddsKey).
  // null = no popup. Lives outside #content so it survives board re-renders.
  aiModalKey: null,
  // Per-page pickers (persisted by league)
  pickerStateByLeague: {},
  // Compare tab
  compareIds: [],
  compareSearch: '',
  compareSlot: null,  // which slot is currently being filled (0/1/2 or null)
  // Favorites (mocked but mutable)
  favoriteTeams: ['phi_eag','bos_cel','phi_phi','liv'],
  favoritePlayers: ['p_haa','p_tat','mac'],
  // Onboarding flag
  onboardingComplete: true
};

function getLeagueSections(){
  if (!state.openSectionsByLeague[state.league]) state.openSectionsByLeague[state.league] = new Set(defaultOpen[state.template] || []);
  return state.openSectionsByLeague[state.league];
}
function isSectionOpen(id){ return getLeagueSections().has(id); }
function toggleSection(id){ const s = getLeagueSections(); if (s.has(id)) s.delete(id); else s.add(id); }

function getPickerState(){
  if (!state.pickerStateByLeague[state.league]) state.pickerStateByLeague[state.league] = {};
  return state.pickerStateByLeague[state.league];
}

function getActiveData(){ return DataSource.getActive(state.league); }

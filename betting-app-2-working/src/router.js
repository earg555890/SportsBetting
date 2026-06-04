// =============================================================================
// ROUTER
// Sport pill dropdown, switchSport, bottom tab bar, and renderContent — the
// top-level dispatch from (tab, sport) -> page renderer. Page renderers live
// in src/pages/ and src/tabs/.
// =============================================================================

// ============================================================
// SPORT DROPDOWN + TAB BAR + ROUTER
// ============================================================
function renderSportDropdown(){
  const dd = document.getElementById('sport-dropdown');
  let html = '';
  Object.entries(sportTree).forEach(([sportKey, sport]) => {
    html += `<div style="margin-bottom:10px;"><p style="margin:0 0 6px; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary); font-weight:500;">${sport.name}</p><div style="display:flex; flex-wrap:wrap; gap:4px;">`;
    sport.leagues.forEach(lg => {
      const active = state.sport === sportKey && state.league === lg.id;
      html += `<button data-sport="${sportKey}" data-league="${lg.id}" data-template="${sport.template}" style="padding:5px 10px; border-radius:12px; font-size:11px; border:0.5px solid ${active ? 'var(--color-border-primary)' : 'var(--color-border-tertiary)'}; background:${active ? 'var(--color-text-primary)' : 'var(--color-background-primary)'}; color:${active ? 'var(--color-background-primary)' : 'var(--color-text-secondary)'}; font-weight:500; cursor:pointer;">${lg.name}</button>`;
    });
    html += `</div></div>`;
  });
  dd.innerHTML = html;
  dd.querySelectorAll('button').forEach(b => b.addEventListener('click', () => switchSport(b.dataset.sport, b.dataset.league, b.dataset.template)));
}

function switchSport(sportKey, leagueId, template){
  state.sport = sportKey; state.league = leagueId; state.template = template;
  state.tab = 'home';
  state.expandedFightId = null;
  const sport = sportTree[sportKey];
  const lg = sport.leagues.find(x => x.id === leagueId);
  document.getElementById('sport-pill-label').textContent = template === 'overview' ? 'Overview' : (sport.name + ' · ' + lg.name);
  document.getElementById('header-title').textContent = template === 'overview' ? 'Overview' : sport.name;
  document.getElementById('header-sub').textContent = template === 'overview' ? 'All sports' : lg.name;
  document.getElementById('sport-dropdown').style.display = 'none';
  renderSportDropdown();
  renderTabBar();
  renderContent();
}

document.getElementById('sport-pill').addEventListener('click', () => {
  const dd = document.getElementById('sport-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
});

const tabs = [
  {id:'home', label:'Home', icon:'M3 12l9-9 9 9M5 10v10h14V10'},
  {id:'odds', label:'Odds', percent:true},
  {id:'compare', label:'Compare', icon:'M8 3v18M16 3v18M3 8h18M3 16h18'},
  {id:'favorites', label:'Favorites', icon:'M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'},
  {id:'more', label:'More', icon:'M4 12h.01M12 12h.01M20 12h.01'}
];

function tabIcon(t){
  if (t.percent) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${t.icon}"/></svg>`;
}

function renderTabBar(){
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = tabs.map(t => {
    const active = state.tab === t.id;
    return `<button data-tab="${t.id}" style="background:transparent; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; padding:4px 0; color:${active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'};">${tabIcon(t)}<span style="font-size:10px; font-weight:${active ? '500' : '400'};">${t.label}</span></button>`;
  }).join('');
  bar.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; renderTabBar(); renderContent(); }));
}

function renderContent(){
  const c = document.getElementById('content');
  if (state.tab === 'home'){
    if (state.template === 'overview') return renderOverview(c);
    if (state.template === 'ufc') return renderUFC(c);
    if (state.template === 'hockey') return renderHockey(c);
    if (state.template === 'basketball') return renderBasketball(c);
    if (state.template === 'football') return renderFootball(c);
    if (state.template === 'baseball') return renderBaseball(c);
    if (state.template === 'soccer') return renderSoccer(c);
  }
  if (state.tab === 'odds') return renderOdds(c);
  if (state.tab === 'compare') return renderCompare(c);
  if (state.tab === 'favorites') return renderFavorites(c);
  if (state.tab === 'more') return renderMore(c);
}

// =============================================================================
// OVERVIEW PAGE (Home tab, Overview sport)
// Cross-sport home: favorite-team games, live games, finals, and aggregated
// headlines pulled from every league.
// =============================================================================

function overviewEmpty(msg){
  return `<p style="font-size:12px; color:var(--color-text-tertiary); padding:6px 2px;">${msg}</p>`;
}

function overviewRow(r){
  const { d, m } = r;
  const h = d.teams[m.home], a = d.teams[m.away];
  if (!h || !a) return '';
  const hasD = m.odds && m.odds.d !== undefined;
  return `<div style="background:var(--color-background-secondary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:10px 12px; margin-bottom:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <span style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">${d.league}</span>
      <div style="display:flex; align-items:center; gap:6px;">${statusPill(m.status)}<span style="font-size:11px; color:var(--color-text-secondary);">${m.time}</span></div>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      ${logoCircle(h.name, h.color, 22)}<span style="flex:1; font-size:13px;">${h.name}</span><span style="font-size:15px; font-weight:500;">${m.hs===null?'—':m.hs}</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px; margin-top:4px;">
      ${logoCircle(a.name, a.color, 22)}<span style="flex:1; font-size:13px;">${a.name}</span><span style="font-size:15px; font-weight:500;">${m.as===null?'—':m.as}</span>
    </div>
    ${m.odds ? oddsBar(h.color, a.color, m.odds, hasD) : ''}
  </div>`;
}

function headlineRow(n){
  return `<div style="display:flex; gap:10px; padding:8px 0; border-bottom:0.5px solid var(--color-border-tertiary);">
    <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:var(--color-background-${n.sev}); color:var(--color-text-${n.sev}); font-weight:500; height:fit-content; flex-shrink:0;">${n.tag}</span>
    <div style="flex:1;">
      <p style="margin:0; font-size:13px; line-height:1.4;">${n.text}</p>
      <p style="margin:2px 0 0; font-size:11px; color:var(--color-text-tertiary);">${n.league} · ${n.when} ago</p>
    </div>
  </div>`;
}

function renderOverview(c){
  const all = DataSource.getAll();
  const favSet = new Set(state.favoriteTeams || []);
  const fav = [], live = [], finished = [], headlines = [];

  Object.values(all).forEach(d => {
    if (d.news) d.news.forEach(n => headlines.push(Object.assign({ league: d.league }, n)));
    if (!d.matches) return;
    d.matches.forEach(m => {
      const row = { d, m };
      if (favSet.has(m.home) || favSet.has(m.away)) fav.push(row);
      if (m.status === 'LIVE') live.push(row);
      else if (m.status === 'FINAL') finished.push(row);
    });
  });

  let html = sampleDataBanner();
  html += section('favgames', 'My teams', fav.length + ' games',
    fav.length ? fav.map(overviewRow).join('') : overviewEmpty('No games for your favorite teams right now.'));
  html += section('livegames', 'Live now', String(live.length),
    live.length ? live.map(overviewRow).join('') : overviewEmpty('Nothing live at the moment.'));
  html += section('finished', 'Final', String(finished.length),
    finished.length ? finished.map(overviewRow).join('') : overviewEmpty('No finals yet today.'));
  html += section('headlines', 'Headlines', '',
    headlines.length ? headlines.slice(0, 8).map(headlineRow).join('') : overviewEmpty('No headlines.'));

  c.innerHTML = html;
  bindSectionToggles(c);
}

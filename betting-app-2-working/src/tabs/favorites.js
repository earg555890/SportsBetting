// =============================================================================
// FAVORITES TAB
// Saved teams + players (mutable). Drives the Overview "My teams" filter.
// renderFavoritesWrapper is the entry the router-patch calls.
// =============================================================================

function favFindTeam(teamId){
  const all = DataSource.getAll();
  for (const d of Object.values(all)){
    if (d.teams && d.teams[teamId]) return { team: d.teams[teamId], league: d.league };
  }
  return null;
}
function favFindPlayer(pid){
  const all = DataSource.getAll();
  for (const d of Object.values(all)){
    if (d.players && d.players[pid]) return { p: d.players[pid], team: d.teams[d.players[pid].team] || {}, league: d.league };
  }
  return null;
}

function renderFavorites(c){
  const teams = (state.favoriteTeams || []).map(id => ({ id, info: favFindTeam(id) })).filter(x => x.info);
  const players = (state.favoritePlayers || []).map(id => ({ id, info: favFindPlayer(id) })).filter(x => x.info);

  let html = '';

  // Teams
  html += `<p style="margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary); font-weight:500;">Teams</p>`;
  html += teams.length ? teams.map(t => `<div style="display:flex; align-items:center; gap:10px; background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:9px 11px; margin-bottom:6px;">
      ${logoCircle(t.info.team.name, t.info.team.color, 26)}
      <div style="flex:1;"><p style="margin:0; font-size:13px; font-weight:500;">${t.info.team.name}</p><p style="margin:1px 0 0; font-size:10px; color:var(--color-text-tertiary);">${t.info.league} · ${t.info.team.record || ''}</p></div>
      <button data-fav-rmteam="${t.id}" style="background:transparent; border:none; cursor:pointer; color:var(--color-text-tertiary); font-size:16px; padding:4px 8px;">✕</button>
    </div>`).join('') : '<p style="font-size:12px; color:var(--color-text-tertiary); margin:0 0 8px;">No favorite teams yet.</p>';

  // Players
  html += `<p style="margin:14px 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary); font-weight:500;">Players</p>`;
  html += players.length ? players.map(p => `<div style="display:flex; align-items:center; gap:10px; background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:9px 11px; margin-bottom:6px;">
      ${logoCircle(p.info.p.name, p.info.p.color, 26)}
      <div style="flex:1;"><p style="margin:0; font-size:13px; font-weight:500;">${p.info.p.name}</p><p style="margin:1px 0 0; font-size:10px; color:var(--color-text-tertiary);">${p.info.team.short || ''} · ${p.info.league}</p></div>
      <button data-fav-rmplayer="${p.id}" style="background:transparent; border:none; cursor:pointer; color:var(--color-text-tertiary); font-size:16px; padding:4px 8px;">✕</button>
    </div>`).join('') : '<p style="font-size:12px; color:var(--color-text-tertiary); margin:0 0 8px;">No favorite players yet.</p>';

  // Add-player picker
  if (state.favPickerOpen){
    const idx = comparePlayerIndex();
    const q = (state.favSearch || '').toLowerCase();
    const matches = Object.entries(idx).filter(([k, e]) => {
      const pid = k.split(':')[1];
      return !(state.favoritePlayers || []).includes(pid) && e.p.name.toLowerCase().includes(q);
    }).slice(0, 30);
    html += `<div style="margin-top:12px; display:flex; gap:8px;">
      <input id="fav-search" type="text" placeholder="Search players…" value="${escapeHtml(state.favSearch || '')}" style="flex:1; padding:9px 11px; border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); background:var(--color-background-secondary); font-size:13px; outline:none;"/>
      <button id="fav-cancel" style="background:var(--color-background-secondary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:9px 12px; font-size:12px; cursor:pointer;">Done</button>
    </div>
    <div style="margin-top:8px; background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); overflow:hidden;">
      ${matches.map(([k, e]) => `<div data-fav-add="${k.split(':')[1]}" style="display:flex; align-items:center; gap:10px; padding:9px 11px; cursor:pointer; border-bottom:0.5px solid var(--color-border-tertiary);">${logoCircle(e.p.name, e.p.color, 24)}<div style="flex:1;"><p style="margin:0; font-size:13px;">${e.p.name}</p><p style="margin:0; font-size:10px; color:var(--color-text-tertiary);">${e.team.short || ''} · ${e.league}</p></div></div>`).join('') || '<p style="font-size:12px; color:var(--color-text-tertiary); padding:12px; text-align:center;">No matches.</p>'}
    </div>`;
  } else {
    html += `<button id="fav-addbtn" style="margin-top:12px; width:100%; background:var(--color-background-secondary); border:0.5px dashed var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:11px; cursor:pointer; font-size:12px; color:var(--color-text-secondary);">+ Add a player</button>`;
  }

  c.innerHTML = html;

  c.querySelectorAll('[data-fav-rmteam]').forEach(b => b.addEventListener('click', () => {
    state.favoriteTeams = state.favoriteTeams.filter(id => id !== b.dataset.favRmteam); renderContent();
  }));
  c.querySelectorAll('[data-fav-rmplayer]').forEach(b => b.addEventListener('click', () => {
    state.favoritePlayers = state.favoritePlayers.filter(id => id !== b.dataset.favRmplayer); renderContent();
  }));
  const addbtn = c.querySelector('#fav-addbtn');
  if (addbtn) addbtn.addEventListener('click', () => { state.favPickerOpen = true; state.favSearch = ''; renderContent(); });
  const cancel = c.querySelector('#fav-cancel');
  if (cancel) cancel.addEventListener('click', () => { state.favPickerOpen = false; state.favSearch = ''; renderContent(); });
  const search = c.querySelector('#fav-search');
  if (search){
    search.addEventListener('input', () => { state.favSearch = search.value; renderContent(); });
    search.focus(); const v = search.value; search.value = ''; search.value = v;
  }
  c.querySelectorAll('[data-fav-add]').forEach(el => el.addEventListener('click', () => {
    const pid = el.dataset.favAdd;
    if (!state.favoritePlayers.includes(pid)) state.favoritePlayers.push(pid);
    renderContent();
  }));
}

function renderFavoritesWrapper(c){ renderFavorites(c); }

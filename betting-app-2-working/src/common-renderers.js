// =============================================================================
// COMMON RENDERERS
// Pieces used by multiple sport home pages: featured game info card,
// expandable "other games" card, per-game viz, news/standings/leaders blocks,
// and the player picker pill + binder.
// =============================================================================

function gameInfoContent(d, hasDraws){
  const f = d.matches.find(m => m.isFeature) || d.matches[0];
  const home = d.teams[f.home], away = d.teams[f.away];
  if (!home || !away) return '<p style="font-size:11px; color:var(--color-text-tertiary);">No game data</p>';
  let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">${statusPill(f.status)}<span style="font-size:11px; color:var(--color-text-secondary);">${f.time}</span></div>
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
    <div style="text-align:center; flex:1;">${logoCircle(home.name, home.color, 40).replace('flex-shrink:0;', 'flex-shrink:0; margin:0 auto 6px;')}<p style="margin:0; font-size:12px; font-weight:500;">${home.name}</p></div>
    <p style="margin:0; font-size:24px; font-weight:500;">${f.hs===null?'—':f.hs} - ${f.as===null?'—':f.as}</p>
    <div style="text-align:center; flex:1;">${logoCircle(away.name, away.color, 40).replace('flex-shrink:0;', 'flex-shrink:0; margin:0 auto 6px;')}<p style="margin:0; font-size:12px; font-weight:500;">${away.name}</p></div>
  </div>
  ${oddsBar(home.color, away.color, f.odds, hasDraws)}
  ${f.line ? `<p style="margin:8px 0 0; font-size:11px; color:var(--color-text-secondary); text-align:center;">Spread: <strong>${f.line}</strong></p>`:''}`;

  // Other games — each is its own collapsible card
  const others = d.matches.filter(m => !m.isFeature);
  if (others.length){
    html += `<p style="margin:14px 0 8px; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Other games (tap to expand)</p>`;
    others.forEach((m, idx) => {
      const realIdx = d.matches.indexOf(m);
      const key = `${state.league}|${realIdx}`;
      const isExpanded = state.expandedGameKey === key;
      html += otherGameCard(d, m, key, isExpanded, hasDraws);
    });
  }
  return html;
}

function otherGameCard(d, m, key, isExpanded, hasDraws){
  const h = d.teams[m.home], a = d.teams[m.away];
  if (!h || !a) return '';
  let html = `<div style="background:var(--color-background-secondary); border:0.5px solid ${isExpanded ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}; border-radius:var(--border-radius-md); margin-bottom:8px; overflow:hidden;">
    <button data-game-toggle="${key}" style="width:100%; padding:10px 12px; background:transparent; border:none; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <div style="display:flex; gap:6px; align-items:center;">${statusPill(m.status)}</div>
        <span style="font-size:11px; color:var(--color-text-secondary);">${m.time}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px; width:100%;">
        ${logoCircle(h.name, h.color, 24)}
        <span style="flex:1; font-size:13px;">${h.name}</span>
        <span style="font-size:16px; font-weight:500;">${m.hs===null?'—':m.hs}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px; width:100%;">
        ${logoCircle(a.name, a.color, 24)}
        <span style="flex:1; font-size:13px;">${a.name}</span>
        <span style="font-size:16px; font-weight:500;">${m.as===null?'—':m.as}</span>
      </div>
      ${m.odds ? oddsBar(h.color, a.color, m.odds, hasDraws) : ''}
      <div style="display:flex; align-items:center; gap:4px; color:var(--color-text-tertiary); font-size:11px; width:100%; justify-content:flex-end;">
        ${isExpanded ? '<span>Hide</span>' : '<span>Tap to expand</span>'}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${isExpanded?180:0}deg);"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </button>`;
  if (isExpanded){
    html += `<div style="padding:0 12px 12px; border-top:0.5px solid var(--color-border-tertiary);">${perGameVisualization(d, m)}</div>`;
  }
  html += `</div>`;
  return html;
}

function perGameVisualization(d, m){
  // Sport-specific mini visualization for an expanded non-featured game
  const home = d.teams[m.home], away = d.teams[m.away];
  let html = '';
  if (espnMode){
    html += `<p style="margin:10px 0 6px; font-size:9px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">⚠ Sample data · real visualization data requires premium feed</p>`;
  } else {
    html += `<p style="margin:10px 0 6px; font-size:11px; color:var(--color-text-secondary); font-weight:500;">Game visualizations</p>`;
  }
  if (d.sport === 'hockey'){
    html += hockeyShotChart(home.color, away.color);
    html += `<p style="margin:6px 0 0; font-size:10px; color:var(--color-text-tertiary); text-align:center;">Shot locations</p>`;
  } else if (d.sport === 'basketball'){
    // Use first available player for the home team if available, else the team color
    const hp = Object.values(d.players || {}).find(p => p.team === m.home) || {color: home.color, stats:{'FG%':46}, shotZone:'midrange'};
    html += basketballShotChart(hp);
    html += `<p style="margin:6px 0 0; font-size:10px; color:var(--color-text-tertiary); text-align:center;">${hp.name || home.short} shot chart</p>`;
  } else if (d.sport === 'football'){
    const qb = Object.values(d.players || {}).find(p => p.team === m.home) || {color: home.color, stats:{'Pass Yds':3000,'Pass TD':20}, passStyle:'balanced'};
    html += footballPassingChart(qb);
    html += `<p style="margin:6px 0 0; font-size:10px; color:var(--color-text-tertiary); text-align:center;">${qb.name || home.short} passing chart</p>`;
  } else if (d.sport === 'baseball'){
    const bat = Object.values(d.players || {}).find(p => p.team === m.home) || {color: home.color, stats:{AVG:'.275',HR:20}, sprayStyle:'all'};
    html += baseballSprayChart(bat);
    html += `<p style="margin:6px 0 0; font-size:10px; color:var(--color-text-tertiary); text-align:center;">${bat.name || home.short} spray chart</p>`;
  } else if (d.sport === 'soccer'){
    const player = Object.values(d.players || {}).find(p => p.team === m.home) || {color: home.color, zone:'centerAtt'};
    html += smoothHeatMap(player.color, player.zone);
    html += `<p style="margin:6px 0 0; font-size:10px; color:var(--color-text-tertiary); text-align:center;">${player.name || home.short} heat map</p>`;
  }
  return html;
}

function newsContent(d){
  return d.news.map(n => `<div style="display:flex; gap:10px; padding:8px 0; border-bottom:0.5px solid var(--color-border-tertiary);"><span style="font-size:10px; padding:2px 6px; border-radius:4px; background:var(--color-background-${n.sev}); color:var(--color-text-${n.sev}); font-weight:500; height:fit-content; flex-shrink:0;">${n.tag}</span><div style="flex:1;"><p style="margin:0; font-size:13px; line-height:1.4;">${n.text}</p><p style="margin:2px 0 0; font-size:11px; color:var(--color-text-tertiary);">${n.when} ago</p></div></div>`).join('');
}

function standingsContent(d){
  const teams = Object.entries(d.teams).slice(0, 6);
  let html = `<div style="display:grid; grid-template-columns:18px 1fr 70px 50px; gap:6px; padding:6px 0; font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; font-weight:500; border-bottom:0.5px solid var(--color-border-tertiary);"><span>#</span><span>Team</span><span style="text-align:right;">Record</span><span style="text-align:right;">Pts</span></div>`;
  teams.forEach(([id, t], i) => {
    html += `<div style="display:grid; grid-template-columns:18px 1fr 70px 50px; gap:6px; padding:8px 0; align-items:center; border-bottom:0.5px solid var(--color-border-tertiary); font-size:12px;"><span style="color:${i<3?'var(--color-text-success)':'var(--color-text-tertiary)'}; font-weight:500;">${i+1}</span><div style="display:flex; align-items:center; gap:6px; min-width:0;">${logoCircle(t.name, t.color, 18)}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.name}</span></div><span style="text-align:right; color:var(--color-text-secondary);">${t.record}</span><span style="text-align:right; font-weight:500;">${t.pts}</span></div>`;
  });
  return html;
}

function leadersContent(d){
  let html = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">`;
  d.leaders.forEach(l => {
    html += `<div style="background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:10px;"><p style="margin:0; font-size:11px; color:var(--color-text-secondary);">${l.title}</p><p style="margin:4px 0 2px; font-size:18px; font-weight:500;">${l.value}</p><p style="margin:0; font-size:11px; color:var(--color-text-tertiary);">${l.name}</p></div>`;
  });
  html += `</div>`;
  return html;
}

// ============================================================
// PLAYER PICKER (used on basketball/football/baseball home pages)
// ============================================================
function playerPickerPill(d, label, key){
  const ps = getPickerState();
  if (!ps[key] || !d.players[ps[key]]) ps[key] = Object.keys(d.players)[0];
  const p = d.players[ps[key]];
  return `<div style="display:flex; justify-content:space-between; align-items:center; margin:8px 0 6px;">
    <p style="margin:0; font-size:11px; color:var(--color-text-secondary); font-weight:500;">${label}</p>
    <button data-pickerkey="${key}" class="picker-btn" style="height:28px; padding:0 10px; border-radius:14px; font-size:11px; display:flex; align-items:center; gap:6px; cursor:pointer; background:var(--color-background-secondary); border:0.5px solid var(--color-border-tertiary);">
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${p.color};"></span>
      <span style="font-weight:500;">${p.name.split(' ').slice(-1)[0]}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </button>
  </div>
  <div data-pickerlist="${key}" style="display:none; background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); margin-bottom:8px; max-height:200px; overflow-y:auto;">
    ${Object.entries(d.players).map(([id, pp]) => {
      const t = d.teams[pp.team];
      return `<div data-pickerselect="${key}|${id}" style="display:flex; align-items:center; gap:10px; padding:8px 10px; cursor:pointer; border-bottom:0.5px solid var(--color-border-tertiary); ${ps[key]===id?'background:var(--color-background-info);':''}">${logoCircle(pp.name, pp.color, 24)}<div style="flex:1;"><p style="margin:0; font-size:12px; font-weight:500;">${pp.name}</p><p style="margin:1px 0 0; font-size:10px; color:var(--color-text-secondary);">${t?t.short:''} #${pp.num} · ${pp.pos}</p></div></div>`;
    }).join('')}
  </div>`;
}

function bindPlayerPickers(c){
  c.querySelectorAll('.picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.pickerkey;
      const list = c.querySelector(`[data-pickerlist="${key}"]`);
      if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
    });
  });
  c.querySelectorAll('[data-pickerselect]').forEach(opt => {
    opt.addEventListener('click', () => {
      const [key, id] = opt.dataset.pickerselect.split('|');
      getPickerState()[key] = id;
      renderContent();
    });
  });
}

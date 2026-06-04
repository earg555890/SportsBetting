// =============================================================================
// BASKETBALL VIZ
// renderBasketball page + basketballShotChart (called by common-renderers).
// =============================================================================

// Half-court shot chart. Marker clusters depend on player.shotZone; fill rate
// nods to FG%.
function basketballShotChart(player){
  const zone = player.shotZone || 'midrange';
  const col = player.color || '#888';
  const fg = (player.stats && player.stats['FG%']) ? player.stats['FG%'] : 46;
  const clusters = {
    paint:    [[100,150],[112,160],[88,158],[100,135],[120,150],[80,145]],
    midrange: [[60,120],[140,120],[100,110],[70,95],[130,95],[100,128]],
    wing:     [[40,95],[160,95],[45,130],[155,130],[60,140],[140,140]],
    three:    [[28,80],[172,80],[35,120],[165,120],[100,55],[55,60],[145,60]]
  };
  const pts = clusters[zone] || clusters.midrange;
  const dots = pts.map((p,i) => {
    const made = (i / pts.length) < (fg/100);
    return made
      ? `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${col}"/>`
      : `<path d="M${p[0]-4} ${p[1]-4} L${p[0]+4} ${p[1]+4} M${p[0]+4} ${p[1]-4} L${p[0]-4} ${p[1]+4}" stroke="${col}" stroke-width="1.6" opacity="0.6"/>`;
  }).join('');
  return `<svg viewBox="0 0 200 175" style="width:100%; height:auto; display:block;">
    <rect x="2" y="2" width="196" height="171" rx="4" fill="var(--color-background-secondary)" stroke="var(--color-border-tertiary)"/>
    <rect x="70" y="2" width="60" height="64" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.2" opacity="0.5"/>
    <circle cx="100" cy="66" r="18" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.2" opacity="0.5"/>
    <circle cx="100" cy="18" r="7" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.2" opacity="0.5"/>
    <path d="M18 2 L18 70 A92 92 0 0 0 182 70 L182 2" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.2" opacity="0.45"/>
    ${dots}
  </svg>`;
}

function basketballShotSection(d){
  const html = playerPickerPill(d, 'Player', 'bball_shot');
  const ps = getPickerState();
  const p = d.players[ps['bball_shot']] || Object.values(d.players)[0];
  return html + `${basketballShotChart(p)}
    <div style="display:flex; gap:12px; justify-content:center; margin-top:6px; font-size:11px; color:var(--color-text-secondary);">
      <span>PPG <strong style="color:var(--color-text-primary);">${p.stats.PPG}</strong></span>
      <span>FG% <strong style="color:var(--color-text-primary);">${p.stats['FG%']}</strong></span>
      <span style="text-transform:capitalize;">zone: ${p.shotZone}</span>
    </div>`;
}

function renderBasketball(c){
  const d = getActiveData();
  if (!d){ c.innerHTML = '<p style="font-size:12px;color:var(--color-text-tertiary);">No data for this league.</p>'; return; }
  let html = sampleDataBanner();
  html += section('game', 'Featured game', (d.matches ? d.matches.length : 0) + ' games', gameInfoContent(d, false));
  html += section('shotchart', 'Shot chart', '', basketballShotSection(d));
  html += section('standings', 'Standings', '', standingsContent(d));
  html += section('leaders', 'League leaders', '', leadersContent(d));
  html += section('news', 'News', '', newsContent(d));
  c.innerHTML = html;
  bindSectionToggles(c);
  bindGameToggles(c);
  bindPlayerPickers(c);
}

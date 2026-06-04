// =============================================================================
// FOOTBALL VIZ
// renderFootball page + footballPassingChart (called by common-renderers).
// =============================================================================

// Passing chart — pass attempts at depths weighted by passStyle, from the QB
// position at bottom-center.
function footballPassingChart(qb){
  const style = qb.passStyle || 'balanced';
  const col = qb.color || '#888';
  const targets = {
    short:    [[60,120],[140,120],[100,128],[45,108],[155,108],[90,118],[110,124]],
    deep:     [[55,40],[150,38],[100,28],[40,70],[165,66],[100,55],[80,48]],
    balanced: [[60,118],[140,116],[55,70],[150,66],[100,40],[100,120],[105,80]]
  };
  const origin = [100,162];
  const pts = targets[style] || targets.balanced;
  const lines = pts.map((p,i) => {
    const complete = i % 3 !== 0;
    return `<line x1="${origin[0]}" y1="${origin[1]}" x2="${p[0]}" y2="${p[1]}" stroke="${col}" stroke-width="1.6" opacity="${complete?0.7:0.28}" stroke-dasharray="${complete?'':'3 3'}"/>
      <circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${complete?col:'none'}" stroke="${col}" stroke-width="1.4"/>`;
  }).join('');
  let yards = '';
  for (let i = 1; i < 5; i++){
    const y = 162 - i*32;
    yards += `<line x1="6" y1="${y}" x2="194" y2="${y}" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.35"/>`;
  }
  return `<svg viewBox="0 0 200 170" style="width:100%; height:auto; display:block;">
    <rect x="2" y="2" width="196" height="166" rx="4" fill="var(--color-background-secondary)" stroke="var(--color-border-tertiary)"/>
    ${yards}
    ${lines}
    <circle cx="${origin[0]}" cy="${origin[1]}" r="5" fill="var(--color-text-primary)"/>
  </svg>`;
}

function footballPassSection(d){
  const html = playerPickerPill(d, 'Quarterback', 'fb_pass');
  const ps = getPickerState();
  const p = d.players[ps['fb_pass']] || Object.values(d.players)[0];
  return html + `${footballPassingChart(p)}
    <div style="display:flex; gap:12px; justify-content:center; margin-top:6px; font-size:11px; color:var(--color-text-secondary);">
      <span>Yds <strong style="color:var(--color-text-primary);">${p.stats['Pass Yds']}</strong></span>
      <span>TD <strong style="color:var(--color-text-primary);">${p.stats['Pass TD']}</strong></span>
      <span style="text-transform:capitalize;">${p.passStyle}</span>
    </div>`;
}

function renderFootball(c){
  const d = getActiveData();
  if (!d){ c.innerHTML = '<p style="font-size:12px;color:var(--color-text-tertiary);">No data for this league.</p>'; return; }
  let html = sampleDataBanner();
  html += section('game', 'Featured game', (d.matches ? d.matches.length : 0) + ' games', gameInfoContent(d, false));
  html += section('passing', 'Passing chart', '', footballPassSection(d));
  html += section('standings', 'Standings', '', standingsContent(d));
  html += section('news', 'News', '', newsContent(d));
  c.innerHTML = html;
  bindSectionToggles(c);
  bindGameToggles(c);
  bindPlayerPickers(c);
}

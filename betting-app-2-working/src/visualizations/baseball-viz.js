// =============================================================================
// BASEBALL VIZ
// renderBaseball page + baseballSprayChart (called by common-renderers).
// =============================================================================

// Spray chart — hits sprayed across the field from home plate, weighted by
// sprayStyle (pull vs all fields).
function baseballSprayChart(bat){
  const style = bat.sprayStyle || 'all';
  const col = bat.color || '#888';
  // Right-handed pull = left field heavy. "all" = even spread.
  const hits = {
    pull: [[60,60],[72,72],[50,80],[80,90],[64,100],[90,70],[56,66]],
    all:  [[60,70],[100,55],[140,70],[80,95],[120,95],[100,80],[150,90]]
  };
  const pts = hits[style] || hits.all;
  const home = [100,150];
  const dots = pts.map((p,i) => {
    const hr = i === 0; // first hit shown as a HR star
    return `<line x1="${home[0]}" y1="${home[1]}" x2="${p[0]}" y2="${p[1]}" stroke="${col}" stroke-width="1" opacity="0.3"/>
      <circle cx="${p[0]}" cy="${p[1]}" r="${hr?5.5:4}" fill="${col}" opacity="${hr?1:0.8}"/>`;
  }).join('');
  return `<svg viewBox="0 0 200 165" style="width:100%; height:auto; display:block;">
    <rect x="2" y="2" width="196" height="161" rx="4" fill="var(--color-background-secondary)" stroke="var(--color-border-tertiary)"/>
    <path d="M100 150 L26 64 A104 104 0 0 1 174 64 Z" fill="var(--color-background-primary)" opacity="0.5" stroke="var(--color-text-tertiary)" stroke-width="0.8"/>
    <path d="M100 150 L150 100 L100 56 L50 100 Z" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1" opacity="0.6"/>
    <line x1="100" y1="150" x2="40" y2="78" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.5"/>
    <line x1="100" y1="150" x2="160" y2="78" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.5"/>
    ${dots}
    <circle cx="100" cy="150" r="3.5" fill="var(--color-text-primary)"/>
  </svg>`;
}

function baseballSpraySection(d){
  const html = playerPickerPill(d, 'Batter', 'bb_spray');
  const ps = getPickerState();
  const p = d.players[ps['bb_spray']] || Object.values(d.players)[0];
  return html + `${baseballSprayChart(p)}
    <div style="display:flex; gap:12px; justify-content:center; margin-top:6px; font-size:11px; color:var(--color-text-secondary);">
      <span>AVG <strong style="color:var(--color-text-primary);">${p.stats.AVG}</strong></span>
      <span>HR <strong style="color:var(--color-text-primary);">${p.stats.HR}</strong></span>
      <span style="text-transform:capitalize;">${p.sprayStyle} hitter</span>
    </div>`;
}

function renderBaseball(c){
  const d = getActiveData();
  if (!d){ c.innerHTML = '<p style="font-size:12px;color:var(--color-text-tertiary);">No data for this league.</p>'; return; }
  let html = sampleDataBanner();
  html += section('game', 'Featured game', (d.matches ? d.matches.length : 0) + ' games', gameInfoContent(d, false));
  html += section('spray', 'Spray chart', '', baseballSpraySection(d));
  html += section('standings', 'Standings', '', standingsContent(d));
  html += section('news', 'News', '', newsContent(d));
  c.innerHTML = html;
  bindSectionToggles(c);
  bindGameToggles(c);
  bindPlayerPickers(c);
}

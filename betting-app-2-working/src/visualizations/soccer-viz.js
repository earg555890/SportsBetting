// =============================================================================
// SOCCER VIZ
// renderSoccer page + smoothHeatMap (called by common-renderers per-game viz).
// =============================================================================

// Heat map — radial blobs over a pitch, positioned by the player's zone.
function smoothHeatMap(color, zone){
  const col = color || '#888';
  // pitch is 200 wide x 130 tall, attacking to the right
  const centers = {
    centerAtt: [[150,65],[135,55],[140,80],[160,60]],
    box:       [[178,65],[168,52],[172,80],[185,65]],
    rightWing: [[160,38],[145,30],[170,50],[150,45]],
    leftWing:  [[160,92],[145,100],[170,80],[150,88]],
    midfield:  [[110,65],[95,55],[120,75],[100,80]]
  };
  const pts = centers[zone] || centers.centerAtt;
  const id = 'hg' + Math.abs(hashStr(col + zone));
  const blobs = pts.map((p,i) =>
    `<circle cx="${p[0]}" cy="${p[1]}" r="${26 - i*3}" fill="url(#${id})"/>`
  ).join('');
  return `<svg viewBox="0 0 200 130" style="width:100%; height:auto; display:block;">
    <defs>
      <radialGradient id="${id}">
        <stop offset="0%" stop-color="${col}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="196" height="126" rx="4" fill="var(--color-background-secondary)" stroke="var(--color-border-tertiary)"/>
    <line x1="100" y1="2" x2="100" y2="128" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.4"/>
    <circle cx="100" cy="65" r="20" fill="none" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.4"/>
    <rect x="170" y="38" width="28" height="54" fill="none" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.4"/>
    <rect x="2" y="38" width="28" height="54" fill="none" stroke="var(--color-text-tertiary)" stroke-width="0.8" opacity="0.4"/>
    ${blobs}
  </svg>`;
}

function hashStr(s){
  let h = 0;
  for (let i = 0; i < s.length; i++){ h = (h*31 + s.charCodeAt(i)) | 0; }
  return h;
}

function soccerHeatSection(d){
  const html = playerPickerPill(d, 'Player', 'soc_heat');
  const ps = getPickerState();
  const p = d.players[ps['soc_heat']] || Object.values(d.players)[0];
  return html + `${smoothHeatMap(p.color, p.zone)}
    <div style="display:flex; gap:12px; justify-content:center; margin-top:6px; font-size:11px; color:var(--color-text-secondary);">
      <span>G <strong style="color:var(--color-text-primary);">${p.stats.Goals}</strong></span>
      <span>A <strong style="color:var(--color-text-primary);">${p.stats.Assists}</strong></span>
      <span>xG <strong style="color:var(--color-text-primary);">${p.stats.xG}</strong></span>
    </div>`;
}

function renderSoccer(c){
  const d = getActiveData();
  if (!d){ c.innerHTML = '<p style="font-size:12px;color:var(--color-text-tertiary);">No data for this league.</p>'; return; }
  let html = sampleDataBanner();
  html += section('game', 'Featured match', (d.matches ? d.matches.length : 0) + ' matches', gameInfoContent(d, true));
  html += section('heat', 'Heat map', '', soccerHeatSection(d));
  html += section('standings', 'Table', '', standingsContent(d));
  html += section('news', 'News', '', newsContent(d));
  c.innerHTML = html;
  bindSectionToggles(c);
  bindGameToggles(c);
  bindPlayerPickers(c);
}

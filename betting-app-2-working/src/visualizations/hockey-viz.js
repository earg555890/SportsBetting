// =============================================================================
// HOCKEY VIZ
// renderHockey page + hockeyShotChart (called by common-renderers per-game viz),
// goalie net heat, power-play timeline.
// =============================================================================

// Shot chart — full rink with deterministic shot markers per team.
function hockeyShotChart(homeColor, awayColor){
  const shots = [
    {x:60,y:50,t:'h',m:true},{x:80,y:90,t:'h',m:false},{x:48,y:70,t:'h',m:true},
    {x:95,y:60,t:'h',m:true},{x:70,y:110,t:'h',m:false},{x:110,y:75,t:'h',m:true},
    {x:240,y:55,t:'a',m:true},{x:225,y:95,t:'a',m:false},{x:255,y:72,t:'a',m:true},
    {x:210,y:62,t:'a',m:true},{x:235,y:112,t:'a',m:false},{x:195,y:80,t:'a',m:true}
  ];
  const dot = s => {
    const col = s.t === 'h' ? homeColor : awayColor;
    return s.m
      ? `<circle cx="${s.x}" cy="${s.y}" r="4.5" fill="${col}"/>`
      : `<circle cx="${s.x}" cy="${s.y}" r="4" fill="none" stroke="${col}" stroke-width="1.5" opacity="0.7"/>`;
  };
  return `<svg viewBox="0 0 300 150" style="width:100%; height:auto; display:block;">
    <rect x="4" y="4" width="292" height="142" rx="30" fill="var(--color-background-secondary)" stroke="var(--color-border-tertiary)"/>
    <line x1="150" y1="4" x2="150" y2="146" stroke="#C8102E" stroke-width="2" opacity="0.55"/>
    <line x1="112" y1="4" x2="112" y2="146" stroke="#0038A8" stroke-width="1.5" opacity="0.45"/>
    <line x1="188" y1="4" x2="188" y2="146" stroke="#0038A8" stroke-width="1.5" opacity="0.45"/>
    <circle cx="150" cy="75" r="18" fill="none" stroke="#C8102E" stroke-width="1.2" opacity="0.4"/>
    <path d="M22 60 a30 30 0 0 1 0 30" fill="none" stroke="#C8102E" stroke-width="1.2" opacity="0.4"/>
    <path d="M278 60 a30 30 0 0 0 0 30" fill="none" stroke="#C8102E" stroke-width="1.2" opacity="0.4"/>
    ${shots.map(dot).join('')}
  </svg>`;
}

function hockeyShotsSection(d){
  const f = d.matches.find(m => m.isFeature) || d.matches[0];
  const h = d.teams[f.home], a = d.teams[f.away];
  if (!h || !a) return '<p style="font-size:11px;color:var(--color-text-tertiary);">No game</p>';
  return `${hockeyShotChart(h.color, a.color)}
  <div style="display:flex; gap:14px; justify-content:center; margin-top:8px; font-size:11px; color:var(--color-text-secondary);">
    <span style="display:flex; align-items:center; gap:5px;"><span style="width:9px;height:9px;border-radius:50%;background:${h.color};"></span>${h.short}</span>
    <span style="display:flex; align-items:center; gap:5px;"><span style="width:9px;height:9px;border-radius:50%;background:${a.color};"></span>${a.short}</span>
    <span style="display:flex; align-items:center; gap:5px;"><span style="width:8px;height:8px;border-radius:50%;border:1.5px solid var(--color-text-tertiary);"></span>missed</span>
  </div>`;
}

// Goalie net — 3x3 save-rate grid colored by zone strength.
function goalieNetSVG(goalie){
  const z = goalie.zones || {};
  const cells = [
    ['topL','topC','topR'],
    ['midL','midC','midR'],
    ['lowL','lowC','lowR']
  ];
  let rects = '';
  cells.forEach((row, r) => row.forEach((key, col) => {
    const v = z[key] != null ? z[key] : 0.6;
    const x = 12 + col*52, y = 10 + r*38;
    rects += `<rect x="${x}" y="${y}" width="50" height="36" rx="3" fill="${goalie.color}" opacity="${0.18 + v*0.7}"/>
      <text x="${x+25}" y="${y+23}" text-anchor="middle" font-size="11" fill="var(--color-text-primary)" font-weight="500">${Math.round(v*100)}</text>`;
  }));
  return `<svg viewBox="0 0 180 130" style="width:140px; height:auto;">
    <rect x="8" y="6" width="164" height="118" rx="4" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2"/>
    ${rects}
  </svg>`;
}

function hockeyGoaliesSection(d){
  const gs = Object.values(d.goalies || {});
  if (!gs.length) return '<p style="font-size:11px;color:var(--color-text-tertiary);">No goalie data</p>';
  return gs.slice(0,2).map(g => {
    const t = d.teams[g.team];
    return `<div style="display:flex; gap:12px; align-items:center; padding:8px 0; border-bottom:0.5px solid var(--color-border-tertiary);">
      ${goalieNetSVG(g)}
      <div style="flex:1;">
        <p style="margin:0; font-size:13px; font-weight:500;">${g.name}</p>
        <p style="margin:2px 0 6px; font-size:11px; color:var(--color-text-secondary);">${t?t.short:''} · #${g.num}</p>
        <div style="display:flex; gap:10px; font-size:11px; color:var(--color-text-secondary);">
          <span>SV% <strong style="color:var(--color-text-primary);">${g.stats['SV%']}</strong></span>
          <span>GAA <strong style="color:var(--color-text-primary);">${g.stats['GAA']}</strong></span>
          <span>W <strong style="color:var(--color-text-primary);">${g.stats['W']}</strong></span>
        </div>
      </div>
    </div>`;
  }).join('') + `<p style="margin:8px 0 0; font-size:10px; color:var(--color-text-tertiary); text-align:center;">Save % by net zone</p>`;
}

function renderHockey(c){
  const d = getActiveData();
  if (!d){ c.innerHTML = '<p style="font-size:12px;color:var(--color-text-tertiary);">No data for this league.</p>'; return; }
  let html = sampleDataBanner();
  html += section('game', 'Featured game', (d.matches ? d.matches.length : 0) + ' games', gameInfoContent(d, false));
  html += section('shots', 'Shot chart', '', hockeyShotsSection(d));
  html += section('goalie', 'Goalies', '', hockeyGoaliesSection(d));
  html += section('standings', 'Standings', '', standingsContent(d));
  html += section('news', 'News', '', newsContent(d));
  c.innerHTML = html;
  bindSectionToggles(c);
  bindGameToggles(c);
}

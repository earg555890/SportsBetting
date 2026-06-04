// =============================================================================
// UFC / COMBAT VIZ
// renderUFC page (also used for Boxing) + anatomical body figure with strike
// heat zones, tale-of-the-tape, strike breakdown, expandable fight cards.
// =============================================================================

// Front-facing body figure with strike-intensity heat over named zones.
function bodyFigure(fighter){
  const z = fighter.zones || {};
  const col = fighter.color || '#888';
  const heat = (key, cx, cy, r) => {
    const v = z[key] != null ? z[key] : 0;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${(v*0.75).toFixed(2)}"/>`;
  };
  return `<svg viewBox="0 0 120 230" style="width:96px; height:auto;">
    <!-- silhouette -->
    <g fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.4" opacity="0.7">
      <circle cx="60" cy="24" r="15"/>
      <path d="M45 40 L75 40 L82 60 L96 110 L86 116 L74 78 L74 130 L70 200 L58 200 L56 140 L52 140 L50 200 L38 200 L46 130 L46 78 L34 116 L24 110 L38 60 Z"/>
    </g>
    <!-- heat zones -->
    ${heat('head', 60, 24, 13)}
    ${heat('faceL', 54, 22, 7)}${heat('faceR', 66, 22, 7)}
    ${heat('shoulderL', 44, 48, 8)}${heat('shoulderR', 76, 48, 8)}
    ${heat('chest', 60, 64, 13)}
    ${heat('ribsL', 49, 78, 8)}${heat('ribsR', 71, 78, 8)}
    ${heat('absL', 54, 96, 8)}${heat('absR', 66, 96, 8)}
    ${heat('thighL', 51, 150, 10)}${heat('thighR', 69, 150, 10)}
    ${heat('calfL', 48, 185, 8)}${heat('calfR', 72, 185, 8)}
  </svg>`;
}

function strikeBreakdown(fighter){
  const t = fighter.strikes && fighter.strikes.targets ? fighter.strikes.targets : null;
  if (!t) return '';
  const row = (label, o) => {
    const pct = o.attempted ? Math.round(o.landed / o.attempted * 100) : 0;
    return `<div style="display:flex; align-items:center; gap:8px; margin:4px 0;">
      <span style="width:42px; font-size:11px; color:var(--color-text-secondary);">${label}</span>
      <div style="flex:1; height:6px; border-radius:3px; background:var(--color-background-secondary); overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${fighter.color};"></div>
      </div>
      <span style="width:54px; text-align:right; font-size:11px;">${o.landed}/${o.attempted}</span>
    </div>`;
  };
  return `<div style="margin-top:6px;">${row('Head', t.head)}${row('Body', t.body)}${row('Leg', t.leg)}</div>`;
}

function tape(f1, f2){
  const r = (label, a, b) => `<div style="display:grid; grid-template-columns:1fr auto 1fr; gap:8px; padding:5px 0; border-bottom:0.5px solid var(--color-border-tertiary); font-size:12px;">
    <span style="text-align:right;">${a}</span><span style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; align-self:center;">${label}</span><span>${b}</span></div>`;
  return `<div style="margin:8px 0;">${r('Record', f1.record, f2.record)}${r('Age', f1.age, f2.age)}${r('Height', f1.height, f2.height)}${r('Reach', f1.reach, f2.reach)}${r('Stance', f1.stance, f2.stance)}</div>`;
}

function fightOddsBar(fight){
  const o = fight.odds;
  return `<div style="margin-top:8px;">
    <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
      <span style="color:${fight.f1.color}; font-weight:500;">${fight.f1.name.split(' ').slice(-1)[0]} ${o.f1}%</span>
      <span style="color:${fight.f2.color}; font-weight:500;">${o.f2}% ${fight.f2.name.split(' ').slice(-1)[0]}</span>
    </div>
    <div style="display:flex; height:6px; border-radius:3px; overflow:hidden; background:var(--color-background-secondary);">
      <div style="width:${o.f1}%; background:${fight.f1.color};"></div>
      <div style="width:${o.f2}%; background:${fight.f2.color};"></div>
    </div>
  </div>`;
}

function fightCard(fight){
  const isOpen = state.expandedFightId === fight.id;
  let html = `<div style="background:var(--color-background-secondary); border:0.5px solid ${isOpen?'var(--color-border-info)':'var(--color-border-tertiary)'}; border-radius:var(--border-radius-md); margin-bottom:8px; overflow:hidden;">
    <button data-fight-toggle="${fight.id}" style="width:100%; padding:11px 12px; background:transparent; border:none; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:7px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">${fight.label}</span>
        <span style="font-size:11px; color:var(--color-text-secondary);">${fight.time}</span>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1;">${logoCircle(fight.f1.name, fight.f1.color, 28)}<span style="font-size:13px; font-weight:500;">${fight.f1.name}</span></div>
        <span style="font-size:11px; color:var(--color-text-tertiary);">vs</span>
        <div style="display:flex; align-items:center; gap:8px; flex:1; justify-content:flex-end;"><span style="font-size:13px; font-weight:500; text-align:right;">${fight.f2.name}</span>${logoCircle(fight.f2.name, fight.f2.color, 28)}</div>
      </div>
      ${fightOddsBar(fight)}
    </button>`;
  if (isOpen){
    html += `<div style="padding:0 12px 12px; border-top:0.5px solid var(--color-border-tertiary);">
      ${tape(fight.f1, fight.f2)}
      <div style="display:flex; gap:8px; justify-content:space-around; margin-top:8px;">
        <div style="text-align:center;">${bodyFigure(fight.f1)}<p style="margin:4px 0 0; font-size:11px; font-weight:500;">${fight.f1.name.split(' ').slice(-1)[0]}</p></div>
        <div style="text-align:center;">${bodyFigure(fight.f2)}<p style="margin:4px 0 0; font-size:11px; font-weight:500;">${fight.f2.name.split(' ').slice(-1)[0]}</p></div>
      </div>
      <p style="margin:10px 0 2px; font-size:11px; color:var(--color-text-secondary); font-weight:500;">${fight.f1.name.split(' ').slice(-1)[0]} — strikes landed</p>
      ${strikeBreakdown(fight.f1)}
      <p style="margin:10px 0 2px; font-size:11px; color:var(--color-text-secondary); font-weight:500;">${fight.f2.name.split(' ').slice(-1)[0]} — strikes landed</p>
      ${strikeBreakdown(fight.f2)}
    </div>`;
  }
  html += `</div>`;
  return html;
}

function bindFightToggles(c){
  c.querySelectorAll('[data-fight-toggle]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.fightToggle;
    state.expandedFightId = state.expandedFightId === id ? null : id;
    renderContent();
  }));
}

function renderUFC(c){
  const d = getActiveData();
  if (!d || !d.fights){ c.innerHTML = '<p style="font-size:12px;color:var(--color-text-tertiary);">No fights scheduled.</p>'; return; }
  let html = sampleDataBanner();
  html += section('fightcard', 'Fight card', d.fights.length + ' fights', d.fights.map(fightCard).join(''));
  html += section('news', 'News', '', newsContent(d));
  c.innerHTML = html;
  bindSectionToggles(c);
  bindFightToggles(c);
}

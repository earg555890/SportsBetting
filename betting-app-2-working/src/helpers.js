// =============================================================================
// UI HELPERS
// Tiny reusable components: logo circles, status pills, odds bars,
// collapsible sections. escapeHtml is the only true utility — rest are HTML.
// Also defines the global espnMode flag and the sample-data banner.
// =============================================================================

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function logoCircle(name, color, size){
  size = size || 36;
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const fontSize = Math.round(size * 0.36);
  return `<div style="width:${size}px; height:${size}px; border-radius:50%; background:${color}; color:white; display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:500; flex-shrink:0;">${escapeHtml(initials)}</div>`;
}

function statusPill(status){
  if (status === 'LIVE') return `<span style="font-size:10px; padding:2px 6px; border-radius:4px; background:var(--color-background-danger); color:var(--color-text-danger); font-weight:500;">● LIVE</span>`;
  if (status === 'FINAL') return `<span style="font-size:10px; padding:2px 6px; border-radius:4px; background:var(--color-background-secondary); color:var(--color-text-secondary); font-weight:500;">FINAL</span>`;
  return `<span style="font-size:10px; padding:2px 6px; border-radius:4px; background:var(--color-background-info); color:var(--color-text-info); font-weight:500;">UPCOMING</span>`;
}

function oddsBar(homeColor, awayColor, odds, hasD){
  if (hasD){
    return `<div style="margin-top:8px;"><div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;"><span style="color:${homeColor}; font-weight:500;">W ${odds.w}%</span><span style="font-weight:500;">D ${odds.d}%</span><span style="color:${awayColor}; font-weight:500;">W ${odds.l}%</span></div><div style="display:flex; height:6px; border-radius:3px; overflow:hidden; background:var(--color-background-secondary);"><div style="width:${odds.w}%; background:${homeColor};"></div><div style="width:${odds.d}%; background:var(--color-text-tertiary); opacity:0.5;"></div><div style="width:${odds.l}%; background:${awayColor};"></div></div></div>`;
  }
  return `<div style="margin-top:8px;"><div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;"><span style="color:${homeColor}; font-weight:500;">W ${odds.w}%</span><span style="color:${awayColor}; font-weight:500;">W ${odds.l}%</span></div><div style="display:flex; height:6px; border-radius:3px; overflow:hidden; background:var(--color-background-secondary);"><div style="width:${odds.w}%; background:${homeColor};"></div><div style="width:${odds.l}%; background:${awayColor};"></div></div></div>`;
}

function section(id, label, badge, contentHTML){
  const isOpen = isSectionOpen(id);
  return `<div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); margin-bottom:8px; overflow:hidden;">
    <button data-section="${id}" style="width:100%; background:${isOpen ? 'var(--color-background-secondary)' : 'transparent'}; border:none; cursor:pointer; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:8px; text-align:left;">
      <div style="display:flex; align-items:center; gap:8px; flex:1;"><p style="margin:0; font-size:13px; font-weight:500;">${label}</p>${badge ? `<span style="font-size:10px; color:var(--color-text-tertiary);">${badge}</span>` : ''}</div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${isOpen ? 180 : 0}deg); transition: transform 0.2s; color: var(--color-text-secondary);"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    ${isOpen ? `<div style="padding:12px 14px 14px; border-top:0.5px solid var(--color-border-tertiary);">${contentHTML}</div>` : ''}
  </div>`;
}

function bindSectionToggles(c){
  c.querySelectorAll('[data-section]').forEach(b => b.addEventListener('click', () => { toggleSection(b.dataset.section); renderContent(); }));
}

function bindGameToggles(c){
  c.querySelectorAll('[data-game-toggle]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.gameToggle;
    state.expandedGameKey = state.expandedGameKey === k ? null : k;
    renderContent();
  }));
}

// Global flag — set by the ESPN integration. Used by visualization functions
// to decide whether to show the "sample data" disclaimer.
let espnMode = false;

function sampleDataBanner(){
  if (!espnMode) return '';
  return `<div style="background:var(--color-background-warning); color:var(--color-text-warning); padding:6px 10px; border-radius:var(--border-radius-md); margin-bottom:10px; font-size:11px; display:flex; align-items:center; gap:6px;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span>Live game data is real. Visualizations below use sample data — premium feed needed for real heat maps & shot charts.</span>
  </div>`;
}

function renderStatusBanner(){
  const banner = document.getElementById('status-banner');
  const m = DataSource.getMode();
  if (m === 'degraded'){
    banner.style.display = 'block';
    banner.innerHTML = `<div style="background:var(--color-background-warning); color:var(--color-text-warning); padding:6px 18px; font-size:11px; display:flex; align-items:center; gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Live data unavailable · showing cached</span></div>`;
  } else { banner.style.display = 'none'; banner.innerHTML = ''; }
}

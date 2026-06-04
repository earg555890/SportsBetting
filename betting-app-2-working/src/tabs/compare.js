// =============================================================================
// COMPARE TAB
// Stack up to three players head-to-head across any league. Searchable picker.
// renderCompareWrapper is the entry the router-patch calls.
// =============================================================================

function comparePlayerIndex(){
  const idx = {};
  Object.entries(DataSource.getAll()).forEach(([lid, d]) => {
    Object.entries(d.players || {}).forEach(([pid, p]) => {
      idx[`${lid}:${pid}`] = { p, league: d.league, lid, team: d.teams[p.team] || {} };
    });
  });
  return idx;
}

function compareStatBlock(entry){
  const { p, league, team } = entry;
  const stats = Object.entries(p.stats || {});
  return `<div style="background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:10px; min-width:0;">
    <div style="display:flex; flex-direction:column; align-items:center; gap:5px; text-align:center;">
      ${logoCircle(p.name, p.color, 34).replace('flex-shrink:0;', 'flex-shrink:0; margin:0 auto;')}
      <p style="margin:0; font-size:12px; font-weight:500; line-height:1.2;">${p.name}</p>
      <p style="margin:0; font-size:10px; color:var(--color-text-tertiary);">${team.short || ''} · ${league}</p>
    </div>
    <div style="margin-top:8px;">
      ${stats.map(([k, v]) => `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:0.5px solid var(--color-border-tertiary); font-size:11px;"><span style="color:var(--color-text-secondary);">${k}</span><span style="font-weight:500;">${v}</span></div>`).join('')}
    </div>
  </div>`;
}

function renderCompare(c){
  const idx = comparePlayerIndex();
  state.compareIds = (state.compareIds || []).filter(k => idx[k]).slice(0, 3);

  // Picker mode
  if (state.compareSlot != null){
    const q = (state.compareSearch || '').toLowerCase();
    const matches = Object.entries(idx)
      .filter(([k, e]) => !state.compareIds.includes(k) && e.p.name.toLowerCase().includes(q))
      .slice(0, 30);
    let html = `<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
      <input id="cmp-search" type="text" placeholder="Search players…" value="${escapeHtml(state.compareSearch || '')}"
        style="flex:1; padding:9px 11px; border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); background:var(--color-background-secondary); font-size:13px; outline:none;"/>
      <button id="cmp-cancel" style="background:var(--color-background-secondary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:9px 12px; font-size:12px; cursor:pointer;">Cancel</button>
    </div>
    <div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); overflow:hidden;">
    ${matches.length ? matches.map(([k, e]) => `<div data-cmp-pick="${k}" style="display:flex; align-items:center; gap:10px; padding:9px 11px; cursor:pointer; border-bottom:0.5px solid var(--color-border-tertiary);">
        ${logoCircle(e.p.name, e.p.color, 26)}
        <div style="flex:1;"><p style="margin:0; font-size:13px; font-weight:500;">${e.p.name}</p><p style="margin:1px 0 0; font-size:10px; color:var(--color-text-tertiary);">${e.team.short || ''} · ${e.league} · ${e.p.pos || ''}</p></div>
      </div>`).join('') : '<p style="font-size:12px; color:var(--color-text-tertiary); padding:14px; text-align:center;">No players match.</p>'}
    </div>`;
    c.innerHTML = html;
    const input = c.querySelector('#cmp-search');
    if (input){
      input.addEventListener('input', () => { state.compareSearch = input.value; renderContent(); });
      input.focus();
      const v = input.value; input.value = ''; input.value = v; // caret to end
    }
    const cancelBtn = c.querySelector('#cmp-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { state.compareSlot = null; state.compareSearch = ''; renderContent(); });
    c.querySelectorAll('[data-cmp-pick]').forEach(el => el.addEventListener('click', () => {
      const k = el.dataset.cmpPick;
      if (state.compareSlot >= state.compareIds.length) state.compareIds.push(k);
      else state.compareIds[state.compareSlot] = k;
      state.compareSlot = null; state.compareSearch = '';
      renderContent();
    }));
    return;
  }

  // Comparison mode
  const filled = state.compareIds.map(k => idx[k]);
  const cols = Math.max(filled.length, 1);
  let html = `<p style="margin:0 0 10px; font-size:12px; color:var(--color-text-secondary);">Compare up to three players from any league.</p>`;
  html += `<div style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:8px; margin-bottom:10px;">`;
  html += filled.map(compareStatBlock).join('');
  if (filled.length < 3){
    html += `<button data-cmp-add="1" style="background:var(--color-background-secondary); border:0.5px dashed var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:18px 8px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:var(--color-text-secondary); min-height:120px;">
      <span style="font-size:22px; line-height:1;">+</span><span style="font-size:11px;">Add player</span></button>`;
  }
  html += `</div>`;
  if (filled.length){
    html += `<button data-cmp-clear="1" style="background:transparent; border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:8px 12px; font-size:12px; cursor:pointer; color:var(--color-text-secondary);">Clear all</button>`;
  }
  c.innerHTML = html;
  const addBtn = c.querySelector('[data-cmp-add]');
  if (addBtn) addBtn.addEventListener('click', () => { state.compareSlot = state.compareIds.length; state.compareSearch = ''; renderContent(); });
  const clearBtn = c.querySelector('[data-cmp-clear]');
  if (clearBtn) clearBtn.addEventListener('click', () => { state.compareIds = []; renderContent(); });
}

function renderCompareWrapper(c){ renderCompare(c); }

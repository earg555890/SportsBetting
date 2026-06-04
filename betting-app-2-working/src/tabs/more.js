// =============================================================================
// MORE TAB
// Settings groupings. Mostly informational for now (see PROJECT.md — stubbed).
// =============================================================================

function moreGroup(title, rows){
  return `<p style="margin:14px 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--color-text-tertiary); font-weight:500;">${title}</p>
  <div style="background:var(--color-background-secondary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); overflow:hidden;">
    ${rows.map((r, i) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:11px 12px; ${i < rows.length - 1 ? 'border-bottom:0.5px solid var(--color-border-tertiary);' : ''}">
      <span style="font-size:13px;">${r.label}</span>
      <span style="font-size:12px; color:var(--color-text-tertiary);">${r.value || ''}</span>
    </div>`).join('')}
  </div>`;
}

function renderMore(c){
  let html = `<p style="margin:0 0 4px; font-size:12px; color:var(--color-text-secondary);">Settings</p>`;
  html += moreGroup('Appearance', [
    { label: 'Theme', value: 'Auto (system)' },
    { label: 'Layout', value: 'Mobile' }
  ]);
  html += moreGroup('Data', [
    { label: 'Live source', value: DataSource.getMode() },
    { label: 'Real ESPN data', value: 'Toggle below the phone' },
    { label: 'Odds & AI', value: 'Needs backend running' }
  ]);
  html += moreGroup('About', [
    { label: 'App', value: 'Betting · v0' },
    { label: 'Build status', value: 'See START_HERE.md' }
  ]);
  html += `<p style="margin:16px 2px 0; font-size:10px; color:var(--color-text-tertiary); line-height:1.6;">21+. For entertainment. Sports betting carries risk and the house holds a built-in edge. If gambling stops being fun, call 1-800-GAMBLER.</p>`;
  c.innerHTML = html;
}
